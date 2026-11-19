"use client";

import { AnimatePresence, motion, type PanInfo } from "motion/react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Bookmark, Check, ChevronLeft, ChevronRight, Download, FileImage, FileJson, FileText, FolderArchive, Heart, Image as ImageIcon, KeyRound, Loader2, MessageCircle, Repeat2, Send, ThumbsUp, X } from "lucide-react";
import { SlideRenderer, ScaledSlide } from "@/components/slide/SlideRenderer";
import { SLIDE_W, slideHeight } from "@/lib/model/constants";
import type { ExportFormat } from "@/lib/export";
import { download, slug } from "@/lib/download";
import { exportProjectFile } from "@/lib/storage";
import { PROVIDERS, getKeys, setKey, type ProviderId } from "@/lib/stock";
import { cn } from "@/components/ui/cn";
import { toast } from "@/components/ui/Toast";
import { Segmented } from "@/components/ui/controls";
import { useEditor } from "@/store/editor";
import { AUTHOR, tracked } from "@/lib/site";
import { StarButton } from "@/components/ui/StarButton";

export function Modals() {
  const modal = useEditor((s) => s.modal);
  const close = () => useEditor.getState().setModal(null);
  return (
    <AnimatePresence>
      {modal === "export" && <ExportModal key="export" onClose={close} />}
      {modal === "preview" && <PreviewModal key="preview" onClose={close} />}
      {modal === "shortcuts" && <ShortcutsModal key="shortcuts" onClose={close} />}
      {modal === "settings" && <SettingsModal key="settings" onClose={close} />}
    </AnimatePresence>
  );
}

function Shell({ children, onClose, className, dark }: { children: ReactNode; onClose: () => void; className?: string; dark?: boolean }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  return (
    <motion.div className="fixed inset-0 z-[90] grid place-items-center p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
      <div className={cn("absolute inset-0 backdrop-blur-md", dark ? "bg-black/80" : "bg-black/40")} onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97, filter: "blur(8px)" }}
        animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
        exit={{ opacity: 0, y: 12, scale: 0.98, filter: "blur(6px)" }}
        transition={{ type: "spring", stiffness: 380, damping: 32 }}
        className={cn("relative", className)}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

function CloseBtn({ onClose, light }: { onClose: () => void; light?: boolean }) {
  return (
    <button onClick={onClose} className={cn("grid h-8 w-8 place-items-center rounded-full transition", light ? "bg-white/10 text-white hover:bg-white/20" : "text-muted hover:bg-line hover:text-ink")} aria-label="Close">
      <X size={16} />
    </button>
  );
}

/* ================================================================= export */

const FORMATS: { id: ExportFormat | "png-one"; icon: typeof FileImage; title: string; sub: string }[] = [
  { id: "zip-png", icon: FolderArchive, title: "PNG · all slides", sub: "ZIP, lossless. Best for Instagram" },
  { id: "pdf", icon: FileText, title: "PDF document", sub: "One file. Best for LinkedIn" },
  { id: "zip-jpg", icon: ImageIcon, title: "JPG · all slides", sub: "ZIP, smaller files" },
  { id: "png-one", icon: FileImage, title: "Current slide", sub: "A single PNG" },
];

