// Renders content/ into ./dist: pages/*.yml patch the Framer export; work/ and thought/ via render.mjs.
// (was) Renders content/pages/*.yml into ./dist (a patched copy of ./site). Run: npm run build
// Each field's text is replaced wherever its original value (content/pages/.baseline.json,
// i.e. what the Framer export shipped with) appears in the exported HTML and JS bundles.
import fs from 'node:fs/promises';
import path from 'node:path';
import YAML from 'yaml';
import { renderCollections, HARD_NAV } from './render.mjs';

const SRC = path.resolve('site');
const OUT = path.resolve('dist');
const TEXT = /\.(html|mjs|js|json)$/;
const baseline = JSON.parse(await fs.readFile('content/pages/.baseline.json', 'utf8'));

// Longest originals first so short strings ("Ase!") can't clobber longer ones.
const jobs = [];
for (const page of Object.keys(baseline)) {
  const current = YAML.parse(await fs.readFile(`content/pages/${page}.yml`, 'utf8'));
  for (const [key, from] of Object.entries(baseline[page])) {
    const to = current[key];
    if (typeof to === 'string' && to !== '' && to !== from) jobs.push({ page, key, from, to });
  }
}
jobs.sort((a, b) => b.from.length - a.from.length);

const escHtml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escJs = (s) => s.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
const escJson = (s) => JSON.stringify(s).slice(1, -1);

await fs.rm(OUT, { recursive: true, force: true });
await fs.cp(SRC, OUT, { recursive: true });

const counts = new Map(jobs.map((j) => [j, 0]));
async function walk(dir) {
  for (const e of await fs.readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, e.name);
    if (e.isDirectory()) { await walk(file); continue; }
    if (!TEXT.test(e.name)) continue;
    let text = await fs.readFile(file, 'utf8');
    const orig = text;
    const esc = e.name.endsWith('.html') ? escHtml : e.name.endsWith('.json') ? escJson : escJs;
    for (const j of jobs) {
      const from = e.name.endsWith('.html') ? escHtml(j.from) : j.from;
      const n = text.split(from).length - 1;
      if (!n) continue;
      text = text.split(from).join(esc(j.to));
      counts.set(j, counts.get(j) + n);
    }
    if (text !== orig) await fs.writeFile(file, text);
  }
}
await walk(OUT);

// Work & Thought are rendered from content/ without the Framer runtime.
await fs.rm(path.join(OUT, 'work'), { recursive: true, force: true });
await fs.rm(path.join(OUT, 'thought'), { recursive: true, force: true });
const n = await renderCollections(OUT);
for (const f of ['index.html', 'contact.html']) {
  const p = path.join(OUT, f);
  await fs.writeFile(p, (await fs.readFile(p, 'utf8')).replace(/<head[^>]*>/, (m) => m + HARD_NAV));
}
console.log(`rendered ${n.work} work, ${n.thoughts} thought`);

for (const [j, n] of counts) console.log(`${j.page}.${j.key}: ${n} replacement(s)`);
if (!jobs.length) console.log('No content changes; dist is a plain copy of site.');
