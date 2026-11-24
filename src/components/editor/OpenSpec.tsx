"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Check, Image as ImageIcon, LayoutTemplate, Loader2, Sparkles } from "lucide-react";
import { LogoMark } from "@/components/ui/Logo";
import { cn } from "@/components/ui/cn";
import { CarouselSpec } from "@/lib/spec/schema";
import { compileSpec, type PendingPhoto } from "@/lib/spec/compile";
import { decodeSpec } from "@/lib/spec/link";
import { defaultProvider, getKeys, getProvider } from "@/lib/stock";
import { getPref, listProjects, previousVersionKey, saveProject, setPref } from "@/lib/storage";
import type { BrandKit, Project, Theme } from "@/lib/model/types";

type Step = "read" | "build" | "photos" | "save";
const STEPS: { id: Step; label: string; icon: typeof Check }[] = [
  { id: "read", label: "Reading the carousel", icon: Sparkles },
  { id: "build", label: "Laying out slides", icon: LayoutTemplate },
  { id: "photos", label: "Finding photos", icon: ImageIcon },
  { id: "save", label: "Saving to your browser", icon: Check },
];

/** Small stable fingerprint (FNV-1a) of a spec, to tell a re-opened link from a new version. */
const fingerprint = (x: unknown) => {
  const str = JSON.stringify(x);
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 0x01000193);
  return (h >>> 0).toString(36);
};

const within = <T,>(p: Promise<T>, ms: number) => Promise.race([p, new Promise<never>((_, rej) => setTimeout(() => rej(new Error("timeout")), ms))]);

/**
 * Find a real stock photo for each photo described in words. The preferred
 * library (Unsplash/Pexels if the user added a key, else Openverse) and
 * Wikimedia Commons are queried in parallel; the first good answer wins within
 * a short budget, and anything not found keeps its placeholder.
 */
async function resolvePhotos(project: Project, pending: PendingPhoto[], onProgress: (done: number) => void) {
  const keys = getKeys();
  const primary = getProvider(defaultProvider());
  const backup = getProvider("wikimedia");
  type Photo = Awaited<ReturnType<typeof primary.search>>["photos"][number];
  const memo = new Map<string, Promise<Photo | null>>();
  const find = (query: string, portrait: boolean) => {
    const k = `${query}|${portrait}`;
    if (!memo.has(k)) {
      const orientation = portrait ? ("portrait" as const) : ("landscape" as const);
      const a = within(primary.search(query, 1, { orientation, key: keys[primary.id] }), 4500).then((r) => r.photos[0] ?? null);
      const b = within(backup.search(query, 1, { orientation }), 6500).then((r) => r.photos[0] ?? null);
      // Prefer the primary library, but don't wait on it more than 1.2s after the backup has an answer.
      const aOk = a.then((h) => h ?? Promise.reject(new Error("none")));
      const bLate = b.then((h) => (h ? new Promise<Photo>((res) => setTimeout(() => res(h), 1200)) : Promise.reject(new Error("none"))));
      memo.set(k, Promise.any([aOk, bLate]).catch(() => null));
    }
    return memo.get(k)!;
  };
  let done = 0;
  await Promise.all(
    pending.map(async (p) => {
      const hit = await find(p.query, p.target === "background");
      if (hit) {
        hit.track?.();
        const slide = project.slides.find((s) => s.id === p.slideId);
        if (slide && p.target === "background" && slide.background.kind === "image") {
          slide.background.src = hit.full;
          slide.background.credit = hit.credit;
        } else if (slide) {
          const el = slide.elements.find((e) => e.id === p.target);
          if (el?.type === "image") {
            el.src = hit.full;
            el.credit = hit.credit;
          }
        }
      }
      onProgress(++done);
    }),
  );
}

/** Set when someone downloads the desktop app here, or picks "Always open links in the app". */
export const HAS_APP_KEY = "slyd-has-desktop-app";
const APP_PREF = "slyd-open-links-in-app";
const readLocal = (k: string) => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};
const writeLocal = (k: string, v: string) => {
  try {
    if (v) localStorage.setItem(k, v);
    else localStorage.removeItem(k);
  } catch {}
};
/** Offer the app only on the web, on a computer, to someone who has (probably) got it. */
const wantsAppChoice = () =>
  !/SlydDesktop|Android|iPhone|iPad/.test(navigator.userAgent) && (readLocal(HAS_APP_KEY) === "1" || readLocal(APP_PREF) === "always");

