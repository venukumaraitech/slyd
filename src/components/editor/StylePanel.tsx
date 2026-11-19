"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { Check, Moon, Plus, Star, Sun, Trash2, Wand2 } from "lucide-react";
import { CANVAS_FONTS, FONT_PAIRS, PALETTES, TEXTURES } from "@/lib/model/constants";
import { isDark, resolveColor, textureCSS } from "@/lib/model/resolve";
import { uid } from "@/lib/model/factory";
import { getPref, setPref } from "@/lib/storage";
import type { HighlightStyle, TextureKind, Theme } from "@/lib/model/types";
import { useEditor } from "@/store/editor";
import { ColorField, Row, Section, Select, Slider } from "@/components/ui/controls";
import { cn } from "@/components/ui/cn";
import { toast } from "@/components/ui/Toast";
import { HighlightGlyph } from "./Inspector";
import { TextureSwatch } from "./TextureSwatch";

/**
 * The whole carousel's look in one place: every control here changes all
 * slides at once, so people who never touch the canvas can still restyle
 * a carousel in a few clicks.
 */

type ColorKey = "bg" | "surface" | "ink" | "muted" | "accent";
const COLOR_ROWS: { k: ColorKey; label: string; hint: string }[] = [
  { k: "bg", label: "Background", hint: "Behind every slide" },
  { k: "ink", label: "Text", hint: "Headlines and body" },
  { k: "accent", label: "Accent", hint: "Highlights, numbers, buttons" },
  { k: "muted", label: "Soft text", hint: "Small labels and captions" },
  { k: "surface", label: "Cards", hint: "Boxes and panels" },
];

export interface SavedTheme {
  id: string;
  name: string;
  theme: Theme;
}

/* --------------------------------------------------- palette from one colour */

function hexToHsl(hex: string): [number, number, number] {
  const n = parseInt(hex.replace("#", "").padEnd(6, "0").slice(0, 6), 16);
  const r = ((n >> 16) & 255) / 255,
    g = ((n >> 8) & 255) / 255,
    b = (n & 255) / 255;
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}

