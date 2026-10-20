// On-page SEO for ./site (idempotent). Run after mirror.mjs: node seo.mjs
import fs from 'node:fs/promises';
import path from 'node:path';

const SITE = 'https://asehing.com';
const SRC = path.resolve('site');
const NAME = 'Ase Hing';
const sameAs = ['https://dribbble.com/hoasehing', 'https://www.behance.net/hoasehing', 'https://www.instagram.com/yanto.visual/',
  'https://www.linkedin.com/in/hoase-hing-b38b4b245/', 'https://x.com/softboyy41'];

const pages = {
  '/': { title: `${NAME} — Freelance Visual Designer | Brand Identity, Social Media, UI/UX`,
    desc: `Freelance visual designer in Sleman, Yogyakarta, Indonesia, available for remote projects worldwide: logo & brand identity, social media design, and UI/UX design. Jasa desain logo, branding, social media, dan UI/UX.` },
  '/work': { title: `Portfolio — Logo, Brand Identity, Social Media & UI/UX Design | ${NAME}`,
    desc: `Portfolio of ${NAME}, freelance visual designer: logo and brand identity, social media design, UI/UX design, and case studies. Portfolio desain logo, branding, social media, dan UI/UX.` },
  '/contact': { title: `Hire ${NAME} — Freelance Visual Designer (Remote & Sleman, Indonesia)`,
    desc: `Hire ${NAME} for logo and brand identity, social media design, or UI/UX design. Remote worldwide, based in Sleman, Yogyakarta, Indonesia. Hubungi untuk jasa desain.` },
  '/thought': { title: `Thoughts — ${NAME}`, desc: `Writing and reflections by ${NAME}, freelance visual designer in Sleman, Indonesia.`, lang: 'id' },
};

