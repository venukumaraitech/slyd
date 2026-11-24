"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { Download } from "lucide-react";
import { DESKTOP_DOWNLOADS, RELEASES_URL } from "@/lib/site";
import { MagneticLink } from "./Button";
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

const OS_NAME = { windows: "Windows", mac: "Mac", linux: "Linux" } as const;

/**
 * The main download for the visitor's computer: Windows installer, Apple-silicon Mac
 * (Intel and Linux ARM are listed in the #self-host section), Linux AppImage.
 * null on phones and tablets, where the web app is the way in.
 */
export function useDesktopDownload(): { href: string; os: string } | null {
  const os = useDesktopOS();
  if (os === "other") return null;
  const href = os === "windows" ? D.windows.file : os === "mac" ? D.macArm.file : D.linux.file;
  return { href, os: OS_NAME[os] };
}

/** Wraps a download link so the site remembers the visitor has the app. */
export function TrackDownload({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span onClickCapture={markDownloaded} className={cn("contents", className)}>
      {children}
    </span>
  );
}

/** Label and target for a "Download" button; phones and tablets go to the download section. */
export function useDownloadCTA() {
  const dl = useDesktopDownload();
  return dl ? { href: dl.href, label: `Download for ${dl.os}`, short: "Download" } : { href: "/#self-host", label: "Download Slyd", short: "Download" };
}

/** The big "Download for <your OS>" button used across the landing page. */
export function DownloadButton({ className, variant, cursor = "Get" }: { className?: string; variant?: "primary" | "soft"; cursor?: string }) {
  const cta = useDownloadCTA();
  const isFile = cta.href.startsWith("http");
  return (
    <TrackDownload>
      <MagneticLink href={cta.href} download={isFile} variant={variant} cursor={cursor} className={className}>
        <Download size={17} /> {cta.label}
      </MagneticLink>
    </TrackDownload>
  );
}
