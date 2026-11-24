"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { useLayoutEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowRight, Bookmark, Check, Copy, GraduationCap, HardDrive, Heart, Megaphone, MessageCircle, Palette, Plus, Rocket, Send, Sparkles, X } from "lucide-react";
import { ScaledSlide } from "@/components/slide/SlideRenderer";
import { Github } from "@/components/ui/BrandIcons";
import { MagneticLink } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";
import { cn } from "@/components/ui/cn";
import { DesktopDownload } from "@/components/ui/DesktopDownload";
import { HeroShader } from "./HeroShader";
import { CountUp, Eyebrow, Reveal, SectionHead, SplitWords } from "./primitives";
import { demo } from "./demo";
import { AUTHOR, GITLAB_REPO_URL, ISSUES_URL, LICENSE_URL, REPO_URL, tracked } from "@/lib/site";

gsap.registerPlugin(ScrollTrigger);

/* ---------------------------------------------------------- manifesto -- */

/** Words light up as you scroll: a GSAP scrubbed reveal. */
export function Manifesto() {
  const ref = useRef<HTMLParagraphElement>(null);
  const text =
    "Most carousel tools want a subscription, an account and your attention. Slyd just opens. You write the hook, pick a mood, drop in a photo and export. It's the tool we wanted on our own laptops, so we made it free for everyone.";
  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".mf-word",
        { opacity: 0.12 },
        { opacity: 1, stagger: 0.05, ease: "none", scrollTrigger: { trigger: ref.current, start: "top 75%", end: "bottom 45%", scrub: true } },
      );
    }, ref);
    return () => ctx.revert();
  }, []);
  return (
    <section className="mx-auto max-w-5xl px-6 py-36">
      <Reveal>
        <Eyebrow className="mb-10">Why Slyd</Eyebrow>
      </Reveal>
      <p ref={ref} className="text-[clamp(1.8rem,3.6vw,3.2rem)] leading-[1.15] font-medium tracking-tight text-balance">
        {text.split(" ").map((w, i) => (
          <span key={i} className={cn("mf-word", ["free", "just", "opens."].includes(w) && "font-serif font-normal italic text-accent")}>
            {w}{" "}
          </span>
        ))}
      </p>
    </section>
  );
}

/* ------------------------------------------------------- how it works -- */

const STEPS = [
  { n: "01", t: "Pick a starting point", d: "Choose one of nine templates, or start blank. Pick the format: square, portrait, story or wide.", tpl: "noir" },
  { n: "02", t: "Write, drop, restyle", d: "Edit text right on the slide and wrap words in *asterisks* to highlight them. Drag in photos, then swap palettes until it feels right.", tpl: "editorial" },
  { n: "03", t: "Preview like a follower", d: "Swipe through a phone preview before you post, so you see what your audience will see.", tpl: "aurora" },
  { n: "04", t: "Export and post", d: "One click for PNGs, a PDF for LinkedIn, or a ZIP of everything.", tpl: "photo" },
];

/** Phone screen in the "How it works" demo: the editor preview's 360×760 screen, scaled to 300 wide. */
const PHONE_W = 300;
const PHONE_H = Math.round((PHONE_W * 760) / 360);

