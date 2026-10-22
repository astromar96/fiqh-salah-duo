import type { Question } from './types';

/** الإجابة التي يقدّمها اللاعب، بحسب نوع السؤال. */
export type Answer =
  | { t: 'mcq'; choice: number }
  | { t: 'tf'; choice: boolean }
  | { t: 'order'; sequence: string[] }
  | { t: 'match'; links: Record<string, string> }
  | { t: 'fill'; choice: string };

const sameSequence = (a: string[], b: string[]) =>
  a.length === b.length && a.every((v, i) => v === b[i]);

/** يقارن الإجابة بالمفتاح. يرمي إن اختلف نوع الإجابة عن نوع السؤال. */
export function grade(question: Question, answer: Answer): boolean {
  if (question.t !== answer.t) {
    throw new Error(`answer type ${answer.t} does not match question type ${question.t}`);
  }
  switch (question.t) {
    case 'mcq':
      return (answer as Extract<Answer, { t: 'mcq' }>).choice === question.a;
    case 'tf':
      return (answer as Extract<Answer, { t: 'tf' }>).choice === question.a;
    case 'fill':
      return (answer as Extract<Answer, { t: 'fill' }>).choice === question.a;
    case 'order':
      return sameSequence((answer as Extract<Answer, { t: 'order' }>).sequence, question.items);
    case 'match': {
      const { links } = answer as Extract<Answer, { t: 'match' }>;
      return question.pairs.every(([left, right]) => links[left] === right);
    }
  }
}

/** الصياغة النصية للإجابة الصحيحة — تُعرض عند الخطأ. */
export function correctAnswerText(question: Question): string {
  switch (question.t) {
    case 'mcq':
      return question.o[question.a];
    case 'tf':
      return question.a ? 'صحيحة' : 'خاطئة';
    case 'fill':
      return question.a;
    case 'order':
      return question.items.join(' ← ');
    case 'match':
      return question.pairs.map(([l, r]) => `${l} ← ${r}`).join('، ');
  }
}
