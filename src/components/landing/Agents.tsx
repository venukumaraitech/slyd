"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { useState, type ReactNode } from "react";
import { ArrowRight, Bot, Check, Copy, ExternalLink, Link2, Lock, MessageSquareText, Sparkles, Zap } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { buttonClass } from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { DesktopDownload } from "@/components/ui/DesktopDownload";
import { DESKTOP_MCP_URL, SITE_URL } from "@/lib/site";

const MCP_URL = `${SITE_URL}/mcp`;

function useCopy() {
  const [copied, setCopied] = useState<string | null>(null);
  const copy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const t = document.createElement("textarea");
      t.value = text;
      document.body.appendChild(t);
      t.select();
      document.execCommand("copy");
      t.remove();
    }
    setCopied(id);
    setTimeout(() => setCopied((c) => (c === id ? null : c)), 1600);
  };
  return { copied, copy };
}

function CopyBlock({ id, text, label, copy, copied, mono = true }: { id: string; text: string; label?: string; copy: (id: string, t: string) => void; copied: string | null; mono?: boolean }) {
  return (
    <div className="group relative">
      {label && <div className="mb-1.5 text-[12px] font-medium text-muted">{label}</div>}
      <pre className={cn("scroll-thin overflow-x-auto rounded-xl bg-ink px-4 py-3.5 pr-14 text-[12.5px] leading-relaxed text-bg", mono ? "font-mono" : "font-sans whitespace-pre-wrap")}>{text}</pre>
      <button
        onClick={() => copy(id, text)}
        className="absolute right-2 bottom-2 flex h-8 items-center gap-1.5 rounded-lg bg-bg/10 px-2.5 text-[12px] font-medium text-bg transition hover:bg-bg/20"
        aria-label="Copy"
      >
        {copied === id ? <Check size={13} /> : <Copy size={13} />}
        {copied === id ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

type Client = { id: string; name: string; badge?: string; body: (c: ReturnType<typeof useCopy>) => ReactNode };

const cursorDeeplink = `cursor://anysphere.cursor-deeplink/mcp/install?name=slyd&config=${typeof btoa !== "undefined" ? btoa(JSON.stringify({ url: MCP_URL })) : ""}`;
const vscodeDeeplink = `vscode:mcp/install?${encodeURIComponent(JSON.stringify({ name: "slyd", type: "http", url: MCP_URL }))}`;

const Steps = ({ items }: { items: ReactNode[] }) => (
  <ol className="flex flex-col gap-2.5">
    {items.map((it, i) => (
      <li key={i} className="flex gap-3 text-[14px] leading-relaxed text-ink-2">
        <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-accent-soft font-mono text-[11px] text-accent">{i + 1}</span>
        <span>{it}</span>
      </li>
    ))}
  </ol>
);

const DOCKER_RUN = "docker run -d -p 3000:3000 --name slyd --restart unless-stopped ghcr.io/venukumaraitech/slyd:latest";
const LOCAL_MCP = DESKTOP_MCP_URL;

const CLIENTS: Client[] = [
  {
    id: "local",
    name: "Your own Slyd",
    badge: "Recommended",
    body: (c) => (
      <div className="flex flex-col gap-5">
        <p className="text-[14px] leading-relaxed text-ink-2">
          Run Slyd on your computer and connect your agent to it. It&apos;s free, private, works offline, and keeps the shared server free for people trying Slyd out. Carousel links your agent makes open straight in the app.
        </p>
        <div>
          <div className="mb-2 text-[12.5px] font-medium text-ink-2">1. Get the Slyd desktop app, and keep it open while your agent works</div>
          <DesktopDownload />
        </div>
        <CopyBlock id="local-cc" label="2. Connect Claude Code" text={`claude mcp add --transport http slyd ${LOCAL_MCP}`} copy={c.copy} copied={c.copied} mono />
        <div className="rounded-xl bg-panel-2 px-4 py-3 text-[13px] leading-relaxed text-ink-2">
          <b className="font-semibold text-ink">Claude Desktop:</b> in the Slyd app, choose <b className="font-medium text-ink">AI agents → Connect to Claude Desktop</b>, then restart Claude. No Node.js or config editing, and Claude opens Slyd for you when it&apos;s closed.
        </div>
        <CopyBlock id="local-cursor" label="…or Cursor (~/.cursor/mcp.json)" text={JSON.stringify({ mcpServers: { slyd: { url: LOCAL_MCP } } }, null, 2)} copy={c.copy} copied={c.copied} mono />
        <CopyBlock id="local-vscode" label="…or VS Code (.vscode/mcp.json)" text={JSON.stringify({ servers: { slyd: { type: "http", url: LOCAL_MCP } } }, null, 2)} copy={c.copy} copied={c.copied} mono />
        <p className="rounded-xl bg-panel-2 px-4 py-3 text-[12.5px] leading-relaxed text-muted">
          claude.ai and ChatGPT on the web connect from their own cloud, so they can&apos;t reach <code className="font-mono">localhost</code>. Use Claude Desktop or Claude Code with your local Slyd, or the shared server in the other tabs.
        </p>
        <p className="-mt-2 text-[12.5px] leading-relaxed text-muted">
          Running Slyd on a server instead?{" "}
          <span className="font-mono [overflow-wrap:anywhere]">{DOCKER_RUN}</span> starts it at localhost:3000; use <code className="font-mono">localhost:3000/mcp</code> in the configs above.
        </p>
      </div>
    ),
  },
  {
    id: "claude",
    name: "Claude",
    badge: "claude.ai · Desktop",
    body: (c) => (
      <div className="flex flex-col gap-4">
        <Steps
          items={[
            <>
              Open <b className="text-ink">Settings → Connectors</b> and choose <b className="text-ink">Add custom connector</b>.
            </>,
            <>
              Name it <b className="text-ink">Slyd</b> and paste the URL below. No sign-in needed.
            </>,
            <>In a chat, ask for a carousel. Claude calls Slyd and hands you the link.</>,
          ]}
        />
        <CopyBlock id="claude-url" text={MCP_URL} copy={c.copy} copied={c.copied} />
      </div>
    ),
  },
  {
    id: "claude-code",
    name: "Claude Code",
    body: (c) => (
      <div className="flex flex-col gap-4">
        <p className="text-[14px] text-ink-2">Run this once in your terminal:</p>
        <CopyBlock id="cc" text={`claude mcp add --transport http slyd ${MCP_URL}`} copy={c.copy} copied={c.copied} />
      </div>
    ),
  },
  {
    id: "chatgpt",
    name: "ChatGPT",
    body: (c) => (
      <div className="flex flex-col gap-4">
        <Steps
          items={[
            <>
              Open <b className="text-ink">Settings → Apps & Connectors</b>. Turn on <b className="text-ink">Developer mode</b> under Advanced if you don&apos;t see &ldquo;Create&rdquo;.
            </>,
            <>
              Choose <b className="text-ink">Create</b>, name it Slyd, paste the URL, and set authentication to <b className="text-ink">None</b>.
            </>,
            <>Enable it in a chat from the + menu, then ask for a carousel.</>,
          ]}
        />
        <CopyBlock id="gpt-url" text={MCP_URL} copy={c.copy} copied={c.copied} />
      </div>
    ),
  },
  {
    id: "cursor",
    name: "Cursor",
    body: (c) => (
      <div className="flex flex-col gap-4">
        <a href={cursorDeeplink} className={buttonClass("ink", "md", "self-start")}>
          <Zap size={15} /> Add to Cursor
        </a>
        <CopyBlock id="cursor-json" label="Or add to ~/.cursor/mcp.json" text={JSON.stringify({ mcpServers: { slyd: { url: MCP_URL } } }, null, 2)} copy={c.copy} copied={c.copied} />
      </div>
    ),
  },
  {
    id: "vscode",
    name: "VS Code",
    badge: "Copilot",
    body: (c) => (
      <div className="flex flex-col gap-4">
        <a href={vscodeDeeplink} className={buttonClass("ink", "md", "self-start")}>
          <Zap size={15} /> Install in VS Code
        </a>
        <CopyBlock id="vscode-cli" label="Or from a terminal" text={`code --add-mcp '${JSON.stringify({ name: "slyd", type: "http", url: MCP_URL })}'`} copy={c.copy} copied={c.copied} />
      </div>
    ),
  },
  {
    id: "other",
    name: "Other",
    badge: "Windsurf, Zed…",
    body: (c) => (
      <div className="flex flex-col gap-4">
        <p className="text-[14px] text-ink-2">
          Any client that supports remote MCP: add a server with type <b className="text-ink">http</b> (Streamable HTTP) and this URL. No auth.
        </p>
        <CopyBlock id="other-url" text={MCP_URL} copy={c.copy} copied={c.copied} />
        <CopyBlock id="other-stdio" label="Client only supports local (stdio) servers? Bridge it:" text={JSON.stringify({ mcpServers: { slyd: { command: "npx", args: ["-y", "mcp-remote", MCP_URL] } } }, null, 2)} copy={c.copy} copied={c.copied} />
      </div>
    ),
  },
];

const PROMPTS = [
  "Turn my last LinkedIn post into a 7-slide carousel in the Noir style.",
  "Make an Instagram carousel: '5 habits that doubled my focus'. Warm editorial look, my handle is @avamakes.",
  "Here are my meeting notes. Turn them into a carousel for my team, 4:5, with a stat slide and a checklist.",
  "Create a carousel announcing our product launch in our brand colours #0B1D3A and #5CE1E6, with photos of a modern office.",
];

const NO_MCP = `Read ${SITE_URL}/llms.txt, then create a Slyd carousel about: <your topic>. Build the link exactly as described there (the #j= format) and give it to me.`;

export function AgentsPage() {
  const c = useCopy();
  const [tab, setTab] = useState(CLIENTS[0].id);
  const client = CLIENTS.find((x) => x.id === tab)!;

  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
        <Logo />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link href="/app" className={buttonClass("ink", "sm")}>
            Open editor <ArrowRight size={14} />
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 pt-10 pb-24">
        <motion.div initial={{ opacity: 0, y: 14, filter: "blur(8px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}>
          <span className="inline-flex items-center gap-2 rounded-full bg-panel px-3 py-1 font-mono text-[11px] tracking-[.14em] text-ink-2 uppercase shadow-sm">
            <Bot size={13} className="text-accent" /> MCP · for AI agents
          </span>
          <h1 className="mt-5 max-w-3xl text-[clamp(2.4rem,5.5vw,4.4rem)] leading-[0.98] font-semibold tracking-[-0.04em] text-balance">
            Let your AI agent make the <span className="font-serif font-normal italic text-accent">carousel.</span>
          </h1>
          <p className="mt-5 max-w-2xl text-[17px] leading-relaxed text-ink-2">
            Connect Slyd to Claude, ChatGPT, Cursor or VS Code. Ask for a carousel in plain words, and your agent writes it, designs it with Slyd, and hands you a link that opens in the editor, ready to tweak and export.
          </p>
        </motion.div>

        {/* Self-host nudge */}
        <button
          onClick={() => {
            setTab("local");
            document.getElementById("setup")?.scrollIntoView({ behavior: "smooth", block: "start" });
          }}
          className="group mt-8 flex w-full items-center gap-3 rounded-2xl bg-accent-soft px-5 py-3.5 text-left ring-1 ring-accent/25 transition hover:ring-accent/50"
        >
          <Zap size={16} className="shrink-0 text-accent" />
          <span className="flex-1 text-[13.5px] leading-snug text-ink-2">
            <b className="font-semibold text-ink">Using Slyd a lot? Get the desktop app.</b> It runs its own MCP server at <code className="font-mono text-[12.5px]">localhost:3737/mcp</code>. Private, offline, and it keeps the shared server free for everyone.
          </span>
          <ArrowRight size={15} className="shrink-0 text-accent transition-transform group-hover:translate-x-0.5" />
        </button>

        {/* URL hero */}
        <div className="mt-10 flex flex-wrap items-center gap-3 rounded-2xl bg-panel p-2 pl-5 shadow-sm">
          <span className="font-mono text-[12px] tracking-wide text-muted uppercase">Shared server</span>
          <code className="min-w-0 flex-1 truncate font-mono text-[15px] text-ink">{MCP_URL}</code>
          <button onClick={() => c.copy("hero", MCP_URL)} className={buttonClass("primary", "md")}>
            {c.copied === "hero" ? <Check size={15} /> : <Copy size={15} />} {c.copied === "hero" ? "Copied" : "Copy URL"}
          </button>
        </div>
        <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-[13px] text-muted">
          <span className="flex items-center gap-1.5">
            <Check size={14} className="text-accent" /> No account or API key
          </span>
          <span className="flex items-center gap-1.5">
            <Check size={14} className="text-accent" /> Nothing to install
          </span>
          <span className="flex items-center gap-1.5">
            <Lock size={14} className="text-accent" /> Carousels live in the link, never on our server
          </span>
        </div>

        {/* Setup tabs */}
        <section id="setup" className="mt-14 scroll-mt-6 overflow-hidden rounded-3xl bg-panel shadow-sm">
          <div className="no-scrollbar flex gap-1 overflow-x-auto border-b border-line p-2">
            {CLIENTS.map((x) => (
              <button key={x.id} onClick={() => setTab(x.id)} className={cn("relative shrink-0 rounded-xl px-4 py-2.5 text-left transition-colors", tab === x.id ? "text-ink" : "text-muted hover:text-ink-2")}>
                {tab === x.id && <motion.span layoutId="agent-tab" className="absolute inset-0 rounded-xl bg-panel-2" transition={{ type: "spring", stiffness: 500, damping: 38 }} />}
                <span className="relative block text-[14px] font-medium">{x.name}</span>
                {x.badge && <span className="relative block text-[11px] text-muted">{x.badge}</span>}
              </button>
            ))}
          </div>
          <div className="p-6 sm:p-8">
            <AnimatePresence mode="wait">
              <motion.div key={client.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }}>
                {client.body(c)}
              </motion.div>
            </AnimatePresence>
          </div>
        </section>

        {/* How it works */}
        <section className="mt-16 grid gap-4 md:grid-cols-3">
          {[
            { icon: MessageSquareText, t: "You ask", d: "Describe the carousel, or paste a post, thread or notes. Mention a style, format or brand if you like." },
            { icon: Sparkles, t: "Your agent writes it", d: "It drafts the hook, the slides and the ask, then calls Slyd's create_carousel with the words and the look." },
            { icon: Link2, t: "You open the link", d: "Slyd lays it out, finds stock photos, applies your saved brand kit, and opens the editor. Tweak, then export." },
          ].map((s, i) => (
            <div key={s.t} className="rounded-3xl bg-panel p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="grid h-10 w-10 place-items-center rounded-2xl bg-accent-soft text-accent">
                  <s.icon size={18} />
                </span>
                <span className="font-mono text-[12px] text-muted">0{i + 1}</span>
              </div>
              <h3 className="mt-5 text-[17px] font-semibold tracking-tight">{s.t}</h3>
              <p className="mt-1.5 text-[14px] leading-relaxed text-muted">{s.d}</p>
            </div>
          ))}
        </section>

        {/* Prompts */}
        <section className="mt-16">
          <h2 className="text-[26px] font-semibold tracking-tight">
            Things to <span className="font-serif font-normal italic text-accent">try</span>
          </h2>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {PROMPTS.map((p, i) => (
              <button key={p} onClick={() => c.copy(`p${i}`, p)} className="group flex items-start justify-between gap-4 rounded-2xl bg-panel p-5 text-left shadow-sm transition hover:shadow-md">
                <span className="text-[14.5px] leading-relaxed text-ink-2">&ldquo;{p}&rdquo;</span>
                <span className="mt-0.5 shrink-0 text-muted transition-colors group-hover:text-accent">{c.copied === `p${i}` ? <Check size={15} /> : <Copy size={15} />}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Tools */}
        <section className="mt-16 grid gap-6 md:grid-cols-[1fr_1.2fr]">
          <div>
            <h2 className="text-[26px] font-semibold tracking-tight">What your agent can do</h2>
            <p className="mt-3 text-[14.5px] leading-relaxed text-muted">
              Everything you can do in the editor: all templates, layouts, palettes, fonts, textures and backgrounds, your brand kit, stock photos by description, and freeform text, images, shapes and icons placed anywhere.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            {[
              ["create_carousel", "Designs a carousel from a spec and returns a link that opens it in Slyd."],
              ["get_carousel_guide", "Layouts, options and copywriting rules, so the agent gets it right first time."],
              ["update_carousel", "Changes a carousel it already made. Opening the new link updates the same carousel in your browser, with Undo."],
              ["read_carousel_link", "Reads a Slyd link back into a spec, so the agent can revise a carousel you shared."],
              ["carousel_from_text", "A prompt: turn any post, thread or notes into a carousel."],
            ].map(([n, d]) => (
              <div key={n} className="rounded-2xl bg-panel px-5 py-4 shadow-sm">
                <code className="font-mono text-[13px] text-accent">{n}</code>
                <p className="mt-1 text-[13.5px] text-ink-2">{d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* No MCP */}
        <section className="mt-16 rounded-3xl border border-dashed border-line-2 p-6 sm:p-8">
          <h2 className="text-[20px] font-semibold tracking-tight">No MCP? It still works.</h2>
          <p className="mt-2 max-w-2xl text-[14.5px] leading-relaxed text-muted">
            Any assistant that can read a web page can build a Slyd link by itself. Paste this into any chat:
          </p>
          <div className="mt-4">
            <CopyBlock id="nomcp" text={NO_MCP} copy={c.copy} copied={c.copied} mono={false} />
          </div>
          <div className="mt-4 flex flex-wrap gap-4 text-[13px]">
            <a href="/llms.txt" target="_blank" className="flex items-center gap-1 text-ink-2 hover:text-accent">
              llms.txt <ExternalLink size={12} />
            </a>
            <a href="/carousel.schema.json" target="_blank" className="flex items-center gap-1 text-ink-2 hover:text-accent">
              JSON Schema <ExternalLink size={12} />
            </a>
          </div>
        </section>
      </main>
    </div>
  );
}
