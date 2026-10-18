// Renders content/work/*.md and content/thought/*.md into plain static pages in OUT.
import fs from 'node:fs/promises';
import path from 'node:path';
import YAML from 'yaml';
import { marked } from 'marked';

const esc = (s = '') => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

async function readCollection(dir) {
  const items = [];
  for (const f of await fs.readdir(dir)) {
    if (!f.endsWith('.md')) continue;
    const raw = await fs.readFile(path.join(dir, f), 'utf8');
    const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
    const data = m ? YAML.parse(m[1]) || {} : {};
    const body = m ? m[2].trim() : raw.trim();
    const slug = data.slug || f.replace(/\.md$/, '');
    items.push({ ...data, slug, body });
  }
  return items;
}

const fmtDate = (d) => {
  const dt = d instanceof Date ? d : new Date(d);
  return isNaN(dt) ? '' : dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
};
const slugify = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const CSS = `
:root{--bg:#fff;--fg:#09090b;--mute:#71717a;--line:#e4e4e7;--card:#f4f4f5}
@media(prefers-color-scheme:dark){:root{--bg:#09090b;--fg:#fafafa;--mute:#a1a1aa;--line:#27272a;--card:#18181b}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.65 system-ui,-apple-system,"Segoe UI",sans-serif}
a{color:inherit}.wrap{max-width:1040px;margin:0 auto;padding:0 20px}
header{border-bottom:1px solid var(--line)}header .wrap{display:flex;gap:20px;align-items:center;height:64px}
header .brand{font-weight:600;text-decoration:none;margin-right:auto}header nav{display:flex;gap:20px}
header nav a{text-decoration:none;color:var(--mute)}header nav a[aria-current]{color:var(--fg)}
h1{font-size:clamp(2rem,5vw,3rem);line-height:1.15;margin:48px 0 8px;letter-spacing:-.02em}
.meta{color:var(--mute);margin:0 0 32px}
.filters{display:flex;flex-wrap:wrap;gap:8px;margin:24px 0 32px}
.filters button{font:inherit;border:1px solid var(--line);background:none;color:var(--fg);border-radius:999px;padding:6px 14px;cursor:pointer}
.filters button[aria-pressed=true]{background:var(--fg);color:var(--bg)}.filters span{color:var(--mute);margin-left:4px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:24px}
.card{text-decoration:none}.card[hidden]{display:none}
.card img{width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:12px;background:var(--card);display:block}
.card h2{font-size:1.05rem;margin:12px 0 0}.card p{margin:0;color:var(--mute);font-size:.9rem}
.list{list-style:none;padding:0;margin:32px 0}.list li{border-top:1px solid var(--line)}
.list a{display:flex;justify-content:space-between;gap:24px;padding:18px 0;text-decoration:none}
.list time{color:var(--mute);white-space:nowrap}
article{max-width:680px;margin:0 auto 80px}article img{max-width:100%;height:auto;border-radius:12px}
article blockquote{margin:1.5em 0;padding-left:1em;border-left:3px solid var(--line);color:var(--mute)}
.hero{width:100%;border-radius:12px;margin:0 0 32px;display:block}
.back{display:inline-block;margin-top:32px;color:var(--mute);text-decoration:none}
footer{border-top:1px solid var(--line);color:var(--mute);padding:24px 0;margin-top:64px;font-size:.9rem}
`;

const NAV = [['Home', '/'], ['Work', '/work'], ['Contact', '/contact'], ['Thought', '/thought']];

function layout({ title, description = '', current, main, script = '' }) {
  const nav = NAV.map(([l, h]) => `<a href="${h}"${h === current ? ' aria-current="page"' : ''}>${l}</a>`).join('');
  return `<!doctype html>
<html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title><meta name="description" content="${esc(description)}">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}">
<style>${CSS}</style></head><body>
<header><div class="wrap"><a class="brand" href="/">Ase!</a><nav>${nav}</nav></div></header>
<main class="wrap">${main}</main>
<footer><div class="wrap">©asehing</div></footer>${script}</body></html>`;
}

async function write(out, rel, html) {
  const file = path.join(out, rel);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, html);
}

