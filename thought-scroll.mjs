// Thought list: once there are 8+ entries, the list becomes a fixed-height window that scrolls inside the page,
// with the top/bottom fading out (same gradient as the Figma "Thought" design). Idempotent. Run after mirror.mjs/seo.mjs.
import fs from 'node:fs/promises';

const FILE = 'site/thought.html';
const THRESHOLD = 8; // entries before the list starts to scroll
const fade = 'linear-gradient(180deg,transparent 0%,rgba(0,0,0,.7) 25%,#000 50%,rgba(0,0,0,.7) 75%,transparent 100%)';
const css = `<style id="thought-scroll">` +
  `.framer-LeDaC .framer-18tbuly:has(.framer-fl4iy5>a:nth-of-type(${THRESHOLD})){` +
  `max-height:min(520px,62vh);overflow-y:auto;overscroll-behavior:contain;scrollbar-width:none;` +
  `padding:90px 0;-webkit-mask-image:${fade};mask-image:${fade}}` +
  `.framer-LeDaC .framer-18tbuly::-webkit-scrollbar{display:none}</style>`;

let html = await fs.readFile(FILE, 'utf8');
html = html.replace(/<style id="thought-scroll">[\s\S]*?<\/style>/, '').replace('</head>', `${css}</head>`);
await fs.writeFile(FILE, html);
console.log('thought scroll applied');
