import { defaultBrand, defaultTheme, icon, image, newProject, shape, text } from "../model/factory";
import { TEMPLATES, buildLayout, type Style } from "../model/templates";
import type { Background, BrandKit, ColorRef, Project, Slide, SlideElement, Theme } from "../model/types";
import type { CarouselSpec, ElementSpec, SlideSpec } from "./schema";

/** A photo described by words rather than a URL, resolved in the browser after opening. */
export interface PendingPhoto {
  slideId: string;
  /** Element id, or "background" for the slide background. */
  target: string;
  query: string;
}

export const isUrl = (s: string) => /^https?:\/\//i.test(s.trim());

/** Deterministic, always-available stand-in until a real stock photo is found. */
export const placeholderPhoto = (query: string, w = 1600, h = 1200) =>
  `https://picsum.photos/seed/${encodeURIComponent(query.trim().toLowerCase().slice(0, 60))}/${w}/${h}`;

const TOKENS = new Set(["bg", "surface", "ink", "muted", "accent"]);
/** Spec colour → model colour ref ("accent" → "$accent", "black" → "#000000"). */
const col = (c: string | undefined): ColorRef | undefined => {
  if (!c) return undefined;
  if (TOKENS.has(c)) return `$${c}`;
  if (c === "black") return "#000000";
  if (c === "white") return "#FFFFFF";
  return c.toUpperCase();
};
const font = (f?: string) => (f === "heading" ? "$heading" : f === "body" ? "$body" : f);
/** Drop undefined keys so factory defaults survive. */
const clean = <T extends object>(o: T) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as Partial<T>;

