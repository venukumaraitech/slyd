/**
 * Site-wide constants: repository and author credit.
 * Forks: set NEXT_PUBLIC_REPO_URL (and keep the author credit, per the license).
 */

/** Primary home is GitHub; GitLab is a mirror. */
export const GITHUB_REPO_URL = "https://github.com/venukumaraitech/slyd";
export const GITLAB_REPO_URL = "https://gitlab.com/venukumar.ai/slyd";
export const REPO_URL = process.env.NEXT_PUBLIC_REPO_URL || GITHUB_REPO_URL;
export const ISSUES_URL = `${REPO_URL}/issues`;
export const LICENSE_URL = `${REPO_URL}/blob/main/LICENSE`;

/** Public URL of the deployed site: canonical links, share cards, sitemap. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://tryslyd.vercel.app").replace(/\/$/, "");

/**
 * Tag outbound links to the author's own site so its analytics can attribute
 * visits to Slyd ("where did this traffic come from?").
 */
export function tracked(url: string, placement: string) {
  const u = new URL(url);
  u.searchParams.set("utm_source", "slyd");
  u.searchParams.set("utm_medium", "referral");
  u.searchParams.set("utm_campaign", "credit");
  u.searchParams.set("utm_content", placement);
  return u.toString();
}

export const AUTHOR = {
  name: "Venu Kumar Mutyala",
  title: "Gen AI Engineer",
  url: "https://venukumar.vercel.app",
  /** Public profiles, as listed on the portfolio. Rendered with rel="me". */
  profiles: [
    { label: "Portfolio", href: "https://venukumar.vercel.app" },
    { label: "LinkedIn", href: "https://www.linkedin.com/in/venukumarmd" },
    { label: "GitHub", href: "https://github.com/mdvenukumar" },
    { label: "GitLab", href: "https://gitlab.com/venukumar.ai" },
    { label: "Instagram", href: "https://www.instagram.com/itsvenukumar" },
  ],
} as const;

/** Desktop app installers, attached to each GitHub release under fixed names. */
const download = (file: string) => `${GITHUB_REPO_URL}/releases/latest/download/${file}`;
export const RELEASES_URL = `${GITHUB_REPO_URL}/releases/latest`;
export const DESKTOP_MCP_URL = "http://localhost:3737/mcp";
export const DESKTOP_DOWNLOADS = {
  windows: { label: "Windows", file: download("Slyd-Setup-x64.exe") },
  macArm: { label: "Mac (Apple silicon)", file: download("Slyd-mac-arm64.dmg") },
  macIntel: { label: "Mac (Intel)", file: download("Slyd-mac-x64.dmg") },
  linux: { label: "Linux (AppImage)", file: download("Slyd-linux-x86_64.AppImage") },
  linuxArm: { label: "Linux ARM (AppImage)", file: download("Slyd-linux-arm64.AppImage") },
} as const;

/**
 * Path prefix when Slyd is served from a sub-folder, e.g. "/slyd" on GitHub Pages
 * (venukumaraitech.github.io/slyd). Next's <Link> and router add it automatically;
 * plain <a href>, the manifest and the service worker use withBase().
 */
export const BASE_PATH = (process.env.NEXT_PUBLIC_BASE_PATH || "").replace(/\/$/, "");
export const withBase = (path: string) => (path.startsWith("/") ? BASE_PATH + path : path);

/** The shared MCP server. Static copies (GitHub Pages) have none of their own and point at the hosted one. */
export const HOSTED_MCP_URL = process.env.NEXT_PUBLIC_MCP_URL || `${SITE_URL}/mcp`;
