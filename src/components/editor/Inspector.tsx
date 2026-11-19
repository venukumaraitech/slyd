"use client";

import { AnimatePresence, motion } from "motion/react";
import {
  AlignCenter,
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignEndVertical,
  AlignLeft,
  AlignRight,
  AlignStartHorizontal,
  AlignStartVertical,
  ArrowDownToLine,
  ArrowUpToLine,
  Copy,
  Eye,
  EyeOff,
  Image as ImageIcon,
  ImagePlus,
  Italic,
  Lock,
  Shapes,
  Trash2,
  Type,
  Unlock,
  CaseUpper,
  Smile,
  Wallpaper,
  ExternalLink,
  Palette,
} from "lucide-react";
import { CANVAS_FONTS, MESHES, TEXTURES } from "@/lib/model/constants";
import { IMAGE_FILTERS, backgroundCSS, fontFamilyName, isDark, resolveColor, textureCSS } from "@/lib/model/resolve";
import { safeSrc } from "@/lib/image";
import type { Background, HighlightStyle, ImageElement, ShapeElement, SlideElement, TextElement, TextureKind, Theme, IconElement } from "@/lib/model/types";
import { useActiveSlide, useEditor, useSelectedElements } from "@/store/editor";
import { ColorField, IconButton, NumberField, Row, Section, Segmented, Select, Slider, Toggle } from "@/components/ui/controls";
import { cn } from "@/components/ui/cn";
import { ICONS } from "@/components/slide/icons";
import { setBackgroundImage } from "./insert";
import { TextureSwatch } from "./TextureSwatch";

export function Inspector() {
  const selected = useSelectedElements();
  return (
    <aside className="scroll-thin flex h-full w-[296px] shrink-0 flex-col overflow-y-auto border-l border-line bg-panel">
      <AnimatePresence mode="wait" initial={false}>
        {selected.length ? (
          <motion.div key="el" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} transition={{ duration: 0.18 }}>
            <ElementInspector els={selected} />
          </motion.div>
        ) : (
          <motion.div key="slide" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} transition={{ duration: 0.18 }}>
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-panel px-4 py-3">
              <span className="text-[13px] font-semibold tracking-tight">This slide</span>
              <button
                onClick={() => useEditor.getState().setLeftTab("style")}
                className="flex items-center gap-1.5 rounded-lg bg-panel-2 px-2.5 py-1.5 text-[11.5px] font-medium text-ink-2 hover:bg-line hover:text-ink"
                title="Colours, fonts and textures for every slide"
              >
                <Palette size={13} className="text-accent" /> Style all slides
              </button>
            </div>
            <SlideInspector />
          </motion.div>
        )}
      </AnimatePresence>
    </aside>
  );
}

/* ================================================================ element */

const TYPE_META: Record<SlideElement["type"], { icon: typeof Type; name: string }> = {
  text: { icon: Type, name: "Text" },
  image: { icon: ImageIcon, name: "Image" },
  shape: { icon: Shapes, name: "Shape" },
  icon: { icon: Smile, name: "Icon" },
};

