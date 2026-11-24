import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import { googleFontsHref } from "@/lib/model/constants";
import { ServiceWorker } from "@/components/ui/ServiceWorker";
import { Analytics } from "@vercel/analytics/next";
import { AUTHOR, GITLAB_REPO_URL, REPO_URL, SITE_URL } from "@/lib/site";
import { OG_ALT, OG_SIZE } from "@/lib/og";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist", display: "swap" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono", display: "swap" });
const instrument = Instrument_Serif({ subsets: ["latin"], weight: "400", style: ["normal", "italic"], variable: "--font-instrument", display: "swap" });

export const metadata: Metadata = {
  title: "Slyd — Carousels that stop the scroll",
  description:
    "Slyd is a free, open source carousel maker for Instagram, LinkedIn and X. Templates, stock photos, brand kits, textures and pixel-perfect exports — all in your browser.",
  metadataBase: new URL(SITE_URL),
  alternates: { canonical: "/" },
  verification: { google: "IooyyTv3W9f5d54zXwZwzYskzIoT8cjkhlRhOr9BWUs" },
  applicationName: "Slyd",
  authors: [{ name: AUTHOR.name, url: AUTHOR.url }],
  creator: AUTHOR.name,
  publisher: AUTHOR.name,
  keywords: ["carousel maker", "instagram carousel", "linkedin carousel", "open source", "design tool"],
  openGraph: {
    title: "Slyd — Carousels that stop the scroll",
    description: `Free, open source, laptop-first carousel maker by ${AUTHOR.name}.`,
    type: "website",
    siteName: "Slyd",
    url: SITE_URL,
    locale: "en_US",
    images: [{ url: "/og.jpg", secureUrl: `${SITE_URL}/og.jpg`, ...OG_SIZE, type: "image/jpeg", alt: OG_ALT }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Slyd — Carousels that stop the scroll",
    description: "Free, open source, laptop-first carousel maker.",
    images: [{ url: "/og.jpg", alt: OG_ALT }],
  },
};

/** Structured data: tells search engines who built Slyd and links every profile to the author. */
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Slyd",
  applicationCategory: "DesignApplication",
  operatingSystem: "Web",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  license: "https://opensource.org/licenses/MIT",
  codeRepository: [REPO_URL, GITLAB_REPO_URL],
  url: SITE_URL,
  author: {
    "@type": "Person",
    name: AUTHOR.name,
    jobTitle: AUTHOR.title,
    url: AUTHOR.url,
    sameAs: AUTHOR.profiles.filter((p) => p.href !== AUTHOR.url).map((p) => p.href),
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f3f0e9" },
    { media: "(prefers-color-scheme: dark)", color: "#0d0d0c" },
  ],
};

/** Applies the saved theme before paint so there's no flash. */
const themeScript = `(function(){try{var t=localStorage.getItem('slyd:theme');if(!t){t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}document.documentElement.dataset.theme=t}catch(e){document.documentElement.dataset.theme='light'}})()`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${geist.variable} ${geistMono.variable} ${instrument.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Canvas fonts: loaded globally so slides render identically everywhere. */}
        <link rel="stylesheet" href={googleFontsHref()} crossOrigin="anonymous" />
        {/* rel="me" links the site to the author's verified profiles */}
        {AUTHOR.profiles.map((p) => (
          <link key={p.href} rel="me" href={p.href} />
        ))}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      </head>
      <body className="font-sans grain">
        {children}
        {/* Privacy-friendly page views; enable "Analytics" for the project in the Vercel dashboard */}
        {/* Vercel Analytics only exists on Vercel; self-hosted copies skip it. */}
        {process.env.VERCEL === "1" && <Analytics />}
        <ServiceWorker />
      </body>
    </html>
  );
}
