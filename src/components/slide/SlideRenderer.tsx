"use client";

import { memo, useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { SLIDE_W, slideHeight } from "@/lib/model/constants";
import { IMAGE_FILTERS, backgroundCSS, isDark, noiseTile, resolveColor, resolveFont, textureCSS } from "@/lib/model/resolve";
import { safeSrc, sizedSrc } from "@/lib/image";
import type { Project, Slide, SlideElement, Theme } from "@/lib/model/types";
import { ICONS } from "./icons";
import { RichText } from "./RichText";

type Doc = Pick<Project, "theme" | "brand" | "aspect">;

export interface SlideRendererProps {
  slide: Slide;
  doc: Doc;
  index: number;
  total: number;
  /** Let the editor wrap each element with interactive chrome. */
  renderElement?: (el: SlideElement, content: ReactNode, style: CSSProperties) => ReactNode;
  /** Rendered above everything, inside the slide coordinate space (guides, marquee…). */
  overlay?: ReactNode;
  className?: string;
  style?: CSSProperties;
  id?: string;
  /**
   * CSS width the slide is shown at. Previews pass it so images are fetched at
   * display size and lazily. Omit for export (full resolution, eager).
   */
  displayWidth?: number;
}

export function elementBoxStyle(el: SlideElement): CSSProperties {
  return {
    position: "absolute",
    left: el.x,
    top: el.y,
    width: el.w,
    height: el.type === "text" ? "auto" : el.h,
    minHeight: el.type === "text" ? 10 : undefined,
    transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
    transformOrigin: "center center",
    opacity: el.opacity,
    visibility: el.hidden ? "hidden" : undefined,
  };
}

export function textStyle(el: Extract<SlideElement, { type: "text" }>, t: Theme): CSSProperties {
  const bg = el.background;
  return {
    fontFamily: resolveFont(el.font, t),
    fontSize: el.size,
    fontWeight: el.weight,
    color: resolveColor(el.color, t),
    textAlign: el.align,
    lineHeight: el.lineHeight,
    letterSpacing: `${el.letterSpacing}em`,
    fontStyle: el.italic ? "italic" : "normal",
    textTransform: el.uppercase ? "uppercase" : "none",
    whiteSpace: "pre-wrap",
    overflowWrap: "break-word",
    fontKerning: "normal",
    fontFeatureSettings: '"kern", "liga", "calt"',
    ...(bg
      ? {
          background: resolveColor(bg.color, t),
          padding: bg.padding,
          borderRadius: bg.radius,
        }
      : null),
  };
}

export function ElementContent({ el, theme, k }: { el: SlideElement; theme: Theme; k?: number }) {
  switch (el.type) {
    case "text":
      return (
        <div style={textStyle(el, theme)}>
          <RichText text={el.text || " "} style={el.highlight.style} color={el.highlight.color} size={el.size} theme={theme} />
        </div>
      );
    case "image":
      return (
        <div
          style={{
            width: "100%",
            height: "100%",
            borderRadius: el.radius,
            overflow: "hidden",
            border: el.border ? `${el.border.width}px solid ${resolveColor(el.border.color, theme)}` : undefined,
            boxShadow: el.shadow ? "0 30px 60px -20px rgba(0,0,0,.45), 0 8px 18px -8px rgba(0,0,0,.3)" : undefined,
            background: "rgba(127,127,127,.12)",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={k ? sizedSrc(el.src, el.w * k * 2) : safeSrc(el.src)}
            crossOrigin="anonymous"
            alt=""
            draggable={false}
            loading={k ? "lazy" : undefined}
            decoding={k ? "async" : undefined}
            style={{
              width: "100%",
              height: "100%",
              objectFit: el.fit,
              objectPosition: el.focus ? `${el.focus.x}% ${el.focus.y}%` : undefined,
              filter: IMAGE_FILTERS[el.filter]?.css ?? "none",
              display: "block",
              userSelect: "none",
            }}
          />
        </div>
      );
    case "shape":
      return <ShapeContent el={el} theme={theme} />;
    case "icon": {
      const Icon = ICONS[el.icon] ?? ICONS.Sparkles;
      return <Icon width="100%" height="100%" color={resolveColor(el.color, theme)} strokeWidth={el.strokeWidth} absoluteStrokeWidth={false} />;
    }
  }
}

function ShapeContent({ el, theme }: { el: Extract<SlideElement, { type: "shape" }>; theme: Theme }) {
  const fill = el.fill === "none" ? "transparent" : resolveColor(el.fill, theme);
  const stroke = resolveColor(el.stroke, theme);
  const sw = el.strokeWidth;
  if (el.shape === "rect" || el.shape === "ellipse") {
    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: fill,
          border: sw ? `${sw}px solid ${stroke}` : undefined,
          borderRadius: el.shape === "ellipse" ? "50%" : el.radius,
        }}
      />
    );
  }
  const common = { vectorEffect: "non-scaling-stroke" as const, stroke: sw ? stroke : "none", strokeWidth: sw, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  let body: ReactNode = null;
  switch (el.shape) {
    case "line":
      body = <line x1="0" y1="50" x2="100" y2="50" {...common} stroke={stroke} />;
      break;
    case "arrow":
      return (
        <svg width="100%" height="100%" viewBox={`0 0 ${el.w} ${el.h}`} style={{ overflow: "visible" }}>
          <line x1={sw} y1={el.h / 2} x2={el.w - sw} y2={el.h / 2} stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
          <polyline
            points={`${el.w - sw - sw * 4},${el.h / 2 - sw * 4} ${el.w - sw},${el.h / 2} ${el.w - sw - sw * 4},${el.h / 2 + sw * 4}`}
            fill="none"
            stroke={stroke}
            strokeWidth={sw}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "triangle":
      body = <polygon points="50,2 98,98 2,98" fill={fill} {...common} />;
      break;
    case "star":
      body = <polygon points="50,2 61,37 98,37 68,59 79,95 50,73 21,95 32,59 2,37 39,37" fill={fill} {...common} />;
      break;
    case "blob":
      body = (
        <path
          d="M78.6,17.1C88.4,25.5,96.1,37.9,95.7,50.4C95.3,62.9,86.8,75.4,75.4,84.1C64,92.8,49.7,97.6,36.6,94.2C23.5,90.8,11.6,79.2,6.6,65.4C1.6,51.6,3.5,35.6,11.6,24.3C19.7,13,34,6.4,48.3,5.7C62.6,5,68.8,8.7,78.6,17.1Z"
          fill={fill}
          {...common}
        />
      );
      break;
  }
  return (
    <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ overflow: "visible", display: "block" }}>
      {body}
    </svg>
  );
}

