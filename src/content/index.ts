/* مُولَّد آليًا بـ `npm run content:build` — لا تعدّله يدويًا.
   لتغيير المنهج عدّل ملفات src/content/units/*.json و src/content/sections.json ثم أعد التوليد. */

import type { Curriculum, Section, Unit } from '@/engine/types';
import u01 from './units/u01.json';
import u02 from './units/u02.json';
import u03 from './units/u03.json';
import u04 from './units/u04.json';
import u05 from './units/u05.json';
import u06 from './units/u06.json';
import u07 from './units/u07.json';
import u08 from './units/u08.json';
import u09 from './units/u09.json';
import u10 from './units/u10.json';
import u11 from './units/u11.json';
import u12 from './units/u12.json';
import u13 from './units/u13.json';
import u14 from './units/u14.json';
import u15 from './units/u15.json';

export const curriculum: Curriculum = {
  meta: {
    title: 'منهاج المسلم',
    book: 'منهاج المسلم',
    author: 'أبو بكر جابر الجزائري',
    edition: 'دار السلام — الطبعة الرابعة',
    note: 'أسئلة مستخلصة من أبواب كتاب «منهاج المسلم» الخمسة. رقم الصفحة تحت كل سؤال يحيل إلى المطبوع للرجوع إليه. المحتوى للتدريب والمراجعة، وللمسائل الخلافية وما يُعمل به يُرجع إلى أهل العلم.',
  },
  sections: [
  {
    id: 's1',
    title: "العقيدة",
    subtitle: "الباب الأول",
    blurb: "الإيمان بالله وأسمائه وملائكته وكتبه ورسله واليوم الآخر والقدر",
    color: 'indigo',
    pages: [7, 58],
    units: [] as Unit[],
  },
  {
    id: 's2',
    title: "الآداب",
    subtitle: "الباب الثاني",
    blurb: "الأدب مع الله وكلامه ورسوله ومع النفس والخلق، وآداب الحياة اليومية",
    color: 'teal',
    pages: [59, 114],
    units: [] as Unit[],
  },
  {
    id: 's3',
    title: "الأخلاق",
    subtitle: "الباب الثالث",
    blurb: "الصبر والتوكل والإيثار والعدل والرحمة والحياء والصدق، وذمّ الأخلاق السيئة",
    color: 'pink',
    pages: [115, 146],
    units: [] as Unit[],
  },
  {
    id: 's4',
    title: "العبادات",
    subtitle: "الباب الرابع",
    blurb: "الطهارة والصلاة والجنائز والزكاة والصيام والحج والأضحية",
    color: 'green',
    pages: [147, 267],
    units: [u01, u02, u03, u04, u05, u06, u07, u08, u09, u10, u11, u12, u13, u14, u15] as Unit[],
  },
  {
    id: 's5',
    title: "المعاملات",
    subtitle: "الباب الخامس",
    blurb: "البيوع والعقود والنكاح والمواريث والأطعمة والقضاء وسائر أحكام التعامل",
    color: 'orange',
    pages: [269, 440],
    units: [] as Unit[],
  },
  ] as Section[],
};
