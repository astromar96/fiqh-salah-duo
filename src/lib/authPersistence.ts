import { browserLocalPersistence, indexedDBLocalPersistence, type Persistence } from 'firebase/auth';

/**
 * حفظ الجلسة على الويب: IndexedDB أوّلًا، و`localStorage` احتياطًا.
 * في النافذة الخاصة قد يُمنع الأوّل، فيبقى الثاني، وإن مُنعا بقيت الجلسة
 * في الذاكرة وحدها فتنتهي بإغلاق التبويب — وهو تدهور مقبول لا عطل.
 *
 * لنسخة الأجهزة انظر `authPersistence.native.ts`؛ metro يختار بينهما.
 */
export const persistence: Persistence[] = [indexedDBLocalPersistence, browserLocalPersistence];
