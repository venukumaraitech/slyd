// Slyd desktop: the whole Slyd app, server and MCP included, running on this computer.
//
// Layout:
//   Slyd's own server (Next.js standalone bundle) runs on a private random port.
//   A small front door listens on http://localhost:3737 and passes everything through,
//   so the app window and AI agents (http://localhost:3737/mcp) share one fixed address.
//   The address is fixed on purpose: carousels are saved in the window's browser storage,
//   which belongs to that exact address.
//
// When an agent's carousel link (http://localhost:3737/c/…) is opened in a web browser,
// the front door hands it to the app window instead, so it lands with your other carousels.
// Links from the hosted Slyd (tryslyd.vercel.app) reach the app as slyd://open/c/…#s=…

const { app, BrowserWindow, WebContentsView, Menu, screen, shell, clipboard, dialog, nativeTheme } = require("electron");
const { spawn } = require("node:child_process");
const http = require("node:http");
const net = require("node:net");
const path = require("node:path");
const fs = require("node:fs");

let PORT = Number(process.env.SLYD_PORT) || 3737;
const REPO = "venukumaraitech/slyd";
const UA_MARK = "SlydDesktop";

let origin = `http://localhost:${PORT}`;
let win = null;
let server = null; // the Next.js child process
let innerPort = 0;
let quitting = false;

let pending = null; // a slyd:// link that arrived before the window was ready

/** slyd://open/c/<name>#s=… (or …/app…) → the same page in the app. */
function fromProtocol(link) {
  try {
    const u = new URL(link);
    if (u.protocol !== "slyd:" || !/^\/(c\/|app)/.test(u.pathname)) return null;
    return `${u.pathname}${u.search}${u.hash}`;
  } catch {
    return null;
  }
}
const protocolArg = (argv) => argv.map(fromProtocol).find(Boolean) || null;
function openLink(rel) {
  if (!rel) return show();
  if (!innerPort) pending = rel;
  else show(`${origin}${rel}`);
}

if (process.defaultApp) app.setAsDefaultProtocolClient("slyd", process.execPath, [path.resolve(process.argv[1])]);
else app.setAsDefaultProtocolClient("slyd");

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  pending = protocolArg(process.argv);
  app.on("second-instance", (_e, argv) => openLink(protocolArg(argv)));
  app.on("open-url", (e, link) => {
    e.preventDefault();
    openLink(fromProtocol(link));
  });
  app.whenReady().then(start).catch(fail);
}

function fail(err) {
  dialog.showErrorBox("Slyd couldn't start", String(err?.stack || err));
  app.exit(1);
}

function serverDir() {
  return app.isPackaged ? path.join(process.resourcesPath, "server") : path.join(__dirname, "server");
}

function freePort() {
  return new Promise((resolve, reject) => {
    const s = net.createServer();
    s.unref();
    s.on("error", reject);
    s.listen(0, "127.0.0.1", () => {
      const { port } = s.address();
      s.close(() => resolve(port));
    });
  });
}