function ElementInspector({ els }: { els: SlideElement[] }) {
  const theme = useEditor((s) => s.project!.theme);
  const st = useEditor.getState;
  const el = els[0];
  const single = els.length === 1;
  const Meta = TYPE_META[el.type];
  const upd = (patch: Partial<SlideElement>, key?: string) => st().updateSelected((e) => void Object.assign(e, patch), key ?? `insp:${Object.keys(patch).join()}`);

  return (
    <div>
      <div className="flex items-center gap-2.5 border-b border-line px-4 py-3">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-accent-soft text-accent">
          <Meta.icon size={14} />
        </span>
        <span className="text-[13px] font-semibold">{single ? el.name || Meta.name : `${els.length} elements`}</span>
        <div className="ml-auto flex">
          <IconButton title={el.locked ? "Unlock" : "Lock"} onClick={() => upd({ locked: !el.locked })} active={el.locked}>
            {el.locked ? <Lock size={14} /> : <Unlock size={14} />}
          </IconButton>
          <IconButton title="Duplicate (Ctrl+D)" onClick={() => st().duplicateSelected()}>
            <Copy size={14} />
          </IconButton>
          <IconButton title="Delete (Del)" onClick={() => st().deleteSelected()} className="hover:bg-red-500/10 hover:text-red-500">
            <Trash2 size={14} />
          </IconButton>
        </div>
      </div>

      <Section title="Arrange">
        <div className="flex justify-between">
          <IconButton title="Align left" onClick={() => st().align("left")}><AlignStartVertical size={15} /></IconButton>
          <IconButton title="Centre horizontally" onClick={() => st().align("hcenter")}><AlignCenterVertical size={15} /></IconButton>
          <IconButton title="Align right" onClick={() => st().align("right")}><AlignEndVertical size={15} /></IconButton>
          <IconButton title="Align top" onClick={() => st().align("top")}><AlignStartHorizontal size={15} /></IconButton>
          <IconButton title="Centre vertically" onClick={() => st().align("vcenter")}><AlignCenterHorizontal size={15} /></IconButton>
          <IconButton title="Align bottom" onClick={() => st().align("bottom")}><AlignEndHorizontal size={15} /></IconButton>
        </div>
        <div className="flex gap-2">
          <button onClick={() => st().layer("front")} className="flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg bg-panel-2 text-[12px] hover:bg-line" title="Bring to front (Ctrl+Shift+])">
            <ArrowUpToLine size={13} /> Front
          </button>
          <button onClick={() => st().layer("back")} className="flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg bg-panel-2 text-[12px] hover:bg-line" title="Send to back (Ctrl+Shift+[)">
            <ArrowDownToLine size={13} /> Back
          </button>
        </div>
        {single && (
          <>
            <div className="grid grid-cols-2 gap-2">
              <NumberField label="X" value={el.x} onChange={(v) => upd({ x: v }, "pos")} />
              <NumberField label="Y" value={el.y} onChange={(v) => upd({ y: v }, "pos")} />
              <NumberField label="W" value={el.w} min={4} onChange={(v) => upd({ w: v }, "size")} />
              {el.type !== "text" ? (
                <NumberField label="H" value={el.h} min={4} onChange={(v) => upd({ h: v }, "size")} />
              ) : (
                <NumberField label="↻" suffix="°" value={el.rotation} min={-180} max={180} onChange={(v) => upd({ rotation: v }, "rot")} />
              )}
            </div>
            {el.type !== "text" && <NumberField label="↻" suffix="°" value={el.rotation} min={-180} max={180} onChange={(v) => upd({ rotation: v }, "rot")} />}
          </>
        )}
        <Row label="Opacity">
          <Slider value={el.opacity} min={0} max={1} step={0.01} suffix="%" onChange={(v) => upd({ opacity: v }, "opacity")} />
        </Row>
      </Section>

      {single && el.type === "text" && <TextProps el={el} theme={theme} />}
      {single && el.type === "image" && <ImageProps el={el} theme={theme} />}
      {single && el.type === "shape" && <ShapeProps el={el} theme={theme} />}
      {single && el.type === "icon" && <IconProps el={el} theme={theme} />}
    </div>
  );
}

const WEIGHTS = [
  { value: "300", label: "Light" },
  { value: "400", label: "Regular" },
  { value: "500", label: "Medium" },
  { value: "600", label: "Semibold" },
  { value: "700", label: "Bold" },
  { value: "800", label: "Extrabold" },
  { value: "900", label: "Black" },
];