export const VERIFIED_COLORS = { blue: "#1D9BF0", gold: "#E8B323", grey: "#8B98A5" } as const;

/** Scalloped verified badge with a check, drawn as one SVG so it exports crisply. */
export function VerifiedBadge({ size, color, check = "#fff" }: { size: number; color: string; check?: string }) {
  const bumps = 8;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-label="Verified" style={{ flexShrink: 0, display: "block" }}>
      <g fill={color}>
        <circle cx="12" cy="12" r="8.6" />
        {Array.from({ length: bumps }, (_, k) => {
          const a = (k / bumps) * Math.PI * 2;
          return <circle key={k} cx={12 + Math.cos(a) * 6.9} cy={12 + Math.sin(a) * 6.9} r="3.9" />;
        })}
      </g>
      <path d="M7.6 12.3l2.9 2.9 5.9-6.1" fill="none" stroke={check} strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const BRAND_SCALE = { s: 0.82, m: 1, l: 1.22 } as const;

function BrandChrome({ doc, index, total, H }: { doc: Doc; index: number; total: number; H: number }) {
  void H;
  const { brand, theme } = doc;
  const color = resolveColor(brand.color, theme);
  const accent = resolveColor("$accent", theme);
  const top = brand.position === "top";
  const isLast = index === total - 1;
  const k = BRAND_SCALE[brand.size ?? "m"];
  const av = Math.round(72 * k);
  const radius = brand.avatarShape === "square" ? Math.round(8 * k) : brand.avatarShape === "rounded" ? Math.round(20 * k) : 999;
  const badge = brand.verifiedColor === "accent" ? accent : VERIFIED_COLORS[(brand.verifiedColor ?? "blue") as keyof typeof VERIFIED_COLORS];
  const counter = brand.counterStyle ?? "numbers";
  const arrow = brand.arrowStyle ?? "circle";
  return (
    <div
      style={{
        position: "absolute",
        left: 72,
        right: 72,
        [top ? "top" : "bottom"]: 64,
        height: Math.max(av, 56),
        display: "flex",
        alignItems: "center",
        gap: Math.round(20 * k),
        color,
        fontFamily: resolveFont("$body", theme),
        pointerEvents: "none",
      }}
      data-brand
    >
      {brand.avatar ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={brand.avatar} alt="" style={{ width: av, height: av, borderRadius: radius, objectFit: "cover", boxShadow: `0 0 0 2px color-mix(in srgb, ${color} 14%, transparent)` }} />
      ) : (
        <div
          style={{
            width: av,
            height: av,
            borderRadius: radius,
            background: accent,
            color: isDark(accent) ? "#fff" : "#111",
            display: "grid",
            placeItems: "center",
            fontWeight: 700,
            fontSize: Math.round(30 * k),
          }}
        >
          {(brand.name || "?").trim().charAt(0).toUpperCase()}
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.15, minWidth: 0 }}>
        <span style={{ display: "flex", alignItems: "center", gap: Math.round(8 * k), fontSize: Math.round(28 * k), fontWeight: 650, whiteSpace: "nowrap" }}>
          {brand.name}
          {brand.verified && <VerifiedBadge size={Math.round(30 * k)} color={badge} check={brand.verifiedColor === "accent" && !isDark(accent) ? "#111" : "#fff"} />}
        </span>
        {brand.showHandle !== false && brand.handle && <span style={{ fontSize: Math.round(24 * k), opacity: 0.6, whiteSpace: "nowrap" }}>{brand.handle}</span>}
      </div>
      <div style={{ flex: 1 }} />
      {brand.showCounter &&
        (counter === "dots" ? (
          <span style={{ display: "flex", gap: Math.round(9 * k), alignItems: "center" }}>
            {Array.from({ length: Math.min(total, 12) }, (_, d) => (
              <span key={d} style={{ width: Math.round(11 * k), height: Math.round(11 * k), borderRadius: 99, background: color, opacity: d === index ? 0.95 : 0.25 }} />
            ))}
          </span>
        ) : counter === "bar" ? (
          <span style={{ position: "relative", width: Math.round(160 * k), height: Math.round(7 * k), borderRadius: 99, background: `color-mix(in srgb, ${color} 18%, transparent)`, overflow: "hidden" }}>
            <span style={{ position: "absolute", inset: 0, width: `${((index + 1) / total) * 100}%`, borderRadius: 99, background: color, opacity: 0.85 }} />
          </span>
        ) : (
          <span style={{ fontSize: Math.round(24 * k), fontWeight: 500, opacity: 0.6, fontVariantNumeric: "tabular-nums", letterSpacing: ".04em" }}>
            {counter === "fraction" ? `${index + 1}/${total}` : `${String(index + 1).padStart(2, "0")} / ${String(total).padStart(2, "0")}`}
          </span>
        ))}
      {brand.showArrow &&
        !isLast &&
        (arrow === "swipe" ? (
          <span style={{ display: "flex", alignItems: "center", gap: Math.round(8 * k), fontSize: Math.round(24 * k), fontWeight: 600, opacity: 0.9 }}>
            Swipe <ArrowRight width={Math.round(28 * k)} height={Math.round(28 * k)} strokeWidth={2.2} />
          </span>
        ) : (
          <div
            style={{
              width: av,
              height: av,
              borderRadius: 999,
              border: arrow === "circle" ? `2px solid ${color}` : "none",
              display: "grid",
              placeItems: "center",
              opacity: 0.9,
            }}
          >
            <ArrowRight width={Math.round(34 * k * (arrow === "plain" ? 1.2 : 1))} height={Math.round(34 * k * (arrow === "plain" ? 1.2 : 1))} strokeWidth={2} />
          </div>
        ))}
    </div>
  );
}

