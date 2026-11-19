"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronDown, Pipette } from "lucide-react";
import { colorTokens, resolveColor } from "@/lib/model/resolve";
import type { Theme } from "@/lib/model/types";
import { cn } from "./cn";

export function Section({ title, children, action, defaultOpen = true }: { title: string; children: ReactNode; action?: ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-line px-4 py-3.5 last:border-b-0">
      <div className="mb-0 flex items-center justify-between">
        <button onClick={() => setOpen(!open)} className="group flex items-center gap-1.5 text-[11px] font-semibold tracking-[.08em] text-muted uppercase hover:text-ink">
          {title}
          <ChevronDown size={12} className={cn("transition-transform duration-300", !open && "-rotate-90")} />
        </button>
        {action}
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }} className="-mx-1.5 overflow-hidden">
            {/* A little inner breathing room so focus rings and selection outlines aren't clipped. */}
            <div className="flex flex-col gap-3 px-1.5 pt-3 pb-1">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function Row({ label, children, className }: { label?: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      {label && <span className="w-[68px] shrink-0 text-[12px] text-muted">{label}</span>}
      <div className="flex min-w-0 flex-1 items-center gap-2">{children}</div>
    </div>
  );
}

/** Number input you can drag horizontally to scrub, like Figma. */
export function NumberField({
  value,
  onChange,
  min = -Infinity,
  max = Infinity,
  step = 1,
  label,
  suffix,
  className,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  suffix?: string;
  className?: string;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const clamp = (v: number) => Math.min(max, Math.max(min, v));
  const fmt = (v: number) => (step < 1 ? v.toFixed(2).replace(/\.?0+$/, "") : String(Math.round(v)));
  return (
    <label className={cn("flex h-8 min-w-0 flex-1 items-center rounded-lg bg-panel-2 pr-2 text-[12.5px] ring-1 ring-transparent transition focus-within:ring-accent/50 hover:ring-line-2", className)}>
      {label && (
        <span
          className="cursor-ew-resize px-2 text-[11px] text-muted select-none"
          onPointerDown={(e) => {
            e.preventDefault();
            const sx = e.clientX;
            const sv = value;
            const move = (ev: PointerEvent) => onChange(clamp(+(sv + Math.round((ev.clientX - sx) / 2) * step * (ev.shiftKey ? 10 : 1)).toFixed(3)));
            const up = () => {
              window.removeEventListener("pointermove", move);
              window.removeEventListener("pointerup", up);
            };
            window.addEventListener("pointermove", move);
            window.addEventListener("pointerup", up);
          }}
        >
          {label}
        </span>
      )}
      <input
        value={draft ?? fmt(value)}
        onChange={(e) => setDraft(e.target.value)}
        onFocus={(e) => e.target.select()}
        onBlur={() => {
          if (draft !== null) {
            const n = parseFloat(draft);
            if (!Number.isNaN(n)) onChange(clamp(n));
          }
          setDraft(null);
        }}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          if (e.key === "ArrowUp" || e.key === "ArrowDown") {
            e.preventDefault();
            onChange(clamp(+(value + (e.key === "ArrowUp" ? 1 : -1) * step * (e.shiftKey ? 10 : 1)).toFixed(3)));
            setDraft(null);
          }
        }}
        className={cn("h-full w-full min-w-0 bg-transparent tabular-nums outline-none", !label && "pl-2.5")}
      />
      {suffix && <span className="text-[11px] text-muted">{suffix}</span>}
    </label>
  );
}

export function Slider({ value, onChange, min, max, step = 1, suffix, format }: { value: number; onChange: (v: number) => void; min: number; max: number; step?: number; suffix?: string; format?: (v: number) => string }) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="flex w-full items-center gap-3">
      <input
        type="range"
        className="range flex-1"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        onKeyDown={(e) => e.stopPropagation()}
        style={{ ["--pct" as string]: `${pct}%` }}
      />
      <span className="w-10 text-right text-[11.5px] text-ink-2 tabular-nums">
        {format ? format(value) : Math.round(value * (step < 1 && max <= 1 ? 100 : 1))}
        {suffix}
      </span>
    </div>
  );
}

