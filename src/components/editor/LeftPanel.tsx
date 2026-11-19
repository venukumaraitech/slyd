"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { BadgeCheck, Image as ImageIcon, LayoutTemplate, Palette, PanelsTopLeft, PenLine, Shapes, Type, Upload, Trash2, UserRound, Check } from "lucide-react";
import { ScaledSlide, VERIFIED_COLORS, VerifiedBadge } from "@/components/slide/SlideRenderer";
import { ICONS } from "@/components/slide/icons";
import { ColorField, Row, Segmented, Toggle } from "@/components/ui/controls";
import { cn } from "@/components/ui/cn";
import { toast } from "@/components/ui/Toast";
import { SLIDE_W, slideHeight } from "@/lib/model/constants";
import { heading, icon, kicker, shape, text, uid } from "@/lib/model/factory";
import { LAYOUTS, TEMPLATES, buildLayout, buildTemplateSlides, styleFromTemplateId } from "@/lib/model/templates";
import { defaultTheme } from "@/lib/model/factory";
import { isDark } from "@/lib/model/resolve";
import { fileToDataUrl } from "@/lib/image";
import { getPref, setPref } from "@/lib/storage";
import type { ShapeKind, Slide, SlideElement } from "@/lib/model/types";
import { useEditor, type LeftTab } from "@/store/editor";
import { PhotosPanel } from "./PhotosPanel";
import { StylePanel } from "./StylePanel";
import { WritePanel } from "./WritePanel";
import { DND_MIME, filesToPayloads, insertImage, setBackgroundImage, type ImagePayload } from "./insert";

const TABS: { id: LeftTab; icon: typeof Type; label: string; key: string }[] = [
  { id: "templates", icon: LayoutTemplate, label: "Templates", key: "1" },
  { id: "style", icon: Palette, label: "Style", key: "2" },
  { id: "write", icon: PenLine, label: "Write", key: "3" },
  { id: "layouts", icon: PanelsTopLeft, label: "Layouts", key: "4" },
  { id: "text", icon: Type, label: "Text", key: "5" },
  { id: "photos", icon: ImageIcon, label: "Photos", key: "6" },
  { id: "elements", icon: Shapes, label: "Elements", key: "7" },
  { id: "uploads", icon: Upload, label: "Uploads", key: "8" },
  { id: "brand", icon: BadgeCheck, label: "Brand", key: "9" },
];

