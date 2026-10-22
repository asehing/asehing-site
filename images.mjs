// Static hosting ignores Framer's "?scale-down-to=512" resize query, so the browser downloads (and decodes) the full
// 2-3 MB PNG for every thumbnail — dozens of them at once break the Work grid. Generate 512/1024/2048px WebP copies
// and point every srcset at them (path-based: /_fr/fu/images/_s512/<file>.webp). Runs after build.mjs.
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const OUT = path.resolve('dist');
const DIR = path.join(OUT, '_fr/fu/images');
const WIDTHS = [512, 1024, 2048];

export const rewriteSrcset = (text) =>
  text.replace(/(\/_fr\/fu\/images\/)([A-Za-z0-9_-]+\.(?:png|jpe?g))\?scale-down-to=(512|1024|2048)\b/g, '$1_s$3/$2.webp?scale-down-to=$3');

let made = 0;
for (const name of await fs.readdir(DIR)) {
  if (!/\.(png|jpe?g)$/i.test(name)) continue;
  for (const w of WIDTHS) {
    const dest = path.join(DIR, `_s${w}`, `${name}.webp`);
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await sharp(path.join(DIR, name)).resize({ width: w, withoutEnlargement: true }).webp({ quality: 80 }).toFile(dest);
    made++;
  }
}

let changed = 0;
async function walk(dir) {
  for (const e of await fs.readdir(dir, { withFileTypes: true })) {
    const f = path.join(dir, e.name);
    if (e.isDirectory()) { await walk(f); continue; }
    if (!/\.(html|mjs|js|json)$/.test(e.name)) continue;
    const src = await fs.readFile(f, 'utf8'), out = rewriteSrcset(src);
    if (out !== src) { await fs.writeFile(f, out); changed++; }
  }
}
await walk(OUT);
console.log(`images: ${made} resized files, ${changed} text files re-pointed`);
