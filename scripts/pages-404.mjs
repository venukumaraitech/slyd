// GitHub Pages has no rewrites, so it serves out/404.html for any unknown address.
// Carousel links (<base>/c/<name>#s=…) are sent on to the editor's open page with the
// carousel (#fragment) intact; anything else gets a small "not found" page.
import { writeFileSync } from "node:fs";

const base = (process.env.NEXT_PUBLIC_BASE_PATH || "").replace(/\/$/, "");
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Slyd</title><meta name="robots" content="noindex">
<script>
(function () {
  var base = ${JSON.stringify(base)};
  var rest = location.pathname.slice(base.length);
  var parts = rest.split("/"); // "", "c", "<name>", maybe ""
  var m = parts[1] === "c" && parts[2] && parts.length <= 4 && !parts[3] ? [null, parts[2]] : null;
  if (m) location.replace(base + "/app/new/?n=" + encodeURIComponent(decodeURIComponent(m[1])) + location.hash);
})();
</script>
<style>
:root{color-scheme:light dark;--bg:#f3f0e9;--ink:#141311;--muted:#6b6862}
@media (prefers-color-scheme:dark){:root{--bg:#0d0d0c;--ink:#f3f0e9;--muted:#9a968e}}
body{margin:0;min-height:100vh;display:grid;place-items:center;background:var(--bg);color:var(--ink);font:15px/1.5 system-ui,sans-serif;padding:16px;text-align:center}
h1{font-size:22px;margin:0 0 6px}p{margin:0 0 18px;color:var(--muted)}
a{display:inline-block;background:var(--ink);color:var(--bg);text-decoration:none;padding:10px 16px;border-radius:12px;font-weight:500}
</style></head>
<body><main><h1>This page doesn't exist</h1><p>The link may be old or mistyped.</p><a href="${base}/">Go to Slyd</a></main></body></html>`;
writeFileSync("out/404.html", html);
console.log("wrote out/404.html");
