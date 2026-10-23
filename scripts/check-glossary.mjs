#!/usr/bin/env node
/**
 * يتحقق من معجم الكلمات الصعبة ويقيس تغطيته للمنهج.
 * يُشغَّل بـ `npm run glossary:check`.
 *
 * يستورد `src/engine/gloss.ts` كما هو — بتجريد الأنواع في Node — ليعمل على
 * نفس المطابقة التي تعمل في التطبيق، فلا تتفرّع نسختان من المنطق.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { bare, makeGlossIndex } from '../src/engine/gloss.ts';

const ROOT = new URL('../', import.meta.url).pathname;
const UNITS_DIR = `${ROOT}src/content/units/`;
const GLOSSARY = `${ROOT}src/content/glossary.json`;

/** كم كلمةً غير مشروحة نعرض في تقرير الثغرات. */
const GAPS = Number(process.env.GAPS ?? 40);
/** الكلمات الوظيفية — لا معنى لشرحها، فلا تُحتسب ثغرةً. */
const STOP = new Set(
  ('علي الي الا ولا اذا عند قال كان بعد كما حتي بين فيه الذي فلا قبل عنه ذلك يوم هذا هذه فيها غير وان وهو بها التي شيء منه وما ذكر يكون بما واحد لها ومن لمن اليه عليها ولم لان نفسه منها انه وفي وحده قوله امر جعل لقوله ماذا احد بلا متي واحده لما اخر وقد دون فقد اول جاء بان ولو ترك فاذا وقال رجل حال عنها كانت وهي مما الاول لكل مثل فمد فمن يقول واما فيما فما كله جميعا بغير فهو لهم غيره لانه عده هنا تلك اولها سواه فهي بذلك يقوم ابدا وكل انهم فيمن انا وهم ذات اين معها ورد وكان زاد بدا عنهم منكم نقل طلب بني امام يحب خاصه اولا لكم بنفسه فانه كانوا لهما يعرف قوم عليكم اخاه حقه وعن انت بينه فله اخيه هكذا كيف معني اليوم معا ابو روي اذن بحال واذا بهذا راي بعده امه سواء فاكثر وترك والا افضل احدهما ثلاثه اربعه خمسه سته سبعه ثمانيه عشره عشر ثلاث اربع خمس ثلاثا اربعا ايه ايات رتب عدها نعم انما وانما اصلا فكان فيهما بينهما منهما بينهم تمام فقط فرق موضع حكمه يكن يمنع فانه')
    .split(/\s+/)
    .map(bare),
);

const file = JSON.parse(readFileSync(GLOSSARY, 'utf8'));
const glossary = file.entries;
const never = file.never ?? [];
const errs = [];
const E = (m) => errs.push(m);

// ── بنية الملف ────────────────────────────────────────────────────
if (!Array.isArray(glossary) || glossary.length === 0) E('glossary.json needs a non-empty entries array');
if (!Array.isArray(never)) E('glossary.json never must be an array');
else {
  const seenNever = new Set();
  never.forEach((form, i) => {
    if (typeof form !== 'string' || !form.trim()) return E(`never[${i}]: must be a non-empty string`);
    const key = bare(form).trim();
    if (seenNever.has(key)) E(`never[${i}]: duplicate ${form}`);
    seenNever.add(key);
  });
}

const byWord = new Map();
const byForm = new Map();

