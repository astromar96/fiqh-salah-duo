/* مُولَّد آليًا بـ `npm run content:build` — لا تعدّله يدويًا.
   لتغيير المنهج عدّل ملفات src/content/units/*.json و src/content/sections.json ثم أعد التوليد. */

import type { Curriculum, Section, Unit } from '@/engine/types';
import u16 from './units/u16.json';
import u17 from './units/u17.json';
import u18 from './units/u18.json';
import u19 from './units/u19.json';
import u20 from './units/u20.json';
import u21 from './units/u21.json';
import u22 from './units/u22.json';
import u23 from './units/u23.json';
import u24 from './units/u24.json';
import u25 from './units/u25.json';
import u26 from './units/u26.json';
import u27 from './units/u27.json';
import u28 from './units/u28.json';
import u29 from './units/u29.json';
import u30 from './units/u30.json';
import u31 from './units/u31.json';
import u32 from './units/u32.json';
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
import u61 from './units/u61.json';
import u15 from './units/u15.json';
import u33 from './units/u33.json';
import u34 from './units/u34.json';
import u35 from './units/u35.json';
import u36 from './units/u36.json';
import u37 from './units/u37.json';
import u38 from './units/u38.json';
import u39 from './units/u39.json';
import u40 from './units/u40.json';
import u41 from './units/u41.json';
import u42 from './units/u42.json';
import u43 from './units/u43.json';
import u44 from './units/u44.json';
import u45 from './units/u45.json';
import u46 from './units/u46.json';
import u47 from './units/u47.json';
import u48 from './units/u48.json';
import u49 from './units/u49.json';
import u50 from './units/u50.json';
import u51 from './units/u51.json';
import u52 from './units/u52.json';
import u53 from './units/u53.json';
import u54 from './units/u54.json';
import u55 from './units/u55.json';
import u56 from './units/u56.json';
import u57 from './units/u57.json';
import u58 from './units/u58.json';
import u59 from './units/u59.json';
import u60 from './units/u60.json';

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
    units: [u16, u17, u18, u19, u20, u21] as Unit[],
  },
  {
    id: 's2',
    title: "الآداب",
    subtitle: "الباب الثاني",
    blurb: "الأدب مع الله وكلامه ورسوله ومع النفس والخلق، وآداب الحياة اليومية",
    color: 'teal',
    pages: [59, 114],
    units: [u22, u23, u24, u25, u26, u27, u28] as Unit[],
  },
  {
    id: 's3',
    title: "الأخلاق",
    subtitle: "الباب الثالث",
    blurb: "الصبر والتوكل والإيثار والعدل والرحمة والحياء والصدق، وذمّ الأخلاق السيئة",
    color: 'pink',
    pages: [115, 146],
    units: [u29, u30, u31, u32] as Unit[],
  },
  {
    id: 's4',
    title: "العبادات",
    subtitle: "الباب الرابع",
    blurb: "الطهارة والصلاة والجنائز والزكاة والصيام والحج والأضحية",
    color: 'green',
    pages: [147, 267],
    units: [u01, u02, u03, u04, u05, u06, u07, u08, u09, u10, u11, u12, u13, u14, u61, u15, u33, u34, u35, u36, u37, u38, u39] as Unit[],
  },
  {
    id: 's5',
    title: "المعاملات",
    subtitle: "الباب الخامس",
    blurb: "البيوع والعقود والنكاح والمواريث والأطعمة والقضاء وسائر أحكام التعامل",
    color: 'orange',
    pages: [269, 440],
    units: [u40, u41, u42, u43, u44, u45, u46, u47, u48, u49, u50, u51, u52, u53, u54, u55, u56, u57, u58, u59, u60] as Unit[],
  },
  ] as Section[],
};