export function compileSpec(spec: CarouselSpec, brandFallback?: BrandKit, savedTheme?: Theme): { project: Project; pending: PendingPhoto[] } {
  const template = TEMPLATES.find((t) => t.id === (spec.template ?? "editorial")) ?? TEMPLATES[0];
  const aspect = spec.format ?? "4:5";
  const pending: PendingPhoto[] = [];

  // Global look: template defaults, then spec overrides.
  const theme = defaultTheme(spec.palette ?? template.style.palette, spec.fonts ?? template.style.pair);
  // "Use my theme": the user's saved look replaces the template's, but an explicit font pair still wins.
  if (spec.myTheme && savedTheme) {
    const fonts = spec.fonts ? { headingFont: theme.headingFont, bodyFont: theme.bodyFont } : {};
    Object.assign(theme, savedTheme, fonts);
  }
  Object.assign(theme, clean({ ...spec.colors, ...(spec.accent ? { accent: spec.accent } : {}) }));
  for (const k of ["bg", "surface", "ink", "muted", "accent"] as const) theme[k] = theme[k].toUpperCase();
  if (spec.headingFont) theme.headingFont = spec.headingFont;
  if (spec.bodyFont) theme.bodyFont = spec.bodyFont;

  const baseStyle: Style = {
    ...template.style,
    ...clean({ highlight: spec.highlight, texture: spec.texture, textureOpacity: spec.textureIntensity, align: spec.align }),
  };
  const highlight = { style: baseStyle.highlight, color: "$accent" };

  const photoUrl = (p: string, slideId: string, target: string, w: number, h: number) => {
    if (isUrl(p)) return p.trim();
    pending.push({ slideId, target, query: p.trim() });
    return placeholderPhoto(p, w, h);
  };

  const element = (e: ElementSpec, slideId: string): SlideElement => {
    const common = clean({ x: e.x, y: e.y, rotation: e.rotation, opacity: e.opacity });
    switch (e.type) {
      case "text":
        return text({
          ...common,
          text: e.text,
          ...clean({
            w: e.w,
            size: e.size,
            font: font(e.font),
            weight: e.weight,
            color: col(e.color),
            align: e.align,
            italic: e.italic,
            uppercase: e.uppercase,
            lineHeight: e.lineHeight,
            letterSpacing: e.letterSpacing,
          }),
          highlight,
          background: e.label ? { color: col(e.label.color)!, padding: e.label.padding ?? 16, radius: e.label.radius ?? 12 } : null,
        });
      case "image": {
        const el = image("", { ...common, w: e.w, h: e.h, ...clean({ radius: e.radius, fit: e.fit, filter: e.filter, shadow: e.shadow, focus: e.focus }) });
        el.src = photoUrl(e.photo, slideId, el.id, Math.min(2000, Math.round(e.w * 1.5)), Math.min(2400, Math.round(e.h * 1.5)));
        return el;
      }
      case "shape":
        return shape(e.shape, { ...common, w: e.w, h: e.h, ...clean({ fill: e.fill === "none" ? "none" : col(e.fill), stroke: col(e.stroke), strokeWidth: e.strokeWidth, radius: e.radius }) });
      case "icon": {
        const s = e.size ?? 160;
        return icon(e.icon, { ...common, w: s, h: s, ...clean({ color: col(e.color), strokeWidth: e.strokeWidth }) });
      }
    }
  };

  let pointNo = 0;
  const slides: Slide[] = spec.slides.map((s: SlideSpec) => {
    const style: Style = { ...baseStyle, ...clean({ align: s.align, texture: s.texture }) };
    // Absent optional text is passed as "" and stripped below, so template placeholders never leak through.
    let slide: Slide;
    switch (s.layout) {
      case "cover":
        slide = buildLayout("cover", style, aspect, { kicker: s.kicker ?? "", title: s.title, body: s.subtitle ?? "" });
        break;
      case "point":
        pointNo = s.number ?? pointNo + 1;
        slide = buildLayout("point", style, aspect, { n: pointNo, title: s.title, body: s.body ?? "" });
        break;
      case "list":
        slide = buildLayout("list", style, aspect, { kicker: s.kicker ?? "", title: s.title, items: s.items });
        break;
      case "quote":
        slide = buildLayout("quote", style, aspect, {
          title: `“${s.quote.replace(/^["“”]+|["“”]+$/g, "")}”`,
          author: s.author ? `— ${s.author.replace(/^[—–-]\s*/, "")}` : "",
        });
        break;
      case "photo":
        slide = buildLayout("imageText", style, aspect, { img: "about:blank", title: s.title, body: s.body ?? "" });
        for (const el of slide.elements) if (el.type === "image") el.src = photoUrl(s.photo, slide.id, el.id, 1600, 1100);
        break;
      case "stat":
        slide = buildLayout("stat", style, aspect, { title: s.value, body: s.label, kicker: s.source ?? "" });
        break;
      case "cta":
        slide = buildLayout("cta", style, aspect, { title: s.title, ...(s.button ? { button: s.button } : {}) });
        break;
      case "blank":
        slide = buildLayout("blank", style, aspect);
        break;
    }
    slide.elements = slide.elements.filter((e) => !(e.type === "text" && e.text.trim() === ""));
    // Template highlight colour/style applies everywhere, including spec-level overrides.
    for (const e of slide.elements) if (e.type === "text") e.highlight = { ...e.highlight, style: style.highlight };

    if (s.texture && !spec.texture) slide.texture = { ...slide.texture, kind: s.texture };
    if (s.hideBrand) slide.hideBrand = true;

    const bg = s.background;
    if (bg) {
      let next: Background | undefined;
      if (bg.photo) {
        next = {
          kind: "image",
          src: photoUrl(bg.photo, slide.id, "background", 1600, 2000),
          overlay: col(bg.overlay) ?? "$bg",
          overlayOpacity: bg.darken ?? (bg.overlay === "black" ? 0.5 : 0.8),
          blur: bg.blur ?? 0,
          credit: null,
        };
      } else if (bg.mesh) next = { kind: "mesh", preset: bg.mesh };
      else if (bg.gradient) next = { kind: "gradient", from: col(bg.gradient.from)!, to: col(bg.gradient.to)!, angle: bg.gradient.angle ?? 160 };
      else if (bg.color) next = { kind: "solid", color: col(bg.color)! };
      if (next) slide.background = next;
    }

    if (s.elements?.length) slide.elements.push(...s.elements.map((e) => element(e, slide.id)));
    return slide;
  });

  const base = brandFallback ?? defaultBrand();
  const b = spec.brand;
  const brand: BrandKit = {
    ...base,
    ...clean({
      name: b?.name,
      handle: b?.handle ? (b.handle.startsWith("@") ? b.handle : `@${b.handle}`) : undefined,
      avatar: b?.avatar,
      enabled: b?.show,
      position: b?.position,
      showCounter: b?.counter,
      showArrow: b?.arrow,
      color: col(b?.color),
      verified: b?.verified,
      verifiedColor: b?.badge,
      avatarShape: b?.avatarShape,
      size: b?.size,
      showHandle: b?.showHandle,
      counterStyle: b?.counterStyle,
      arrowStyle: b?.arrowStyle,
    }),
  };

  const first = spec.slides.find((s) => "title" in s) as { title?: string } | undefined;
  const project = newProject({
    name: (spec.title ?? first?.title ?? `${template.name} carousel`).replace(/\*/g, "").slice(0, 80),
    aspect,
    templateId: template.id,
    theme,
    brand,
    slides,
  });
  if (spec.id) project.sourceId = spec.id;
  return { project, pending };
}
