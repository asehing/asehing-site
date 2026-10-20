// Home: clicking the "Visual Designer" hover-reveal word opens /work (hover animation is kept). Idempotent.
// Run after mirror.mjs / seo.mjs. The handler lives outside React's root, so Framer hydration is untouched.
import fs from 'node:fs/promises';

const FILE = 'site/index.html';
const SELECTOR = '[data-framer-name="Hover Reveal Visual Designer"],.framer-jte153-container';
const block = `<style id="home-link">${SELECTOR}{cursor:pointer}</style>` +
`<script id="home-link-js">(function(){var S='${SELECTOR}';function go(){location.href='/work'}` +
`document.addEventListener('click',function(e){var t=e.target;if(!t||!t.closest)return;` +
`var w=t.closest('span.framer-text');if(t.closest(S)||(w&&w.textContent.trim()==='Visual Designer')){e.preventDefault();e.stopPropagation();go()}},true);` +
`document.addEventListener('keydown',function(e){if(e.key==='Enter'&&e.target.closest&&e.target.closest(S)){e.preventDefault();go()}},true);` +
`window.addEventListener('load',function(){setTimeout(function(){document.querySelectorAll('.framer-jte153-container').forEach(function(n){` +
`n.setAttribute('role','link');n.setAttribute('tabindex','0');n.setAttribute('aria-label','Visual Designer — see my work')})},1500)})})()</script>`;

let html = await fs.readFile(FILE, 'utf8');
html = html.replace(/<style id="home-link">[\s\S]*?<\/style><script id="home-link-js">[\s\S]*?<\/script>/, '').replace('</head>', `${block}</head>`);
await fs.writeFile(FILE, html);
console.log('home link applied');