glossary.forEach((entry, i) => {
  const p = `glossary[${i}]`;
  if (!entry || typeof entry !== 'object') return E(`${p}: not an object`);
  for (const key of Object.keys(entry)) {
    if (!['w', 'm', 'also'].includes(key)) E(`${p}: unknown key ${JSON.stringify(key)}`);
  }
  if (typeof entry.w !== 'string' || !entry.w.trim()) E(`${p}: needs a non-empty w`);
  if (typeof entry.m !== 'string' || !entry.m.trim()) E(`${p}: needs a non-empty m`);
  if (entry.also !== undefined) {
    if (!Array.isArray(entry.also)) E(`${p}: also must be an array`);
    else if (!entry.also.every((f) => typeof f === 'string' && f.trim())) E(`${p}: also must hold non-empty strings`);
  }
  if (typeof entry.w !== 'string') return;
  // المعنى يُعرض بعد الكلمة مباشرةً («الوضوء: غسل…»)، فلا يُعيدها ولا يبدأ بها.
  if (entry.m) {
    const w = bare(entry.w).trim();
    const m = bare(entry.m).trim();
    if (m === w) E(`${p} ${entry.w}: m just repeats w`);
    else if (m.startsWith(w)) E(`${p} ${entry.w}: m opens by repeating w — it is shown after it`);
  }
  if (byWord.has(entry.w)) E(`${p}: duplicate w ${entry.w} (also at ${byWord.get(entry.w)})`);
  else byWord.set(entry.w, p);
  for (const form of [entry.w, ...(entry.also ?? [])]) {
    if (typeof form !== 'string') continue;
    const key = bare(form).trim().replace(/\s+/g, ' ');
    // الفهرس يسجّل الصورة معرَّفةً ومنكَّرةً، فنوازنه هنا وإلا فاتنا تعارضٌ
    // لا يظهر إلا بعد اقتطاع «ال» — ككلمة «المُحرِم» مع «مُحرَّم».
    for (const variant of key.startsWith('ال') ? [key, key.slice(2)] : [key]) {
      if (variant.length < 3) continue;
      // صيغتان متطابقتان بعد التجريد تعني أن الثانية لا تُطابَق أبدًا.
      if (byForm.has(variant) && byForm.get(variant) !== entry.w) {
        E(`${p} ${entry.w}: form ${JSON.stringify(form)} collides with ${byForm.get(variant)}`);
      } else byForm.set(variant, entry.w);
    }
  }
});

// ── التغطية على المنهج ────────────────────────────────────────────
const index = makeGlossIndex(glossary, never);

/**
 * حالاتٌ تُحرس: المطابقة تقوم على اقتطاع السوابق واللواحق، وهو يُصيب ويُخطئ،
 * فكل سطرٍ هنا خطأٌ وقع مرّةً أو صوابٌ عزيزٌ يَسهل كسره بتعديلٍ في المحرّك.
 */
const CASES = [
  ['قالَ رسولُ اللهِ صلَّى اللهُ عليهِ وسلَّمَ', 'السَّلَم', false],
  ['وثلثٌ هديَّةٌ للأصدقاء', 'الهَدي', false],
  ['وثلثٌ هديَّةٌ للأصدقاء', 'الهَديَّة', true],
  ['ما حكمُ ذلكَ بعدَها', 'العِدَّة', false],
  ['عِدَّةُ المطلَّقةِ ثلاثةُ قروء', 'العِدَّة', true],
  ['صلَّى ثمَّ تركَ المسجدَ وتركَ الدعاءَ', 'الوِتر', false],
  ['الوِترُ ركعةٌ في آخرِ الليل', 'الوِتر', true],
  ['جلسَ أمامَهُ', 'الإمام', false],
  ['فِعلُهُ هذا لا يجوز', 'العِلَّة', false],
  ['كلُّهُم صامَ', 'اللهمَّ', false],
  ['يسعى بينَ الصَّفا والمروة', 'الصَّف', false],
  ['يسعى بينَ الصَّفا والمروة', 'الصَّفا', true],
  ['وقفَ بعرفةَ يومَ التاسع', 'العُرف', false],
  ['وقفَ بعرفةَ يومَ التاسع', 'عَرَفة', true],
  ['فصلَّى ركعتين', 'الفَصل', false],
  ['الأدلَّةُ النَّقليَّةُ والعقليَّة', 'النَّقليَّة', true],
  ['أرفعُهَا قدرًا وأخطرُهَا شأنًا', 'الشَّأن', true],
  ['ينبني عليهِ عيشُ المسلمِ بأسرِهِ', 'بأَسرِه', true],
  ['ساقَ المؤلِّفُ الحديثَ واستدلَّ بهِ', 'ساقَ', true],
  ['الإيمانُ بربوبيَّتِهِ وألوهيَّتِهِ', 'الرُّبوبيَّة', true],
  ['صلاتُهُ صحيحةٌ وزكاتُهُ واجبة', 'الزَّكاة', true],
  ['الدِّينُ النصيحة', 'الدِّين', true],
];

for (const [text, word, want] of CASES) {
  const got = index.find([text]).some((g) => g.w === word);
  if (got !== want) E(`case: ${want ? 'expected' : 'did not expect'} ${word} in "${text}"`);
}

