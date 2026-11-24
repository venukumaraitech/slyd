// Connects Claude Desktop (which talks to MCP servers over stdin/stdout) to the Slyd app's
// MCP server at http://localhost:3737/mcp. Starts Slyd first if it isn't open.
//
// Claude Desktop runs it as:  <Slyd executable> <this file>   with ELECTRON_RUN_AS_NODE=1,
// so it needs no Node.js install. The app writes that config entry for you
// (Slyd menu → AI agents → Connect to Claude Desktop).

const { spawn } = require("node:child_process");
const readline = require("node:readline");

const PORT = Number(process.env.SLYD_PORT) || 3737;
const MCP = `http://127.0.0.1:${PORT}/mcp`;
const APP = process.env.SLYD_APP || process.execPath;

const log = (...a) => process.stderr.write(`[slyd] ${a.join(" ")}\n`);
const up = () => fetch(`http://127.0.0.1:${PORT}/robots.txt`).then((r) => r.ok, () => false);

let ready = null;
function ensureApp() {
  ready ??= (async () => {
    if (await up()) return;
    log("starting Slyd…");
    const env = { ...process.env };
    delete env.ELECTRON_RUN_AS_NODE;
    spawn(APP, [], { detached: true, stdio: "ignore", env }).unref();
    for (let i = 0; i < 120; i++) {
      await new Promise((r) => setTimeout(r, 500));
      if (await up()) return;
    }
    throw new Error("Slyd didn't start. Open the Slyd app and try again.");
  })().catch((err) => {
    ready = null;
    throw err;
  });
  return ready;
}

const send = (msg) => process.stdout.write(JSON.stringify(msg) + "\n");

async function forward(line) {
  let msg;
  try {
    msg = JSON.parse(line);
  } catch {
    return;
  }
  const id = msg && typeof msg === "object" && "id" in msg ? msg.id : undefined;
  try {
    await ensureApp();
    const res = await fetch(MCP, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream" },
      body: JSON.stringify(msg),
    });
    const text = await res.text();
    if (!text.trim()) return; // notifications get no reply
    if ((res.headers.get("content-type") || "").includes("text/event-stream")) {
      for (const l of text.split("\n")) if (l.startsWith("data:")) send(JSON.parse(l.slice(5)));
    } else {
      send(JSON.parse(text));
    }
  } catch (err) {
    log(String(err?.message || err));
    if (id !== undefined) send({ jsonrpc: "2.0", id, error: { code: -32000, message: String(err?.message || err) } });
  }
}

readline.createInterface({ input: process.stdin }).on("line", (l) => l.trim() && forward(l));
