import { z } from "zod";
import { ASPECTS, CANVAS_FONTS, FONT_PAIRS, MESHES, PALETTES, SLIDE_W, TEXTURES } from "../model/constants";
import { ICON_NAMES } from "../model/iconNames";
import { TEMPLATES } from "../model/templates";
import type { AspectId, HighlightStyle, ImageFilter, ShapeKind, TextureKind } from "../model/types";

/**
 * The Carousel Spec: everything a person can do in the Slyd editor, expressed
 * as JSON an agent can write. Slyd compiles it onto real templates.
 *
 *  - Content first: pick a `layout` per slide and fill in the words.
 *  - Everything visual is optional and defaults to the template.
 *  - `*asterisks*` in any text highlight words in the accent style.
 *  - `photo` fields take an https URL *or* a few search words; Slyd finds a free stock photo.
 *  - `elements` add freeform text/images/shapes/icons at exact positions on a 1080px-wide canvas.
 */

const HL = "Words wrapped in *asterisks* are highlighted (1–3 per slide reads best).";
const PHOTO = "An https image URL, or 2–5 search words describing the photo (e.g. 'minimal desk at sunrise'); Slyd finds a free stock photo.";

const tuple = <T extends string>(xs: readonly T[]) => xs as unknown as [T, ...T[]];
export const TEMPLATE_IDS = tuple(TEMPLATES.map((t) => t.id));
export const PALETTE_IDS = tuple(PALETTES.map((p) => p.id));
export const FONT_PAIR_IDS = tuple(FONT_PAIRS.map((p) => p.id));
export const FONT_FAMILIES = tuple(CANVAS_FONTS.map((f) => f.family));
export const FORMAT_IDS = tuple(Object.keys(ASPECTS) as AspectId[]);
export const TEXTURE_IDS = tuple(TEXTURES.map((t) => t.id) as TextureKind[]);
export const MESH_IDS = tuple(Object.keys(MESHES));
export const HIGHLIGHT_IDS = tuple<HighlightStyle>(["color", "italic", "marker", "underline", "pill"]);
export const FILTER_IDS = tuple<ImageFilter>(["none", "mono", "noir", "warm", "cool", "fade", "punch"]);
export const SHAPE_IDS = tuple<ShapeKind>(["rect", "ellipse", "line", "arrow", "triangle", "star", "blob"]);
export const ICON_IDS = tuple(ICON_NAMES);

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use a 6-digit hex colour like #FF5A1F");
const TOKENS = ["bg", "surface", "ink", "muted", "accent"] as const;
/** A theme token (recolours with the palette) or a literal hex colour. */
export const ColorSpec = z
  .union([z.enum(TOKENS), hex])
  .describe("A theme colour (bg, surface, ink, muted, accent), which follows the palette, or a hex colour like #FF5A1F.");
const photo = z.string().min(2).max(600).describe(PHOTO);
const unit = z.number().min(0).max(1);

/* ------------------------------------------------------------- elements -- */

const box = {
  x: z.number().min(-1080).max(2160).describe(`Left edge in px. The canvas is ${SLIDE_W}px wide.`),
  y: z.number().min(-2000).max(4000).describe("Top edge in px. Canvas height: 1080 (1:1), 1350 (4:5), 1440 (3:4), 1920 (9:16), 608 (16:9)."),
  rotation: z.number().min(-180).max(180).optional().describe("Degrees."),
  opacity: unit.optional(),
};

const TextEl = z.object({
  type: z.literal("text"),
  text: z.string().min(1).max(600).describe(`The text. Use \\n for line breaks. ${HL}`),
  ...box,
  w: z.number().min(20).max(2160).optional().describe("Width in px (text wraps). Default 888."),
  size: z.number().min(10).max(400).optional().describe("Font size in px. Body ~36, subheading ~52, heading ~100."),
  font: z.union([z.enum(["heading", "body"]), z.enum(FONT_FAMILIES)]).optional().describe("'heading' or 'body' (follow the theme) or a font family."),
  weight: z.number().int().min(300).max(900).optional(),
  color: ColorSpec.optional(),
  align: z.enum(["left", "center", "right"]).optional(),
  italic: z.boolean().optional(),
  uppercase: z.boolean().optional(),
  lineHeight: z.number().min(0.7).max(2.5).optional(),
  letterSpacing: z.number().min(-0.1).max(0.5).optional().describe("In em, e.g. -0.02 or 0.12."),
  label: z.object({ color: ColorSpec, padding: z.number().min(0).max(80).optional(), radius: z.number().min(0).max(999).optional() }).optional().describe("Optional box behind the text (a tag or pill)."),
});

