"use client";

import { Check } from "lucide-react";
import { isDark, textureCSS } from "@/lib/model/resolve";
import type { TextureKind, Theme } from "@/lib/model/types";
import { cn } from "@/components/ui/cn";

/**
 * Patterns are drawn for a 1080px slide; at swatch size they need their own
 * scale, or a "dot grid" shows one dot and "ruled" one line.
 */
const SWATCH: Partial<Record<TextureKind, { size: string; position?: string; opacity: number }>> = {
  grain: { size: "128px 128px", opacity: 0.9 },
  "noise-heavy": { size: "128px 128px", opacity: 0.9 },
  paper: { size: "160px 160px", opacity: 0.9 },
  dots: { size: "10px 10px", position: "5px 5px", opacity: 0.55 },
  grid: { size: "12px 12px", opacity: 0.32 },
  lines: { size: "100% 10px", position: "0 5px", opacity: 0.4 },
};

export function TextureSwatch({ kind, active, theme, label }: { kind: TextureKind; active: boolean; theme: Theme; label: string }) {
  const dark = isDark(theme.bg);
  const css = textureCSS(kind, 1, dark);
  const s = SWATCH[kind];
  return (
    <span className="flex flex-col items-center gap-1">
      {/* The ring is drawn inside the tile, so a scrolling or animating panel can never clip it. */}
      <span
        className="group/sw relative block aspect-square w-full overflow-hidden rounded-lg"
        style={{ background: theme.bg }}
      >
        {css && s && <span className="absolute inset-0" style={{ ...css, backgroundSize: s.size, backgroundPosition: s.position ?? css.backgroundPosition, opacity: s.opacity }} />}
        {kind === "none" && <span className="absolute top-1/2 left-1/2 h-px w-[70%] -translate-x-1/2 -translate-y-1/2 -rotate-45" style={{ background: dark ? "rgba(255,255,255,.35)" : "rgba(0,0,0,.25)" }} />}
        {/* keep the ring on top of the pattern */}
        <span
          className={cn(
            "pointer-events-none absolute inset-0 rounded-lg transition-shadow",
            active ? "shadow-[inset_0_0_0_2px_var(--accent),inset_0_0_0_4px_var(--panel)]" : "shadow-[inset_0_0_0_1px_var(--line-2)] group-hover/sw:shadow-[inset_0_0_0_1px_var(--muted)]",
          )}
        />
        {active && (
          <span className="absolute right-1.5 bottom-1.5 grid h-4 w-4 place-items-center rounded-full bg-accent text-accent-ink">
            <Check size={10} strokeWidth={3} />
          </span>
        )}
      </span>
      <span className={cn("text-[10.5px]", active ? "font-medium text-ink" : "text-muted")}>{label}</span>
    </span>
  );
}
