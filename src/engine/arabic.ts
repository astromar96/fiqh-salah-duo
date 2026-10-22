/**
 * صيغة المعدود في العربية تتبع العدد، لا تُجمع دائمًا:
 * ١ مفرد، ٢ مثنى، ٣-١٠ جمع، و١١ فأكثر مفرد منصوب.
 * بدونها يظهر «١٥ وحدات» وهو لحنٌ ظاهر.
 */
export type NounForms = {
  /** واحد: درس */
  one: string;
  /** اثنان: درسان */
  two: string;
  /** ٣-١٠: دروس */
  few: string;
  /** ١١ فأكثر، و٠: درسًا */
  many: string;
};

export const LESSON: NounForms = { one: 'درس', two: 'درسان', few: 'دروس', many: 'درسًا' };
export const UNIT: NounForms = { one: 'وحدة', two: 'وحدتان', few: 'وحدات', many: 'وحدة' };
export const QUESTION: NounForms = { one: 'سؤال', two: 'سؤالان', few: 'أسئلة', many: 'سؤالًا' };

/** يختار صيغة المعدود المناسبة للعدد. */
export function nounFor(n: number, forms: NounForms): string {
  const abs = Math.abs(n) % 100;
  if (abs === 1) return forms.one;
  if (abs === 2) return forms.two;
  if (abs >= 3 && abs <= 10) return forms.few;
  return forms.many;
}

/** «٣ دروس» / «١٥ درسًا» — العدد ومعدوده بالصيغة الصحيحة. */
export function counted(n: number, forms: NounForms): string {
  // ١ و٢ يُستغنى فيهما عن العدد: «درس» و«درسان» تدلّان عليه.
  const abs = Math.abs(n) % 100;
  if (abs === 1 || abs === 2) return nounFor(n, forms);
  return `${n} ${nounFor(n, forms)}`;
}