function TextProps({ el, theme }: { el: TextElement; theme: Theme }) {
  const upd = (patch: Partial<TextElement>, key?: string) => useEditor.getState().updateElement(el.id, patch, key);
  const fontOptions = [
    { value: "$heading", label: `Heading · ${theme.headingFont}` },
    { value: "$body", label: `Body · ${theme.bodyFont}` },
    ...CANVAS_FONTS.map((f) => ({ value: f.family, label: f.family })),
  ];
  return (
    <>
      <Section title="Typography">
        <Select
          value={el.font}
          onChange={(v) => upd({ font: v })}
          options={fontOptions}
          renderOption={(o) => <span style={{ fontFamily: `"${fontFamilyName(o.value, theme)}"`, fontSize: 14 }}>{o.label}</span>}
        />
        <div className="flex gap-2">
          <NumberField label="Size" value={el.size} min={8} max={600} onChange={(v) => upd({ size: v }, `size:${el.id}`)} />
          <Select value={String(el.weight)} onChange={(v) => upd({ weight: +v })} options={WEIGHTS} />
        </div>
        <Row label="Colour">
          <ColorField value={el.color} theme={theme} onChange={(v) => upd({ color: v })} />
        </Row>
        <div className="flex gap-2">
          <Segmented
            layoutId={`align-${el.id}`}
            value={el.align}
            onChange={(v) => upd({ align: v })}
            options={[
              { value: "left", label: <AlignLeft size={14} />, title: "Left" },
              { value: "center", label: <AlignCenter size={14} />, title: "Centre" },
              { value: "right", label: <AlignRight size={14} />, title: "Right" },
            ]}
          />
          <IconButton title="Italic" active={el.italic} onClick={() => upd({ italic: !el.italic })} className="bg-panel-2">
            <Italic size={14} />
          </IconButton>
          <IconButton title="Uppercase" active={el.uppercase} onClick={() => upd({ uppercase: !el.uppercase })} className="bg-panel-2">
            <CaseUpper size={15} />
          </IconButton>
        </div>
        <Row label="Line height">
          <Slider value={el.lineHeight} min={0.7} max={2.4} step={0.01} format={(v) => v.toFixed(2)} onChange={(v) => upd({ lineHeight: v }, `lh:${el.id}`)} />
        </Row>
        <Row label="Tracking">
          <Slider value={el.letterSpacing} min={-0.1} max={0.4} step={0.005} format={(v) => (v * 100).toFixed(0)} onChange={(v) => upd({ letterSpacing: v }, `ls:${el.id}`)} />
        </Row>
      </Section>
      <Section title="Highlight">
        <p className="-mt-1 text-[11.5px] leading-relaxed text-muted">
          Wrap words in <code className="rounded bg-panel-2 px-1 font-mono text-ink">*asterisks*</code> to highlight them.
        </p>
        <div className="grid grid-cols-5 gap-1">
          {(["color", "italic", "marker", "underline", "pill"] as HighlightStyle[]).map((h) => (
            <button
              key={h}
              onClick={() => upd({ highlight: { ...el.highlight, style: h } })}
              className={cn("flex h-9 items-center justify-center rounded-lg text-[13px] font-semibold capitalize transition", el.highlight.style === h ? "bg-ink text-bg" : "bg-panel-2 hover:bg-line")}
              title={h}
            >
              <HighlightGlyph style={h} />
            </button>
          ))}
        </div>
        <Row label="Colour">
          <ColorField value={el.highlight.color} theme={theme} onChange={(v) => upd({ highlight: { ...el.highlight, color: v } })} />
        </Row>
      </Section>
      <Section title="Label background" defaultOpen={!!el.background}>
        <Toggle label="Background box" checked={!!el.background} onChange={(v) => upd({ background: v ? { color: "$accent", padding: 18, radius: 12 } : null })} />
        {el.background && (
          <>
            <Row label="Fill">
              <ColorField value={el.background.color} theme={theme} onChange={(v) => upd({ background: { ...el.background!, color: v } })} />
            </Row>
            <Row label="Padding">
              <Slider value={el.background.padding} min={0} max={80} onChange={(v) => upd({ background: { ...el.background!, padding: v } }, `bgp:${el.id}`)} />
            </Row>
            <Row label="Radius">
              <Slider value={el.background.radius} min={0} max={80} onChange={(v) => upd({ background: { ...el.background!, radius: v } }, `bgr:${el.id}`)} />
            </Row>
          </>
        )}
      </Section>
    </>
  );
}

