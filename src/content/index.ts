/* مُولَّد آليًا بـ `npm run content:build` — لا تعدّله يدويًا.
   لتغيير المنهج عدّل ملفات src/content/units/*.json ثم أعد التوليد. */

import type { Curriculum, Unit } from '@/engine/types';
import u01 from './units/u01.json';
import u02 from './units/u02.json';
import u03 from './units/u03.json';
import u04 from './units/u04.json';
import u05 from './units/u05.json';
import u06 from './units/u06.json';

export const curriculum: Curriculum = {
  meta: {
    title: 'فقه الصلاة',
    book: 'منهاج المسلم',
    author: 'أبو بكر جابر الجزائري',
    edition: 'دار السلام — الطبعة الرابعة',
    note: 'المادة مستخلصة من كتاب «منهاج المسلم» لأبي بكر جابر الجزائري، من الطهارة إلى صلاة الجنازة. رقم الصفحة تحت كل سؤال يحيل إلى المطبوع. المحتوى للتدريب، وللمسائل الخلافية راجع أهل العلم.',
  },
  units: [u01, u02, u03, u04, u05, u06] as Unit[],
};

export default curriculum;
