import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { AUTHOR, HOSTED_MCP_URL, ISSUES_URL, REPO_URL, SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy — Slyd",
  description: "How Slyd and the Slyd MCP server handle your data: no accounts, nothing stored on our servers, carousels live in your browser and in the link.",
  alternates: { canonical: "/privacy" },
};

const UPDATED = "18 November 2026";

const sections: { h: string; body: React.ReactNode }[] = [
  {
    h: "The short version",
    body: (
      <>
        <p>Slyd has no accounts and no database. We don&apos;t collect your name, email or the content of your carousels. Your projects are saved in your own browser, and carousels made by AI agents travel inside the link itself.</p>
      </>
    ),
  },
  {
    h: "What we collect",
    body: (
      <ul>
        <li><b>Carousel content:</b> none. Projects are stored in your browser (IndexedDB) and never uploaded to us.</li>
        <li><b>No analytics:</b> the website doesn&apos;t count or track visits, and uses no cookies.</li>
        <li><b>Server logs:</b> the website is hosted on GitHub Pages and the shared MCP server on Vercel. Both keep standard request logs (such as IP address, time and the page requested) for a short period for security and reliability. We don&apos;t use them to track anyone. The desktop app sends nothing anywhere.</li>
      </ul>
    ),
  },
  {
    h: "The MCP server (for AI agents)",
    body: (
      <>
        <p>
          When an AI assistant such as Claude uses the Slyd connector at <code>{HOSTED_MCP_URL.replace(/^https?:\/\//, "")}</code>, it sends the carousel it wants to make (slide text, colours and photo search words). The server turns that into a link and replies straight away. It is stateless: nothing is saved, and requests aren&apos;t logged beyond the hosting logs above.
        </p>
        <p>
          The carousel is packed into the part of the link after the <code>#</code>. Browsers never send that part to a server, so when you open the link, your carousel is read only by your own browser. The server never receives your conversation, chat history, files or anything other than what the assistant passes to the tool.
        </p>
      </>
    ),
  },
  {
    h: "Third parties",
    body: (
      <>
        <p>To find photos, your browser sends your <b>photo search words</b> (never your carousel text) directly to the photo service you use: Openverse, Wikimedia Commons, Picsum, or Unsplash and Pexels if you add your own API key. Some images load through the wsrv.nl image proxy so they can be exported. Fonts load from Google Fonts. Each service has its own privacy policy.</p>
        <p>We don&apos;t sell or share data with anyone else, and Slyd has no advertising.</p>
      </>
    ),
  },
  {
    h: "Retention and your control",
    body: (
      <p>We don&apos;t keep your content, so there is nothing for us to delete. To remove your projects, delete them in the editor or clear this site&apos;s data in your browser. Any API keys you paste into Settings stay in your browser only.</p>
    ),
  },
  {
    h: "Children",
    body: <p>Slyd isn&apos;t directed at children under 13 and doesn&apos;t knowingly collect information from them.</p>,
  },
  {
    h: "Changes",
    body: <p>If this policy changes, we&apos;ll update this page and the date at the top. Slyd is open source, so you can always check what the code does.</p>,
  },
  {
    h: "Contact",
    body: (
      <p>
        Slyd is built and run by {AUTHOR.name}. For privacy questions or to report a security issue, <a href={ISSUES_URL}>open an issue on GitHub</a> or reach out through <a href={AUTHOR.url}>{AUTHOR.url.replace(/^https?:\/\//, "")}</a>. Source code: <a href={REPO_URL}>{REPO_URL.replace(/^https?:\/\//, "")}</a>.
      </p>
    ),
  },
];

export default function Privacy() {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-6 py-5">
        <Logo />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link href="/app" className="inline-flex h-9 items-center gap-1.5 rounded-full bg-ink px-4 text-[13px] font-medium text-bg transition hover:opacity-90">
            Open editor <ArrowRight size={14} />
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 pt-10 pb-24">
        <h1 className="text-[clamp(2.2rem,5vw,3.6rem)] leading-[1] font-semibold tracking-[-0.04em]">
          Privacy <span className="font-serif font-normal italic text-accent">policy</span>
        </h1>
        <p className="mt-4 font-mono text-[12px] tracking-wide text-muted uppercase">Last updated {UPDATED}</p>
        <div className="mt-10 flex flex-col gap-10">
          {sections.map((s) => (
            <section key={s.h}>
              <h2 className="text-[20px] font-semibold tracking-[-0.02em] text-ink">{s.h}</h2>
              <div className="mt-3 flex flex-col gap-3 text-[15.5px] leading-relaxed text-ink-2 [&_a]:text-ink [&_a]:underline [&_a]:decoration-line-2 [&_a]:underline-offset-4 hover:[&_a]:decoration-accent [&_b]:font-medium [&_b]:text-ink [&_code]:rounded [&_code]:bg-panel [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[13px] [&_li]:mt-2 [&_ul]:list-disc [&_ul]:pl-5">
                {s.body}
              </div>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}