function ExportModal({ onClose }: { onClose: () => void }) {
  const project = useEditor((s) => s.project)!;
  const activeId = useEditor((s) => s.activeSlideId);
  const [fmt, setFmt] = useState<(typeof FORMATS)[number]["id"]>("zip-png");
  const [scale, setScale] = useState<"1" | "2" | "3">("1");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  const host = useRef<HTMLDivElement>(null);
  const H = slideHeight(project.aspect);
  const sc = +scale;

  const run = async () => {
    setBusy(true);
    setDone(false);
    setProgress(0);
    try {
      // html-to-image, JSZip and jsPDF load only when someone actually exports.
      const { buildFontEmbedCSS, renderSlide, packagePdf, packageZip } = await import("@/lib/export");
      await document.fonts.ready;
      const fontEmbedCSS = await buildFontEmbedCSS(project);
      const nodes = Array.from(host.current!.querySelectorAll<HTMLElement>("[data-export]"));
      const targets = fmt === "png-one" ? nodes.filter((n) => n.dataset.export === activeId) : nodes;
      const type = fmt === "zip-jpg" || fmt === "pdf" ? "jpg" : "png";
      const out: string[] = [];
      for (let i = 0; i < targets.length; i++) {
        out.push(await renderSlide(targets[i], project, { scale: sc, type, fontEmbedCSS, quality: fmt === "pdf" ? 0.9 : 0.92 }));
        setProgress((i + 1) / targets.length);
      }
      const base = slug(project.name);
      if (fmt === "png-one") {
        const idx = project.slides.findIndex((s) => s.id === activeId);
        download(out[0], `${base}-${String(idx + 1).padStart(2, "0")}.png`);
      } else if (fmt === "pdf") download(await packagePdf(out, project, sc), `${base}.pdf`);
      else download(await packageZip(out, project, type), `${base}.zip`);
      setDone(true);
      toast.ok("Exported. Go post it.");
    } catch (e) {
      console.error(e);
      toast.error("Export failed. A photo may be blocking cross-origin access. Try re-adding it.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Shell onClose={busy ? () => {} : onClose} className="w-[680px] overflow-hidden rounded-3xl bg-panel shadow-lg">
      <div className="flex">
        <div className="relative hidden w-[240px] shrink-0 items-center justify-center overflow-hidden bg-bg-2 p-6 sm:flex">
          <div className="relative" style={{ height: 300 }}>
            {project.slides.slice(0, 3).map((s, i) => (
              <motion.div
                key={s.id}
                className="absolute top-0 left-1/2 overflow-hidden rounded-lg shadow-[0_20px_40px_-16px_rgb(0_0_0/.5)]"
                initial={{ x: "-50%", rotate: 0, y: 0 }}
                animate={{ x: `calc(-50% + ${(i - 1) * 26}px)`, rotate: (i - 1) * 6, y: busy ? [0, -6, 0] : Math.abs(i - 1) * 8 }}
                transition={busy ? { repeat: Infinity, duration: 1.2, delay: i * 0.15 } : { type: "spring", stiffness: 200, damping: 18 }}
                style={{ zIndex: i === 1 ? 3 : 1 }}
              >
                <ScaledSlide width={150} slide={s} doc={project} index={i} total={project.slides.length} />
              </motion.div>
            ))}
          </div>
        </div>
        <div className="flex-1 p-7">
          <div className="mb-5 flex items-start justify-between">
            <div>
              <h3 className="text-[20px] font-semibold tracking-tight">Export</h3>
              <p className="text-[13px] text-muted">
                {project.slides.length} slides · {SLIDE_W * sc}×{H * sc}px
              </p>
            </div>
            <CloseBtn onClose={onClose} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            {FORMATS.map((f) => (
              <button
                key={f.id}
                onClick={() => setFmt(f.id)}
                className={cn("flex flex-col items-start gap-2 rounded-2xl p-3.5 text-left transition", fmt === f.id ? "bg-accent-soft ring-2 ring-accent" : "bg-panel-2 ring-1 ring-transparent hover:ring-line-2")}
              >
                <f.icon size={18} className={fmt === f.id ? "text-accent" : "text-ink-2"} />
                <div>
                  <div className="text-[13.5px] font-medium">{f.title}</div>
                  <div className="text-[11.5px] text-muted">{f.sub}</div>
                </div>
              </button>
            ))}
          </div>
          <div className="mt-5 flex items-center gap-3">
            <span className="text-[12.5px] text-muted">Quality</span>
            <div className="flex-1">
              <Segmented
                layoutId="exp-scale"
                value={scale}
                onChange={setScale}
                options={[
                  { value: "1", label: "1× · 1080px" },
                  { value: "2", label: "2× Retina" },
                  { value: "3", label: "3× Print" },
                ]}
              />
            </div>
          </div>
          <button onClick={run} disabled={busy} className="relative mt-6 flex h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-ink text-[14.5px] font-medium text-bg transition active:scale-[.99] disabled:cursor-wait">
            <motion.span className="absolute inset-y-0 left-0 bg-accent" initial={false} animate={{ width: busy ? `${progress * 100}%` : "0%" }} transition={{ ease: "easeOut" }} />
            <span className="relative flex items-center gap-2">
              {busy ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Rendering {Math.round(progress * 100)}%
                </>
              ) : done ? (
                <>
                  <Check size={16} /> Done. Export again?
                </>
              ) : (
                <>
                  <Download size={16} /> Export
                </>
              )}
            </span>
          </button>
          <p className="mt-3 text-center text-[11.5px] text-muted">Rendered on your device. Nothing is uploaded.</p>
        </div>
      </div>
      {/* Offscreen full-resolution render targets */}
      {typeof document !== "undefined" &&
        createPortal(
          <div ref={host} aria-hidden style={{ position: "fixed", left: -100000, top: 0, pointerEvents: "none" }}>
            {project.slides.map((s, i) => (
              <div key={s.id} data-export={s.id} style={{ width: SLIDE_W, height: H }}>
                <SlideRenderer slide={s} doc={project} index={i} total={project.slides.length} />
              </div>
            ))}
          </div>,
          document.body,
        )}
    </Shell>
  );
}

/* ================================================================ preview */

/** Fixed phone screen (px) and the height of each piece of app chrome around the post. */
const PHONE = { w: 360, h: 760, status: 36, header: 52, tabs: 48, igActions: 92, liCaption: 34, liActions: 44 };

function PreviewModal({ onClose }: { onClose: () => void }) {
  const project = useEditor((s) => s.project)!;
  const activeId = useEditor((s) => s.activeSlideId);
  const [i, setI] = useState(Math.max(0, project.slides.findIndex((s) => s.id === activeId)));
  const [platform, setPlatform] = useState<"instagram" | "linkedin">("instagram");
  const n = project.slides.length;
  // The phone is always the same size: the slide fits inside the screen instead of stretching the phone.
  const ratio = slideHeight(project.aspect) / SLIDE_W;
  const chrome = PHONE.status + PHONE.header + PHONE.tabs + (platform === "instagram" ? PHONE.igActions : PHONE.liCaption + PHONE.liActions);
  const W = Math.min(PHONE.w, Math.floor((PHONE.h - chrome) / ratio));
  const H = Math.round(W * ratio);
  // Shrink the whole phone (never grow it) on short windows.
  const [fit, setFit] = useState(1);
  useEffect(() => {
    const r = () => setFit(Math.min(1, (window.innerHeight - 150) / (PHONE.h + 32)));
    r();
    window.addEventListener("resize", r);
    return () => window.removeEventListener("resize", r);
  }, []);
  const go = (d: number) => setI((x) => Math.min(n - 1, Math.max(0, x + d)));
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n]);
  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x < -60 || info.velocity.x < -400) go(1);
    else if (info.offset.x > 60 || info.velocity.x > 400) go(-1);
  };
  const { brand } = project;

  return (
    <Shell onClose={onClose} dark className="flex flex-col items-center gap-5">
      <div className="flex items-center gap-3">
        <div className="flex rounded-xl bg-white/10 p-1">
          {(["instagram", "linkedin"] as const).map((pl) => (
            <button
              key={pl}
              onClick={() => setPlatform(pl)}
              className={cn("relative h-8 w-28 rounded-lg text-[13px] font-medium transition-colors", platform === pl ? "text-black" : "text-white/70 hover:text-white")}
            >
              {platform === pl && <motion.span layoutId="pv-plat" className="absolute inset-0 rounded-lg bg-white" transition={{ type: "spring", stiffness: 500, damping: 38 }} />}
              <span className="relative">{pl === "instagram" ? "Instagram" : "LinkedIn"}</span>
            </button>
          ))}
        </div>
        <CloseBtn onClose={onClose} light />
      </div>
      <div className="flex items-center gap-6">
        <button onClick={() => go(-1)} disabled={i === 0} className="grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20 disabled:opacity-20">
          <ChevronLeft size={20} />
        </button>
        <div data-phone className="shrink-0 rounded-[52px] bg-[#0b0b0b] p-4 shadow-[0_0_0_2px_#2a2a2a,0_60px_120px_-30px_rgb(0_0_0/.8)]" style={{ zoom: fit }}>
          <div className={cn("flex flex-col overflow-hidden rounded-[38px]", platform === "instagram" ? "bg-black text-white" : "bg-[#f4f2ee] text-black")} style={{ width: PHONE.w, height: PHONE.h }}>
            <div className="flex h-9 shrink-0 items-center justify-between px-7 pt-2 text-[12px] font-semibold">
              <span>9:41</span>
              <span className="h-[22px] w-[90px] rounded-full bg-black" />
              <span>●●●</span>
            </div>
            <div className={cn("flex h-[52px] shrink-0 items-center gap-2.5 px-4", platform === "linkedin" && "bg-white")}>
              {brand.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={brand.avatar} alt="" className="h-8 w-8 rounded-full object-cover" />
              ) : (
                <div className="grid h-8 w-8 place-items-center rounded-full text-[13px] font-bold" style={{ background: project.theme.accent, color: project.theme.bg }}>
                  {brand.name.charAt(0)}
                </div>
              )}
              <div className="min-w-0 flex-1 leading-tight">
                <div className="text-[13px] font-semibold">{platform === "instagram" ? brand.handle.replace(/^@/, "") : brand.name}</div>
                <div className="text-[11px] opacity-60">{platform === "instagram" ? "Original audio" : "Creator · 2h"}</div>
              </div>
              <span className="opacity-70">···</span>
            </div>
            {platform === "linkedin" && <div className="flex h-[34px] shrink-0 items-start truncate bg-white px-4 text-[12.5px] leading-snug">{project.name}. Swipe through 👉</div>}
            <div className={cn("relative mx-auto shrink-0 overflow-hidden", platform === "instagram" ? "bg-black" : "bg-[#f4f2ee]")} style={{ width: W, height: H }}>
              <motion.div className="flex cursor-grab active:cursor-grabbing" drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={0.2} onDragEnd={onDragEnd} animate={{ x: -i * W }} transition={{ type: "spring", stiffness: 300, damping: 34 }}>
                {project.slides.map((s, k) => (
                  <div key={s.id} className="shrink-0" style={{ width: W }}>
                    <ScaledSlide width={W} slide={s} doc={project} index={k} total={n} />
                  </div>
                ))}
              </motion.div>
              <span className="absolute top-3 right-3 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur">
                {i + 1}/{n}
              </span>
            </div>
            {platform === "instagram" ? (
              <div className="h-[92px] shrink-0 px-4 pt-3">
                <div className="flex items-center gap-4">
                  <Heart size={22} />
                  <MessageCircle size={22} />
                  <Send size={21} />
                  <div className="flex flex-1 justify-center gap-1">
                    {project.slides.map((s, k) => (
                      <span key={s.id} className={cn("h-1.5 w-1.5 rounded-full transition-colors", k === i ? "bg-sky-500" : "bg-white/30")} />
                    ))}
                  </div>
                  <div className="w-[62px]" />
                  <Bookmark size={21} />
                </div>
                <div className="mt-2.5 text-[12.5px]">
                  <b>{brand.handle.replace(/^@/, "")}</b> <span className="opacity-80">{project.name}</span>
                </div>
              </div>
            ) : (
              <div className="flex h-[44px] shrink-0 items-center justify-around bg-white px-4 text-[12px] font-medium text-black/60">
                <span className="flex items-center gap-1.5">
                  <ThumbsUp size={16} /> Like
                </span>
                <span className="flex items-center gap-1.5">
                  <MessageCircle size={16} /> Comment
                </span>
                <span className="flex items-center gap-1.5">
                  <Repeat2 size={16} /> Repost
                </span>
                <span className="flex items-center gap-1.5">
                  <Send size={16} /> Send
                </span>
              </div>
            )}
            {/* The rest of the feed, then the app's tab bar, so the screen is always full. */}
            <div className={cn("min-h-0 flex-1", platform === "instagram" ? "bg-black" : "bg-[#f4f2ee]")} />
            <div className={cn("flex h-[48px] shrink-0 items-center justify-around border-t px-6", platform === "instagram" ? "border-white/10 bg-black text-white/80" : "border-black/10 bg-white text-black/55")}>
              {[0, 1, 2, 3, 4].map((k) => (
                <span key={k} className={cn("h-5 w-5 rounded-md border-2 border-current", k === 0 && "bg-current")} />
              ))}
            </div>
          </div>
        </div>
        <button onClick={() => go(1)} disabled={i === n - 1} className="grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20 disabled:opacity-20">
          <ChevronRight size={20} />
        </button>
      </div>
      <p className="text-[12px] text-white/50">Drag, swipe or use ← → · Esc to close</p>
    </Shell>
  );
}