export function HighlightGlyph({ style }: { style: HighlightStyle }) {
  switch (style) {
    case "color":
      return <span className="text-accent">Aa</span>;
    case "italic":
      return <span className="font-serif text-[16px] font-normal italic">Aa</span>;
    case "marker":
      return <span style={{ backgroundImage: "linear-gradient(transparent 55%, var(--accent) 55%)" }}>Aa</span>;
    case "underline":
      return <span className="underline decoration-accent decoration-2 underline-offset-2">Aa</span>;
    case "pill":
      return <span className="rounded-full bg-accent px-1 text-accent-ink">Aa</span>;
  }
}

function ImageProps({ el, theme }: { el: ImageElement; theme: Theme }) {
  const upd = (patch: Partial<ImageElement>, key?: string) => useEditor.getState().updateElement(el.id, patch, key);
  return (
    <>
      <Section title="Image">
        <Segmented
          layoutId={`fit-${el.id}`}
          value={el.fit}
          onChange={(v) => upd({ fit: v })}
          options={[
            { value: "cover", label: "Fill" },
            { value: "contain", label: "Fit" },
          ]}
        />
        {el.fit === "cover" && (
          <>
            <Row label="Focus X">
              <Slider value={el.focus?.x ?? 50} min={0} max={100} suffix="%" onChange={(v) => upd({ focus: { x: v, y: el.focus?.y ?? 50 } }, `fx:${el.id}`)} />
            </Row>
            <Row label="Focus Y">
              <Slider value={el.focus?.y ?? 50} min={0} max={100} suffix="%" onChange={(v) => upd({ focus: { x: el.focus?.x ?? 50, y: v } }, `fy:${el.id}`)} />
            </Row>
            <p className="-mt-1 text-[11.5px] text-muted">Tip: double-click the photo on the canvas and drag to reposition it.</p>
          </>
        )}
        <Row label="Corners">
          <Slider value={el.radius} min={0} max={Math.round(Math.min(el.w, el.h) / 2)} onChange={(v) => upd({ radius: v }, `rad:${el.id}`)} />
        </Row>
        <Toggle label="Drop shadow" checked={!!el.shadow} onChange={(v) => upd({ shadow: v })} />
        <Toggle label="Border" checked={!!el.border} onChange={(v) => upd({ border: v ? { width: 8, color: "$bg" } : null })} />
        {el.border && (
          <>
            <Row label="Colour">
              <ColorField value={el.border.color} theme={theme} onChange={(v) => upd({ border: { ...el.border!, color: v } })} />
            </Row>
            <Row label="Width">
              <Slider value={el.border.width} min={1} max={40} onChange={(v) => upd({ border: { ...el.border!, width: v } }, `bw:${el.id}`)} />
            </Row>
          </>
        )}
        <div className="flex gap-2">
          <button onClick={() => useEditor.getState().setLeftTab("photos")} className="flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg bg-panel-2 text-[12px] hover:bg-line" title="Drop a photo on this image to replace it">
            <ImagePlus size={13} /> Replace
          </button>
          <button
            onClick={() => {
              setBackgroundImage({ src: el.src, w: el.w, h: el.h, credit: el.credit });
              useEditor.getState().deleteSelected();
            }}
            className="flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg bg-panel-2 text-[12px] hover:bg-line"
          >
            <Wallpaper size={13} /> Make background
          </button>
        </div>
      </Section>
      <Section title="Filter">
        <div className="grid grid-cols-4 gap-1.5">
          {Object.entries(IMAGE_FILTERS).map(([id, f]) => (
            <button key={id} onClick={() => upd({ filter: id as ImageElement["filter"] })} className="group flex flex-col items-center gap-1">
              <span className={cn("block aspect-square w-full overflow-hidden rounded-lg ring-offset-2 ring-offset-panel transition", el.filter === id ? "ring-2 ring-accent" : "ring-1 ring-line")}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={safeSrc(el.src, 200)} alt="" crossOrigin="anonymous" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" style={{ filter: f.css }} />
              </span>
              <span className={cn("text-[10.5px]", el.filter === id ? "text-ink" : "text-muted")}>{f.name}</span>
            </button>
          ))}
        </div>
      </Section>
      {el.credit && <CreditCard credit={el.credit} />}
    </>
  );
}

