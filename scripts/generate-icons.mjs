import { mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const OUT_DIR = path.resolve("public/icons");
const BG = { r: 15, g: 23, b: 42, alpha: 1 }; // slate-900 — matches theme color
const FG = "#ffffff";

const LOGO_SVG = (size) =>
  `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100">
  <rect width="100" height="100" fill="rgb(15,23,42)" />
  <text x="50" y="62" text-anchor="middle" font-family="system-ui, sans-serif"
        font-size="44" font-weight="700" fill="${FG}">EP</text>
</svg>
`.trim();

async function renderSolid(size, outName) {
  const buf = Buffer.from(LOGO_SVG(size));
  await sharp(buf).png().toFile(path.join(OUT_DIR, outName));
}

async function renderMaskable(size, outName) {
  // Maskable icons need safe-zone padding (inner 80%). Pad the logo.
  const padded = Math.round(size * 0.8);
  const offset = Math.round((size - padded) / 2);
  const logoBuf = Buffer.from(LOGO_SVG(padded));
  const logoPng = await sharp(logoBuf).png().toBuffer();
  await sharp({
    create: { width: size, height: size, channels: 4, background: BG },
  })
    .composite([{ input: logoPng, top: offset, left: offset }])
    .png()
    .toFile(path.join(OUT_DIR, outName));
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  await renderSolid(192, "icon-192.png");
  await renderSolid(512, "icon-512.png");
  await renderMaskable(512, "icon-maskable.png");
  console.log("icons generated in", OUT_DIR);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