const ImageEl = z.object({
  type: z.literal("image"),
  photo: photo,
  ...box,
  w: z.number().min(20).max(2160),
  h: z.number().min(20).max(4000),
  radius: z.number().min(0).max(999).optional().describe("Corner radius in px."),
  fit: z.enum(["cover", "contain"]).optional(),
  filter: z.enum(FILTER_IDS).optional(),
  shadow: z.boolean().optional(),
  focus: z.object({ x: z.number().min(0).max(100), y: z.number().min(0).max(100) }).optional().describe("Which part of the photo stays visible when cropped, in % (50,50 = centre)."),
});

const ShapeEl = z.object({
  type: z.literal("shape"),
  shape: z.enum(SHAPE_IDS),
  ...box,
  w: z.number().min(2).max(2160),
  h: z.number().min(2).max(4000),
  fill: z.union([ColorSpec, z.literal("none")]).optional(),
  stroke: ColorSpec.optional(),
  strokeWidth: z.number().min(0).max(60).optional(),
  radius: z.number().min(0).max(999).optional().describe("Corner radius for rect."),
});

const IconEl = z.object({
  type: z.literal("icon"),
  icon: z.enum(ICON_IDS),
  ...box,
  size: z.number().min(16).max(800).optional().describe("Icon size in px. Default 160."),
  color: ColorSpec.optional(),
  strokeWidth: z.number().min(0.5).max(4).optional(),
});

export const ElementSpec = z.discriminatedUnion("type", [TextEl, ImageEl, ShapeEl, IconEl]);
export type ElementSpec = z.infer<typeof ElementSpec>;

/* --------------------------------------------------------------- slides -- */

export const BackgroundSpec = z
  .object({
    color: ColorSpec.optional().describe("Solid colour."),
    gradient: z.object({ from: ColorSpec, to: ColorSpec, angle: z.number().min(0).max(360).optional() }).optional(),
    mesh: z.enum(MESH_IDS).optional().describe(`Soft multi-colour mesh: ${MESH_IDS.join(", ")} ('themed' uses the palette).`),
    photo: photo.optional().describe(`Full-bleed background photo. ${PHOTO}`),
    darken: unit.optional().describe("Photo only: how strongly to wash the photo so text reads (0–1). Default 0.8 with the theme background colour; use with overlay 'black' for a dark cinematic look."),
    overlay: z.union([ColorSpec, z.literal("black"), z.literal("white")]).optional().describe("Photo only: wash colour. Default: the theme background."),
    blur: z.number().min(0).max(40).optional().describe("Photo only: blur in px."),
  })
  .describe("Optional slide background. Set one of color, gradient, mesh or photo.");

const common = {
  background: BackgroundSpec.optional(),
  texture: z.enum(TEXTURE_IDS).optional().describe("Texture override for this slide."),
  align: z.enum(["left", "center"]).optional().describe("Text alignment override for this slide's layout."),
  hideBrand: z.boolean().optional().describe("Hide the brand footer on this slide."),
  elements: z.array(ElementSpec).max(30).optional().describe("Extra freeform elements drawn on top of the layout."),
};