function CreditCard({ credit }: { credit: NonNullable<ImageElement["credit"]> }) {
  return (
    <Section title="Credit">
      <div className="rounded-lg bg-panel-2 p-2.5 text-[12px] leading-relaxed text-ink-2">
        Photo by{" "}
        {credit.authorUrl ? (
          <a href={credit.authorUrl} target="_blank" rel="noreferrer" className="font-medium text-ink underline decoration-line-2 underline-offset-2 hover:decoration-accent">
            {credit.author}
          </a>
        ) : (
          <span className="font-medium text-ink">{credit.author}</span>
        )}{" "}
        on {credit.provider}
        {credit.license && <div className="mt-0.5 text-[11px] text-muted">{credit.license}</div>}
        {credit.sourceUrl && (
          <a href={credit.sourceUrl} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-[11px] text-muted hover:text-accent">
            Source <ExternalLink size={10} />
          </a>
        )}
      </div>
    </Section>
  );
}

function ShapeProps({ el, theme }: { el: ShapeElement; theme: Theme }) {
  const upd = (patch: Partial<ShapeElement>, key?: string) => useEditor.getState().updateElement(el.id, patch, key);
  const isLine = el.shape === "line" || el.shape === "arrow";
  return (
    <Section title="Shape">
      {!isLine && (
        <Row label="Fill">
          <ColorField value={el.fill} theme={theme} allowNone onChange={(v) => upd({ fill: v })} />
        </Row>
      )}
      <Row label="Stroke">
        <ColorField value={el.stroke} theme={theme} onChange={(v) => upd({ stroke: v })} />
      </Row>
      <Row label="Width">
        <Slider value={el.strokeWidth} min={0} max={40} onChange={(v) => upd({ strokeWidth: v }, `sw:${el.id}`)} />
      </Row>
      {el.shape === "rect" && (
        <Row label="Corners">
          <Slider value={el.radius} min={0} max={Math.round(Math.min(el.w, el.h) / 2)} onChange={(v) => upd({ radius: v }, `rad:${el.id}`)} />
        </Row>
      )}
    </Section>
  );
}

function IconProps({ el, theme }: { el: IconElement; theme: Theme }) {
  const upd = (patch: Partial<IconElement>, key?: string) => useEditor.getState().updateElement(el.id, patch, key);
  return (
    <Section title="Icon">
      <Row label="Colour">
        <ColorField value={el.color} theme={theme} onChange={(v) => upd({ color: v })} />
      </Row>
      <Row label="Stroke">
        <Slider value={el.strokeWidth} min={0.5} max={4} step={0.25} format={(v) => v.toFixed(2)} onChange={(v) => upd({ strokeWidth: v }, `isw:${el.id}`)} />
      </Row>
      <div className="grid grid-cols-7 gap-1">
        {Object.entries(ICONS).map(([name, I]) => (
          <button key={name} title={name} onClick={() => upd({ icon: name })} className={cn("grid aspect-square place-items-center rounded-lg transition", el.icon === name ? "bg-ink text-bg" : "hover:bg-line")}>
            <I size={16} />
          </button>
        ))}
      </div>
    </Section>
  );
}

/* ================================================================== slide */

