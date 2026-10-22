// Home: clicking the "Visual Designer" hover-reveal word opens /work (hover animation is kept). Idempotent.
// Part of `npm run build`. The handler lives outside React's root, so Framer hydration is untouched.
import fs from 'node:fs/promises';
import path from 'node:path';

const SELECTOR = '[data-framer-name="Hover Reveal Visual Designer"],.framer-jte153-container';
const block = `<style id="home-link">${SELECTOR}{cursor:pointer}</style>` +
`<script id="home-link-js">(function(){var S='${SELECTOR}';function go(){location.href='/work'}` +
`document.addEventListener('click',function(e){var t=e.target;if(!t||!t.closest)return;` +
`var w=t.closest('span.framer-text');if(t.closest(S)||(w&&w.textContent.trim()==='Visual Designer')){e.preventDefault();e.stopImmediatePropagation();go()}},true);` +
`document.addEventListener('keydown',function(e){if(e.key==='Enter'&&e.target.closest&&e.target.closest(S)){e.preventDefault();go()}},true);` +
`window.addEventListener('load',function(){setTimeout(function(){document.querySelectorAll('.framer-jte153-container').forEach(function(n){` +
`n.setAttribute('role','link');n.setAttribute('tabindex','0');n.setAttribute('aria-label','Visual Designer — see my work')})},1500)})})()</script>`;

const strip = (h) => h.replace(/<style id="home-link">[\s\S]*?<\/style><script id="home-link-js">[\s\S]*?<\/script>/, '');

// usage: node home-link.mjs [dir=dist] [--remove]
// Runs on EVERY page: Framer's client-side router keeps the document of the page you came from (e.g. /work), so the
// handler must already be there when you navigate back to Home. Registered first in <head> so no other
// window-level click handler can swallow the click.
const args = process.argv.slice(2), remove = args.includes('--remove'), dir = args.find((a) => !a.startsWith('--')) || 'dist';
async function* walk(d) {
  for (const e of await fs.readdir(d, { withFileTypes: true })) {
    const f = path.join(d, e.name);
    if (e.isDirectory()) { if (!e.name.startsWith('_')) yield* walk(f); }
    else if (e.name.endsWith('.html')) yield f;
  }
}
let n = 0;
for await (const f of walk(dir)) {
  const html = await fs.readFile(f, 'utf8');
  const out = strip(html);
  const next = remove ? out : out.replace(/<head([^>]*)>/, (m) => `${m}${block}`);
  if (next !== html) { await fs.writeFile(f, next); n++; }
}
console.log(`home link ${remove ? 'removed from' : 'applied to'} ${n} pages in ${dir}`);