/** كل النصوص المعروضة للقارئ في عنصرٍ واحد. */
function itemTexts(item) {
  return [
    item.h,
    item.b,
    item.q,
    item.e,
    ...(item.o ?? []),
    ...(item.items ?? []),
    ...(item.bank ?? []),
    ...(item.pairs ?? []).flat(),
  ].filter((t) => typeof t === 'string');
}

const used = new Set();
const freq = new Map();
/** لكل مدخلة: الصور التي طابقتها في المنهج وعددُها — لكشف المطابقة الخاطئة. */
const shapes = new Map();
/** كل صور الكلمات الواردة في المنهج — لمراجعة قائمة المنع. */
const seenWords = new Set();
let items = 0;
let covered = 0;
let hits = 0;
let most = { n: 0, where: '' };

for (const file of readdirSync(UNITS_DIR).filter((f) => f.endsWith('.json'))) {
  const unit = JSON.parse(readFileSync(UNITS_DIR + file, 'utf8'));
  for (const lesson of unit.lessons ?? []) {
    for (const item of lesson.items ?? []) {
      const texts = itemTexts(item);
      const found = index.find(texts);
      items += 1;
      hits += found.length;
      if (found.length) covered += 1;
      if (found.length > most.n) most = { n: found.length, where: `${unit.id}/${lesson.id}` };
      for (const g of found) used.add(g.w);
      for (const text of texts) {
        for (const word of bare(text).match(/[ء-ي]+/g) ?? []) {
          seenWords.add(word);
          const [hit] = index.find([word]);
          if (hit) {
            const forms = shapes.get(hit.w) ?? new Map();
            forms.set(word, (forms.get(word) ?? 0) + 1);
            shapes.set(hit.w, forms);
          }
          if (word.length < 4 || STOP.has(word)) continue;
          freq.set(word, (freq.get(word) ?? 0) + 1);
        }
      }
    }
  }
}

const dead = glossary.filter((e) => !used.has(e.w));
const idle = never.filter((form) => !seenWords.has(bare(form).trim()));
const unglossed = [...freq]
  .filter(([w]) => !index.find([w]).length)
  .sort((a, b) => b[1] - a[1])
  .slice(0, GAPS);

const pct = (n) => `${((n / items) * 100).toFixed(1)}%`;
console.log(`${glossary.length} entries · ${index.size} indexed forms`);
console.log(`coverage: ${covered}/${items} items carry at least one gloss (${pct(covered)})`);
console.log(`density: ${(hits / items).toFixed(2)} glosses per item · busiest ${most.n} in ${most.where}`);
console.log(`unused entries: ${dead.length}${dead.length ? ` → ${dead.map((e) => e.w).join('، ')}` : ''}`);
console.log(`never list: ${never.length} forms${idle.length ? ` · ${idle.length} absent from the curriculum → ${idle.join('، ')}` : ''}`);
if (unglossed.length) {
  console.log(`\ntop ${unglossed.length} words with no gloss (candidates):`);
  console.log(unglossed.map(([w, n]) => `  ${String(n).padStart(4)}  ${w}`).join('\n'));
}
// الصور التي لم تُطابَق إلا بعد اقتطاع سابقةٍ أو لاحقة: هنا يقع الخطأ، إذ قد
// يَردّ الاقتطاعُ كلمةً إلى غير أصلها — «هديّة» إلى «هَدي». تُراجَع بالعين.
if (process.env.FORMS) {
  const risky = [];
  for (const [w, forms] of shapes) {
    const entry = glossary.find((e) => e.w === w);
    const exact = new Set([entry.w, ...(entry.also ?? [])].map((f) => bare(f).trim()));
    for (const [form, n] of forms) if (!exact.has(form)) risky.push([n, form, w]);
  }
  risky.sort((a, b) => b[0] - a[0]);
  console.log(`\n${risky.length} shapes matched only after stripping (review for wrong hits):`);
  console.log(
    risky
      .slice(0, Number(process.env.FORMS))
      .map(([n, form, w]) => `  ${String(n).padStart(4)}  ${form.padEnd(16)} → ${w}`)
      .join('\n'),
  );
}

errs.forEach((e) => console.log('ERROR ' + e));
console.log(errs.length ? `\nFAIL (${errs.length} errors)` : '\nPASS');
process.exit(errs.length ? 1 : 0);
