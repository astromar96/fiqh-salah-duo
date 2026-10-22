#!/usr/bin/env node
/**
 * يطبع جدول المنهج بصيغة ماركداون من المحتوى نفسه، ليُلصق في README.
 * المصدر هو الملفات لا الذاكرة، فلا يتخلّف الجدول عن المنهج.
 */
import { checkAll } from './check-content.mjs';

const AR = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
const ar = (n) => String(n).replace(/\d/g, (d) => AR[+d]);

const { loaded, errs, sections } = checkAll();
if (errs.length) {
  console.error(`refusing to print: ${errs.length} content errors`);
  process.exit(1);
}

console.log('| الباب | الصفحات | وحدات | دروس | أسئلة |');
console.log('|---|---|---|---|---|');
for (const s of sections) {
  const mine = loaded.filter(({ unit }) => unit.section === s.id);
  const lessons = mine.reduce((n, { unit }) => n + unit.lessons.length, 0);
  const items = mine.reduce(
    (n, { unit }) => n + unit.lessons.reduce((m, l) => m + l.items.filter((i) => i.t !== 'info').length, 0),
    0,
  );
  console.log(
    `| ${s.subtitle} — ${s.title} | ${ar(s.pages[0])}–${ar(s.pages[1])} | ${ar(mine.length)} | ${ar(lessons)} | ${ar(items)} |`,
  );
}
const lessons = loaded.reduce((n, { unit }) => n + unit.lessons.length, 0);
const items = loaded.reduce(
  (n, { unit }) => n + unit.lessons.reduce((m, l) => m + l.items.filter((i) => i.t !== 'info').length, 0),
  0,
);
console.log(`| **المجموع** | **${ar(7)}–${ar(440)}** | **${ar(loaded.length)}** | **${ar(lessons)}** | **${ar(items)}** |`);
