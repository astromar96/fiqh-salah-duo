#!/usr/bin/env node
/**
 * يحقن وسوم PWA في صفحات التصدير.
 *
 * لا نستعمل `+html.tsx` لهذا: وجوده يستبدل مستند Expo نفسه، فتسقط منه
 * وسوم <script> للحزم وروابط preload، فتُعرض الصفحة بلا تفاعل. الأسلم
 * أن نضيف إلى ما يولّده Expo لا أن نحلّ محلّه.
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const ROOT = new URL('../', import.meta.url).pathname;
const DIST = join(ROOT, 'dist');
const BASE = JSON.parse(readFileSync(join(ROOT, 'app.json'), 'utf8')).expo.experiments?.baseUrl ?? '';

const APP = 'منهاج المسلم';

/**
 * عنوان لكل صفحة. بدونه يعرض المتصفّح الرابط في التبويب وفي المفضّلة
 * وعند المشاركة. Expo لا يضع عنوانًا ما لم تحدّده الشاشة، فنشتقّه هنا
 * من المنهج: اسم الدرس أو الباب، متبوعًا باسم التطبيق.
 */
const UNITS = join(ROOT, 'src/content/units');
const lessonTitles = new Map();
for (const f of readdirSync(UNITS).filter((n) => n.endsWith('.json'))) {
  const unit = JSON.parse(readFileSync(join(UNITS, f), 'utf8'));
  for (const lesson of unit.lessons) lessonTitles.set(`${unit.id}/${lesson.id}`, lesson.title);
}
const sectionTitles = new Map(
  JSON.parse(readFileSync(join(ROOT, 'src/content/sections.json'), 'utf8')).map((s) => [s.id, s.title]),
);

function titleFor(file) {
  const parts = relative(DIST, file).replace(/\.html$/, '').split(sep);
  if (parts[0] === 'lesson' && parts.length === 3) {
    const name = lessonTitles.get(`${parts[1]}/${parts[2]}`);
    return name ? `${name} — ${APP}` : APP;
  }
  if (parts[0] === 'section' && parts.length === 2) {
    const name = sectionTitles.get(parts[1]);
    return name ? `${name} — ${APP}` : APP;
  }
  return APP;
}

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

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
  const title = html.includes('<title>') ? '' : `<title>${esc(titleFor(file))}</title>`;
  writeFileSync(file, html.replace('</head>', `${title}${TAGS}</head>`).replace('</body>', `${SW}</body>`));
  patched++;
}
console.log(`pwa: injected into ${patched} pages${skipped ? `, skipped ${skipped}` : ''} (base "${BASE}")`);
