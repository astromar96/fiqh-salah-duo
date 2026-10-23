import data from '@/content/glossary.json';
import { makeGlossIndex, type Gloss } from './gloss';

export type { Gloss };

/** معجم الكلمات الصعبة — يُحرَّر في `src/content/glossary.json`. */
export const glossary = data.entries as Gloss[];

/** فهرس واحد لكل التطبيق: بناؤه مرّة عند تحميل الوحدة لا عند كل سؤال. */
export const glossIndex = makeGlossIndex(glossary, data.never);