export function LeftPanel() {
  const tab = useEditor((s) => s.leftTab);
  const setTab = useEditor((s) => s.setLeftTab);
  return (
    <div className="flex h-full shrink-0">
      <nav className="flex w-[72px] flex-col items-center gap-1 border-r border-line bg-panel py-3">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className="group relative flex w-[60px] flex-col items-center gap-1 rounded-xl py-2" title={`${t.label} (Alt+${t.key})`}>
            {tab === t.id && <motion.span layoutId="rail" className="absolute inset-0 rounded-xl bg-accent-soft" transition={{ type: "spring", stiffness: 500, damping: 38 }} />}
            <t.icon size={19} strokeWidth={1.75} className={cn("relative transition-colors", tab === t.id ? "text-accent" : "text-ink-2 group-hover:text-ink")} />
            <span className={cn("relative text-[10.5px] transition-colors", tab === t.id ? "font-medium text-ink" : "text-muted group-hover:text-ink-2")}>{t.label}</span>
          </button>
        ))}
      </nav>
      <div className="flex w-[300px] flex-col border-r border-line bg-panel">
        <div className="px-4 pt-4 pb-2">
          <h2 className="text-[15px] font-semibold tracking-tight">{TABS.find((t) => t.id === tab)?.label}</h2>
        </div>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 6, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -6, filter: "blur(4px)" }}
            transition={{ duration: 0.18 }}
            className="min-h-0 flex-1"
          >
            {tab === "templates" && <TemplatesPanel />}
            {tab === "style" && <StylePanel />}
            {tab === "write" && <WritePanel />}
            {tab === "layouts" && <LayoutsPanel />}
            {tab === "text" && <TextPanel />}
            {tab === "photos" && <PhotosPanel />}
            {tab === "elements" && <ElementsPanel />}
            {tab === "uploads" && <UploadsPanel />}
            {tab === "brand" && <BrandPanel />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

const Scroll = ({ children, className }: { children: React.ReactNode; className?: string }) => <div className={cn("scroll-thin h-full overflow-y-auto px-4 pb-8", className)}>{children}</div>;

/* -------------------------------------------------------------- templates */

function TemplatesPanel() {
  const project = useEditor((s) => s.project)!;
  const mutate = useEditor((s) => s.mutate);
  const [pending, setPending] = useState<string | null>(null);
  const previews = useMemo(() => TEMPLATES.map((t) => ({ t, slides: buildTemplateSlides(t, project.aspect) })), [project.aspect]);

  const applyStyle = (id: string) => {
    const t = TEMPLATES.find((x) => x.id === id)!;
    const th = defaultTheme(t.style.palette, t.style.pair);
    mutate((d) => {
      d.theme = th;
      d.templateId = t.id;
      d.slides.forEach((s, i) => {
        s.texture = { kind: t.style.texture, opacity: t.style.textureOpacity };
        if (s.background.kind !== "image") s.background = structuredClone(i === 0 || i === d.slides.length - 1 ? t.style.coverBg ?? t.style.bg ?? { kind: "solid", color: "$bg" } : t.style.bg ?? { kind: "solid", color: "$bg" });
      });
    });
    toast.ok(`${t.name} style applied`);
    setPending(null);
  };
  const replace = (id: string) => {
    const t = TEMPLATES.find((x) => x.id === id)!;
    const slides = buildTemplateSlides(t, project.aspect);
    mutate((d) => {
      d.theme = defaultTheme(t.style.palette, t.style.pair);
      d.templateId = t.id;
      d.slides = slides;
    });
    useEditor.getState().setActiveSlide(slides[0].id);
    toast.ok(`Replaced with ${t.name}. Ctrl+Z to undo.`);
    setPending(null);
  };

  return (
    <Scroll>
      <p className="mb-4 text-[12.5px] leading-relaxed text-muted">
        <b className="font-medium text-ink-2">Apply style</b> keeps your words and changes the look. <b className="font-medium text-ink-2">Replace</b> starts over with the template&apos;s slides.
      </p>
      <div className="grid grid-cols-2 gap-x-3 gap-y-5">
        {previews.map(({ t, slides }) => {
          const doc = { theme: defaultTheme(t.style.palette, t.style.pair), brand: project.brand, aspect: project.aspect };
          const active = project.templateId === t.id;
          return (
            <div key={t.id} className="relative">
              <button onClick={() => setPending(pending === t.id ? null : t.id)} className="group block w-full text-left">
                <div className={cn("overflow-hidden rounded-xl transition-all duration-300 group-hover:-translate-y-0.5", active ? "ring-2 ring-accent ring-offset-2 ring-offset-panel" : "shadow-[0_0_0_1px_var(--line)] group-hover:shadow-[0_12px_24px_-12px_rgb(0_0_0/.4),0_0_0_1px_var(--line-2)]")}>
                  <ScaledSlide width={128} slide={slides[0]} doc={doc} index={0} total={slides.length} />
                </div>
                <div className="mt-1.5 flex items-center gap-1 text-[12px] font-medium">
                  {t.name} {active && <Check size={12} className="text-accent" />}
                </div>
              </button>
              <AnimatePresence>
                {pending === t.id && (
                  <motion.div initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.92 }} className="absolute inset-x-1 top-1/2 z-10 flex -translate-y-1/2 flex-col gap-1 rounded-xl bg-panel p-1.5 shadow-lg">
                    <button onClick={() => applyStyle(t.id)} className="rounded-lg bg-ink px-2 py-1.5 text-[12px] font-medium text-bg">
                      Apply style
                    </button>
                    <button onClick={() => replace(t.id)} className="rounded-lg px-2 py-1.5 text-[12px] hover:bg-line">
                      Replace slides
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </Scroll>
  );
}

/* ---------------------------------------------------------------- layouts */

function LayoutsPanel() {
  const project = useEditor((s) => s.project)!;
  const addSlide = useEditor((s) => s.addSlide);
  const style = styleFromTemplateId(project.templateId);
  const previews = useMemo(() => LAYOUTS.map((l) => ({ l, slide: buildLayout(l.id, style, project.aspect) })), [style, project.aspect]);
  return (
    <Scroll>
      <p className="mb-4 text-[12.5px] text-muted">Adds a new slide after the current one, in your current theme.</p>
      <div className="grid grid-cols-2 gap-x-3 gap-y-4">
        {previews.map(({ l, slide }) => (
          <button key={l.id} onClick={() => addSlide(buildLayout(l.id, style, project.aspect))} className="group text-left">
            <div className="overflow-hidden rounded-xl shadow-[0_0_0_1px_var(--line)] transition-all duration-300 group-hover:-translate-y-0.5 group-hover:shadow-[0_12px_24px_-12px_rgb(0_0_0/.4),0_0_0_2px_var(--accent)]">
              <ScaledSlide width={128} slide={slide} doc={project} index={0} total={1} />
            </div>
            <div className="mt-1.5 text-[12px] font-medium">{l.name}</div>
            <div className="text-[11px] text-muted">{l.hint}</div>
          </button>
        ))}
      </div>
    </Scroll>
  );
}

/* ------------------------------------------------------------------- text */

function TextPanel() {
  const theme = useEditor((s) => s.project!.theme);
  const aspect = useEditor((s) => s.project!.aspect);
  const addElement = useEditor((s) => s.addElement);
  const mutate = useEditor((s) => s.mutate);
  const H = slideHeight(aspect);
  const add = (el: SlideElement) => addElement(el, { center: true });
  const presets: { label: string; make: () => SlideElement; style: React.CSSProperties }[] = [
    { label: "Add a heading", make: () => heading({ text: "Your *big* idea", w: 880, size: 110 }), style: { fontFamily: `"${theme.headingFont}"`, fontSize: 26, lineHeight: 1.05 } },
    { label: "Add a subheading", make: () => text({ text: "A supporting line that adds context", w: 820, size: 48, weight: 600, font: "$heading" }), style: { fontFamily: `"${theme.headingFont}"`, fontSize: 18, fontWeight: 600 } },
    { label: "Add body text", make: () => text({ text: "Keep it short. One idea per slide, two or three sentences at most.", w: 820, size: 38, lineHeight: 1.4 }), style: { fontFamily: `"${theme.bodyFont}"`, fontSize: 14 } },
    { label: "LABEL / KICKER", make: () => kicker({ text: "Part one", w: 600 }), style: { fontFamily: "JetBrains Mono", fontSize: 11, letterSpacing: ".14em" } },
  ];
  const combos: { label: string; make: () => SlideElement[] }[] = [
    {
      label: "Numbered point",
      make: () => [heading({ text: "01", x: 96, y: H * 0.18, size: 200, color: "$accent", w: 600 }), heading({ text: "Make one point *per slide.*", x: 96, y: H * 0.42, size: 84, w: 888 })],
    },
    {
      label: "Pill tag",
      make: () => [text({ text: "NEW", x: 96, y: 96, w: 180, size: 30, weight: 700, align: "center", color: "$bg", letterSpacing: 0.1, background: { color: "$ink", padding: 16, radius: 999 } })],
    },
    {
      label: "Swipe cue",
      make: () => [text({ text: "Swipe  →", x: SLIDE_W - 96 - 300, y: H - 240, w: 300, size: 32, weight: 600, align: "right", color: "$muted" })],
    },
    {
      label: "Highlighted quote",
      make: () => [heading({ text: "“Simplicity is the *ultimate* sophistication.”", x: 96, y: H * 0.3, size: 76, w: 888, italic: true, highlight: { style: "marker", color: "$accent" } }), kicker({ text: "— Leonardo da Vinci", x: 96, y: H * 0.3 + 300, w: 600 })],
    },
  ];
  return (
    <Scroll>
      <div className="flex flex-col gap-2">
        {presets.map((p) => (
          <button key={p.label} onClick={() => add(p.make())} className="rounded-xl bg-panel-2 px-4 py-3.5 text-left transition hover:bg-line hover:shadow-sm">
            <span style={p.style}>{p.label}</span>
          </button>
        ))}
      </div>
      <div className="mt-6 mb-2 text-[11px] font-semibold tracking-[.08em] text-muted uppercase">Combos</div>
      <div className="grid grid-cols-2 gap-2">
        {combos.map((c) => (
          <button
            key={c.label}
            onClick={() => {
              const els = c.make();
              mutate((d) => {
                const s = d.slides.find((x) => x.id === useEditor.getState().activeSlideId)!;
                s.elements.push(...els);
              });
              useEditor.getState().select(els.map((e) => e.id));
            }}
            className="rounded-xl bg-panel-2 px-3 py-3 text-left text-[12.5px] font-medium hover:bg-line"
          >
            {c.label}
          </button>
        ))}
      </div>
      <div className="mt-6 rounded-xl border border-dashed border-line-2 p-3 text-[12px] leading-relaxed text-muted">
        <b className="font-medium text-ink-2">Tip:</b> press <kbd className="kbd">T</kbd> to add text anywhere. Double-click to edit, and wrap words in <code className="font-mono text-ink">*asterisks*</code> to highlight them.
      </div>
    </Scroll>
  );
}

/* --------------------------------------------------------------- elements */

const SHAPES: { kind: ShapeKind; label: string; radius?: number }[] = [
  { kind: "rect", label: "Square", radius: 0 },
  { kind: "rect", label: "Rounded", radius: 48 },
  { kind: "ellipse", label: "Circle" },
  { kind: "triangle", label: "Triangle" },
  { kind: "star", label: "Star" },
  { kind: "blob", label: "Blob" },
  { kind: "line", label: "Line" },
  { kind: "arrow", label: "Arrow" },
];

function ShapeGlyph({ kind, radius }: { kind: ShapeKind; radius?: number }) {
  const c = "var(--ink-2)";
  if (kind === "rect") return <span className="block h-8 w-8" style={{ background: c, borderRadius: radius ? 9 : 2 }} />;
  if (kind === "ellipse") return <span className="block h-8 w-8 rounded-full" style={{ background: c }} />;
  if (kind === "line") return <span className="block h-0.75 w-9 rounded" style={{ background: c }} />;
  return (
    <svg viewBox="0 0 100 100" className="h-8 w-8" fill={kind === "arrow" ? "none" : c} stroke={kind === "arrow" ? c : "none"} strokeWidth={10} strokeLinecap="round" strokeLinejoin="round">
      {kind === "triangle" && <polygon points="50,6 96,94 4,94" />}
      {kind === "star" && <polygon points="50,2 61,37 98,37 68,59 79,95 50,73 21,95 32,59 2,37 39,37" />}
      {kind === "blob" && <path d="M78.6,17.1C88.4,25.5,96.1,37.9,95.7,50.4C95.3,62.9,86.8,75.4,75.4,84.1C64,92.8,49.7,97.6,36.6,94.2C23.5,90.8,11.6,79.2,6.6,65.4C1.6,51.6,3.5,35.6,11.6,24.3C19.7,13,34,6.4,48.3,5.7C62.6,5,68.8,8.7,78.6,17.1Z" />}
      {kind === "arrow" && (
        <>
          <line x1="8" y1="50" x2="90" y2="50" />
          <polyline points="66,26 90,50 66,74" />
        </>
      )}
    </svg>
  );
}

function ElementsPanel() {
  const addElement = useEditor((s) => s.addElement);
  return (
    <Scroll>
      <div className="mb-2 text-[11px] font-semibold tracking-[.08em] text-muted uppercase">Shapes</div>
      <div className="grid grid-cols-4 gap-2">
        {SHAPES.map((s) => (
          <button
            key={s.label}
            onClick={() => addElement(shape(s.kind, s.kind === "line" || s.kind === "arrow" ? { w: 400, h: 40 } : { radius: s.radius ?? 0 }), { center: true })}
            className="group flex aspect-square flex-col items-center justify-center gap-1.5 rounded-xl bg-panel-2 transition hover:bg-line"
            title={s.label}
          >
            <span className="transition-transform duration-300 group-hover:scale-110">
              <ShapeGlyph kind={s.kind} radius={s.radius} />
            </span>
          </button>
        ))}
      </div>
      <div className="mt-6 mb-2 text-[11px] font-semibold tracking-[.08em] text-muted uppercase">Icons</div>
      <div className="grid grid-cols-6 gap-1.5">
        {Object.entries(ICONS).map(([name, I]) => (
          <button key={name} onClick={() => addElement(icon(name), { center: true })} title={name} className="group grid aspect-square place-items-center rounded-lg bg-panel-2 transition hover:bg-line">
            <I size={18} strokeWidth={1.75} className="transition-transform duration-300 group-hover:scale-110" />
          </button>
        ))}
      </div>
    </Scroll>
  );
}

/* ---------------------------------------------------------------- uploads */

interface Upload {
  id: string;
  src: string;
  w: number;
  h: number;
}

function UploadsPanel() {
  const [items, setItems] = useState<Upload[]>([]);
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    getPref<Upload[]>("uploads", []).then(setItems);
  }, []);
  const persist = (next: Upload[]) => {
    setItems(next);
    setPref("uploads", next);
  };
  const addFiles = async (files: FileList | File[]) => {
    const ps = await filesToPayloads(files);
    if (!ps.length) return toast.error("Those files aren't images");
    const ups = ps.map((p) => ({ id: uid(), src: p.src, w: p.w, h: p.h }));
    persist([...ups, ...items]);
    toast.ok(`${ups.length} image${ups.length > 1 ? "s" : ""} added`);
  };
  return (
    <Scroll>
      <button
        onClick={() => input.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          addFiles(e.dataTransfer.files);
        }}
        className={cn("flex w-full flex-col items-center gap-2 rounded-2xl border-2 border-dashed py-8 transition-colors", over ? "border-accent bg-accent-soft" : "border-line-2 hover:border-muted")}
      >
        <motion.span animate={over ? { y: -4, scale: 1.1 } : { y: 0, scale: 1 }} className="grid h-11 w-11 place-items-center rounded-full bg-panel-2">
          <Upload size={18} />
        </motion.span>
        <span className="text-[13px] font-medium">Drop images or click to browse</span>
        <span className="text-[11.5px] text-muted">PNG, JPG, WebP, SVG · stays on this device</span>
      </button>
      <input ref={input} type="file" accept="image/*" multiple hidden onChange={(e) => e.target.files && addFiles(e.target.files)} />
      <p className="mt-3 text-[11.5px] text-muted">
        You can also paste an image with <kbd className="kbd">Ctrl</kbd> <kbd className="kbd">V</kbd> or drop one straight onto the canvas.
      </p>
      <div className="mt-4 grid grid-cols-2 gap-2">
        {items.map((u) => {
          const payload: ImagePayload = { src: u.src, w: u.w, h: u.h };
          return (
            <div
              key={u.id}
              draggable
              onDragStart={(e) => e.dataTransfer.setData(DND_MIME, JSON.stringify(payload))}
              onClick={() => insertImage(payload)}
              className="group relative cursor-pointer overflow-hidden rounded-xl bg-panel-2"
              style={{ aspectRatio: `${u.w}/${u.h}` }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={u.src} alt="" className="h-full w-full object-cover" />
              <div className="absolute inset-0 flex items-start justify-end gap-1 p-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setBackgroundImage(payload);
                  }}
                  className="rounded-md bg-white/90 px-1.5 py-0.5 text-[10.5px] text-black"
                >
                  BG
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    persist(items.filter((x) => x.id !== u.id));
                  }}
                  className="rounded-md bg-white/90 p-1 text-black"
                >
                  <Trash2 size={11} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </Scroll>
  );
}

/* ------------------------------------------------------------------ brand */

function BrandGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2.5 border-t border-line pt-4">
      <div className="text-[11px] font-semibold tracking-[.08em] text-muted uppercase">{title}</div>
      {children}
    </div>
  );
}

function BrandPanel() {
  const brand = useEditor((s) => s.project!.brand);
  const theme = useEditor((s) => s.project!.theme);
  const mutate = useEditor((s) => s.mutate);
  const input = useRef<HTMLInputElement>(null);
  const set = (patch: Partial<typeof brand>, key?: string) => mutate((d) => void Object.assign(d.brand, patch), { key });
  return (
    <Scroll>
      <div className="flex flex-col gap-4">
        <Toggle label="Show brand footer" checked={brand.enabled} onChange={(v) => set({ enabled: v })} />
        <div className={cn("flex flex-col gap-4 transition-opacity", !brand.enabled && "pointer-events-none opacity-40")}>
          <div className="flex items-center gap-3">
            <button onClick={() => input.current?.click()} className="group relative h-16 w-16 shrink-0 overflow-hidden rounded-full bg-panel-2 ring-1 ring-line" title="Upload avatar">
              {brand.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={brand.avatar} alt="" className="h-full w-full object-cover" />
              ) : (
                <UserRound size={22} className="mx-auto text-muted" />
              )}
              <span className="absolute inset-0 grid place-items-center bg-black/50 text-[10px] font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">Change</span>
            </button>
            <input
              ref={input}
              type="file"
              accept="image/*"
              hidden
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                const { src } = await fileToDataUrl(f, 256, 0.9);
                set({ avatar: src });
              }}
            />
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <input
                value={brand.name}
                onChange={(e) => set({ name: e.target.value }, "brand-name")}
                onKeyDown={(e) => e.stopPropagation()}
                placeholder="Name"
                className="h-8 rounded-lg bg-panel-2 px-2.5 text-[13px] font-medium outline-none focus:ring-2 focus:ring-accent/40"
              />
              <input
                value={brand.handle}
                onChange={(e) => set({ handle: e.target.value }, "brand-handle")}
                onKeyDown={(e) => e.stopPropagation()}
                placeholder="@handle"
                className="h-8 rounded-lg bg-panel-2 px-2.5 text-[13px] outline-none focus:ring-2 focus:ring-accent/40"
              />
            </div>
          </div>
          {brand.avatar && (
            <button onClick={() => set({ avatar: null })} className="-mt-2 self-start text-[11.5px] text-muted hover:text-red-500">
              Remove avatar
            </button>
          )}
          <Toggle label="Show @handle" checked={brand.showHandle !== false} onChange={(v) => set({ showHandle: v })} />

          <BrandGroup title="Verified badge">
            <Toggle label="Show a verified badge" checked={!!brand.verified} onChange={(v) => set({ verified: v })} />
            {brand.verified && (
              <div className="grid grid-cols-4 gap-1.5">
                {(["blue", "gold", "grey", "accent"] as const).map((c) => {
                  const col = c === "accent" ? theme.accent : VERIFIED_COLORS[c];
                  const on = (brand.verifiedColor ?? "blue") === c;
                  return (
                    <button
                      key={c}
                      onClick={() => set({ verifiedColor: c })}
                      className={cn("flex flex-col items-center gap-1 rounded-xl py-2 transition", on ? "bg-accent-soft ring-1 ring-accent/50" : "bg-panel-2 hover:bg-line")}
                    >
                      <VerifiedBadge size={22} color={col} check={c === "accent" && !isDark(col) ? "#111" : "#fff"} />
                      <span className={cn("text-[10.5px] capitalize", on ? "text-ink" : "text-muted")}>{c === "accent" ? "Theme" : c}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </BrandGroup>

          <BrandGroup title="Look">
            <Row label="Position">
              <Segmented layoutId="brand-pos" value={brand.position} onChange={(v) => set({ position: v })} options={[{ value: "top", label: "Top" }, { value: "bottom", label: "Bottom" }]} />
            </Row>
            <Row label="Size">
              <Segmented layoutId="brand-size" value={brand.size ?? "m"} onChange={(v) => set({ size: v })} options={[{ value: "s", label: "Small" }, { value: "m", label: "Medium" }, { value: "l", label: "Large" }]} />
            </Row>
            <Row label="Avatar">
              <Segmented
                layoutId="brand-shape"
                value={brand.avatarShape ?? "circle"}
                onChange={(v) => set({ avatarShape: v })}
                options={[
                  { value: "circle", label: <span className="block h-3.5 w-3.5 rounded-full bg-current" />, title: "Circle" },
                  { value: "rounded", label: <span className="block h-3.5 w-3.5 rounded-[4px] bg-current" />, title: "Rounded" },
                  { value: "square", label: <span className="block h-3.5 w-3.5 rounded-[1px] bg-current" />, title: "Square" },
                ]}
              />
            </Row>
            <Row label="Colour">
              <ColorField value={brand.color} theme={theme} onChange={(v) => set({ color: v })} />
            </Row>
          </BrandGroup>

          <BrandGroup title="Page counter">
            <Toggle label="Show the counter" checked={brand.showCounter} onChange={(v) => set({ showCounter: v })} />
            {brand.showCounter && (
              <Segmented
                layoutId="brand-counter"
                value={brand.counterStyle ?? "numbers"}
                onChange={(v) => set({ counterStyle: v })}
                options={[
                  { value: "numbers", label: "03 / 07" },
                  { value: "fraction", label: "3/7" },
                  { value: "dots", label: "•••" },
                  { value: "bar", label: "Bar" },
                ]}
              />
            )}
          </BrandGroup>

          <BrandGroup title="Swipe hint">
            <Toggle label="Show on every slide but the last" checked={brand.showArrow} onChange={(v) => set({ showArrow: v })} />
            {brand.showArrow && (
              <Segmented
                layoutId="brand-arrow"
                value={brand.arrowStyle ?? "circle"}
                onChange={(v) => set({ arrowStyle: v })}
                options={[
                  { value: "circle", label: "◯ →", title: "Arrow in a circle" },
                  { value: "plain", label: "→", title: "Arrow" },
                  { value: "swipe", label: "Swipe →", title: "Swipe text" },
                ]}
              />
            )}
          </BrandGroup>
        </div>
        <button
          onClick={async () => {
            await setPref("brand", brand);
            toast.ok("Saved. New carousels will start with this brand.");
          }}
          className="mt-2 h-9 rounded-xl bg-ink text-[13px] font-medium text-bg transition hover:opacity-90"
        >
          Save as my default brand
        </button>
        <p className="text-[11.5px] leading-relaxed text-muted">To hide the footer on one slide (a cover, say), deselect everything and switch it off under Slide.</p>
      </div>
    </Scroll>
  );
}

export type { Slide };