function SlideInspector() {
  const slide = useActiveSlide()!;
  const theme = useEditor((s) => s.project!.theme);
  const mutate = useEditor((s) => s.mutate);
  const setSlide = (fn: (s: typeof slide) => void, key?: string) =>
    mutate(
      (d) => {
        const s = d.slides.find((x) => x.id === slide.id)!;
        fn(s as typeof slide);
      },
      { key },
    );
  const bg = slide.background;

  const switchKind = (k: Background["kind"]) => {
    if (k === bg.kind) return;
    const next: Background =
      k === "solid"
        ? { kind: "solid", color: "$bg" }
        : k === "gradient"
          ? { kind: "gradient", from: "$bg", to: "$accent", angle: 160 }
          : k === "mesh"
            ? { kind: "mesh", preset: "themed" }
            : { kind: "image", src: "https://picsum.photos/id/1036/1600/2000", overlay: "#000000", overlayOpacity: 0.35, blur: 0 };
    setSlide((s) => void (s.background = next));
  };

  return (
    <div>
      <Section title="Background">
        <Segmented
          layoutId="bg-kind"
          value={bg.kind}
          onChange={switchKind}
          options={[
            { value: "solid", label: "Solid" },
            { value: "gradient", label: "Gradient" },
            { value: "mesh", label: "Mesh" },
            { value: "image", label: "Photo" },
          ]}
        />
        {bg.kind === "solid" && (
          <Row label="Colour">
            <ColorField value={bg.color} theme={theme} onChange={(v) => setSlide((s) => void ((s.background as typeof bg).color = v))} />
          </Row>
        )}
        {bg.kind === "gradient" && (
          <>
            <Row label="From">
              <ColorField value={bg.from} theme={theme} onChange={(v) => setSlide((s) => void ((s.background as typeof bg).from = v))} />
            </Row>
            <Row label="To">
              <ColorField value={bg.to} theme={theme} onChange={(v) => setSlide((s) => void ((s.background as typeof bg).to = v))} />
            </Row>
            <Row label="Angle">
              <Slider value={bg.angle} min={0} max={360} suffix="°" onChange={(v) => setSlide((s) => void ((s.background as typeof bg).angle = v), "bg-angle")} />
            </Row>
          </>
        )}
        {bg.kind === "mesh" && (
          <div className="grid grid-cols-3 gap-1.5">
            {Object.entries(MESHES).map(([id, m]) => (
              <button key={id} onClick={() => setSlide((s) => void ((s.background as typeof bg).preset = id))} className="flex flex-col items-center gap-1">
                <span className={cn("block aspect-4/5 w-full rounded-lg ring-offset-2 ring-offset-panel", bg.preset === id ? "ring-2 ring-accent" : "ring-1 ring-line")} style={backgroundCSS({ kind: "mesh", preset: id }, theme)} />
                <span className="text-[10.5px] text-muted">{m.name}</span>
              </button>
            ))}
          </div>
        )}
        {bg.kind === "image" && (
          <>
            <div className="relative overflow-hidden rounded-lg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={safeSrc(bg.src, 400)} alt="" crossOrigin="anonymous" className="aspect-video w-full object-cover" />
              <button onClick={() => useEditor.getState().setLeftTab("photos")} className="absolute right-2 bottom-2 rounded-md bg-black/60 px-2 py-1 text-[11px] text-white backdrop-blur hover:bg-black/80">
                Change photo
              </button>
            </div>
            <Row label="Overlay">
              <ColorField value={bg.overlay} theme={theme} onChange={(v) => setSlide((s) => void ((s.background as typeof bg).overlay = v))} />
            </Row>
            <Row label="Darken">
              <Slider value={bg.overlayOpacity} min={0} max={1} step={0.01} suffix="%" onChange={(v) => setSlide((s) => void ((s.background as typeof bg).overlayOpacity = v), "bg-ov")} />
            </Row>
            <Row label="Blur">
              <Slider value={bg.blur} min={0} max={40} onChange={(v) => setSlide((s) => void ((s.background as typeof bg).blur = v), "bg-blur")} />
            </Row>
            <Row label="Focus X">
              <Slider value={bg.focus?.x ?? 50} min={0} max={100} suffix="%" onChange={(v) => setSlide((s) => void ((s.background as typeof bg).focus = { x: v, y: bg.focus?.y ?? 50 }), "bg-fx")} />
            </Row>
            <Row label="Focus Y">
              <Slider value={bg.focus?.y ?? 50} min={0} max={100} suffix="%" onChange={(v) => setSlide((s) => void ((s.background as typeof bg).focus = { x: bg.focus?.x ?? 50, y: v }), "bg-fy")} />
            </Row>
            {bg.credit && <CreditCard credit={bg.credit} />}
          </>
        )}
        <button
          onClick={() =>
            mutate((d) => {
              d.slides.forEach((s) => {
                s.background = structuredClone(bg);
                s.texture = { ...slide.texture };
              });
            })
          }
          className="h-8 rounded-lg bg-panel-2 text-[12px] text-ink-2 hover:bg-line hover:text-ink"
        >
          Apply background to all slides
        </button>
      </Section>

      <Section title="Texture">
        <div className="grid grid-cols-4 gap-1.5">
          {TEXTURES.map((t) => (
            <button key={t.id} onClick={() => setSlide((s) => void (s.texture.kind = t.id as TextureKind))} title={t.name}>
              <TextureSwatch kind={t.id} active={slide.texture.kind === t.id} theme={theme} label={t.name} />
            </button>
          ))}
        </div>
        {slide.texture.kind !== "none" && (
          <Row label="Intensity">
            <Slider value={slide.texture.opacity} min={0.05} max={1} step={0.01} suffix="%" onChange={(v) => setSlide((s) => void (s.texture.opacity = v), "tex-op")} />
          </Row>
        )}
      </Section>

      <Section title="This slide">
        <Toggle label="Hide brand footer here" checked={!!slide.hideBrand} onChange={(v) => setSlide((s) => void (s.hideBrand = v))} />
      </Section>

      <Layers />
    </div>
  );
}

