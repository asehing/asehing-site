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


// Detail pages follow the "Thought - Detail" design: Geist, left "Back" rail, 700px column.
const DETAIL_CSS = `
*,*::before,*::after{box-sizing:border-box}
body{margin:0;background:#fff;font-family:"Geist",system-ui,sans-serif;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale}
h1,h2,h3,h4,p{margin:0}
.detail{display:flex;min-height:100vh;max-width:1920px;margin:0 auto}
.rail{width:180px;flex-shrink:0;padding:64px 56px}
.back{display:flex;align-items:center;gap:8px;text-decoration:none;color:rgb(113,113,123);font-size:20px;line-height:1;white-space:nowrap}
.back svg{width:16px;height:16px;flex-shrink:0}
.stage{flex:1 1 0;min-width:0;display:flex;justify-content:center;padding:64px 0 96px}
.col{width:100%;max-width:700px;display:flex;flex-direction:column;gap:32px}
.head{padding:0 32px;display:flex;flex-direction:column;gap:4px}
.head h1{font-size:32px;font-weight:500;color:rgb(38,38,38);letter-spacing:-.02em;line-height:1.2}
.head p{font-size:18px;color:rgb(113,113,123);letter-spacing:.01em;line-height:1.5}
.img{height:400px;padding:8px;border:1px solid rgb(228,228,231);border-radius:14.7px;overflow:hidden}
.img div{height:100%;border:1px solid rgb(212,212,216);border-radius:8px;overflow:hidden;background:#fff}
.img img{width:100%;height:100%;object-fit:cover;display:block}
.body{display:flex;flex-direction:column;gap:24px;padding-top:8px}
.body>*{margin:0;padding:0 32px;font-size:18px;font-weight:400;color:rgb(113,113,123);letter-spacing:.01em;line-height:1.5;text-wrap:balance}
.body>blockquote{border-left:3px solid rgb(159,159,169)}
.body>blockquote p{margin:0}.body>blockquote p+p{margin-top:1.5em}
.body img{max-width:100%;height:auto;border-radius:8px}
.body h2,.body h3{color:rgb(38,38,38);font-weight:500;letter-spacing:-.01em}
.body ul,.body ol{padding-left:56px}
@media(max-width:800px){.detail{flex-direction:column}.rail{width:auto;padding:24px 20px 0}.stage{padding:24px 0 64px}.head,.body>*{padding-left:20px;padding-right:20px}.img{height:auto;aspect-ratio:7/4;margin:0 20px}}
`;
const BACK_ICON = '<svg viewBox="0 0 16 11" fill="none" aria-hidden="true"><path d="M14.5 10.2422V7.24219C14.5 6.42969 13.8438 5.74219 13 5.74219H2.5625L5.53125 8.71094C5.8125 8.99219 5.8125 9.49219 5.53125 9.77344C5.25 10.0547 4.75 10.0547 4.46875 9.77344L0.21875 5.52344C0.09375 5.39844 0 5.17969 0 4.99219C0 4.80469 0.09375 4.61719 0.21875 4.46094L4.46875 0.210938C4.75 -0.0703125 5.25 -0.0703125 5.53125 0.210938C5.8125 0.492188 5.8125 0.992188 5.53125 1.27344L2.5625 4.24219H13C14.6562 4.24219 16 5.58594 16 7.24219V10.2422C16 10.6484 15.6562 10.9922 15.25 10.9922C14.8438 10.9922 14.5 10.6484 14.5 10.2422Z" fill="#71717B"/></svg>';

function detailLayout({ title, description = '', backHref, heading, sub, image, bodyHtml }) {
  return `<!doctype html>
<html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title><meta name="description" content="${esc(description)}">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@100..900&display=swap" rel="stylesheet">
<style>${DETAIL_CSS}</style></head><body>
<div class="detail"><nav class="rail"><a class="back" href="${backHref}">${BACK_ICON}<span>Back</span></a></nav>
<main class="stage"><article class="col"><div class="head"><h1>${esc(heading)}</h1><p>${esc(sub)}</p></div>
${image ? `<div class="img"><div><img src="${esc(image)}" alt=""></div></div>` : ''}
<div class="body">${bodyHtml}</div></article></main></div></body></html>`;
}

