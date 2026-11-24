"use client";

import { useSyncExternalStore } from "react";
import { Download } from "lucide-react";
import { DESKTOP_DOWNLOADS, RELEASES_URL } from "@/lib/site";
import { cn } from "./cn";

/** Remembered so carousel links on this site can offer to open in the app. */
const markDownloaded = () => {
  try {
    localStorage.setItem("slyd-has-desktop-app", "1");
  } catch {}
};

export type DesktopOS = "windows" | "mac" | "linux" | "other";

function detect(): DesktopOS {
  const ua = navigator.userAgent;
  if (/Android|iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return "other";
  if (/Windows/.test(ua)) return "windows";
  if (/Macintosh|Mac OS X/.test(ua)) return "mac";
  if (/Linux|X11|CrOS/.test(ua)) return "linux";
  return "other";
}

/** The visitor's desktop OS ("other" on phones, tablets and during server rendering). */
export function useDesktopOS(): DesktopOS {
  return useSyncExternalStore(
    () => () => {},
    detect,
    () => "other" as DesktopOS,
  );
}

/** true inside the Slyd desktop app itself. */
export function useIsDesktopApp() {
  return useSyncExternalStore(
    () => () => {},
    () => /SlydDesktop/.test(navigator.userAgent),
    () => false,
  );
}

const D = DESKTOP_DOWNLOADS;
type Item = { label: string; file: string };
const primaryFor = (os: DesktopOS): Item[] => (os === "windows" ? [D.windows] : os === "mac" ? [D.macArm, D.macIntel] : os === "linux" ? [D.linux] : []);

/** Download buttons for the visitor's OS first, then links for the others. */
export function DesktopDownload({ className, dark = false }: { className?: string; dark?: boolean }) {
  const os = useDesktopOS();
  const primary = primaryFor(os);
  const others: Item[] = Object.values(D).filter((d) => !primary.includes(d));
  return (
    <div className={className}>
      <div className="flex flex-wrap gap-2">
        {primary.map((d, i) => (
          <a
            key={d.file}
            href={d.file}
            onClick={markDownloaded}
            className={cn(
              "inline-flex h-11 items-center gap-2 rounded-xl px-4 text-[14px] font-medium transition",
              i === 0 ? "bg-accent text-accent-ink hover:opacity-90" : dark ? "bg-bg/10 hover:bg-bg/20" : "bg-panel ring-1 ring-line hover:ring-line-2",
            )}
          >
            <Download size={16} /> Download for {d.label}
          </a>
        ))}
      </div>
      <p className={cn("mt-3 text-[12.5px] leading-relaxed", dark ? "text-bg/55" : "text-muted")}>
        {primary.length ? "Also for " : "For "}
        {others.map((d, i) => (
          <span key={d.file}>
            <a href={d.file} onClick={markDownloaded} className="underline decoration-current/30 underline-offset-4 hover:decoration-current">
              {d.label}
            </a>
            {i < others.length - 2 ? ", " : i === others.length - 2 ? " and " : ""}
          </span>
        ))}
        .{" "}
        <a href={RELEASES_URL} target="_blank" rel="noreferrer" className="underline decoration-current/30 underline-offset-4 hover:decoration-current">
          All releases
        </a>
      </p>
    </div>
  );
}
