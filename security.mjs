// Post-build hardening for ./dist (runs after build.mjs): per-page script hashes (CSP meta),
// rel=noopener on external links, and removal of leftover third-party preconnects. Run: npm run build
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const OUT = path.resolve('dist');
// browsers hash script text after HTML newline normalisation (CRLF/CR -> LF)
const sha = (s) => `'sha256-${crypto.createHash('sha256').update(s.replace(/\r\n?/g, '\n'), 'utf8').digest('base64')}'`;

async function* walk(dir) {
  for (const e of await fs.readdir(dir, { withFileTypes: true })) {
    const f = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(f);
    else if (e.name.endsWith('.html')) yield f;
  }
}

// Framer's bundle can load its editor bar from framer.com at runtime (third-party code on a public site): disable it.
const sitesDir = path.join(OUT, '_fr/fu/sites');
for (const dir of await fs.readdir(sitesDir)) {
  for (const f of await fs.readdir(path.join(sitesDir, dir))) {
    if (!/^script_main.*\.mjs$/.test(f)) continue;
    const file = path.join(sitesDir, dir, f);
    const js = await fs.readFile(file, 'utf8');
    const patched = js.replaceAll('await import(`https://framer.com/edit/init.mjs`)', '({createEditorBar:()=>null})');
    if (patched !== js) await fs.writeFile(file, patched);
    if (patched.includes('framer.com/edit')) throw new Error('editor loader still present in ' + f);
  }
}

let pages = 0, hashes = 0;
for await (const file of walk(OUT)) {
  let html = await fs.readFile(file, 'utf8');
  html = html
    .replace(/<meta http-equiv="Content-Security-Policy"[^>]*>/g, '')
    .replace(/<link rel="preconnect" href="https:\/\/fonts\.gstatic\.com"[^>]*>/g, '')
    .replace(/<a ([^>]*target="_blank"[^>]*)>/g, (m, attrs) =>
      /\brel=/.test(attrs) ? m.replace(/rel="[^"]*"/, 'rel="noopener noreferrer"') : `<a ${attrs} rel="noopener noreferrer">`);
  // every inline <script> that actually executes needs its hash (data blocks like ld+json / framer/handover do not)
  const list = new Set();
  for (const m of html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)) {
    const type = /(?:^|\s)type="([^"]*)"/.exec(m[1])?.[1];
    if (/\bsrc=/.test(m[1]) || (type && type !== 'module' && type !== 'text/javascript') || !m[2].trim()) continue;
    list.add(sha(m[2]));
  }
  const csp = `script-src 'self' ${[...list].join(' ')}; object-src 'none'; base-uri 'self'`;
  html = html.replace(/<head([^>]*)>/, (m) => `${m}<meta http-equiv="Content-Security-Policy" content="${csp}">`);
  await fs.writeFile(file, html);
  pages++; hashes += list.size;
}
console.log(`security: ${pages} pages, ${hashes} script hashes`);
