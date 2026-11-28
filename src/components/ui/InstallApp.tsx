"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { MonitorDown, X } from "lucide-react";
import { DESKTOP_DOWNLOADS, withBase } from "@/lib/site";
import { DesktopDownload, useDesktopOS, useIsDesktopApp } from "./DesktopDownload";
import { LogoMark } from "./Logo";
import { cn } from "./cn";

/**
 * Points people using Slyd in a web browser to the desktop app (Windows, Mac, Linux).
 * Hidden inside the desktop app and on phones and tablets.
 */
function useOffer() {
  const os = useDesktopOS();
  const inApp = useIsDesktopApp();
  return !inApp && os !== "other" ? os : null;
}

/** Header button: a direct download for the visitor's OS. */
export function InstallButton({ className }: { className?: string }) {
  const os = useOffer();
  if (!os) return null;
  const href = os === "windows" ? DESKTOP_DOWNLOADS.windows.file : os === "linux" ? DESKTOP_DOWNLOADS.linux.file : withBase("/#self-host");
  return (
    <a href={href} className={cn("inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-[13px] font-medium text-ink-2 transition hover:bg-line hover:text-ink", className)} title="Get the Slyd desktop app">
      <MonitorDown size={15} /> Desktop app
    </a>
  );
}

const DISMISS_KEY = "slyd-install-dismissed";
const SNOOZE_MS = 1000 * 60 * 60 * 24 * 21;
const NAMES = { windows: "Windows", mac: "Mac", linux: "Linux" } as const;

/** A one-time card in the corner, a few seconds after the dashboard opens. "Not now" hides it for three weeks. */
export function InstallCard() {
  const os = useOffer();
  const [show, setShow] = useStateDelayed(os !== null, 4000);

  const dismiss = () => {
    setShow(false);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {}
  };

  return (
    <AnimatePresence>
      {show && os && (
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.97 }}
          transition={{ type: "spring", stiffness: 380, damping: 32 }}
          className="fixed right-6 bottom-6 z-40 w-[360px] rounded-2xl bg-panel p-4 shadow-xl ring-1 ring-line"
          role="dialog"
          aria-label="Get the Slyd desktop app"
        >
          <button onClick={dismiss} className="absolute top-3 right-3 grid h-7 w-7 place-items-center rounded-lg text-muted hover:bg-line hover:text-ink" aria-label="Close">
            <X size={14} />
          </button>
          <div className="flex gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-bg ring-1 ring-line">
              <LogoMark className="h-7 w-7" />
            </span>
            <div className="min-w-0 pr-5">
              <div className="text-[14px] font-semibold tracking-tight">Slyd for {NAMES[os]}</div>
              <p className="mt-1 text-[12.5px] leading-relaxed text-muted">
                The same Slyd as a desktop app: works offline, and includes its own MCP server so your AI agent can make carousels right on your computer.
              </p>
            </div>
          </div>
          <DesktopDownload className="mt-4 [&_a.h-11]:h-9 [&_a.h-11]:text-[13px]" />
          <button onClick={dismiss} className="mt-1 h-8 rounded-lg px-2 text-[12.5px] text-ink-2 hover:bg-line">
            Not now
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** true after `delay` ms when `want` holds, unless the user snoozed the card recently. */
function useStateDelayed(want: boolean, delay: number): [boolean, (v: boolean) => void] {
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (!want) return;
    let snoozed = false;
    try {
      snoozed = Date.now() - Number(localStorage.getItem(DISMISS_KEY) ?? 0) < SNOOZE_MS;
    } catch {}
    if (snoozed) return;
    const t = setTimeout(() => setShow(true), delay);
    return () => clearTimeout(t);
  }, [want, delay, setShow]);
  return [show, setShow];
}