function hsl(h: number, s: number, l: number) {
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const c = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(c * 255)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`.toUpperCase();
}

/** A full, readable palette built around one brand colour. */
export function paletteFrom(accent: string, dark: boolean): Pick<Theme, ColorKey> {
  const [h, s, l] = hexToHsl(accent);
  const tint = Math.min(s, 0.6);
  if (dark)
    return {
      bg: hsl(h, tint * 0.35, 0.07),
      surface: hsl(h, tint * 0.3, 0.12),
      ink: hsl(h, tint * 0.25, 0.95),
      muted: hsl(h, tint * 0.15, 0.62),
      accent: l < 0.45 ? hsl(h, s, 0.6) : accent.toUpperCase(),
    };
  return {
    bg: hsl(h, tint * 0.45, 0.95),
    surface: hsl(h, tint * 0.4, 0.9),
    ink: hsl(h, tint * 0.4, 0.1),
    muted: hsl(h, tint * 0.12, 0.42),
    accent: l > 0.62 ? hsl(h, s, 0.48) : accent.toUpperCase(),
  };
}

/* --------------------------------------------------------------------- UI */

function Swatch({ theme, active, size = "md" }: { theme: Pick<Theme, ColorKey>; active?: boolean; size?: "md" | "sm" }) {
  return (
    <span
      className={cn("relative block aspect-square w-full overflow-hidden rounded-xl ring-offset-2 ring-offset-panel transition-transform group-hover:scale-105", active ? "ring-2 ring-accent" : "ring-1 ring-line")}
      style={{ background: theme.bg }}
    >
      <span className={cn("absolute top-2 left-2 font-serif leading-none italic", size === "md" ? "text-[18px]" : "text-[14px]")} style={{ color: theme.ink }}>
        Aa
      </span>
      <span className="absolute right-2 bottom-2 h-3.5 w-3.5 rounded-full" style={{ background: theme.accent }} />
    </span>
  );
}

const sameColors = (a: Pick<Theme, ColorKey>, b: Pick<Theme, ColorKey>) => a.bg === b.bg && a.accent === b.accent && a.ink === b.ink;

export function StylePanel() {
  const project = useEditor((s) => s.project)!;
  const mutate = useEditor((s) => s.mutate);
  const theme = project.theme;
  const setTheme = (patch: Partial<Theme>, key?: string) => mutate((d) => void Object.assign(d.theme, patch), { key });

  const [saved, setSaved] = useState<SavedTheme[]>([]);
  const [myThemeId, setMyThemeId] = useState<string | null>(null);
  const [naming, setNaming] = useState<string | null>(null);
  const [seed, setSeed] = useState(theme.accent);

  useEffect(() => {
    getPref<SavedTheme[]>("savedThemes", []).then(setSaved);
    getPref<string | null>("myThemeId", null).then(setMyThemeId);
  }, []);

  const persist = (next: SavedTheme[]) => {
    setSaved(next);
    setPref("savedThemes", next);
  };
  const saveCurrent = () => {
    const name = (naming ?? "").trim() || `My theme ${saved.length + 1}`;
    const t: SavedTheme = { id: uid(), name, theme: { ...theme } };
    persist([t, ...saved]);
    setNaming(null);
    if (!myThemeId) makeDefault(t);
    toast.ok(`Saved “${name}”`);
  };
  const makeDefault = (t: SavedTheme) => {
    setMyThemeId(t.id);
    setPref("myThemeId", t.id);
    setPref("myTheme", t.theme);
  };
  const remove = (t: SavedTheme) => {
    persist(saved.filter((x) => x.id !== t.id));
    if (myThemeId === t.id) {
      setMyThemeId(null);
      setPref("myThemeId", null);
      setPref("myTheme", undefined);
    }
  };

  // Whole-carousel text and texture settings, read from what the slides use most.
  const texts = useMemo(() => project.slides.flatMap((s) => s.elements.filter((e) => e.type === "text")), [project.slides]);
  const highlight = useMemo(() => {
    const count = new Map<HighlightStyle, number>();
    for (const e of texts) if (e.type === "text") count.set(e.highlight.style, (count.get(e.highlight.style) ?? 0) + 1);
    return [...count.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  }, [texts]);
  const texture = project.slides[0]?.texture ?? { kind: "none" as TextureKind, opacity: 0.5 };
  const pair = FONT_PAIRS.find((p) => p.heading === theme.headingFont && p.body === theme.bodyFont);

  return (
    <div className="scroll-thin -mt-1 h-full overflow-y-auto pb-8">
      <p className="px-4 pb-1 text-[12.5px] leading-relaxed text-muted">Everything here changes all slides at once. Ctrl+Z undoes any change.</p>

      <Section title="Colour themes">
        <div className="grid grid-cols-4 gap-2">
          {PALETTES.map((p) => (
            <button key={p.id} onClick={() => setTheme(p.theme)} className="group flex flex-col items-center gap-1" title={p.name}>
              <Swatch theme={p.theme} active={sameColors(p.theme, theme)} />
              <span className={cn("text-[10.5px]", sameColors(p.theme, theme) ? "text-ink" : "text-muted")}>{p.name}</span>
            </button>
          ))}
        </div>
      </Section>

      <Section title="From your brand colour">
        <p className="-mt-1 text-[11.5px] leading-relaxed text-muted">Pick one colour and Slyd builds a matching, readable palette around it.</p>
        <Row>
          <label className="relative h-9 w-9 shrink-0 cursor-pointer overflow-hidden rounded-lg ring-1 ring-line" style={{ background: seed }} title="Choose a colour">
            <input type="color" value={seed} onChange={(e) => setSeed(e.target.value.toUpperCase())} className="absolute inset-0 cursor-pointer opacity-0" />
          </label>
          <input
            value={seed}
            onChange={(e) => /^#?[0-9a-f]{0,6}$/i.test(e.target.value) && setSeed(e.target.value.startsWith("#") ? e.target.value.toUpperCase() : `#${e.target.value.toUpperCase()}`)}
            className="h-9 w-[84px] rounded-lg bg-panel-2 px-2 font-mono text-[12px] outline-none focus:ring-2 focus:ring-accent"
            aria-label="Brand colour hex"
          />
          <button onClick={() => /^#[0-9A-F]{6}$/.test(seed) && setTheme(paletteFrom(seed, false))} className="flex h-9 flex-1 items-center justify-center gap-1 rounded-lg bg-panel-2 text-[12px] hover:bg-line" title="Light palette">
            <Sun size={13} /> Light
          </button>
          <button onClick={() => /^#[0-9A-F]{6}$/.test(seed) && setTheme(paletteFrom(seed, true))} className="flex h-9 flex-1 items-center justify-center gap-1 rounded-lg bg-ink text-[12px] text-bg hover:opacity-90" title="Dark palette">
            <Moon size={13} /> Dark
          </button>
        </Row>
      </Section>

      <Section title="Fine-tune colours" defaultOpen={false}>
        {COLOR_ROWS.map(({ k, label, hint }) => (
          <div key={k} className="flex items-center gap-3">
            <div className="w-[96px] shrink-0 leading-tight">
              <div className="text-[12px] text-ink-2">{label}</div>
              <div className="text-[10.5px] text-muted">{hint}</div>
            </div>
            <div className="min-w-0 flex-1">
              <ColorField value={theme[k]} theme={theme} onChange={(v) => setTheme({ [k]: resolveColor(v, theme) })} />
            </div>
          </div>
        ))}
      </Section>

      <Section
        title="My themes"
        action={
          naming === null && (
            <button onClick={() => setNaming("")} className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11.5px] font-medium text-accent hover:bg-accent-soft">
              <Plus size={12} /> Save current
            </button>
          )
        }
      >
        <AnimatePresence initial={false}>
          {naming !== null && (
            <motion.form
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              onSubmit={(e) => {
                e.preventDefault();
                saveCurrent();
              }}
              className="flex gap-1.5 overflow-hidden"
            >
              <input
                autoFocus
                value={naming}
                onChange={(e) => setNaming(e.target.value)}
                onKeyDown={(e) => e.key === "Escape" && setNaming(null)}
                placeholder="Name, e.g. My brand"
                maxLength={30}
                className="h-9 min-w-0 flex-1 rounded-lg bg-panel-2 px-3 text-[12.5px] outline-none focus:ring-2 focus:ring-accent"
              />
              <button type="submit" className="h-9 rounded-lg bg-ink px-3 text-[12px] font-medium text-bg">
                Save
              </button>
            </motion.form>
          )}
        </AnimatePresence>
        {saved.length === 0 && naming === null && (
          <p className="text-[11.5px] leading-relaxed text-muted">Save the colours and fonts you like to reuse them on any carousel. Your starred theme is also what AI agents use when you ask for “my theme”.</p>
        )}
        {saved.length > 0 && (
          <div className="grid grid-cols-4 gap-2">
            {saved.map((t) => (
              <div key={t.id} className="group/t relative flex flex-col items-center gap-1">
                <button onClick={() => setTheme(t.theme)} className="group w-full" title={`Apply ${t.name}`}>
                  <Swatch theme={t.theme} active={sameColors(t.theme, theme) && t.theme.headingFont === theme.headingFont} size="sm" />
                </button>
                <span className="w-full truncate text-center text-[10.5px] text-muted">{t.name}</span>
                <button
                  onClick={() => makeDefault(t)}
                  className={cn("absolute -top-1.5 -left-1.5 grid h-5 w-5 place-items-center rounded-full bg-panel shadow-sm", myThemeId === t.id ? "text-amber-500" : "text-muted opacity-0 group-hover/t:opacity-100")}
                  title={myThemeId === t.id ? "Your default theme" : "Make this your default theme"}
                >
                  <Star size={11} fill={myThemeId === t.id ? "currentColor" : "none"} />
                </button>
                <button onClick={() => remove(t)} className="absolute -top-1.5 -right-1.5 grid h-5 w-5 place-items-center rounded-full bg-panel text-muted opacity-0 shadow-sm group-hover/t:opacity-100 hover:text-red-500" title="Delete">
                  <Trash2 size={10} />
                </button>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Fonts">
        <div className="grid grid-cols-2 gap-1.5">
          {FONT_PAIRS.map((p) => (
            <button
              key={p.id}
              onClick={() => setTheme({ headingFont: p.heading, bodyFont: p.body })}
              className={cn("flex flex-col items-start rounded-xl p-2.5 text-left transition", pair?.id === p.id ? "bg-ink text-bg" : "bg-panel-2 hover:bg-line")}
            >
              <span style={{ fontFamily: `"${p.heading}"`, fontSize: 19, lineHeight: 1.1 }}>{p.name}</span>
              <span className="mt-0.5 text-[10.5px] opacity-60" style={{ fontFamily: `"${p.body}"` }}>
                {p.heading} + {p.body}
              </span>
            </button>
          ))}
        </div>
        <Row label="Headlines">
          <Select value={theme.headingFont} onChange={(v) => setTheme({ headingFont: v })} options={CANVAS_FONTS.map((f) => ({ value: f.family, label: f.family }))} renderOption={(o) => <span style={{ fontFamily: `"${o.value}"` }}>{o.label}</span>} />
        </Row>
        <Row label="Body">
          <Select value={theme.bodyFont} onChange={(v) => setTheme({ bodyFont: v })} options={CANVAS_FONTS.map((f) => ({ value: f.family, label: f.family }))} renderOption={(o) => <span style={{ fontFamily: `"${o.value}"` }}>{o.label}</span>} />
        </Row>
      </Section>

      <Section title="Highlighted words">
        <p className="-mt-1 text-[11.5px] leading-relaxed text-muted">
          Words wrapped in <code className="rounded bg-panel-2 px-1 font-mono text-ink">*asterisks*</code> stand out. Pick how, for every slide.
        </p>
        <div className="grid grid-cols-5 gap-1">
          {(["color", "italic", "marker", "underline", "pill"] as HighlightStyle[]).map((h) => (
            <button
              key={h}
              onClick={() =>
                mutate((d) => {
                  for (const s of d.slides) for (const e of s.elements) if (e.type === "text") e.highlight.style = h;
                })
              }
              className={cn("flex h-9 items-center justify-center rounded-lg text-[13px] font-semibold transition", highlight === h ? "bg-ink text-bg" : "bg-panel-2 hover:bg-line")}
              title={h[0].toUpperCase() + h.slice(1)}
            >
              <HighlightGlyph style={h} />
            </button>
          ))}
        </div>
      </Section>

      <Section title="Texture">
        <div className="grid grid-cols-4 gap-1.5">
          {TEXTURES.map((t) => (
            <button
              key={t.id}
              title={t.name}
              onClick={() =>
                mutate((d) => {
                  for (const s of d.slides) s.texture = { kind: t.id, opacity: s.texture.kind === "none" ? 0.5 : s.texture.opacity };
                })
              }
            >
              <TextureSwatch kind={t.id} active={texture.kind === t.id} theme={theme} label={t.name} />
            </button>
          ))}
        </div>
        {texture.kind !== "none" && (
          <Row label="Strength">
            <Slider
              value={texture.opacity}
              min={0.05}
              max={1}
              step={0.01}
              suffix="%"
              onChange={(v) =>
                mutate(
                  (d) => {
                    for (const s of d.slides) s.texture.opacity = v;
                  },
                  { key: "tex-all" },
                )
              }
            />
          </Row>
        )}
      </Section>

      <div className="px-4 pt-4">
        <button
          onClick={() => {
            const p = PALETTES[Math.floor(Math.random() * PALETTES.length)];
            const f = FONT_PAIRS[Math.floor(Math.random() * FONT_PAIRS.length)];
            setTheme({ ...p.theme, headingFont: f.heading, bodyFont: f.body });
          }}
          className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-panel-2 text-[12.5px] font-medium text-ink-2 hover:bg-line hover:text-ink"
        >
          <Wand2 size={14} /> Surprise me
        </button>
      </div>
    </div>
  );
}
