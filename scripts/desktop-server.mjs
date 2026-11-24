// Copies Slyd's standalone server build into desktop/server for the desktop app.
// Build first:  STANDALONE=1 NEXT_PUBLIC_SITE_URL=http://localhost:3737 npm run build
import { cpSync, existsSync, rmSync } from "node:fs";
import { join } from "node:path";

const dist = process.env.NEXT_DIST_DIR || ".next";
const standalone = join(dist, "standalone");
const out = join("desktop", "server");
if (!existsSync(join(standalone, "server.js"))) {
  console.error(`No ${standalone}/server.js. Build with STANDALONE=1 first.`);
  process.exit(1);
}
rmSync(out, { recursive: true, force: true });
cpSync(standalone, out, { recursive: true });
cpSync(join(dist, "static"), join(out, dist, "static"), { recursive: true });
cpSync("public", join(out, "public"), { recursive: true });
// Local env files never belong in an installer.
for (const f of [".env", ".env.local", ".env.production", ".env.production.local"]) rmSync(join(out, f), { force: true });
console.log(`Desktop server ready in ${out}`);