const FILTER_JS = `<script>
document.querySelectorAll('.filters button').forEach(function(b){b.addEventListener('click',function(){
var c=b.dataset.cat;document.querySelectorAll('.filters button').forEach(function(x){x.setAttribute('aria-pressed',String(x===b))});
document.querySelectorAll('.card').forEach(function(a){a.hidden=c!=='all'&&a.dataset.cat!==c})})});
</script>`;

export async function renderCollections(out) {
  // ---- Work ----
  const work = (await readCollection('content/work')).sort((a, b) =>
    String(b.year).localeCompare(String(a.year)) || String(a.title).localeCompare(String(b.title), undefined, { numeric: true }));
  const cats = [...new Set(work.map((w) => w.category).filter(Boolean))];
  const filters = `<div class="filters"><button data-cat="all" aria-pressed="true">All<span>${work.length}</span></button>` +
    cats.map((c) => `<button data-cat="${slugify(c)}" aria-pressed="false">${esc(c)}<span>${work.filter((w) => w.category === c).length}</span></button>`).join('') + '</div>';
  const cards = work.map((w) => `<a class="card" href="/work/${esc(w.slug)}" data-cat="${slugify(w.category || '')}">` +
    `${w.image ? `<img src="${esc(w.image)}" alt="${esc(w.title)}" loading="lazy">` : ''}<h2>${esc(w.title)}</h2><p>${esc(w.category)} · ${esc(w.year)}</p></a>`).join('');
  await write(out, 'work.html', layout({ title: 'Work — Ase!', description: 'Selected work.', current: '/work',
    main: `<h1>Work</h1>${filters}<div class="grid">${cards}</div>`, script: FILTER_JS }));
  for (const w of work) {
    await write(out, `work/${w.slug}.html`, layout({ title: `${w.title} — Ase!`, description: `${w.category} · ${w.year}`, current: '/work',
      main: `<article><h1>${esc(w.title)}</h1><p class="meta">${esc(w.category)} · ${esc(w.year)}</p>` +
        `${w.image ? `<img class="hero" src="${esc(w.image)}" alt="${esc(w.title)}">` : ''}${marked.parse(w.body || '')}` +
        `<a class="back" href="/work">← Back to work</a></article>` }));
  }

  // ---- Thought ----
  const thoughts = (await readCollection('content/thought')).sort((a, b) => new Date(b.date) - new Date(a.date));
  const list = thoughts.map((t) => `<li><a href="/thought/${esc(t.slug)}"><span>${esc(t.title)}</span><time datetime="${esc(String(t.date instanceof Date ? t.date.toISOString().slice(0, 10) : t.date))}">${fmtDate(t.date)}</time></a></li>`).join('');
  await write(out, 'thought.html', layout({ title: 'Thoughts — Ase!', description: 'Writing.', current: '/thought',
    main: `<h1>Thoughts</h1><ul class="list">${list}</ul>` }));
  for (const t of thoughts) {
    const plain = marked.parse(t.body || '').replace(/<[^>]+>/g, '').slice(0, 160);
    await write(out, `thought/${t.slug}.html`, layout({ title: `${t.title} — Ase!`, description: plain, current: '/thought',
      main: `<article><h1>${esc(t.title)}</h1><p class="meta">${fmtDate(t.date)}</p>` +
        `${t.cover ? `<img class="hero" src="${esc(t.cover)}" alt="">` : ''}${marked.parse(t.body || '')}<a class="back" href="/thought">← Back to thoughts</a></article>` }));
  }

  // ---- sitemap (replaces Framer's) ----
  const urls = ['/', '/work', '/contact', '/thought', ...work.map((w) => `/work/${w.slug}`), ...thoughts.map((t) => `/thought/${t.slug}`)];
  await write(out, 'sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map((u) => `<url><loc>${u}</loc></url>`).join('')}</urlset>\n`);
  return { work: work.length, thoughts: thoughts.length };
}

// Framer's client router would swallow links to /work and /thought and render its own (stale) pages.
export const HARD_NAV = `<script>window.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('a[href]');
if(!a||e.defaultPrevented||e.metaKey||e.ctrlKey||e.shiftKey)return;var u=new URL(a.href,location.href);
if(u.origin===location.origin&&/^\\/(work|thought)(\\/|$)/.test(u.pathname)){e.preventDefault();e.stopImmediatePropagation();location.href=u.href}},true)</script>`;
