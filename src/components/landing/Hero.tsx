"use client";

import Link from "next/link";
import { AnimatePresence, motion, useMotionValueEvent, useScroll, useSpring, useTransform } from "motion/react";
import { useEffect, useState } from "react";
import { ArrowRight, Star } from "lucide-react";
import { StarButton } from "@/components/ui/StarButton";
import { Logo } from "@/components/ui/Logo";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { MagneticLink, buttonClass } from "@/components/ui/Button";
import { ScaledSlide } from "@/components/slide/SlideRenderer";
import { cn } from "@/components/ui/cn";
import { HeroShader } from "./HeroShader";
import { SplitWords } from "./primitives";
import { demo } from "./demo";

import { REPO_URL } from "@/lib/site";

export function Nav() {
  const { scrollY } = useScroll();
  // Always pinned; it just gains a frosted background once the page scrolls.
  const [solid, setSolid] = useState(false);
  useMotionValueEvent(scrollY, "change", (y) => setSolid(y > 24));
  const links = [
    ["Features", "#features"],
    ["Templates", "#templates"],
    ["How it works", "#how"],
    ["FAQ", "#faq"],
    ["For agents", "/agents"],
  ];
  return (
    <header className="fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-4">
      <nav
        className={cn(
          "flex w-full max-w-6xl items-center justify-between rounded-2xl px-3 py-2 pl-4 transition-[background,box-shadow,backdrop-filter] duration-500",
          solid ? "bg-panel/70 shadow-md backdrop-blur-xl backdrop-saturate-150" : "bg-transparent",
        )}
      >
        <Logo />
        <div className="hidden items-center gap-1 md:flex">
          {links.map(([l, h]) => (
            <a key={h} href={h} className="rounded-lg px-3 py-1.5 text-[14px] text-ink-2 transition-colors hover:bg-line hover:text-ink">
              {l}
            </a>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          <ThemeToggle />
          <StarButton className="hidden sm:inline-flex" />
          <Link href="/app" className={buttonClass("ink", "sm", "group")}>
            Open editor <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </nav>
    </header>
  );
}

const DECK_TEMPLATES = ["editorial", "noir", "aurora", "photo", "swiss"];

/** A fanned stack of real, rendered slides that cycles through templates. */
function DeckFan() {
  const [ti, setTi] = useState(0);
  const [hover, setHover] = useState(false);
  const [mx, setMx] = useState(0);
  useEffect(() => {
    if (hover) return;
    const t = setInterval(() => setTi((i) => (i + 1) % DECK_TEMPLATES.length), 3800);
    return () => clearInterval(t);
  }, [hover]);
  const p = demo(DECK_TEMPLATES[ti]);
  const slides = p.slides.slice(0, 5);
  const W = 232;
  const spread = hover ? 1.35 : 1;

  return (
    <div
      className="relative mx-auto h-[400px] w-full max-w-5xl"
      onPointerEnter={() => setHover(true)}
      onPointerLeave={() => {
        setHover(false);
        setMx(0);
      }}
      onPointerMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        setMx(((e.clientX - r.left) / r.width - 0.5) * 2);
      }}
    >
      <AnimatePresence mode="popLayout">
        {slides.map((s, i) => {
          const o = i - (slides.length - 1) / 2;
          return (
            <motion.div
              key={`${p.id}-${s.id}`}
              className="absolute left-1/2 top-6 overflow-hidden rounded-[18px] shadow-[0_40px_80px_-30px_rgb(0_0_0/.45),0_0_0_1px_rgb(0_0_0/.06)]"
              style={{ marginLeft: -W / 2, zIndex: 10 - Math.abs(Math.round(o)) }}
              initial={{ opacity: 0, y: 120, rotate: o * 4, scale: 0.85, filter: "blur(8px)" }}
              animate={{
                opacity: 1,
                x: o * 150 * spread + mx * 18 * (o + 0.5),
                y: Math.abs(o) * 22 * (hover ? 0.6 : 1) - (hover && o === 0 ? 12 : 0),
                rotate: o * 7 * spread,
                scale: 1 - Math.abs(o) * 0.04,
                filter: "blur(0px)",
              }}
              exit={{ opacity: 0, y: -40, scale: 0.9, filter: "blur(10px)", transition: { duration: 0.35 } }}
              transition={{ type: "spring", stiffness: 140, damping: 20, delay: Math.abs(o) * 0.06 }}
            >
              <ScaledSlide width={W} slide={s} doc={p} index={i} total={p.slides.length} />
            </motion.div>
          );
        })}
      </AnimatePresence>
      <div className="absolute inset-x-0 bottom-0 flex justify-center gap-1.5">
        {DECK_TEMPLATES.map((id, i) => (
          <button
            key={id}
            onClick={() => setTi(i)}
            aria-label={`Show ${id}`}
            className={cn("h-1.5 rounded-full transition-all duration-500", i === ti ? "w-6 bg-ink" : "w-1.5 bg-line-2 hover:bg-muted")}
          />
        ))}
      </div>
    </div>
  );
}

export function Hero() {
  const { scrollY } = useScroll();
  const y = useSpring(useTransform(scrollY, [0, 800], [0, 140]), { stiffness: 120, damping: 30 });
  const fade = useTransform(scrollY, [0, 600], [1, 0.2]);
  return (
    <section className="relative overflow-hidden pt-32 pb-16">
      <HeroShader className="absolute inset-0 -z-10 h-[115%]" />
      <motion.div style={{ y, opacity: fade }} className="mx-auto flex max-w-5xl flex-col items-center px-6 text-center">
        <motion.a
          href={REPO_URL}
          target="_blank"
          rel="noreferrer"
          initial={{ opacity: 0, y: 10, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="group mb-7 inline-flex items-center gap-2 rounded-full bg-panel/80 py-1 pr-3 pl-1 text-[13px] text-ink-2 shadow-sm backdrop-blur"
        >
          <span className="rounded-full bg-ink px-2 py-0.5 text-[11px] font-semibold tracking-wide text-bg">NEW</span>
          Open source, MIT licensed, free forever
          <Star size={13} className="text-accent transition-transform duration-500 group-hover:rotate-[72deg]" />
        </motion.a>

        <h1 className="text-[clamp(3rem,8.4vw,7.4rem)] leading-[0.92] font-semibold tracking-[-0.045em] text-balance">
          <SplitWords text={"Carousels that\n*stop* the scroll."} immediate delay={0.1} />
        </h1>

        <motion.p
          initial={{ opacity: 0, y: 14, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.55 }}
          className="mt-6 max-w-xl text-[18px] leading-relaxed text-ink-2 text-pretty"
        >
          Slyd is a free carousel maker built for laptops. Start from templates, stock photos, brand kits and real textures, then export
          pixel-perfect PNG, PDF or ZIP in one click.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.7 }}
          className="mt-8 flex flex-wrap items-center justify-center gap-3"
        >
          <MagneticLink href="/app" cursor="Create">
            Start creating, it&apos;s free
            <ArrowRight size={17} className="transition-transform duration-300 group-hover:translate-x-1" />
          </MagneticLink>
          <MagneticLink href="#templates" variant="soft" cursor="Look">
            Browse templates
          </MagneticLink>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1, duration: 1 }}
          className="mt-6 flex items-center gap-4 font-mono text-[11px] tracking-[.12em] text-muted uppercase"
        >
          <span>No sign-up</span>
          <span className="h-1 w-1 rounded-full bg-muted/50" />
          <span>Works offline</span>
          <span className="h-1 w-1 rounded-full bg-muted/50" />
          <span>Your files stay local</span>
        </motion.div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 60 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.5 }}
        className="mt-6 origin-top scale-[.62] sm:scale-[.8] lg:scale-100"
      >
        <DeckFan />
      </motion.div>
    </section>
  );
}