export function Segmented<T extends string>({ value, onChange, options, layoutId }: { value: T; onChange: (v: T) => void; options: { value: T; label: ReactNode; title?: string }[]; layoutId: string }) {
  return (
    <div className="flex h-8 w-full rounded-lg bg-panel-2 p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          title={o.title}
          className={cn("relative flex flex-1 items-center justify-center rounded-md text-[12px] transition-colors", value === o.value ? "text-ink" : "text-muted hover:text-ink-2")}
        >
          {value === o.value && <motion.span layoutId={layoutId} className="absolute inset-0 rounded-md bg-panel shadow-sm" transition={{ type: "spring", stiffness: 500, damping: 38 }} />}
          <span className="relative flex items-center gap-1">{o.label}</span>
        </button>
      ))}
    </div>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button onClick={() => onChange(!checked)} className="flex w-full items-center justify-between gap-3 text-[12.5px] text-ink-2">
      {label}
      <span className={cn("relative h-5 w-9 rounded-full transition-colors duration-300", checked ? "bg-accent" : "bg-line-2")}>
        <motion.span layout transition={{ type: "spring", stiffness: 600, damping: 35 }} className={cn("absolute top-0.5 h-4 w-4 rounded-full bg-white shadow", checked ? "right-0.5" : "left-0.5")} />
      </span>
    </button>
  );
}

