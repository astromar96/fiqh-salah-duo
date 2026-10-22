#!/usr/bin/env node
/**
 * يولّد src/content/index.ts من src/content/sections.json وملفات src/content/units.
 * يفشل إن كان في أي وحدة خطأ، كيلا يُبنى التطبيق على محتوى معطوب.
 */
import { writeFileSync } from 'node:fs';
import { checkAll } from './check-content.mjs';

const OUT = new URL('../src/content/index.ts', import.meta.url).pathname;

const { loaded, errs, sections } = checkAll();
if (errs.length) {
  errs.forEach((e) => console.error('ERROR ' + e));
  console.error(`\nrefusing to build: ${errs.length} content errors`);
  process.exit(1);
}

/** الوحدات داخل الباب مرتَّبة بصفحة بدايتها، فترتيبها هو ترتيب الكتاب لا ترتيب المعرّفات. */
const bySection = sections.map((section) => ({
  section,
  units: loaded
    .filter(({ unit }) => unit.section === section.id)
    .sort((a, b) => a.unit.source.pages[0] - b.unit.source.pages[0]),
}));

const imports = bySection
  .flatMap(({ units }) => units.map(({ unit, file }) => `import ${unit.id} from './units/${file}';`))
  .join('\n');

const sectionLiterals = bySection
  .map(
    ({ section, units }) => `  {
    id: '${section.id}',
    title: ${JSON.stringify(section.title)},
    subtitle: ${JSON.stringify(section.subtitle)},
    blurb: ${JSON.stringify(section.blurb)},
    color: '${section.color}',
    pages: [${section.pages[0]}, ${section.pages[1]}],
    units: [${units.map(({ unit }) => unit.id).join(', ')}] as Unit[],
  }`,
  )
  .join(',\n');

const body = `/* مُولَّد آليًا بـ \`npm run content:build\` — لا تعدّله يدويًا.
   لتغيير المنهج عدّل ملفات src/content/units/*.json و src/content/sections.json ثم أعد التوليد. */

import type { Curriculum, Section, Unit } from '@/engine/types';
${imports}

export const curriculum: Curriculum = {
  meta: {
    title: 'منهاج المسلم',
    book: 'منهاج المسلم',
    author: 'أبو بكر جابر الجزائري',
    edition: 'دار السلام — الطبعة الرابعة',
    note: 'أسئلة مستخلصة من أبواب كتاب «منهاج المسلم» الخمسة. رقم الصفحة تحت كل سؤال يحيل إلى المطبوع للرجوع إليه. المحتوى للتدريب والمراجعة، وللمسائل الخلافية وما يُعمل به يُرجع إلى أهل العلم.',
  },
  sections: [
${sectionLiterals},
  ] as Section[],
};

export default curriculum;
`;

writeFileSync(OUT, body);

const lessons = loaded.reduce((n, { unit }) => n + unit.lessons.length, 0);
const items = loaded.reduce((n, { unit }) => n + unit.lessons.reduce((m, l) => m + l.items.length, 0), 0);
const orphans = loaded.filter(({ unit }) => !sections.some((s) => s.id === unit.section));
if (orphans.length) console.warn(`warning: ${orphans.length} units not in any section`);
console.log(
  `wrote src/content/index.ts — ${sections.length} sections · ${loaded.length} units · ${lessons} lessons · ${items} items`,
);