const cover = z.object({
  layout: z.literal("cover").describe("The hook slide, normally first."),
  kicker: z.string().max(40).optional().describe("Small label above the title, e.g. 'Founder lessons' or 'Part 1 of 3'."),
  title: z.string().min(1).max(110).describe(`The hook: a bold promise or tension in under ~10 words. ${HL}`),
  subtitle: z.string().max(140).optional().describe("One supporting line, e.g. what they get by swiping."),
  ...common,
});
const point = z.object({
  layout: z.literal("point").describe("One numbered idea per slide. Numbers are added automatically in order."),
  number: z.number().int().min(0).max(99).optional().describe("Override the auto number."),
  title: z.string().min(1).max(90).describe(`The idea in a short sentence. ${HL}`),
  body: z.string().max(280).optional().describe("2–3 short sentences that explain or prove the idea."),
  ...common,
});
const list = z.object({
  layout: z.literal("list").describe("A short checklist."),
  kicker: z.string().max(40).optional(),
  title: z.string().min(1).max(70).describe(`List heading. ${HL}`),
  items: z.array(z.string().min(1).max(64)).min(2).max(7).describe("2–7 short bullet items, ideally under 6 words each."),
  ...common,
});
const quote = z.object({
  layout: z.literal("quote").describe("A pull quote with attribution."),
  quote: z.string().min(1).max(180).describe(`The quote, without quotation marks (they're added). ${HL}`),
  author: z.string().max(60).optional().describe("Who said it."),
  ...common,
});
const photoSlide = z.object({
  layout: z.literal("photo").describe("A photo on top with a caption below."),
  photo: photo.describe(`The main photo. ${PHOTO}`),
  title: z.string().min(1).max(80).describe(`Caption headline. ${HL}`),
  body: z.string().max(200).optional(),
  ...common,
});
const stat = z.object({
  layout: z.literal("stat").describe("One big number that lands a point."),
  value: z.string().min(1).max(10).describe("The number, short: '3.1×', '87%', '$2M', '6h'."),
  label: z.string().min(1).max(110).describe("What the number means, in one sentence."),
  source: z.string().max(60).optional().describe("Optional source or footnote."),
  ...common,
});
const cta = z.object({
  layout: z.literal("cta").describe("The closing ask. Usually the last slide."),
  title: z.string().min(1).max(90).describe(`The ask, e.g. 'Found this useful? *Save it* for later.' ${HL}`),
  button: z.string().max(32).optional().describe("Button label, e.g. 'Follow for more →'."),
  ...common,
});
const blank = z.object({
  layout: z.literal("blank").describe("An empty slide for fully custom designs. Put content in `elements`."),
  ...common,
});

export const SlideSpec = z.discriminatedUnion("layout", [cover, point, list, quote, photoSlide, stat, cta, blank]);
export type SlideSpec = z.infer<typeof SlideSpec>;

/* -------------------------------------------------------------- project -- */

export const BrandSpec = z
  .object({
    name: z.string().max(40).optional().describe("Creator or company name in the footer."),
    handle: z.string().max(40).optional().describe("Social handle, e.g. '@avamakes'."),
    avatar: z.string().url().optional().describe("https URL of a square avatar/logo image."),
    show: z.boolean().optional().describe("Show the brand footer. Default true."),
    position: z.enum(["top", "bottom"]).optional(),
    counter: z.boolean().optional().describe("Show the '03 / 07' page counter. Default true."),
    arrow: z.boolean().optional().describe("Show the swipe arrow. Default true."),
    color: ColorSpec.optional().describe("Footer text colour."),
    verified: z.boolean().optional().describe("Show a verified badge next to the name."),
    badge: z.enum(["blue", "gold", "grey", "accent"]).optional().describe("Verified badge colour. Default blue; accent uses the theme accent."),
    avatarShape: z.enum(["circle", "rounded", "square"]).optional(),
    size: z.enum(["s", "m", "l"]).optional().describe("Footer size. Default m."),
    showHandle: z.boolean().optional().describe("Show the @handle under the name. Default true."),
    counterStyle: z.enum(["numbers", "fraction", "dots", "bar"]).optional().describe("Page counter look: '03 / 07', '3/7', dots or a progress bar."),
    arrowStyle: z.enum(["circle", "plain", "swipe"]).optional().describe("Swipe hint: arrow in a circle, plain arrow, or 'Swipe →' text."),
  })
  .describe("Optional. Anything omitted falls back to the user's saved brand kit in Slyd.");

export const CAROUSEL_ID = z
  .string()
  .regex(/^[A-Za-z0-9_-]{6,40}$/, "6–40 letters, digits, - or _")
  .describe("Carousel id. Carousels sharing an id are versions of the same carousel: opening a newer link updates the existing carousel in the user's browser instead of adding a copy.");