export function Select<T extends string>({ value, onChange, options, className, renderOption }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; className?: string; renderOption?: (o: { value: T; label: string }) => ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    window.addEventListener("pointerdown", close);
    return () => window.removeEventListener("pointerdown", close);
  }, [open]);
  const cur = options.find((o) => o.value === value);
  return (
    <div ref={ref} className={cn("relative min-w-0 flex-1", className)}>
      <button onClick={() => setOpen(!open)} className="flex h-8 w-full items-center justify-between gap-2 rounded-lg bg-panel-2 px-2.5 text-left text-[12.5px] ring-1 ring-transparent hover:ring-line-2">
        <span className="truncate">{cur ? (renderOption ? renderOption(cur) : cur.label) : value}</span>
        <ChevronDown size={13} className="shrink-0 text-muted" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="scroll-thin absolute right-0 left-0 z-50 mt-1 max-h-72 origin-top overflow-auto rounded-xl bg-panel p-1 shadow-lg"
          >
            {options.map((o) => (
              <button
                key={o.value}
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
                className={cn("flex w-full items-center rounded-lg px-2.5 py-1.5 text-left text-[13px] hover:bg-line", o.value === value && "bg-accent-soft text-ink")}
              >
                {renderOption ? renderOption(o) : o.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const TOKEN_LABEL: Record<string, string> = { bg: "Background", surface: "Surface", ink: "Ink", muted: "Muted", accent: "Accent" };

/**
 * Colour picker that prefers theme tokens: picking "Accent" keeps the link to
 * the palette, so recolouring the theme recolours this element too.
 */
export function ColorField({ value, onChange, theme, allowNone }: { value: string; onChange: (v: string) => void; theme: Theme; allowNone?: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const resolved = value === "none" ? "transparent" : resolveColor(value, theme);
  const isToken = value.startsWith("$");
  const [hex, setHex] = useState(resolved);
  useEffect(() => setHex(resolved), [resolved]);
  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    window.addEventListener("pointerdown", close);
    return () => window.removeEventListener("pointerdown", close);
  }, [open]);
  const recent = ["#000000", "#FFFFFF", "#FF5A1F", "#FFD23F", "#3A5BFF", "#18A058", "#E8261F", "#A98BFF"];

  return (
    <div ref={ref} className="relative min-w-0 flex-1">
      <button onClick={() => setOpen(!open)} className="flex h-8 w-full items-center gap-2 rounded-lg bg-panel-2 px-1.5 text-[12.5px] ring-1 ring-transparent hover:ring-line-2">
        <span
          className="h-5 w-5 shrink-0 rounded-md shadow-[inset_0_0_0_1px_rgb(0_0_0/.12)]"
          style={{ background: value === "none" ? "repeating-conic-gradient(#ccc 0 25%, #fff 0 50%) 0 0/8px 8px" : resolved }}
        />
        <span className="truncate">{value === "none" ? "None" : isToken ? TOKEN_LABEL[value.slice(1)] : value.toUpperCase()}</span>
        {isToken && <span className="ml-auto rounded bg-accent-soft px-1.5 py-px text-[9.5px] font-semibold tracking-wide text-accent uppercase">Theme</span>}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 z-50 mt-1 w-60 origin-top-right rounded-xl bg-panel p-3 shadow-lg"
          >
            <div className="mb-1.5 text-[10.5px] font-semibold tracking-[.08em] text-muted uppercase">Theme</div>
            <div className="mb-3 flex gap-1.5">
              {colorTokens.map((t) => (
                <button
                  key={t}
                  title={TOKEN_LABEL[t]}
                  onClick={() => onChange(`$${t}`)}
                  className={cn("h-7 flex-1 rounded-md shadow-[inset_0_0_0_1px_rgb(0_0_0/.12)] transition-transform hover:scale-110", value === `$${t}` && "ring-2 ring-accent ring-offset-2 ring-offset-panel")}
                  style={{ background: theme[t] }}
                />
              ))}
            </div>
            <div className="mb-1.5 text-[10.5px] font-semibold tracking-[.08em] text-muted uppercase">Custom</div>
            <div className="mb-2 flex flex-wrap gap-1.5">
              {allowNone && (
                <button onClick={() => onChange("none")} className="h-6 w-6 rounded-md ring-1 ring-line-2" style={{ background: "repeating-conic-gradient(#ccc 0 25%, #fff 0 50%) 0 0/8px 8px" }} title="None" />
              )}
              {recent.map((c) => (
                <button key={c} onClick={() => onChange(c)} className="h-6 w-6 rounded-md shadow-[inset_0_0_0_1px_rgb(0_0_0/.12)] transition-transform hover:scale-110" style={{ background: c }} />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <label className="relative grid h-8 w-8 shrink-0 cursor-pointer place-items-center overflow-hidden rounded-lg bg-panel-2" title="Pick any colour">
                <Pipette size={14} />
                <input type="color" value={/^#[0-9a-f]{6}$/i.test(resolved) ? resolved : "#000000"} onChange={(e) => onChange(e.target.value.toUpperCase())} className="absolute inset-0 cursor-pointer opacity-0" />
              </label>
              <input
                value={hex}
                onChange={(e) => setHex(e.target.value)}
                onKeyDown={(e) => {
                  e.stopPropagation();
                  if (e.key === "Enter" && /^#?[0-9a-f]{3,8}$/i.test(hex)) onChange(hex.startsWith("#") ? hex.toUpperCase() : `#${hex.toUpperCase()}`);
                }}
                onBlur={() => /^#?[0-9a-f]{3,8}$/i.test(hex) && hex !== resolved && onChange(hex.startsWith("#") ? hex.toUpperCase() : `#${hex.toUpperCase()}`)}
                className="h-8 w-full rounded-lg bg-panel-2 px-2.5 font-mono text-[12px] uppercase outline-none focus:ring-1 focus:ring-accent/50"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function IconButton({ children, onClick, title, active, className, disabled }: { children: ReactNode; onClick?: () => void; title?: string; active?: boolean; className?: string; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={cn(
        "grid h-8 w-8 shrink-0 place-items-center rounded-lg text-ink-2 transition-colors hover:bg-line hover:text-ink disabled:pointer-events-none disabled:opacity-35",
        active && "bg-accent-soft text-accent hover:bg-accent-soft hover:text-accent",
        className,
      )}
    >
      {children}
    </button>
  );
}