const H1 = { '/': `${NAME} — Freelance Visual Designer: Brand Identity, Social Media, UI/UX`, '/work': 'Work — selected visual design projects', '/contact': `Contact ${NAME}`, '/thought': 'Thoughts' };
const ABOUT = { '/': `${NAME} is a freelance visual designer based in Sleman, Yogyakarta, Indonesia, available for remote projects worldwide: logo and brand identity design, social media design, and UI/UX design for websites and apps. ${NAME} adalah visual designer freelance di Sleman, Yogyakarta, menerima jasa desain logo dan branding, desain social media, serta UI/UX.` };
const HIDE = 'position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap';
const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const clip = (s, n) => (s.length <= n ? s : s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…');

// article titles/intros come from the Framer search index
const idx = JSON.parse(await fs.readFile(
  (await fs.readdir(path.join(SRC, '_fr/fu/sites/XdTyRDBZcpcdR9CVbXbEe'))).filter((f) => f.startsWith('searchIndex')).map((f) => path.join(SRC, '_fr/fu/sites/XdTyRDBZcpcdR9CVbXbEe', f))[0], 'utf8'));
for (const [url, e] of Object.entries(idx)) {
  if (url.startsWith('/thought/') && e.p?.length > 3)
    pages[url] = { title: `${e.p[1]} — ${NAME}`, desc: clip(e.p[3], 155), lang: 'id', article: true, headline: e.p[1], date: e.p[2] };
  else if (url.startsWith('/work/')) {
    // placeholder CMS pages (only title + Framer boilerplate) are thin content: keep them out of the index until filled in
    const real = (e.p || []).filter((x) => !/^(Back|In progress)$/.test(x) && x !== e.p[1] && !/^Create a free website with Framer/.test(x) && !/^Ringkasan satu kalimat/.test(x) && !/still being written/.test(x));
    pages[url] = { title: `${e.p?.[1] || url.split('/').pop()} — ${NAME}`, desc: `Visual design project by ${NAME}.`, noindex: real.length === 0 };
  }
}

const SERVICES = [
  ['Logo & brand identity design (desain logo dan branding)', 'Logo and visual identity for brands and businesses, delivered remotely. Logo, brand identity, dan identitas visual.'],
  ['Social media design (desain social media)', 'Instagram feed design, posts, carousels, stories, and content templates. Desain feed dan konten media sosial.'],
  ['UI/UX design (desain UI/UX)', 'Interface and user experience design for websites and apps. Desain antarmuka website dan aplikasi.'],
];
const jsonld = `<script type="application/ld+json">${JSON.stringify({
  '@context': 'https://schema.org', '@type': 'Person', name: NAME, url: SITE, jobTitle: 'Visual Designer', homeLocation: { '@type': 'Place', address: { '@type': 'PostalAddress', addressLocality: 'Sleman', addressRegion: 'Special Region of Yogyakarta', addressCountry: 'ID' } }, areaServed: ['Sleman', 'Yogyakarta', 'Indonesia', 'Worldwide (remote)'], knowsLanguage: ['en', 'id'], hasOfferCatalog: { '@type': 'OfferCatalog', name: 'Layanan', itemListElement: SERVICES.map(([name, description]) => ({ '@type': 'Offer', itemOffered: { '@type': 'Service', name, description, provider: { '@type': 'Person', name: NAME } } })) },
  description: pages['/'].desc, knowsAbout: ['Visual design', 'Logo design', 'Branding', 'Social media design', 'UI/UX design'], sameAs })}</script>`;

for (const [url, p] of Object.entries(pages)) {
  const file = path.join(SRC, url === '/' ? 'index.html' : `${url.slice(1)}.html`);
  let html;
  try { html = await fs.readFile(file, 'utf8'); } catch { continue; }
  const t = esc(p.title), d = esc(p.desc), u = SITE + (url === '/' ? '/' : url);
  html = html
    .replace(/<html[^>]*>/, `<html lang="${p.lang || 'en'}" dir="ltr">`)
    .replace(/<title>[^<]*<\/title>/, `<title>${t}</title>`)
    .replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${d}">`)
    .replace(/<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${t}">`)
    .replace(/<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${d}">`)
    .replace(/<meta name="twitter:title" content="[^"]*">/, `<meta name="twitter:title" content="${t}">`)
    .replace(/<meta name="twitter:description" content="[^"]*">/, `<meta name="twitter:description" content="${d}">`)
    .replace(/<meta property="og:type" content="[^"]*">/, `<meta property="og:type" content="${p.article ? 'article' : 'website'}">`)
    .replace(/<link rel="canonical" href="[^"]*">/, `<link rel="canonical" href="${u}">`)
    .replace(/<meta property="og:url" content="[^"]*">/, `<meta property="og:url" content="${u}">`)
    .replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g, '');
  const img = `${SITE}/_fr/fu/seo/og.jpg`;
  html = html
    .replace(/<meta property="og:image[^>]*>/g, '').replace(/<meta name="twitter:(card|image)"[^>]*>/g, '')
    .replace('</head>', `<meta property="og:image" content="${img}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">` +
      `<meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="${img}"></head>`)
    .replace(/<meta name="robots" content="[^"]*">/, `<meta name="robots" content="${p.noindex ? 'noindex, follow' : 'max-image-preview:large'}">`);
  if (url === '/') html = html.replace('</head>', `${jsonld}</head>`);
  if (p.article) {
    const d = new Date(`${p.date} UTC`);
    const art = { '@context': 'https://schema.org', '@type': 'BlogPosting', headline: p.headline, description: p.desc, inLanguage: 'id',
      ...(isNaN(d) ? {} : { datePublished: d.toISOString().slice(0, 10) }), author: { '@type': 'Person', name: NAME, url: SITE },
      mainEntityOfPage: u, publisher: { '@type': 'Person', name: NAME } };
    html = html.replace('</head>', `<script type="application/ld+json">${JSON.stringify(art)}</script></head>`);
  }
  // one crawlable <h1> per page, outside React's root so hydration is untouched
  html = html.replace(/<h1 data-seo[^>]*>[^<]*<\/h1>(<p data-seo[^>]*>[^<]*<\/p>)?/, '');
  const h1 = p.article ? p.headline : H1[url];
  if (h1) html = html.replace(/<div id="main"/, `<h1 data-seo style="${HIDE}">${esc(h1)}</h1>${ABOUT[url] ? `<p data-seo style="${HIDE}">${esc(ABOUT[url])}</p>` : ''}<div id="main"`);
  await fs.writeFile(file, html);
}

// Framer's runtime re-sets <title>/description from one shared metadata function; make it per-page.
const lib = path.join(SRC, '_fr/fu/sites/XdTyRDBZcpcdR9CVbXbEe', (await fs.readdir(path.join(SRC, '_fr/fu/sites/XdTyRDBZcpcdR9CVbXbEe'))).find((f) => f.startsWith('shared-lib')));
const meta = Object.fromEntries(Object.entries(pages).map(([u, p]) => [u, { title: p.title, description: p.desc, robots: p.noindex ? 'noindex, follow' : 'max-image-preview:large' }]));
let js = await fs.readFile(lib, 'utf8');
js = js.replace(/function t\(e,t\)\{[\s\S]*?\}(?=var n=e\(\(\(\)=>\{\}\)\))/,
  () => `function t(e,t){let M=${JSON.stringify(meta)},k=(typeof location<\`u\`?location.pathname:\`/\`).replace(/\\/+$/,\`\`)||\`/\`,m=M[k]||M[\`/\`];return{description:m.description,favicon:\`/_fr/fu/assets/U0DIRSFx4DtxPODLv3yTxlqo1I.png\`,robots:m.robots,title:m.title}}`);
await fs.writeFile(lib, js);

const urls = Object.entries(pages).filter(([, p]) => !p.noindex).map(([u]) => u).sort();
await fs.writeFile(path.join(SRC, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map((u) => `<url><loc>${SITE}${u === '/' ? '' : u}</loc></url>`).join('')}</urlset>\n`);
await fs.writeFile(path.join(SRC, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);
console.log('seo applied to', Object.keys(pages).length, 'pages');