export const CarouselSpec = z.object({
  id: CAROUSEL_ID.optional(),
  title: z.string().max(80).optional().describe("Project name in Slyd. Defaults to the hook."),
  template: z.enum(TEMPLATE_IDS).optional().describe(`Visual style. ${TEMPLATES.map((t) => `${t.id}: ${t.description}`).join(" | ")}. Default: editorial.`),
  format: z.enum(FORMAT_IDS).optional().describe(`Slide size. ${FORMAT_IDS.map((f) => `${f} = ${ASPECTS[f].label} (${ASPECTS[f].hint})`).join("; ")}. Default 4:5.`),
  palette: z.enum(PALETTE_IDS).optional().describe(`Colour palette override: ${PALETTE_IDS.join(", ")}. Defaults to the template's.`),
  colors: z
    .object({ bg: hex.optional(), surface: hex.optional(), ink: hex.optional(), muted: hex.optional(), accent: hex.optional() })
    .optional()
    .describe("Exact theme colours (e.g. brand colours). Applied on top of the palette."),
  accent: hex.optional().describe("Shortcut for colors.accent."),
  fonts: z.enum(FONT_PAIR_IDS).optional().describe(`Font pair: ${FONT_PAIRS.map((f) => `${f.id} (${f.heading} + ${f.body})`).join(", ")}.`),
  headingFont: z.enum(FONT_FAMILIES).optional().describe("Exact heading font, overrides `fonts`."),
  bodyFont: z.enum(FONT_FAMILIES).optional().describe("Exact body font, overrides `fonts`."),
  myTheme: z.boolean().optional().describe("Use the colours and fonts the user saved as their own theme in Slyd, if they have one (falls back to the template's look). Explicit colors/fonts in this spec still apply on top."),
  highlight: z.enum(HIGHLIGHT_IDS).optional().describe("How *highlighted* words look: color, italic, marker (highlighter), underline, pill."),
  texture: z.enum(TEXTURE_IDS).optional().describe(`Texture on every slide: ${TEXTURE_IDS.join(", ")}.`),
  textureIntensity: unit.optional().describe("0–1. Default from the template."),
  align: z.enum(["left", "center"]).optional().describe("Text alignment for all layouts."),
  brand: BrandSpec.optional(),
  slides: z.array(SlideSpec).min(1).max(20).describe("The slides in order. Best results: 5–10 slides, cover first, cta last."),
  open: z.enum(["editor", "preview", "export"]).optional().describe("What the link opens: the editor (default), a phone preview, or the export dialog."),
});
export type CarouselSpec = z.infer<typeof CarouselSpec>;

/* ---------------------------------------------------------------- lint -- */

/** Friendly, non-blocking advice an agent can act on before sharing the link. */
export function lintSpec(spec: CarouselSpec): string[] {
  const w: string[] = [];
  const n = spec.slides.length;
  const words = (t?: string) => (t ? t.replace(/\*/g, "").trim().split(/\s+/).filter(Boolean).length : 0);
  if (spec.slides[0]?.layout !== "cover" && spec.slides[0]?.layout !== "blank") w.push("Start with a 'cover' slide. The first slide is the hook that earns the swipe.");
  if (n > 1 && !["cta", "blank"].includes(spec.slides[n - 1]?.layout)) w.push("Consider ending with a 'cta' slide (follow, save, share).");
  if (n < 3) w.push(`Only ${n} slide${n === 1 ? "" : "s"}. Carousels usually work best with 5–10.`);
  if (n > 12) w.push(`${n} slides is long. Most readers drop off after ~10.`);
  spec.slides.forEach((s, i) => {
    const at = `Slide ${i + 1} (${s.layout})`;
    if (s.layout === "cover" && words(s.title) > 12) w.push(`${at}: the hook is ${words(s.title)} words. Under 10 reads better on a phone.`);
    if ("body" in s && s.body && words(s.body) > 45) w.push(`${at}: body is ${words(s.body)} words. Trim to ~35 so it fits comfortably.`);
    if (s.layout === "list" && s.items.some((it) => words(it) > 8)) w.push(`${at}: some list items are long. Aim for under 6 words each.`);
    if (s.layout === "blank" && !s.elements?.length) w.push(`${at}: blank slide with no elements will be empty.`);
    const texts = [("title" in s && s.title) || "", ("quote" in s && s.quote) || "", ...(s.elements ?? []).map((e) => (e.type === "text" ? e.text : ""))];
    if (texts.some((t) => (t.match(/\*/g) || []).length % 2 === 1)) w.push(`${at}: unmatched * in the text. Highlights need an opening and closing asterisk.`);
    const bg = s.background;
    if (bg && [bg.color, bg.gradient, bg.mesh, bg.photo].filter(Boolean).length > 1) w.push(`${at}: background sets more than one of color/gradient/mesh/photo; the first one wins (photo > mesh > gradient > color).`);
  });
  return w;
}