function Layers() {
  const slide = useActiveSlide()!;
  const selectedIds = useEditor((s) => s.selectedIds);
  const select = useEditor((s) => s.select);
  const updateElement = useEditor((s) => s.updateElement);
  const theme = useEditor((s) => s.project!.theme);
  const els = [...slide.elements].reverse();
  return (
    <Section title={`Layers · ${els.length}`}>
      {els.length === 0 && <p className="text-[12px] text-muted">Nothing here yet. Add text, shapes or photos from the left.</p>}
      <div className="-mx-1 flex flex-col">
        {els.map((el) => {
          const M = TYPE_META[el.type];
          const label = el.name || (el.type === "text" ? el.text.replace(/\*/g, "").slice(0, 28) || "Text" : M.name);
          return (
            <div
              key={el.id}
              onClick={(e) => select([el.id], e.shiftKey ? "toggle" : "replace")}
              className={cn("group flex h-8 cursor-pointer items-center gap-2 rounded-lg px-2 text-[12.5px]", selectedIds.includes(el.id) ? "bg-accent-soft" : "hover:bg-line")}
            >
              <M.icon size={13} className="shrink-0 text-muted" style={el.type === "text" ? { color: resolveColor(el.color, theme) } : undefined} />
              <span className={cn("flex-1 truncate", el.hidden && "opacity-40")}>{label}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  updateElement(el.id, { hidden: !el.hidden });
                }}
                className={cn("text-muted hover:text-ink", !el.hidden && "opacity-0 group-hover:opacity-100")}
                title={el.hidden ? "Show" : "Hide"}
              >
                {el.hidden ? <EyeOff size={13} /> : <Eye size={13} />}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  updateElement(el.id, { locked: !el.locked });
                }}
                className={cn("text-muted hover:text-ink", !el.locked && "opacity-0 group-hover:opacity-100")}
                title={el.locked ? "Unlock" : "Lock"}
              >
                {el.locked ? <Lock size={13} /> : <Unlock size={13} />}
              </button>
            </div>
          );
        })}
      </div>
    </Section>
  );
}