// ---- Thought pages: pixel-identical Framer markup (SSR HTML + CSS, no runtime), content swapped in ----
const stripScripts = (html) => html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<link[^>]*rel="modulepreload"[^>]*>/g, '');
const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const iso = (d) => (d instanceof Date ? d : new Date(d)).toISOString().slice(0, 10) + 'T00:00:00.000Z';
const setMeta = (html, title, desc) => html
  .replace(/<title>[^<]*<\/title>/, `<title>${esc(title)}</title>`)
  .replace(/(<meta (?:property="og:title"|name="twitter:title") content=")[^"]*"/g, `$1${esc(title)}"`)
  .replace(/(<meta (?:name="description"|property="og:description"|name="twitter:description") content=")[^"]*"/g, `$1${esc(desc)}"`);

function framerBody(md) {
  return marked.parse(md || '')
    .replace(/<p>/g, '<p dir="auto" class="framer-text framer-styles-preset-15p98y5">')
    .replace(/<blockquote>/g, '<blockquote class="framer-text framer-styles-preset-1oz2nmo">')
    .replace(/<(em|strong|a|li|ul|ol|h[1-6]|code)([ >])/g, '<$1 class="framer-text"$2')
    .replace(/<br\s*\/?>/g, '<br class="framer-text trailing-break">'.replace(' trailing-break', ''))
    .replace(/\n/g, '');
}

async function renderThoughtsFramer(out, thoughts) {
  const SAMPLE = { title: 'Menembus kabut kegagalan', slug: 'menembus-kabut-kegagalan' };
  const detail = stripScripts(await fs.readFile('site/thought/menembus-kabut-kegagalan.html', 'utf8'));
  for (const t of thoughts) {
    let html = detail.split(SAMPLE.title).join(esc(t.title))
      .split(`thought/${SAMPLE.slug}`).join(`thought/${t.slug}`)
      .replace(/<time datetime="[^"]*">[^<]*<\/time>/g, `<time datetime="${iso(t.date)}">${fmtDate(t.date)}</time>`);
    html = html.replace(/(data-framer-name="Content \(CMS\)"[^>]*>)[\s\S]*?(<\/div>)/, (_, a, b) => a + framerBody(t.body) + b);
    const plain = marked.parse(t.body || '').replace(/<[^>]+>/g, '').slice(0, 160);
    await write(out, `thought/${t.slug}.html`, setMeta(html, `${t.title} — Ase!`, plain));
  }
  let list = stripScripts(await fs.readFile('site/thought.html', 'utf8'));
  const rowRe = /<!--\$--><a class="framer-15blm0i[^>]*data-framer-name="Thought Row"[\s\S]*?<\/a><!--\/\$-->/g;
  const rows = list.match(rowRe);
  const first = rows[0];
  const sTitle = 'Menit-menit tambahan, sebelum akhir', sSlug = 'menit-menit-tambahan-sebelum-akhir';
  const made = thoughts.map((t) => first.split(sTitle).join(esc(t.title)).split(sSlug).join(t.slug)
    .replace(/<time datetime="[^"]*">[^<]*<\/time>/g, `<time datetime="${iso(t.date)}">${fmtDate(t.date)}</time>`)).join('');
  list = list.replace(rows[0], '\0ROWS\0');
  for (const r of rows.slice(1)) list = list.replace(r, '');
  list = list.replace('\0ROWS\0', () => made);
  await write(out, 'thought.html', setMeta(list, 'Thoughts — Ase!', 'Writing.'));
}

async function write(out, rel, html) {
  const file = path.join(out, rel);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, html.replaceAll("https://asehing.framer.website", "https://asehing.com"));
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
    await write(out, `work/${w.slug}.html`, detailLayout({ title: `${w.title} — Ase!`, description: `${w.category} · ${w.year}`,
      backHref: '/work', heading: w.title, sub: `${w.category} · ${w.year}`, image: w.image, bodyHtml: marked.parse(w.body || '') }));
  }

  // ---- Thought ----
  const thoughts = (await readCollection('content/thought')).sort((a, b) => new Date(b.date) - new Date(a.date));
  await renderThoughtsFramer(out, thoughts);

  // ---- sitemap (replaces Framer's) ----
  const urls = ['/', '/work', '/contact', '/thought', ...work.map((w) => `/work/${w.slug}`), ...thoughts.map((t) => `/thought/${t.slug}`)];
  await write(out, 'sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map((u) => `<url><loc>https://asehing.com${u === '/' ? '' : u}</loc></url>`).join('')}</urlset>\n`);
  return { work: work.length, thoughts: thoughts.length };
}

// Framer's client router would swallow links to /work and /thought and render its own (stale) pages.
export const HARD_NAV = `<script>window.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('a[href]');
if(!a||e.defaultPrevented||e.metaKey||e.ctrlKey||e.shiftKey)return;var u=new URL(a.href,location.href);
if(u.origin===location.origin&&/^\\/(work|thought)(\\/|$)/.test(u.pathname)){e.preventDefault();e.stopImmediatePropagation();location.href=u.href}},true)</script>`;
