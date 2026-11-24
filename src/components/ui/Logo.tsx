import Link from "next/link";
import { cn } from "./cn";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("h-7 w-7", className)} aria-hidden>
      <rect x="13" y="4" width="12" height="17" rx="3" fill="var(--accent)" opacity=".45" transform="rotate(14 19 12)" />
      <rect x="10.5" y="6" width="12" height="17" rx="3" fill="var(--accent)" opacity=".75" transform="rotate(5 16 14)" />
      <rect x="7" y="8" width="12" height="17" rx="3" fill="var(--ink)" transform="rotate(-7 13 16)" />
    </svg>
  );
}

const SIZES = {
  md: { mark: "h-9 w-9", word: "text-[32px]" },
  lg: { mark: "h-11 w-11", word: "text-[40px]" },
};

export function Logo({ href = "/", className, size = "lg" }: { href?: string; className?: string; size?: keyof typeof SIZES }) {
  const s = SIZES[size];
  return (
    <Link href={href} prefetch={false} className={cn("group inline-flex items-center gap-2", className)} aria-label="Slyd home">
      <LogoMark className={cn(s.mark, "transition-transform duration-500 ease-spring group-hover:-rotate-6 group-hover:scale-110")} />
      {/* Optical alignment: the italic serif sits low, so nudge it up and pad the descender */}
      <span className={cn(s.word, "translate-y-[-0.06em] pr-[0.06em] font-serif leading-none tracking-[-0.01em] italic")}>slyd</span>
    </Link>
  );
}
