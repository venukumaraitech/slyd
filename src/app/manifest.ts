import type { MetadataRoute } from "next";
import { withBase as b } from "@/lib/site";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Slyd — Carousel maker",
    short_name: "Slyd",
    description: "Free, open source carousel maker for Instagram, LinkedIn and X.",
    id: b("/app"),
    start_url: b("/app"),
    scope: b("/"),
    display: "standalone",
    categories: ["design", "productivity", "social"],
    shortcuts: [
      { name: "New carousel", url: b("/app?template=blank"), icons: [{ src: b("/icon-192.png"), sizes: "192x192" }] },
      { name: "Connect an AI agent", short_name: "AI agents", url: b("/agents"), icons: [{ src: b("/icon-192.png"), sizes: "192x192" }] },
    ],
    background_color: "#f3f0e9",
    theme_color: "#141311",
    icons: [
      { src: b("/icon-192.png"), sizes: "192x192", type: "image/png" },
      { src: b("/icon-512.png"), sizes: "512x512", type: "image/png" },
      { src: b("/icon-512.png"), sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
