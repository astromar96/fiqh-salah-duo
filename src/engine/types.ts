import type { UnitColor } from '@/theme/tokens';

/** بطاقة تعليمية — لا تُحتسب في التصحيح. */
export type InfoItem = { t: 'info'; h: string; b: string; src: number };

/** اختيار من متعدد. `a` فهرس الخيار الصحيح في `o`. */
export type McqItem = { t: 'mcq'; q: string; o: string[]; a: number; e: string; src: number };

/** صح أو خطأ. */
export type TfItem = { t: 'tf'; q: string; a: boolean; e: string; src: number };

/** ترتيب — `items` مخزَّنة بالترتيب الصحيح، ويخلطها المحرّك عند العرض. */
export type OrderItem = { t: 'order'; q: string; items: string[]; e: string; src: number };

/** توصيل — `pairs` أزواج [يسار، يمين]. */
export type MatchItem = { t: 'match'; q: string; pairs: [string, string][]; e: string; src: number };

/** ملء الفراغ — `q` فيها `____` واحدة، و`a` أحد عناصر `bank`. */
export type FillItem = { t: 'fill'; q: string; bank: string[]; a: string; e: string; src: number };

export type Item = InfoItem | McqItem | TfItem | OrderItem | MatchItem | FillItem;
export type ItemType = Item['t'];

/** العناصر التي تُسأل وتُصحَّح (كل شيء عدا `info`). */
export type Question = Exclude<Item, InfoItem>;

export const isQuestion = (item: Item): item is Question => item.t !== 'info';

export type Lesson = {
  id: string;
  title: string;
  items: Item[];
};

export type Unit = {
  id: string;
  title: string;
  subtitle: string;
  color: UnitColor;
  source: { book: string; pages: [number, number] };
  lessons: Lesson[];
};

export type Curriculum = {
  meta: {
    title: string;
    book: string;
    author: string;
    edition: string;
    note: string;
  };
  units: Unit[];
};

/** درس مُسطَّح مع موقعه في المنهج — لترتيب المسار وحساب التقدّم. */
export type PathNode = {
  key: string;
  unit: Unit;
  lesson: Lesson;
  unitIndex: number;
  lessonIndex: number;
};

export function flatten(curriculum: Curriculum): PathNode[] {
  return curriculum.units.flatMap((unit, unitIndex) =>
    unit.lessons.map((lesson, lessonIndex) => ({
      key: `${unit.id}/${lesson.id}`,
      unit,
      lesson,
      unitIndex,
      lessonIndex,
    })),
  );
}
