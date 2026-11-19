/**
 * Core document model.
 *
 * Coordinates are in slide pixels. Every slide is 1080px wide and its height
 * depends on the project's aspect ratio, which is also the export size.
 *
 * Colours can be a theme token ("$bg" | "$ink" | "$accent" | "$muted" | "$surface")
 * or a literal CSS colour. Fonts can be "$heading" | "$body" or a family name.
 * Tokens let one palette or font change restyle the whole carousel.
 */

export type AspectId = "1:1" | "4:5" | "3:4" | "9:16" | "16:9";

export type ColorRef = string;
export type FontRef = string;

export type TextureKind = "none" | "grain" | "paper" | "dots" | "grid" | "lines" | "noise-heavy";

export interface Theme {
  bg: string;
  surface: string;
  ink: string;
  muted: string;
  accent: string;
  headingFont: string;
  bodyFont: string;
}

export interface BrandKit {
  enabled: boolean;
  name: string;
  handle: string;
  avatar: string | null;
  position: "top" | "bottom";
  showCounter: boolean;
  showArrow: boolean;
  color: ColorRef;
  /** Verified badge next to the name. */
  verified?: boolean;
  verifiedColor?: VerifiedColor;
  avatarShape?: "circle" | "rounded" | "square";
  size?: "s" | "m" | "l";
  showHandle?: boolean;
  counterStyle?: "numbers" | "fraction" | "dots" | "bar";
  arrowStyle?: "circle" | "plain" | "swipe";
}

export type VerifiedColor = "blue" | "gold" | "grey" | "accent";

export type HighlightStyle = "color" | "marker" | "underline" | "pill" | "italic";

interface BaseElement {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  rotation: number;
  opacity: number;
  locked?: boolean;
  hidden?: boolean;
  name?: string;
}

export interface TextElement extends BaseElement {
  type: "text";
  text: string;
  font: FontRef;
  size: number;
  weight: number;
  color: ColorRef;
  align: "left" | "center" | "right";
  lineHeight: number;
  letterSpacing: number; // em
  italic: boolean;
  uppercase: boolean;
  highlight: { style: HighlightStyle; color: ColorRef };
  background?: { color: ColorRef; padding: number; radius: number } | null;
}

export type ImageFilter = "none" | "mono" | "warm" | "cool" | "fade" | "punch" | "noir";

export interface ImageElement extends BaseElement {
  type: "image";
  src: string;
  fit: "cover" | "contain";
  /** Focal point in % for object-position (drag to reposition inside the frame). */
  focus?: { x: number; y: number };
  radius: number;
  filter: ImageFilter;
  border?: { width: number; color: ColorRef } | null;
  shadow?: boolean;
  credit?: StockCredit | null;
}

export type ShapeKind = "rect" | "ellipse" | "line" | "arrow" | "triangle" | "star" | "blob";

export interface ShapeElement extends BaseElement {
  type: "shape";
  shape: ShapeKind;
  fill: ColorRef | "none";
  stroke: ColorRef;
  strokeWidth: number;
  radius: number;
}

export interface IconElement extends BaseElement {
  type: "icon";
  icon: string;
  color: ColorRef;
  strokeWidth: number;
}

export type SlideElement = TextElement | ImageElement | ShapeElement | IconElement;
export type ElementType = SlideElement["type"];

export interface StockCredit {
  provider: string;
  author: string;
  authorUrl?: string;
  sourceUrl?: string;
  license?: string;
}

export type Background =
  | { kind: "solid"; color: ColorRef }
  | { kind: "gradient"; from: ColorRef; to: ColorRef; angle: number }
  | { kind: "mesh"; preset: string }
  | {
      kind: "image";
      src: string;
      overlay: ColorRef;
      overlayOpacity: number;
      blur: number;
      focus?: { x: number; y: number };
      credit?: StockCredit | null;
    };

export interface Slide {
  id: string;
  background: Background;
  texture: { kind: TextureKind; opacity: number };
  elements: SlideElement[];
  hideBrand?: boolean;
  note?: string;
}

export interface Project {
  id: string;
  name: string;
  aspect: AspectId;
  theme: Theme;
  brand: BrandKit;
  slides: Slide[];
  templateId?: string;
  /** Carousel id from an agent's spec: later links with the same id update this project. */
  sourceId?: string;
  /** Fingerprint of the last spec applied, so re-opening the same link doesn't overwrite edits. */
  sourceHash?: string;
  createdAt: number;
  updatedAt: number;
}

export interface ProjectMeta {
  id: string;
  name: string;
  aspect: AspectId;
  slideCount: number;
  updatedAt: number;
}
