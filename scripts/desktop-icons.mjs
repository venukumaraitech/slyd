// App icons for the desktop build, from src/app/icon.svg.  Run: node scripts/desktop-icons.mjs
//   desktop/build/icon-mac.png  1024px on the macOS grid (824px tile, transparent margin, soft shadow)
//   desktop/build/icon.ico      Windows, 16–256px
//   desktop/build/icon.png      Linux and the window icon, 512px
import sharp from "sharp";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const svg = readFileSync("src/app/icon.svg", "utf8");
const out = "desktop/build";
mkdirSync(out, { recursive: true });
const png = (size, src = svg) => sharp(Buffer.from(src), { density: Math.max(72, (72 * size) / 64) }).resize(size, size).png({ compressionLevel: 9 }).toBuffer();

// macOS: Apple's template puts an 824px rounded tile in a 1024px canvas (radius ≈ 185px).
const tile = svg.replace('<rect width="64" height="64" rx="16"', '<rect width="64" height="64" rx="14.4"');
const shadow = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024"><defs><filter id="f" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="14"/></filter></defs><rect x="100" y="112" width="824" height="824" rx="185" fill="#000" opacity=".32" filter="url(#f)"/></svg>`,
);
const mac = await sharp(shadow)
  .composite([{ input: await png(824, tile), left: 100, top: 100 }])
  .png({ compressionLevel: 9 })
  .toBuffer();
writeFileSync(`${out}/icon-mac.png`, mac);

writeFileSync(`${out}/icon.png`, await png(512));

const sizes = [16, 24, 32, 48, 64, 128, 256];
const images = await Promise.all(sizes.map((s) => png(s)));
const header = Buffer.alloc(6 + 16 * sizes.length);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(sizes.length, 4);
let offset = header.length;
sizes.forEach((s, i) => {
  const e = 6 + i * 16;
  header.writeUInt8(s % 256, e); // 0 means 256
  header.writeUInt8(s % 256, e + 1);
  header.writeUInt16LE(1, e + 4);
  header.writeUInt16LE(32, e + 6);
  header.writeUInt32LE(images[i].length, e + 8);
  header.writeUInt32LE(offset, e + 12);
  offset += images[i].length;
});
writeFileSync(`${out}/icon.ico`, Buffer.concat([header, ...images]));
console.log("desktop icons written");