/** Generated after mount so server and client markup agree; cached for the session. */
function useNoiseTile(kind: Slide["texture"]["kind"], dark: boolean) {
  const noisy = kind === "grain" || kind === "noise-heavy" || kind === "paper";
  const [tile, setTile] = useState<string | null>(null);
  useEffect(() => {
    setTile(noisy ? noiseTile(kind, dark) : null);
  }, [kind, dark, noisy]);
  return noisy ? tile : null;
}

function SlideRendererImpl({ slide, doc, index, total, renderElement, overlay, className, style, id, displayWidth }: SlideRendererProps) {
  const H = slideHeight(doc.aspect);
  const k = displayWidth ? displayWidth / SLIDE_W : undefined;
  const t = doc.theme;
  const bg = slide.background;
  const baseColor =
    bg.kind === "solid" ? resolveColor(bg.color, t) : bg.kind === "image" ? (bg.overlayOpacity > 0.35 ? resolveColor(bg.overlay, t) : "#777") : bg.kind === "gradient" ? resolveColor(bg.from, t) : t.bg;
  const dark = isDark(baseColor.startsWith("#") ? baseColor : t.bg);
  const tile = useNoiseTile(slide.texture.kind, dark);
  const tex = tile || !["grain", "noise-heavy", "paper"].includes(slide.texture.kind) ? textureCSS(slide.texture.kind, slide.texture.opacity, dark, tile) : null;

  return (
    <div
      id={id}
      className={className}
      data-slide={slide.id}
      style={{
        position: "relative",
        width: SLIDE_W,
        height: H,
        overflow: "hidden",
        ...backgroundCSS(bg, t),
        ...style,
      }}
    >
      {bg.kind === "image" && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={displayWidth ? sizedSrc(bg.src, displayWidth * 2) : safeSrc(bg.src, 2400)}
            crossOrigin="anonymous"
            alt=""
            draggable={false}
            loading={k ? "lazy" : undefined}
            decoding={k ? "async" : undefined}
            style={{
              position: "absolute",
              inset: bg.blur ? -bg.blur * 2 : 0,
              width: bg.blur ? `calc(100% + ${bg.blur * 4}px)` : "100%",
              height: bg.blur ? `calc(100% + ${bg.blur * 4}px)` : "100%",
              objectFit: "cover",
              objectPosition: bg.focus ? `${bg.focus.x}% ${bg.focus.y}%` : undefined,
              filter: bg.blur ? `blur(${bg.blur}px)` : undefined,
            }}
          />
          <div style={{ position: "absolute", inset: 0, background: resolveColor(bg.overlay, t), opacity: bg.overlayOpacity }} />
        </>
      )}

      {slide.elements.map((el) => {
        const boxStyle = elementBoxStyle(el);
        const content = <ElementContent el={el} theme={t} k={k} />;
        if (renderElement) return renderElement(el, content, boxStyle);
        return (
          <div key={el.id} style={boxStyle}>
            {content}
          </div>
        );
      })}

      {doc.brand.enabled && !slide.hideBrand && <BrandChrome doc={doc} index={index} total={total} H={H} />}

      {tex && <div aria-hidden style={{ position: "absolute", inset: 0, pointerEvents: "none", ...tex }} />}

      {overlay}
    </div>
  );
}

