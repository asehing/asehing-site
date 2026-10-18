// Mirrors asehing.framer.website into ./site as a static site (run: node mirror.mjs)
import fs from 'node:fs/promises';
import path from 'node:path';

const ORIGIN = 'https://asehing.framer.website';
const OUT = path.resolve('site');
const HOSTS = { 'framerusercontent.com': 'fu', 'fonts.gstatic.com': 'gs' };
const URL_RE = /https:\/\/(framerusercontent\.com|fonts\.gstatic\.com)\/[A-Za-z0-9_\-./%@~+]+(?:\?[A-Za-z0-9_\-=.%]*)?/g;
const TEXT_EXT = /\.(mjs|js|css|json|html)$/;

const seen = new Set();
const queue = [];

const localFor = (u) => {
  const x = new URL(u);
  return path.join(OUT, '_fr', HOSTS[x.hostname], decodeURIComponent(x.pathname));
};

async function save(file, data) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, data);
}

// Framer's CDN serves CMS data via ?range=a-b,c-d; static hosts can't, so fetch the whole
// file and slice the byte ranges in the browser instead.
const RANGE_RE = /(\w+)\.searchParams\.set\(`range`,(\w+)\);let (\w+)=await (\w+)\(\1\);(if\(\3\.status!==200\)throw Error\([^;]*?\);)let (\w+)=await \3\.arrayBuffer\(\)/g;
const sliceRanges = (_, u, o, r, w, check, buf) =>
  `let ${r}=await ${w}(${u});${check}let ${buf}=await(async b=>{b=new Uint8Array(await b.arrayBuffer());` +
  `let p=${o}.split(\`,\`).map(x=>{let[f,t]=x.split(\`-\`).map(Number);return b.subarray(f,t+1)}),` +
  `q=new Uint8Array(p.reduce((s,x)=>s+x.length,0)),k=0;for(let x of p){q.set(x,k);k+=x.length}return q.buffer})(${r})`;

function rewrite(text) {
  return text
    .replace(RANGE_RE, sliceRanges)
    .replaceAll('.href.replace(`/modules/`,`/cms/`)', '.href')
    .replace(/new URL\(`([^`]+)`,`(https:\/\/(?:framerusercontent\.com|fonts\.gstatic\.com)\/[^`]+)`\)/g,
      (_, rel, abs) => `new URL(\`${rel}\`,location.origin+\`${abs}\`)`)
    .replaceAll('https://framerusercontent.com/', '/_fr/fu/')
    .replaceAll('https://fonts.gstatic.com/', '/_fr/gs/');
}

function discover(text, baseUrl) {
  const found = new Set();
  for (const m of text.matchAll(URL_RE)) {
    const u = m[0].replace(/\?.*$/, '');
    if (/\.[A-Za-z0-9]{2,6}$/.test(u)) found.add(u); // skip directory prefixes built at runtime
  }
  // relative module imports inside framer bundles
  for (const m of text.matchAll(/['"`]\.\/([A-Za-z0-9_\-.]+\.(?:mjs|js|json))['"`]/g))
    if (baseUrl) found.add(new URL(m[1], baseUrl).href);
  // new URL(`./x.framercms`, `https://.../module.js`)
  for (const m of text.matchAll(/new URL\(`([^`]+)`,`(https:\/\/[^`]+)`\)/g))
    found.add(new URL(m[1], m[2]).href);
  return found;
}

async function fetchAsset(u) {
  if (seen.has(u)) return;
  seen.add(u);
  const res = await fetch(u);
  if (!res.ok) { console.warn('SKIP', res.status, u); return; }
  const file = localFor(u);
  if (TEXT_EXT.test(u)) {
    const text = await res.text();
    for (const f of discover(text, u)) if (!seen.has(f)) queue.push(f);
    await save(file, rewrite(text));
  } else {
    await save(file, Buffer.from(await res.arrayBuffer()));
  }
}

// 1. pages
const sitemap = await (await fetch(ORIGIN + '/sitemap.xml')).text();
const pages = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].replace(ORIGIN, '') || '/');
for (const p of pages) {
  let html = await (await fetch(ORIGIN + p)).text();
  for (const f of discover(html, null)) queue.push(f);
  html = rewrite(html)
    .replace('</head>', '<style>#__framer-badge-container{display:none!important}</style></head>')
    // drop Framer editor hook + analytics
    .replace(/<script[^>]*src="https:\/\/events\.framer\.com[^>]*><\/script>/g, '')
    .replace(/<link[^>]*framer\.com\/edit\/init\.mjs[^>]*>/g, '')
    .replace(/<script[^>]*>[^<]*framer\.com\/edit\/init\.mjs[^<]*<\/script>/g, '');
  const file = p === '/' ? 'index.html' : p.slice(1) + '.html';
  await save(path.join(OUT, file), html);
  console.log('page', p);
}

// 2. assets (BFS)
while (queue.length) {
  const batch = queue.splice(0, 8);
  await Promise.all(batch.map(fetchAsset));
}
console.log('assets:', seen.size);