async function startServer() {
  const dir = serverDir();
  const entry = path.join(dir, "server.js");
  if (!fs.existsSync(entry)) throw new Error(`Slyd's server files are missing (${entry}). Run "npm run prepare-server" first.`);
  innerPort = await freePort();
  server = spawn(process.execPath, [entry], {
    cwd: dir,
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: "1",
      NODE_ENV: "production",
      NEXT_TELEMETRY_DISABLED: "1",
      PORT: String(innerPort),
      HOSTNAME: "127.0.0.1",
      PUBLIC_URL: origin,
    },
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
  const log = fs.createWriteStream(path.join(app.getPath("userData"), "server.log"), { flags: "w" });
  server.stdout.pipe(log);
  server.stderr.pipe(log);
  server.on("exit", (code) => {
    if (!quitting) fail(new Error(`Slyd's server stopped (code ${code}). Details: ${path.join(app.getPath("userData"), "server.log")}`));
  });
  // Wait until it answers.
  for (let i = 0; i < 150; i++) {
    if (await ping(innerPort)) return;
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error("Slyd's server didn't start within 15 seconds.");
}

function ping(port) {
  return new Promise((resolve) => {
    const req = http.get({ host: "127.0.0.1", port, path: "/robots.txt", timeout: 1000 }, (res) => {
      res.resume();
      resolve(res.statusCode === 200);
    });
    req.on("error", () => resolve(false));
    req.on("timeout", () => (req.destroy(), resolve(false)));
  });
}

// Shown in a web browser that opens a carousel link: passes the carousel to the app.
const HANDOFF = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<title>Opening in Slyd…</title>
<style>
:root{color-scheme:light dark;--bg:#faf9f7;--ink:#1a1a1a;--muted:#6b6b6b}
@media (prefers-color-scheme:dark){:root{--bg:#141414;--ink:#f2f2f2;--muted:#9a9a9a}}
body{margin:0;min-height:100vh;display:grid;place-items:center;background:var(--bg);color:var(--ink);font:15px/1.5 system-ui,sans-serif;padding:16px;text-align:center}
h1{font-size:20px;margin:0 0 6px}p{margin:0;color:var(--muted)}a{color:inherit}
</style>
<main><h1 id="t">Opening in Slyd…</h1><p id="m">Your carousel is on its way to the Slyd app.</p></main>
<script>
fetch("/__slyd/open",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({path:location.pathname+location.search,hash:location.hash})})
.then(function(r){if(!r.ok)throw 0;document.getElementById("t").textContent="Opened in Slyd";document.getElementById("m").textContent="You can close this tab.";setTimeout(function(){window.close()},1200)})
.catch(function(){document.getElementById("t").textContent="Couldn't reach the Slyd app";document.getElementById("m").innerHTML='Make sure Slyd is open, then reload this page.'});
</script>`;

function startFrontDoor() {
  const front = http.createServer((req, res) => {
    const fromApp = String(req.headers["user-agent"] || "").includes(UA_MARK);

    if (req.method === "POST" && req.url === "/__slyd/open") {
      // Only our own handoff page (same address) may ask the app to open something.
      if (req.headers.origin !== origin) return void res.writeHead(403).end();
      let body = "";
      req.on("data", (c) => (body = (body + c).slice(0, 1_000_000)));
      req.on("end", () => {
        try {
          const { path: p, hash } = JSON.parse(body);
          if (typeof p !== "string" || !/^\/(c\/|app)/.test(p)) throw new Error("bad path");
          show(`${origin}${p}${typeof hash === "string" ? hash : ""}`);
          res.writeHead(204).end();
        } catch {
          res.writeHead(400).end();
        }
      });
      return;
    }

    if (!fromApp && req.method === "GET" && /^\/c\/[^/]+/.test(req.url || "")) {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
      return void res.end(HANDOFF);
    }

    const upstream = http.request(
      { host: "127.0.0.1", port: innerPort, method: req.method, path: req.url, headers: { ...req.headers, "x-forwarded-host": `localhost:${PORT}`, "x-forwarded-proto": "http" } },
      (up) => {
        res.writeHead(up.statusCode || 502, up.headers);
        up.pipe(res);
      },
    );
    upstream.on("error", () => {
      if (!res.headersSent) res.writeHead(502);
      res.end();
    });
    req.pipe(upstream);
  });

  return new Promise((resolve, reject) => {
    front.once("error", reject);
    front.listen(PORT, "127.0.0.1", () => resolve(front));
  });
}

function show(url) {
  if (!win || win.isDestroyed()) createWindow(url);
  else {
    if (url) view.webContents.loadURL(url);
    if (win.isMinimized()) win.restore();
    win.show();
    win.focus();
    view.webContents.focus();
  }
}

/*
 * The window has no system title bar (on Windows it takes the accent colour, often bright
 * blue). Instead a slim bar in Slyd's own colours sits on top, with the system's window
 * buttons drawn over it, and the app fills the rest of the window.
 */
const BAR = 36;
const isMac = process.platform === "darwin";
const LOGO = `<svg viewBox="0 0 64 64" width="16" height="16"><rect width="64" height="64" rx="16" fill="#141311"/><rect x="25" y="13" width="22" height="30" rx="5" fill="#ff5a1f" transform="rotate(12 36 28)" opacity=".55"/><rect x="21" y="16" width="22" height="30" rx="5" fill="#ff5a1f" transform="rotate(4 32 31)" opacity=".8"/><rect x="17" y="19" width="22" height="30" rx="5" fill="#f3f0e9" transform="rotate(-6 28 34)"/></svg>`;
const barHTML = (bg, ink) => `<!doctype html><meta charset="utf-8"><style>
html,body{margin:0;overflow:hidden}
body{background:var(--bg,${bg});color:var(--ink,${ink});font:12.5px/1 system-ui,-apple-system,"Segoe UI",sans-serif;-webkit-app-region:drag;user-select:none;
height:${BAR}px;display:flex;align-items:center;gap:8px;padding-left:${isMac ? 84 : 12}px;transition:background .2s}
#t{opacity:.62;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:60vw}
svg{flex:none}
</style><body>${isMac ? "" : LOGO}<span id="t">Slyd</span></body>`;

const toHex = (rgb) => {
  const m = String(rgb).match(/\d+(\.\d+)?/g);
  if (!m || m.length < 3) return null;
  return "#" + m.slice(0, 3).map((n) => Math.round(+n).toString(16).padStart(2, "0")).join("");
};

let view = null; // the app itself, below the bar

/* Window size: maximized to the screen the first time, then wherever you left it. */
const boundsFile = () => path.join(app.getPath("userData"), "window.json");
function savedBounds() {
  try {
    const b = JSON.parse(fs.readFileSync(boundsFile(), "utf8"));
    // Only reuse it if it still fits on a connected screen (monitors change).
    const area = screen.getDisplayMatching(b).workArea;
    const fits = b.width >= 900 && b.height >= 600 && b.x >= area.x - 8 && b.y >= area.y - 8 && b.x + b.width <= area.x + area.width + 8 && b.y + b.height <= area.y + area.height + 8;
    return fits ? b : { maximized: true };
  } catch {
    return { maximized: true };
  }
}
function saveBounds() {
  try {
    fs.writeFileSync(boundsFile(), JSON.stringify({ ...win.getNormalBounds(), maximized: win.isMaximized() || win.isFullScreen() }));
  } catch {}
}
let barColors = "";

function createWindow(url = `${origin}/app`) {
  const dark = nativeTheme.shouldUseDarkColors;
  const bg = dark ? "#141414" : "#faf9f7";
  const ink = dark ? "#f2f2f2" : "#1a1a1a";
  const saved = savedBounds();
  const area = screen.getPrimaryDisplay().workArea;
  const w = Math.min(1440, area.width), h = Math.min(900, area.height);
  win = new BrowserWindow({
    ...(saved.width ? { x: saved.x, y: saved.y, width: saved.width, height: saved.height } : { width: w, height: h, center: true }),
    minWidth: 900,
    minHeight: 600,
    title: "Slyd",
    show: false,
    backgroundColor: bg,
    titleBarStyle: "hidden",
    ...(isMac ? { trafficLightPosition: { x: 14, y: 11 } } : { titleBarOverlay: { color: bg, symbolColor: ink, height: BAR } }),
    icon: path.join(__dirname, "build", "icon.png"), // Windows and Linux taskbar
    webPreferences: { contextIsolation: true, sandbox: true },
  });
  win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(barHTML(bg, ink))}`);

  view = new WebContentsView({ webPreferences: { contextIsolation: true, sandbox: true, spellcheck: true } });
  view.setBackgroundColor(bg);
  win.contentView.addChildView(view);
  const fit = () => {
    const [w, h] = win.getContentSize();
    view.setBounds({ x: 0, y: BAR, width: w, height: Math.max(0, h - BAR) });
  };
  fit();
  win.on("resize", fit);
  win.on("enter-full-screen", fit);
  win.on("leave-full-screen", fit);

  const page = view.webContents;
  page.setUserAgent(`${page.getUserAgent()} ${UA_MARK}/${app.getVersion()}`);
  const reveal = () => {
    if (!win || win.isDestroyed() || win.isVisible()) return;
    if (saved.maximized) win.maximize();
    win.show();
    fit();
    page.focus();
  };
  page.once("did-finish-load", reveal);
  setTimeout(reveal, 4000);
  win.on("maximize", fit);
  win.on("unmaximize", fit);
  win.on("close", saveBounds);

  // The bar follows the page: its title, and its colours as you switch light and dark.
  page.on("page-title-updated", (_e, title) => {
    win.setTitle(title);
    win.webContents.executeJavaScript(`document.getElementById("t").textContent=${JSON.stringify(title)}`).catch(() => {});
  });
  const syncColors = async () => {
    if (!win || win.isDestroyed() || page.isDestroyed()) return;
    try {
      const [b, i] = await page.executeJavaScript(`(() => { const s = getComputedStyle(document.body); return [s.backgroundColor, s.color]; })()`);
      const bh = toHex(b), ih = toHex(i);
      if (!bh || !ih || `${bh}${ih}` === barColors || /rgba\(0, 0, 0, 0\)/.test(b)) return;
      barColors = `${bh}${ih}`;
      win.setBackgroundColor(bh);
      win.webContents.executeJavaScript(`document.body.style.setProperty("--bg","${bh}");document.body.style.setProperty("--ink","${ih}")`).catch(() => {});
      if (!isMac) win.setTitleBarOverlay({ color: bh, symbolColor: ih, height: BAR });
    } catch {}
  };
  page.on("did-finish-load", syncColors);

  // Scroll like a desktop app: slim scrollbars, no rubber-band overscroll.
  page.on("dom-ready", () => {
    page
      .insertCSS(
        `html{scrollbar-width:thin;scrollbar-color:color-mix(in srgb,currentColor 22%,transparent) transparent;overscroll-behavior:none}
         body{overscroll-behavior:none}
         *{scrollbar-width:thin}`,
      )
      .catch(() => {});
  });
  // The marketing homepage isn't useful inside the app: go to your carousels instead.
  const home = (u) => {
    try {
      if (new URL(u).pathname === "/") page.loadURL(`${origin}/app`);
    } catch {}
  };
  page.on("did-navigate", (_e, u) => home(u));
  page.on("did-navigate-in-page", (_e, u) => home(u));
  const timer = setInterval(syncColors, 700);

  // Slyd's own pages stay in the app; everything else opens in the web browser.
  const inside = (u) => u.startsWith(origin + "/") || u === origin;
  page.setWindowOpenHandler(({ url: u }) => {
    if (inside(u)) page.loadURL(u);
    else if (/^https?:|^mailto:/.test(u)) shell.openExternal(u);
    return { action: "deny" };
  });
  page.on("will-navigate", (e, u) => {
    if (!inside(u)) {
      e.preventDefault();
      if (/^https?:|^mailto:/.test(u)) shell.openExternal(u);
    }
  });
  win.on("focus", () => page.focus());
  win.on("closed", () => {
    clearInterval(timer);
    win = null;
    view = null;
    barColors = "";
  });
  page.loadURL(url);
}

function buildMenu() {
  const mcp = `${origin}/mcp`;
  const page = () => view?.webContents;
  const template = [
    ...(isMac ? [{ role: "appMenu" }] : []),
    {
      label: "File",
      submenu: [
        { label: "All carousels", accelerator: "CmdOrCtrl+Shift+H", click: () => show(`${origin}/app`) },
        { type: "separator" },
        { label: "Open in web browser", click: () => shell.openExternal(page()?.getURL() || `${origin}/app`) },
        { type: "separator" },
        isMac ? { role: "close" } : { role: "quit" },
      ],
    },
    { role: "editMenu" },
    {
      label: "View",
      submenu: [
        { label: "Reload", accelerator: "CmdOrCtrl+R", click: () => page()?.reload() },
        { label: "Back", accelerator: isMac ? "Cmd+[" : "Alt+Left", click: () => page()?.navigationHistory.goBack() },
        { type: "separator" },
        { label: "Actual size", accelerator: "CmdOrCtrl+0", click: () => page()?.setZoomLevel(0) },
        { label: "Zoom in", accelerator: "CmdOrCtrl+=", click: () => page() && page().setZoomLevel(page().getZoomLevel() + 0.5) },
        { label: "Zoom out", accelerator: "CmdOrCtrl+-", click: () => page() && page().setZoomLevel(page().getZoomLevel() - 0.5) },
        { type: "separator" },
        { role: "togglefullscreen" },
        { label: "Developer tools", accelerator: isMac ? "Alt+Cmd+I" : "Ctrl+Shift+I", click: () => page()?.toggleDevTools() },
      ],
    },
    {
      label: "AI agents",
      submenu: [
        { label: `MCP address: ${mcp}`, enabled: false },
        { label: "Copy MCP address", click: () => clipboard.writeText(mcp) },
        { label: "Connect to Claude Desktop", click: connectClaudeDesktop },
        { label: "Copy Claude Code command", click: () => clipboard.writeText(`claude mcp add --transport http slyd ${mcp}`) },
        { type: "separator" },
        { label: "How to connect an agent…", click: () => show(`${origin}/agents#setup`) },
      ],
    },
    { role: "windowMenu" },
    {
      role: "help",
      submenu: [
        { label: "Check for updates…", click: () => checkForUpdates(true) },
        { label: "Slyd on GitHub", click: () => shell.openExternal(`https://github.com/${REPO}`) },
        { label: "Report a problem", click: () => shell.openExternal(`https://github.com/${REPO}/issues`) },
        { label: "Show server log", click: () => shell.showItemInFolder(path.join(app.getPath("userData"), "server.log")) },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

/* ---------------------------------------------------- Claude Desktop -- */

// The bridge lives in the app's data folder, so its path survives updates and AppImage mounts.
const bridgePath = () => path.join(app.getPath("userData"), "mcp-bridge.js");
const appCommand = () => process.env.APPIMAGE || process.execPath;

function installBridge() {
  try {
    fs.writeFileSync(bridgePath(), fs.readFileSync(path.join(__dirname, "mcp-bridge.js")));
  } catch {}
}

function claudeConfigPath() {
  const home = app.getPath("home");
  if (process.platform === "win32") return path.join(app.getPath("appData"), "Claude", "claude_desktop_config.json");
  if (process.platform === "darwin") return path.join(home, "Library", "Application Support", "Claude", "claude_desktop_config.json");
  return path.join(app.getPath("appData"), "Claude", "claude_desktop_config.json");
}

async function connectClaudeDesktop() {
  const file = claudeConfigPath();
  const entry = {
    command: appCommand(),
    args: [bridgePath()],
    env: { ELECTRON_RUN_AS_NODE: "1", SLYD_PORT: String(PORT), SLYD_APP: appCommand() },
  };
  try {
    let config = {};
    if (fs.existsSync(file)) {
      const text = fs.readFileSync(file, "utf8").trim();
      if (text) config = JSON.parse(text);
      fs.copyFileSync(file, `${file}.bak`);
    } else {
      fs.mkdirSync(path.dirname(file), { recursive: true });
    }
    config.mcpServers = { ...(config.mcpServers || {}), slyd: entry };
    fs.writeFileSync(file, JSON.stringify(config, null, 2) + "\n");
    installBridge();
    dialog.showMessageBox(win ?? undefined, {
      type: "info",
      message: "Slyd is connected to Claude Desktop",
      detail:
        "Quit Claude Desktop completely and open it again. Then ask Claude for a carousel: it makes it here in Slyd.\n\n" +
        "If Slyd is closed, Claude opens it for you.",
    });
  } catch (err) {
    clipboard.writeText(JSON.stringify({ mcpServers: { slyd: entry } }, null, 2));
    dialog.showMessageBox(win ?? undefined, {
      type: "warning",
      message: "Couldn't update Claude Desktop's settings",
      detail: `${err.message || err}\n\nThe settings are copied to your clipboard. In Claude Desktop, open Settings → Developer → Edit config, paste them in, and restart Claude.`,
    });
  }
}

const newer = (a, b) => {
  const pa = a.split(".").map(Number), pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) > (pb[i] || 0);
  return false;
};

async function checkForUpdates(manual = false) {
  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, { headers: { Accept: "application/vnd.github+json" } });
    if (!res.ok) throw new Error(`GitHub answered ${res.status}`);
    const rel = await res.json();
    const latest = String(rel.tag_name || "").replace(/^v/, "");
    if (latest && newer(latest, app.getVersion())) {
      const { response } = await dialog.showMessageBox(win ?? undefined, {
        type: "info",
        buttons: ["Download", "Later"],
        defaultId: 0,
        message: `Slyd ${latest} is available`,
        detail: `You have ${app.getVersion()}. Your carousels stay where they are when you update.`,
      });
      if (response === 0) shell.openExternal(rel.html_url || `https://github.com/${REPO}/releases/latest`);
    } else if (manual) {
      dialog.showMessageBox(win ?? undefined, { type: "info", message: "Slyd is up to date", detail: `Version ${app.getVersion()}` });
    }
  } catch (err) {
    if (manual) dialog.showMessageBox(win ?? undefined, { type: "warning", message: "Couldn't check for updates", detail: String(err.message || err) });
  }
}

async function start() {
  let front;
  try {
    front = await startFrontDoor();
  } catch (err) {
    if (err.code !== "EADDRINUSE") throw err;
    const { response } = await dialog.showMessageBox({
      type: "warning",
      buttons: ["Use another address", "Quit"],
      defaultId: 1,
      message: `Another program is using localhost:${PORT}`,
      detail:
        "Slyd keeps your carousels under that address. Close the other program and open Slyd again to see them.\n\n" +
        "You can continue on another address, but carousels made there are kept separately, and agents need its MCP address (Slyd menu → AI agents).",
    });
    if (response === 1) return app.quit();
    PORT = await freePort();
    origin = `http://localhost:${PORT}`;
    front = await startFrontDoor();
  }
  await startServer();
  installBridge();
  buildMenu();
  createWindow(pending ? `${origin}${pending}` : undefined);
  pending = null;
  setTimeout(() => checkForUpdates(false), 8000);
  app.on("before-quit", () => {
    quitting = true;
    front?.close();
    server?.kill();
  });
}

app.on("window-all-closed", () => {
  // On a Mac the app (and its MCP server) keeps running with no window, as Mac apps do.
  if (process.platform !== "darwin") app.quit();
});
app.on("activate", () => show());