export function HowItWorks() {
  const root = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);
  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>(".how-step").forEach((el, i) => {
        ScrollTrigger.create({ trigger: el, start: "top 55%", end: "bottom 55%", onToggle: (s) => s.isActive && setActive(i) });
      });
    }, root);
    return () => ctx.revert();
  }, []);
  const p = demo(STEPS[active].tpl);
  return (
    <section ref={root} id="how" className="mx-auto max-w-6xl px-6 py-24">
      <SectionHead eyebrow="How it works" title="From blank page to *posted* in minutes." center={false} />
      <div className="grid gap-16 lg:grid-cols-[1fr_420px]">
        <div className="flex flex-col">
          {STEPS.map((s, i) => (
            <div key={s.n} className="how-step flex min-h-[46vh] gap-8 border-t border-line py-10">
              <span className={cn("font-mono text-[13px] transition-colors duration-500", i === active ? "text-accent" : "text-muted")}>{s.n}</span>
              <div className={cn("transition-all duration-700", i === active ? "opacity-100" : "opacity-30 blur-[1px]")}>
                <h3 className="text-[clamp(1.6rem,2.8vw,2.4rem)] font-semibold tracking-[-0.03em]">{s.t}</h3>
                <p className="mt-3 max-w-md text-[16px] leading-relaxed text-muted">{s.d}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="relative hidden lg:block">
          {/* Same phone as the editor's preview (360×760 screen, scaled), so its size never changes between steps. */}
          <div className="sticky top-[max(5.5rem,calc(50vh-330px))]">
            <div className="relative mx-auto w-fit rounded-[46px] bg-ink p-3 shadow-[0_0_0_1px_rgb(0_0_0/.2),0_50px_100px_-30px_rgb(0_0_0/.45)]">
              <div className="flex flex-col overflow-hidden rounded-[36px] bg-black text-white" style={{ width: PHONE_W, height: PHONE_H }}>
                <div className="flex h-8 shrink-0 items-center justify-between px-6 pt-1 text-[11px] font-semibold">
                  <span>9:41</span>
                  <span className="h-[19px] w-[76px] rounded-full bg-[#111]" />
                  <span className="tracking-tighter">●●●</span>
                </div>
                <div className="flex h-[46px] shrink-0 items-center gap-2 px-3.5">
                  <div className="h-7 w-7 rounded-full bg-accent" />
                  <div className="leading-tight">
                    <div className="text-[12px] font-semibold">avamakes</div>
                    <div className="text-[10px] opacity-55">Original audio</div>
                  </div>
                  <span className="ml-auto text-[16px] leading-none opacity-70">···</span>
                </div>
                <div className="relative shrink-0 overflow-hidden" style={{ width: PHONE_W, height: Math.round(PHONE_W * 1.25) }}>
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                      key={active}
                      initial={{ opacity: 0, x: 40, filter: "blur(6px)" }}
                      animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                      exit={{ opacity: 0, x: -40, filter: "blur(6px)" }}
                      transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
                      className="absolute inset-0"
                    >
                      <ScaledSlide width={PHONE_W} slide={p.slides[Math.min(active, p.slides.length - 1)]} doc={p} index={active} total={p.slides.length} />
                    </motion.div>
                  </AnimatePresence>
                </div>
                <div className="shrink-0 px-3.5 pt-2.5">
                  <div className="flex items-center gap-3.5">
                    <Heart size={19} />
                    <MessageCircle size={19} />
                    <Send size={18} />
                    <div className="flex flex-1 justify-center gap-1">
                      {[0, 1, 2, 3, 4].map((d) => (
                        <span key={d} className={cn("h-1.5 w-1.5 rounded-full transition-colors", d === active ? "bg-sky-400" : "bg-white/30")} />
                      ))}
                    </div>
                    <div className="w-[50px]" />
                    <Bookmark size={18} />
                  </div>
                  <div className="mt-2 text-[11.5px]">
                    <b>avamakes</b> <span className="opacity-75">{STEPS[active].t}</span>
                  </div>
                </div>
                <div className="min-h-0 flex-1" />
                <div className="flex h-[42px] shrink-0 items-center justify-around border-t border-white/10 px-5 text-white/80">
                  {[0, 1, 2, 3, 4].map((k) => (
                    <span key={k} className={cn("h-[17px] w-[17px] rounded-[5px] border-2 border-current", k === 0 && "bg-current")} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* --------------------------------------------------------------- stats -- */

export function Stats() {
  const items = [
    { v: 9, s: "", l: "Templates", d: "Each built on live theme tokens" },
    { v: 12, s: "", l: "Palettes", d: "Tuned for contrast on phones" },
    { v: 14, s: "", l: "Typefaces", d: "Embedded into every export" },
    { v: 0, s: "", l: "Sign-ups", d: "Open the app and start making" },
  ];
  return (
    <section className="mx-auto max-w-6xl px-6 py-20">
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[28px] bg-line shadow-sm lg:grid-cols-4">
        {items.map((it, i) => (
          <Reveal key={it.l} delay={i * 0.06} className="bg-panel p-8">
            <div className="text-[clamp(3rem,5vw,4.5rem)] leading-none font-semibold tracking-tighter">
              <CountUp to={it.v} suffix={it.s} />
            </div>
            <div className="mt-4 text-[15px] font-medium">{it.l}</div>
            <div className="mt-1 text-[13px] text-muted">{it.d}</div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ----------------------------------------------------------- use cases -- */

const USES = [
  { icon: Rocket, t: "Founders", d: "Turn launch notes, lessons and metrics into posts people save." },
  { icon: GraduationCap, t: "Educators", d: "Break a concept into one idea per slide. Students remember it." },
  { icon: Megaphone, t: "Marketers", d: "Keep campaigns on brand with one palette, one font pair and one footer." },
  { icon: Palette, t: "Designers", d: "Pixel-level control, real textures, and exports up to 3×." },
  { icon: Sparkles, t: "Creators", d: "Ship a carousel a day without fighting your tools." },
];

export function UseCases() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-28">
      <SectionHead eyebrow="Made for" title="Whatever you're *teaching*, telling or selling." />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {USES.map((u, i) => (
          <Reveal key={u.t} delay={i * 0.06}>
            <motion.div
              whileHover={{ y: -6 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="group flex h-full flex-col gap-10 rounded-3xl bg-panel p-6 shadow-sm"
            >
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-panel-2 text-ink-2 transition-all duration-500 group-hover:rotate-[-8deg] group-hover:bg-accent group-hover:text-accent-ink">
                <u.icon size={19} />
              </span>
              <div>
                <h3 className="text-[17px] font-semibold tracking-tight">{u.t}</h3>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted">{u.d}</p>
              </div>
            </motion.div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------- pricing -- */

export function Pricing() {
  const yes = ["All 9 templates & every layout", "Unsplash, Pexels & Openverse search", "Brand kit, palettes, 14 fonts", "PNG, JPG, PDF & ZIP export up to 3×", "Unlimited projects, saved locally", "Self-host it. Fork it. Ship it."];
  const no = ["$15–$30 every month", "Watermarks on the free plan", "Export limits", "Your drafts on someone else's server"];
  return (
    <section className="mx-auto max-w-5xl px-6 py-28">
      <SectionHead eyebrow="Pricing" title="Start simple. *Stay* free." sub="No tiers, no trials, no feature walls. Slyd is MIT licensed, and that won't change." />
      <div className="grid gap-4 md:grid-cols-[1.2fr_1fr]">
        <Reveal className="relative overflow-hidden rounded-4xl bg-ink p-9 text-bg shadow-lg">
          <div aria-hidden className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-accent opacity-40 blur-3xl" />
          <div className="relative">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] tracking-[.16em] uppercase opacity-70">Slyd</span>
              <span className="rounded-full bg-accent px-3 py-1 text-[11px] font-semibold text-accent-ink">The full box</span>
            </div>
            <div className="mt-8 flex items-end gap-3">
              <span className="text-[88px] leading-none font-semibold tracking-[-0.06em]">$0</span>
              <span className="mb-3 text-[15px] opacity-60">forever, for everyone</span>
            </div>
            <ul className="mt-8 flex flex-col gap-3">
              {yes.map((y) => (
                <li key={y} className="flex items-center gap-3 text-[15px]">
                  <span className="grid h-5 w-5 place-items-center rounded-full bg-accent text-accent-ink">
                    <Check size={12} strokeWidth={3} />
                  </span>
                  {y}
                </li>
              ))}
            </ul>
            <div className="mt-10">
              <MagneticLink href="/app" cursor="Go" className="bg-bg text-ink shadow-none hover:brightness-95" variant="soft">
                Open the editor <ArrowRight size={16} />
              </MagneticLink>
            </div>
          </div>
        </Reveal>
        <Reveal delay={0.1} className="rounded-4xl bg-panel p-9 shadow-sm">
          <span className="font-mono text-[11px] tracking-[.16em] text-muted uppercase">The usual alternative</span>
          <div className="mt-8 flex items-end gap-3">
            <span className="relative text-[64px] leading-none font-semibold tracking-tighter text-muted">
              $24
              <motion.span
                className="absolute top-1/2 left-0 h-0.75 w-full origin-left bg-accent"
                initial={{ scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: 0.5, ease: [0.65, 0, 0.35, 1] }}
              />
            </span>
            <span className="mb-2 text-[15px] text-muted">/ month</span>
          </div>
          <ul className="mt-8 flex flex-col gap-3">
            {no.map((n) => (
              <li key={n} className="flex items-center gap-3 text-[15px] text-muted">
                <span className="grid h-5 w-5 place-items-center rounded-full bg-panel-2">
                  <X size={11} strokeWidth={3} />
                </span>
                {n}
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------------- faq -- */

const FAQ = [
  ["Is Slyd really free?", "Yes. It's MIT-licensed open source. There's no paid tier and no watermark. If it helps you, a GitHub star is how you can say thanks."],
  ["Where are my projects stored?", "In your browser's IndexedDB, on your machine. Nothing is uploaded. You can export any project as a .slyd.json file to back it up or move it."],
  ["Can I use the stock photos commercially?", "Unsplash and Pexels photos are free for commercial use under their licenses. Openverse results are limited to licenses that allow commercial use and modification. Slyd saves the credit with every photo, so attribution is one glance away."],
  ["Do I need an API key for photos?", "No. Openverse and Picsum work without one. To search Unsplash or Pexels too, paste your own free key in Settings. It stays in your browser."],
  ["What sizes can I export?", "Square 1:1, portrait 4:5, tall 3:4, story 9:16 and wide 16:9, all 1080px wide, at 1×, 2× or 3×. PDF export is made for LinkedIn document posts."],
  ["Can I run Slyd myself?", "Yes, and please do if you use it often. The desktop app for Windows, Mac and Linux is the easiest way: it includes your own MCP server at localhost:3737/mcp. On a server, one command, docker run -d -p 3000:3000 ghcr.io/venukumaraitech/slyd:latest, starts the full app at localhost:3000, including your own MCP server for AI agents at localhost:3000/mcp. Node.js works too; see the README."],
  ["Why laptop-first?", "Carousels are written, not tapped. Slyd is designed around a keyboard, a trackpad and a 13–16\" screen, and every action has a shortcut. Phones get a friendly heads-up."],
  ["Is there AI?", "Not yet, on purpose. The editor comes first. An optional AI layer for drafting hooks and outlines is on the roadmap."],
];

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="mx-auto grid max-w-6xl gap-12 px-6 py-28 lg:grid-cols-[1fr_1.4fr]">
      <div>
        <Reveal>
          <Eyebrow>FAQ</Eyebrow>
        </Reveal>
        <h2 className="mt-5 text-[clamp(2.2rem,4vw,3.6rem)] leading-none font-semibold tracking-[-0.035em]">
          <SplitWords text="Questions, *answered.*" />
        </h2>
        <Reveal delay={0.1}>
          <p className="mt-5 max-w-sm text-[15px] text-muted">
            Something else? Open an issue on{" "}
            <a href={ISSUES_URL} className="text-ink underline decoration-line-2 underline-offset-4 hover:decoration-accent">
              GitHub
            </a>
            .
          </p>
        </Reveal>
      </div>
      <div className="flex flex-col">
        {FAQ.map(([q, a], i) => (
          <Reveal key={q} delay={i * 0.04} className="border-b border-line">
            <button onClick={() => setOpen(open === i ? null : i)} className="flex w-full items-center justify-between gap-6 py-6 text-left">
              <span className="text-[18px] font-medium tracking-tight">{q}</span>
              <motion.span animate={{ rotate: open === i ? 45 : 0 }} transition={{ type: "spring", stiffness: 300, damping: 20 }} className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-full transition-colors", open === i ? "bg-accent text-accent-ink" : "bg-panel shadow-sm")}>
                <Plus size={15} />
              </motion.span>
            </button>
            <AnimatePresence initial={false}>
              {open === i && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }} className="overflow-hidden">
                  <p className="max-w-xl pb-7 text-[15.5px] leading-relaxed text-muted">{a}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ----------------------------------------------------------------- cta -- */

export function FinalCta() {
  return (
    <section className="px-4 pb-4">
      <div className="relative isolate overflow-hidden rounded-[40px] bg-bg-2 px-6 py-32 text-center shadow-sm">
        <HeroShader className="absolute inset-0 -z-10 opacity-90" />
        <h2 className="mx-auto max-w-4xl text-[clamp(2.8rem,7vw,6.4rem)] leading-[0.95] font-semibold tracking-[-0.045em] text-balance">
          <SplitWords text="Make the next one *unskippable.*" />
        </h2>
        <Reveal delay={0.2}>
          <p className="mx-auto mt-6 max-w-md text-[17px] text-ink-2">Open the editor and start. Your first carousel can go out today.</p>
        </Reveal>
        <Reveal delay={0.3} className="mt-10 flex flex-wrap justify-center gap-3">
          <MagneticLink href="/app" cursor="Create">
            Start creating <ArrowRight size={17} />
          </MagneticLink>
          <MagneticLink href={REPO_URL} external variant="soft" cursor="Star">
            <Github size={17} /> Star on GitHub
          </MagneticLink>
        </Reveal>
      </div>
    </section>
  );
}

export function Footer() {
  const cols = [
    { h: "Product", l: [["Editor", "/app"], ["For AI agents", "/agents"], ["Templates", "#templates"], ["FAQ", "#faq"], ["Privacy", "/privacy"]] },
    { h: "Open source", l: [["Desktop app", "#self-host"], ["GitHub", REPO_URL], ["GitLab mirror", GITLAB_REPO_URL], ["Report a bug", ISSUES_URL], ["MIT License", LICENSE_URL]] },
    { h: "Photos by", l: [["Unsplash", "https://unsplash.com"], ["Pexels", "https://pexels.com"], ["Openverse", "https://openverse.org"], ["Picsum", "https://picsum.photos"]] },
  ];
  return (
    <footer className="mx-auto max-w-6xl px-6 pt-20 pb-10">
      <div className="grid gap-12 md:grid-cols-[1.3fr_repeat(4,1fr)]">
        <div>
          <Logo />
          <p className="mt-4 max-w-xs text-[14px] leading-relaxed text-muted">A free, open source carousel maker. Built on a laptop, for laptops.</p>
          <a
            href={tracked(AUTHOR.url, "footer-card")}
            target="_blank"
            rel="me author noopener"
            className="group mt-6 inline-flex items-center gap-3 rounded-2xl bg-panel py-2 pr-4 pl-2 shadow-sm transition hover:shadow-md"
          >
            <span className="grid h-9 w-9 place-items-center rounded-full bg-ink font-serif text-[17px] text-bg italic">vk</span>
            <span className="leading-tight">
              <span className="block text-[11px] tracking-wide text-muted">Designed &amp; built by</span>
              <span className="block text-[14px] font-medium text-ink transition-colors group-hover:text-accent">{AUTHOR.name}</span>
            </span>
          </a>
        </div>
        {cols.map((c) => (
          <div key={c.h}>
            <div className="mb-4 font-mono text-[11px] tracking-[.14em] text-muted uppercase">{c.h}</div>
            <ul className="flex flex-col gap-2.5">
              {c.l.map(([l, h]) => (
                <li key={l}>
                  <Link href={h} className="text-[14px] text-ink-2 transition-colors hover:text-accent">
                    {l}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
        <div>
          <div className="mb-4 font-mono text-[11px] tracking-[.14em] text-muted uppercase">Creator</div>
          <ul className="flex flex-col gap-2.5">
            {AUTHOR.profiles.map((p) => (
              <li key={p.href}>
                <a
                  href={p.href === AUTHOR.url ? tracked(p.href, "footer-links") : p.href}
                  target="_blank"
                  rel="me noopener"
                  className="text-[14px] text-ink-2 transition-colors hover:text-accent"
                >
                  {p.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="mt-20 overflow-hidden">
        <motion.div
          initial={{ y: "60%" }}
          whileInView={{ y: "0%" }}
          viewport={{ once: true }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          className="pr-[0.1em] pb-[0.24em] font-serif text-[clamp(6rem,24vw,22rem)] leading-[0.85] tracking-[-0.04em] text-ink italic select-none"
        >
          slyd<span className="text-accent">.</span>
        </motion.div>
      </div>
      <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-6 text-[13px] text-muted">
        <span>
          © {new Date().getFullYear()}{" "}
          <a href={tracked(AUTHOR.url, "copyright")} target="_blank" rel="author noopener" className="text-ink-2 hover:text-accent">
            {AUTHOR.name}
          </a>{" "}
          &amp; Slyd contributors · MIT License
        </span>
        <span>Made with care on a laptop.</span>
      </div>
    </footer>
  );
}

/* ------------------------------------------------------------ self-host -- */

const DOCKER_RUN = "docker run -d -p 3000:3000 --name slyd ghcr.io/venukumaraitech/slyd:latest";

export function SelfHost() {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(DOCKER_RUN);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {}
  };
  const points = [
    { t: "Your machine, your carousels", d: "The editor, your projects and the MCP server all run on your computer." },
    { t: "Your own MCP for agents", d: "While Slyd is open, Claude Desktop, Claude Code, Cursor or VS Code can use it at localhost:3737/mcp. Links your agent makes open straight in the app." },
    { t: "Works offline", d: "No account, no limits, nothing to break when the internet does." },
  ];
  return (
    <section id="self-host" className="mx-auto max-w-6xl scroll-mt-24 px-6 py-24">
      <div className="grid gap-12 lg:grid-cols-[1fr_1.05fr] lg:items-center">
        <div>
          <Eyebrow>Desktop app</Eyebrow>
          <h2 className="mt-4 text-[clamp(2rem,4vw,3.2rem)] leading-[1.02] font-semibold tracking-[-0.035em] text-balance">
            <SplitWords text="Slyd on *your* machine." />
          </h2>
          <p className="mt-5 max-w-md text-[16px] leading-relaxed text-muted">
            Slyd is free, and this site runs on a hobby budget. If you use it often, get the desktop app. It&apos;s the same Slyd, private by default, with its own MCP server for your AI agent.
          </p>
          <DesktopDownload className="mt-7" />
          <ul className="mt-7 flex flex-col gap-3.5">
            {points.map((p) => (
              <li key={p.t} className="flex gap-3">
                <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-accent-soft text-accent">
                  <Check size={13} strokeWidth={3} />
                </span>
                <span className="text-[14.5px] leading-relaxed text-ink-2">
                  <b className="font-medium text-ink">{p.t}.</b> {p.d}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <Reveal>
          <div className="overflow-hidden rounded-3xl bg-ink text-bg shadow-lg">
            <div className="flex items-center gap-2 border-b border-bg/10 px-5 py-3">
              <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
              <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
              <span className="h-3 w-3 rounded-full bg-[#28c840]" />
              <span className="ml-2 flex items-center gap-1.5 font-mono text-[11.5px] text-bg/50">
                <HardDrive size={12} /> Terminal
              </span>
            </div>
            <div className="p-5 font-mono text-[13px] leading-relaxed sm:p-6">
              <div className="text-bg/45"># Prefer a server? Run Slyd with Docker</div>
              <div className="mt-1 flex items-start gap-3">
                <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">
                  <span className="text-accent">$</span> {DOCKER_RUN}
                </span>
                <button onClick={copy} className="flex h-8 shrink-0 items-center gap-1.5 rounded-lg bg-bg/10 px-2.5 font-sans text-[12px] font-medium transition hover:bg-bg/20" aria-label="Copy the command">
                  {copied ? <Check size={13} /> : <Copy size={13} />} {copied ? "Copied" : "Copy"}
                </button>
              </div>
              <div className="mt-5 text-bg/45"># Open the editor</div>
              <div className="mt-1">http://localhost:3000</div>
              <div className="mt-5 text-bg/45"># Connect your AI agent (Claude Code shown)</div>
              <div className="mt-1 [overflow-wrap:anywhere]">
                <span className="text-accent">$</span> claude mcp add --transport http slyd http://localhost:3000/mcp
              </div>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-muted">
            <a href={`${REPO_URL}#run-your-own-slyd`} target="_blank" rel="noreferrer" className="underline decoration-line-2 underline-offset-4 hover:text-ink hover:decoration-accent">
              Docker Compose &amp; Node.js setup
            </a>
            <Link href="/agents" className="underline decoration-line-2 underline-offset-4 hover:text-ink hover:decoration-accent">
              Claude Desktop, Cursor &amp; VS Code
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------- agents -- */

export function AgentBand() {
  const lines = [
    { who: "you", text: "Turn my launch notes into a 6-slide carousel. Noir style, my brand." },
    { who: "agent", text: "Done. Hook, four points, a stat and a CTA. Open it here:" },
  ];
  return (
    <section className="mx-auto max-w-6xl px-6 py-24">
      <div className="grid items-center gap-12 overflow-hidden rounded-[36px] bg-ink p-8 text-bg shadow-lg sm:p-12 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-bg/10 px-3 py-1 font-mono text-[11px] tracking-[.14em] uppercase">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" /> New · MCP
          </span>
          <h2 className="mt-5 text-[clamp(2rem,4vw,3.4rem)] leading-none font-semibold tracking-[-0.035em] text-balance">
            <SplitWords text="Or let your AI agent *make it.*" />
          </h2>
          <p className="mt-5 max-w-md text-[16px] leading-relaxed text-bg/70">
            Connect Slyd to Claude, ChatGPT, Cursor or VS Code with one URL. Ask for a carousel and get a link that opens in the editor, fully designed and ready to export.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <MagneticLink href="/agents" cursor="Connect">
              Connect your agent <ArrowRight size={16} />
            </MagneticLink>
          </div>
          <p className="mt-4 font-mono text-[12px] text-bg/50">No install · no API key · nothing stored</p>
        </div>
        <Reveal className="flex flex-col gap-3">
          {lines.map((l, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 + i * 0.5, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className={cn("max-w-[88%] rounded-2xl px-4 py-3 text-[14.5px] leading-relaxed", l.who === "you" ? "self-end rounded-br-md bg-accent text-accent-ink" : "self-start rounded-bl-md bg-bg/10")}
            >
              {l.text}
            </motion.div>
          ))}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 1.3, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="flex max-w-[88%] items-center gap-3 self-start rounded-2xl bg-bg p-3 text-ink"
          >
            <div className="flex -space-x-6">
              {["noir", "editorial", "aurora"].map((id, i) => {
                const p = demo(id);
                return (
                  <div key={id} className="overflow-hidden rounded-md shadow-md" style={{ transform: `rotate(${(i - 1) * 6}deg)` }}>
                    <ScaledSlide width={54} slide={p.slides[0]} doc={p} index={0} total={p.slides.length} />
                  </div>
                );
              })}
            </div>
            <div className="min-w-0 pl-2">
              <div className="truncate text-[13.5px] font-semibold">Launch notes carousel</div>
              <div className="font-mono text-[11.5px] text-muted">tryslyd.vercel.app/app/new#…</div>
            </div>
          </motion.div>
        </Reveal>
      </div>
    </section>
  );
}
