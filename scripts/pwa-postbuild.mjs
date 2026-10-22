#!/usr/bin/env node
/**
 * يحقن وسوم PWA في صفحات التصدير.
 *
 * لا نستعمل `+html.tsx` لهذا: وجوده يستبدل مستند Expo نفسه، فتسقط منه
 * وسوم <script> للحزم وروابط preload، فتُعرض الصفحة بلا تفاعل. الأسلم
 * أن نضيف إلى ما يولّده Expo لا أن نحلّ محلّه.
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('../', import.meta.url).pathname;
const DIST = join(ROOT, 'dist');
const BASE = JSON.parse(readFileSync(join(ROOT, 'app.json'), 'utf8')).expo.experiments?.baseUrl ?? '';

const TAGS = [
  `<link rel="manifest" href="${BASE}/manifest.json"/>`,
  `<meta name="theme-color" content="#17a673"/>`,
  `<meta name="description" content="تعلّم أبواب كتاب «منهاج المسلم» الخمسة: العقيدة والآداب والأخلاق والعبادات والمعاملات."/>`,
  `<link rel="apple-touch-icon" href="${BASE}/icons/apple-touch-icon.png"/>`,
  `<meta name="apple-mobile-web-app-capable" content="yes"/>`,
  `<meta name="apple-mobile-web-app-title" content="منهاج المسلم"/>`,
].join('');

/** تسجيل عامل الخدمة — يُحقن في كل صفحة ليعمل مهما كانت نقطة الدخول. */
const SW = `<script>if('serviceWorker' in navigator){window.addEventListener('load',function(){navigator.serviceWorker.register('${BASE}/sw.js').catch(function(){})})}</script>`;

function* htmlFiles(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* htmlFiles(p);
    else if (name.endsWith('.html')) yield p;
  }
}

let patched = 0;
let skipped = 0;
for (const file of htmlFiles(DIST)) {
  const html = readFileSync(file, 'utf8');
  if (html.includes('rel="manifest"')) { skipped++; continue; }
  if (!html.includes('</head>')) { skipped++; continue; }
  writeFileSync(file, html.replace('</head>', `${TAGS}</head>`).replace('</body>', `${SW}</body>`));
  patched++;
}
console.log(`pwa: injected into ${patched} pages${skipped ? `, skipped ${skipped}` : ''} (base "${BASE}")`);
