#!/usr/bin/env node
/**
 * يولّد src/content/index.ts من ملفات JSON في src/content/units.
 * يفشل إن كان في أي وحدة خطأ، كيلا يُبنى التطبيق على محتوى معطوب.
 */
import { writeFileSync } from 'node:fs';
import { checkAll } from './check-content.mjs';

const OUT = new URL('../src/content/index.ts', import.meta.url).pathname;

const { loaded, errs } = checkAll();
if (errs.length) {
  errs.forEach((e) => console.error('ERROR ' + e));
  console.error(`\nrefusing to build: ${errs.length} content errors`);
  process.exit(1);
}

const ordered = loaded.slice().sort((a, b) => a.unit.id.localeCompare(b.unit.id));
const names = ordered.map(({ unit }) => unit.id);

const body = `/* مُولَّد آليًا بـ \`npm run content:build\` — لا تعدّله يدويًا.
   لتغيير المنهج عدّل ملفات src/content/units/*.json ثم أعد التوليد. */

import type { Curriculum, Unit } from '@/engine/types';
${ordered.map(({ unit, file }) => `import ${unit.id} from './units/${file}';`).join('\n')}

export const curriculum: Curriculum = {
  meta: {
    title: 'فقه الصلاة',
    book: 'منهاج المسلم',
    author: 'أبو بكر جابر الجزائري',
    edition: 'دار السلام — الطبعة الرابعة',
    note: 'المادة مستخلصة من كتاب «منهاج المسلم» لأبي بكر جابر الجزائري، من الطهارة إلى صلاة الجنازة. رقم الصفحة تحت كل سؤال يحيل إلى المطبوع. المحتوى للتدريب، وللمسائل الخلافية راجع أهل العلم.',
  },
  units: [${names.join(', ')}] as Unit[],
};

export default curriculum;
`;

writeFileSync(OUT, body);
const lessons = loaded.reduce((n, { unit }) => n + unit.lessons.length, 0);
const items = loaded.reduce((n, { unit }) => n + unit.lessons.reduce((m, l) => m + l.items.length, 0), 0);
console.log(`wrote src/content/index.ts — ${loaded.length} units · ${lessons} lessons · ${items} items`);