export function OpenSpec() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("read");
  const [photos, setPhotos] = useState<{ done: number; total: number }>({ done: 0, total: 0 });
  const [error, setError] = useState<{ title: string; details: string[] } | null>(null);
  const [updating, setUpdating] = useState(false);
  const [handoff, setHandoff] = useState<{ link: string; run: () => void } | null>(null);
  const [sent, setSent] = useState(false);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    const hash = window.location.hash;
    const path = window.location.pathname;
    // Clear the fragment right away: the carousel's text shouldn't linger in history.
    history.replaceState(null, "", path);
    const run = () => openHere(hash);
    // People with the desktop app can send links from the website straight into it.
    if (hash.length >= 4 && wantsAppChoice()) {
      const link = `slyd://open${path.startsWith("/c/") ? path : "/c/carousel"}${hash}`;
      setHandoff({ link, run });
      if (readLocal(APP_PREF) === "always") {
        window.location.href = link;
        setSent(true);
      }
      return;
    }
    run();

    function openHere(hash: string) {
      (async () => {
      if (!hash || hash.length < 4) {
        setError({ title: "This link is empty", details: ["Ask your agent to create the carousel again, or start one from the dashboard."] });
        return;
      }
      let raw: unknown;
      try {
        raw = await decodeSpec(hash);
      } catch {
        setError({ title: "This link looks broken", details: ["It may have been cut off when it was copied. Ask your agent for the link again."] });
        return;
      }
      const parsed = CarouselSpec.safeParse(raw);
      if (!parsed.success) {
        setError({
          title: "Slyd couldn't read this carousel",
          details: parsed.error.issues.slice(0, 6).map((i) => `${i.path.join(".") || "spec"}: ${i.message}`),
        });
        return;
      }
      const spec = parsed.data;
      const open = spec.open && spec.open !== "editor" ? `&open=${spec.open}` : "";
      const print = fingerprint(spec);

      // Same carousel id as one already in this browser → update it in place instead of adding a copy.
      const existing = spec.id ? (await listProjects()).find((p) => p.sourceId === spec.id) : undefined;
      if (existing && existing.sourceHash === print) {
        // The exact same link opened again: keep any edits made since and just open it.
        router.replace(`/app/edit?id=${existing.id}${open}`);
        return;
      }
      if (existing) setUpdating(true);

      setStep("build");
      const [brand, myTheme] = await Promise.all([getPref<BrandKit | undefined>("brand", undefined), getPref<Theme | undefined>("myTheme", undefined)]);
      const { project, pending } = compileSpec(spec, existing?.brand ?? brand, myTheme);
      project.sourceHash = print;
      if (pending.length) {
        setStep("photos");
        setPhotos({ done: 0, total: pending.length });
        await resolvePhotos(project, pending, (done) => setPhotos({ done, total: pending.length }));
      }
      setStep("save");
      if (existing) {
        await setPref(previousVersionKey(existing.id), existing);
        await saveProject({ ...project, id: existing.id, createdAt: existing.createdAt, updatedAt: Date.now() });
        router.replace(`/app/edit?id=${existing.id}&updated=1${open}`);
        return;
      }
      await saveProject(project);
      router.replace(`/app/edit?id=${project.id}${open}`);
      })().catch((e) => setError({ title: "Something went wrong", details: [String((e as Error)?.message ?? e)] }));
    }
  }, [router]);

  const toApp = (always: boolean) => {
    if (!handoff) return;
    if (always) writeLocal(APP_PREF, "always");
    window.location.href = handoff.link;
    setSent(true);
  };
  const here = () => {
    if (!handoff) return;
    writeLocal(APP_PREF, "");
    const { run } = handoff;
    setHandoff(null);
    run();
  };

  const idx = STEPS.findIndex((s) => s.id === step);

  return (
    <div className="grid min-h-screen place-items-center px-6">
      <AnimatePresence mode="wait">
        {handoff ? (
          <motion.div key="choose" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="w-full max-w-sm text-center">
            <LogoMark className="mx-auto h-14 w-14" />
            <h1 className="mt-6 text-[22px] font-semibold tracking-tight">{sent ? "Opened in the Slyd app" : "Open this carousel in…"}</h1>
            {sent ? (
              <>
                <p className="mt-2 text-[13.5px] leading-relaxed text-muted">Your carousel is in the app. You can close this tab.</p>
                <div className="mt-6 flex flex-col gap-2">
                  <button onClick={() => toApp(false)} className="h-11 rounded-xl bg-panel text-[14px] font-medium ring-1 ring-line hover:ring-line-2">
                    Nothing happened? Try again
                  </button>
                  <button onClick={here} className="h-10 rounded-xl text-[13px] text-ink-2 hover:bg-line">
                    Open it here in the browser instead
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="mt-2 text-[13.5px] leading-relaxed text-muted">The Slyd app keeps it with your other carousels, on your computer.</p>
                <div className="mt-6 flex flex-col gap-2">
                  <button onClick={() => toApp(false)} className="h-11 rounded-xl bg-accent text-[14px] font-medium text-accent-ink hover:opacity-90">
                    The Slyd app
                  </button>
                  <button onClick={here} className="h-11 rounded-xl bg-panel text-[14px] font-medium ring-1 ring-line hover:ring-line-2">
                    This browser
                  </button>
                  <button onClick={() => toApp(true)} className="mt-1 text-[12.5px] text-muted underline decoration-line-2 underline-offset-4 hover:text-ink">
                    Always open links in the app
                  </button>
                </div>
              </>
            )}
          </motion.div>
        ) : error ? (
          <motion.div key="err" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md rounded-3xl bg-panel p-7 shadow-md">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-red-500/10 text-red-500">
              <AlertTriangle size={18} />
            </span>
            <h1 className="mt-4 text-[20px] font-semibold tracking-tight">{error.title}</h1>
            <ul className="mt-3 flex flex-col gap-1.5">
              {error.details.map((d) => (
                <li key={d} className="rounded-lg bg-panel-2 px-3 py-2 font-mono text-[12px] leading-relaxed text-ink-2">
                  {d}
                </li>
              ))}
            </ul>
            <div className="mt-6 flex gap-2">
              <Link href="/app" className="rounded-xl bg-ink px-4 py-2 text-[13px] font-medium text-bg">
                Go to dashboard
              </Link>
              <Link href="/agents" className="rounded-xl px-4 py-2 text-[13px] text-ink-2 hover:bg-line">
                Agent docs
              </Link>
            </div>
          </motion.div>
        ) : (
          <motion.div key="load" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="flex w-full max-w-sm flex-col items-center">
            <motion.div animate={{ rotate: [0, -8, 8, 0], scale: [1, 1.06, 1] }} transition={{ repeat: Infinity, duration: 1.6 }}>
              <LogoMark className="h-14 w-14" />
            </motion.div>
            <h1 className="mt-6 text-[22px] font-semibold tracking-tight">
              {updating ? "Updating" : "Opening"} your <span className="font-serif font-normal italic text-accent">carousel</span>
            </h1>
            <ul className="mt-6 flex w-full flex-col gap-2">
              {STEPS.map((s, i) => {
                const state = i < idx ? "done" : i === idx ? "active" : "todo";
                return (
                  <li key={s.id} className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] transition-colors", state === "active" ? "bg-panel shadow-sm" : "")}>
                    <span className={cn("grid h-6 w-6 place-items-center rounded-full", state === "done" ? "bg-accent text-accent-ink" : state === "active" ? "bg-accent-soft text-accent" : "bg-line text-muted")}>
                      {state === "done" ? <Check size={13} strokeWidth={3} /> : state === "active" ? <Loader2 size={13} className="animate-spin" /> : <s.icon size={12} />}
                    </span>
                    <span className={state === "todo" ? "text-muted" : "text-ink"}>{s.label}</span>
                    {s.id === "photos" && photos.total > 0 && (
                      <span className="ml-auto font-mono text-[11px] text-muted tabular-nums">
                        {photos.done}/{photos.total}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
            <p className="mt-6 text-center text-[12px] text-muted">Everything happens in your browser. Nothing is uploaded.</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
