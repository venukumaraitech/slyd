"use client";

import Link from "next/link";
import { motion, useMotionValue, useSpring } from "motion/react";
import { forwardRef, useRef, type ComponentProps, type ReactNode } from "react";
import { cn } from "./cn";

type Variant = "primary" | "ink" | "ghost" | "soft" | "outline";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary: "bg-accent text-accent-ink shadow-[0_1px_0_rgb(255_255_255/.35)_inset,0_10px_24px_-10px_var(--accent)] hover:brightness-105",
  ink: "bg-ink text-bg shadow-[0_1px_0_rgb(255_255_255/.15)_inset,0_10px_24px_-12px_rgb(0_0_0/.5)] hover:bg-ink-2",
  ghost: "text-ink-2 hover:bg-line hover:text-ink",
  soft: "bg-panel text-ink shadow-sm hover:bg-panel-2",
  outline: "text-ink ring-1 ring-line-2 hover:bg-line",
};
const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-[13px] gap-1.5 rounded-lg",
  md: "h-10 px-4 text-sm gap-2 rounded-xl",
  lg: "h-13 px-6 text-[15px] gap-2.5 rounded-2xl",
};

export const buttonClass = (variant: Variant = "soft", size: Size = "md", className?: string) =>
  cn(
    "relative inline-flex select-none items-center justify-center whitespace-nowrap font-medium transition-[background,color,box-shadow,filter,transform] duration-200 active:scale-[.97] disabled:pointer-events-none disabled:opacity-40",
    variants[variant],
    sizes[size],
    className,
  );

export const Button = forwardRef<HTMLButtonElement, ComponentProps<"button"> & { variant?: Variant; size?: Size }>(
  ({ variant = "soft", size = "md", className, ...p }, ref) => <button ref={ref} className={buttonClass(variant, size, className)} {...p} />,
);
Button.displayName = "Button";

/** A link-button that drifts toward the pointer. Used for hero CTAs. */
export function MagneticLink({
  href,
  children,
  variant = "primary",
  size = "lg",
  className,
  cursor,
  external,
  download,
}: {
  href: string;
  children: ReactNode;
  variant?: Variant;
  size?: Size;
  className?: string;
  cursor?: string;
  external?: boolean;
  /** A file download: a plain link that stays on this page. */
  download?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const x = useSpring(mx, { stiffness: 300, damping: 20 });
  const y = useSpring(my, { stiffness: 300, damping: 20 });
  const Comp = external || download ? "a" : Link;
  return (
    <motion.div
      ref={ref}
      style={{ x, y }}
      className="inline-block"
      onPointerMove={(e) => {
        const r = ref.current!.getBoundingClientRect();
        mx.set((e.clientX - (r.left + r.width / 2)) * 0.25);
        my.set((e.clientY - (r.top + r.height / 2)) * 0.35);
      }}
      onPointerLeave={() => {
        mx.set(0);
        my.set(0);
      }}
    >
      <Comp
        href={href}
        {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
        className={buttonClass(variant, size, cn("group overflow-hidden", className))}
      >
        {children}
      </Comp>
    </motion.div>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="kbd">{children}</kbd>;
}