/* ============================================================== shortcuts */

const SHORTCUTS: [string, string[][]][] = [
  ["Create", [["Add text", "T"], ["Add rectangle", "R"], ["Add circle", "O"], ["New slide", "Ctrl", "Enter"], ["Duplicate", "Ctrl", "D"], ["Paste image", "Ctrl", "V"]]],
  ["Edit", [["Edit text", "Enter"], ["Finish editing", "Esc"], ["Undo", "Ctrl", "Z"], ["Redo", "Ctrl", "Shift", "Z"], ["Copy / cut", "Ctrl", "C / X"], ["Delete", "Del"]]],
  ["Arrange", [["Nudge", "↑ ↓ ← →"], ["Nudge ×10", "Shift", "Arrows"], ["Bring forward", "Ctrl", "]"], ["Send backward", "Ctrl", "["], ["Select all", "Ctrl", "A"], ["Duplicate while dragging", "Alt", "Drag"]]],
  ["Navigate", [["Previous / next slide", "← / →"], ["Zoom", "Ctrl", "Scroll"], ["Fit to screen", "Ctrl", "0"], ["Switch panels", "Alt", "1–9"], ["Preview", "P"], ["Export", "Ctrl", "E"]]],
];

function ShortcutsModal({ onClose }: { onClose: () => void }) {
  return (
    <Shell onClose={onClose} className="w-[760px] rounded-3xl bg-panel p-8 shadow-lg">
      <div className="mb-6 flex items-center justify-between">
        <h3 className="text-[22px] font-semibold tracking-tight">
          Keyboard <span className="font-serif font-normal italic text-accent">shortcuts</span>
        </h3>
        <CloseBtn onClose={onClose} />
      </div>
      <div className="grid grid-cols-2 gap-x-10 gap-y-7">
        {SHORTCUTS.map(([group, items]) => (
          <div key={group}>
            <div className="mb-2 font-mono text-[10.5px] tracking-[.14em] text-muted uppercase">{group}</div>
            <div className="flex flex-col">
              {items.map(([label, ...keys]) => (
                <div key={label} className="flex items-center justify-between border-b border-line py-2 text-[13px] last:border-0">
                  <span className="text-ink-2">{label}</span>
                  <span className="flex gap-1">
                    {keys.map((k) => (
                      <kbd key={k} className="kbd">
                        {k}
                      </kbd>
                    ))}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-6 text-[12px] text-muted">On a Mac, use ⌘ wherever Ctrl appears.</p>
    </Shell>
  );
}

/* =============================================================== settings */

function SettingsModal({ onClose }: { onClose: () => void }) {
  const project = useEditor((s) => s.project)!;
  const [keys, setKeys] = useState<Partial<Record<ProviderId, string>>>({});
  useEffect(() => setKeys(getKeys()), []);
  const keyed = useMemo(() => PROVIDERS.filter((p) => p.needsKey), []);
  return (
    <Shell onClose={onClose} className="w-[520px] rounded-3xl bg-panel p-7 shadow-lg">
      <div className="mb-5 flex items-center justify-between">
        <h3 className="text-[20px] font-semibold tracking-tight">Settings</h3>
        <CloseBtn onClose={onClose} />
      </div>
      <div className="mb-2 flex items-center gap-2 text-[13px] font-semibold">
        <KeyRound size={14} className="text-accent" /> Stock photo keys
      </div>
      <p className="mb-3 text-[12.5px] leading-relaxed text-muted">Optional. Openverse and Picsum work without keys. Keys are stored in this browser and are only sent to the provider.</p>
      <div className="flex flex-col gap-2">
        {keyed.map((p) => (
          <label key={p.id} className="flex items-center gap-3">
            <span className="w-20 text-[12.5px]">{p.name}</span>
            <input
              defaultValue={keys[p.id] ?? ""}
              key={keys[p.id] ?? "empty"}
              placeholder={`Paste your ${p.name} key`}
              onKeyDown={(e) => e.stopPropagation()}
              onBlur={(e) => {
                setKey(p.id, e.target.value);
                setKeys(getKeys());
              }}
              className="h-9 flex-1 rounded-lg bg-panel-2 px-3 font-mono text-[12px] outline-none focus:ring-2 focus:ring-accent/40"
            />
            <a href={p.keyUrl} target="_blank" rel="noreferrer" className="text-[11.5px] text-muted underline underline-offset-2 hover:text-accent">
              Get key
            </a>
          </label>
        ))}
      </div>
      <div className="my-6 h-px bg-line" />
      <div className="mb-2 flex items-center gap-2 text-[13px] font-semibold">
        <FileJson size={14} className="text-accent" /> Project file
      </div>
      <p className="mb-3 text-[12.5px] text-muted">Download this carousel as a portable .slyd.json file. Import it from the dashboard on any machine.</p>
      <button onClick={() => download(exportProjectFile(project), `${slug(project.name)}.slyd.json`)} className="h-9 rounded-xl bg-ink px-4 text-[13px] font-medium text-bg">
        Download project file
      </button>
      <div className="mt-7 flex items-center justify-between border-t border-line pt-4 text-[12px] text-muted">
        <StarButton label="Star Slyd" />
        <a href={tracked(AUTHOR.url, "editor-settings")} target="_blank" rel="author noopener" className="hover:text-accent">
          Built by <span className="text-ink-2">{AUTHOR.name}</span>
        </a>
      </div>
    </Shell>
  );
}
