"use client";

import { useEffect } from "react";
import { BASE_PATH } from "@/lib/site";

/** Registers /sw.js in production so Slyd runs from the browser's cache after the first visit. */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    // Static hosting under a sub-folder (GitHub Pages) skips the offline cache: the desktop app is the offline Slyd.
    if (BASE_PATH) return;
    const register = () => navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {});
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
  }, []);
  return null;
}