/**
 * Immer keeps unchanged slides, themes and brand kits referentially equal, so a
 * shallow check on those (not on the whole project object) lets every
 * thumbnail and preview skip re-rendering while you drag on another slide.
 */
function sameProps(a: SlideRendererProps, b: SlideRendererProps) {
  return (
    a.slide === b.slide &&
    a.doc.theme === b.doc.theme &&
    a.doc.brand === b.doc.brand &&
    a.doc.aspect === b.doc.aspect &&
    a.index === b.index &&
    a.total === b.total &&
    a.renderElement === b.renderElement &&
    a.overlay === b.overlay &&
    a.className === b.className &&
    a.style === b.style &&
    a.displayWidth === b.displayWidth
  );
}

export const SlideRenderer = memo(SlideRendererImpl, sameProps);

/** Fits a slide into a box by scaling. Used for thumbnails, previews, the landing page. */
function ScaledSlideImpl({ width, className, style, ...props }: SlideRendererProps & { width: number }) {
  const H = slideHeight(props.doc.aspect);
  const k = width / SLIDE_W;
  return (
    <div className={className} style={{ width, height: H * k, position: "relative", overflow: "hidden", ...style }}>
      <div style={{ transform: `scale(${k})`, transformOrigin: "0 0", width: SLIDE_W, height: H }}>
        <SlideRenderer {...props} displayWidth={width} />
      </div>
    </div>
  );
}

export const ScaledSlide = memo(ScaledSlideImpl, (a, b) => a.width === b.width && sameProps(a, b));
