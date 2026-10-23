/**
 * مطابقة كلمات المعجم في نصّ المنهج.
 *
 * هذا الملف خالٍ من الاستيراد عن قصد: المدقّق `scripts/check-glossary.mjs`
 * يستورده كما هو فيعمل على نفس المطابقة التي تعمل في التطبيق، فلا تتفرّع
 * نسختان من المنطق ولا يمرّ خطأٌ في إحداهما دون الأخرى.
 */

/** مدخلة في المعجم: الكلمة كما تُكتب، ومعناها بعربية سهلة. */
export type Gloss = {
  /** الكلمة مشكولةً — هي ما يُعرض للقارئ. */
  w: string;
  /** المعنى بأسهل عبارة ممكنة. */
  m: string;
  /** صيغ أخرى تُطابَق ولا تُعرض (جمعٌ، أو مفردٌ، أو لفظٌ لا تبلغه القواعد). */
  also?: string[];
};

/**
 * علامات التشكيل والتطويل. نصّ المنهج مشكول بالكامل، والمعجم لا يحمل كل
 * احتمالات الشكل للكلمة الواحدة، فنطابق على الهيكل المجرَّد منه.
 */
const MARKS = /[ؗ-ًؚ-ْٰۖ-ۭـ]/g;

/**
 * يجرّد الكلمة من التشكيل ويوحّد الحروف التي يتبادل رسمُها (الهمزات،
 * والألف المقصورة، والتاء المربوطة). المخرج للمطابقة لا للعرض.
 */
export function bare(text: string): string {
  return text
    .replace(MARKS, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/ة/g, 'ه');
}

/**
 * السوابق واللواحق المتصلة بالكلمة، من الأطول إلى الأقصر ليُقتطع أكبرُ ما
 * يطابق فلا تُقتطع «ال» من «بالصلاة» وتُترك الباء.
 */
const PREFIXES = ['وبال', 'فبال', 'ولل', 'فلل', 'وال', 'فال', 'بال', 'كال', 'لل', 'ال', 'و', 'ف', 'ب', 'ل', 'ك'];
// ألف تنوين النصب آخرةٌ لأن غيرها أولى بالاقتطاع: «عليها» ضميرٌ لا تنوين.
const SUFFIXES = ['هما', 'كما', 'هم', 'هن', 'كم', 'كن', 'ها', 'نا', 'ه', 'ك', 'ي', 'ا'];

/** أقصر جذر نقبله بعد الاقتطاع — أقلُّ من ذلك يطابق الحروف لا الكلمات. */
const MIN_STEM = 3;

const WORDS = /[ء-ي]+/g;

/**
 * الجذور الباقية بعد اقتطاع كل سابقةٍ أو لاحقةٍ تطابق. ولا نقف عند أولِ ما
 * يطابق: «شأنًا» تنتهي بـ«نا» وهي ضمير، فلو وقفنا عندها لخرج «شا» وسقطت
 * الكلمة، وإنما هي ألف تنوينٍ يَبقى بعدها «شأن».
 */
function strip(word: string, affixes: string[], side: 'start' | 'end'): string[] {
  const stems: string[] = [];
  for (const affix of affixes) {
    const hit = side === 'start' ? word.startsWith(affix) : word.endsWith(affix);
    if (!hit) continue;
    const stem = side === 'start' ? word.slice(affix.length) : word.slice(0, -affix.length);
    if (stem.length >= MIN_STEM) stems.push(stem);
  }
  return stems;
}

/**
 * صيغ الكلمة التي نجرّبها في المعجم: كما هي، ثم بعد اقتطاع سابقة، ثم
 * لاحقة، ثم الاثنتين. نكتفي بواحدةٍ من كل جهة لأن تكرار الاقتطاع يولّد
 * جذورًا وهمية تطابق كلماتٍ لا رحم بينها وبين الأصل.
 */
function forms(word: string, head: boolean, tail: boolean): string[] {
  const stems = head ? [word, ...strip(word, PREFIXES, 'start')] : [word];
  if (!tail) return stems;
  const out = [...stems];
  for (const stem of stems) {
    for (const cut of strip(stem, SUFFIXES, 'end')) {
      out.push(cut);
      // «ربوبيّة» + «ـه» = «ربوبيته»: التاء المربوطة تُفتح قبل الضمير، فنردّها.
      if (cut.endsWith('ت')) out.push(`${cut.slice(0, -1)}ه`);
    }
  }
  return out;
}

export type GlossIndex = {
  /** كلمات المعجم الواقعة في النصوص، على ترتيب ورودها وبلا تكرار. */
  find(texts: (string | undefined | null)[]): Gloss[];
  /** عدد الصيغ المفهرسة — للمدقّق. */
  readonly size: number;
};

/**
 * يبني فهرسًا من مدخلات المعجم. تُفهرس كل صيغة مجرّدةً، ومعها صورتها بلا
 * «ال» حتى تطابق الكلمةُ معرَّفةً ومنكَّرةً على السواء.
 */
export function makeGlossIndex(entries: Gloss[], never: string[] = []): GlossIndex {
  const index = new Map<string, Gloss>();
  /**
   * صورٌ يَردّها الاقتطاع إلى غير أصلها، فتُمنع من المطابقة رأسًا: «وسلَّم»
   * ليست عقد السَّلَم، و«فِعله» ليست العِلَّة، و«بعدها» ليست العِدَّة. ولا
   * تُغني عنها القواعد، إذ لا فرق في الرسم بين الصواب والخطأ ها هنا.
   */
  const blocked = new Set(never.map((form) => bare(form).trim()));
  let longest = 1;

  const add = (key: string, entry: Gloss) => {
    // أوّل مدخلة تكسب: ترتيب الملف هو ترتيب الأولوية عند تكرار الصيغة.
    if (key.length >= MIN_STEM && !index.has(key)) index.set(key, entry);
  };

  for (const entry of entries) {
    for (const form of [entry.w, ...(entry.also ?? [])]) {
      const words: string[] = bare(form).match(WORDS) ?? [];
      const [head, ...tail] = words;
      if (!head) continue;
      add(words.join(' '), entry);
      // تُفهرس الصيغة معرَّفةً ومنكَّرةً، فتطابق الكلمةُ على الوجهين.
      if (head.startsWith('ال')) add([head.slice(2), ...tail].join(' '), entry);
      longest = Math.max(longest, words.length);
    }
  }

  /** يبحث عن عبارة من `n` كلمة، مجرِّبًا صيغ أوّلها وآخرها. */
  const match = (words: string[]): Gloss | undefined => {
    const single = words.length === 1;
    const heads = forms(words[0], true, single);
    if (single) {
      for (const head of heads) {
        const hit = index.get(head);
        if (hit) return hit;
      }
      return undefined;
    }
    const tails = forms(words[words.length - 1], false, true);
    const middle = words.slice(1, -1);
    for (const head of heads) {
      for (const tail of tails) {
        const hit = index.get([head, ...middle, tail].join(' '));
        if (hit) return hit;
      }
    }
    return undefined;
  };

  return {
    size: index.size,
    find(texts) {
      const found: Gloss[] = [];
      const seen = new Set<Gloss>();
      for (const text of texts) {
        if (!text) continue;
        const words: string[] = bare(text).match(WORDS) ?? [];
        for (let i = 0; i < words.length; i += 1) {
          if (blocked.has(words[i] as string)) continue;
          // نُفضّل أطول عبارة تطابق، فـ«فرضُ عينٍ» مصطلحٌ واحد لا كلمتان.
          for (let n = Math.min(longest, words.length - i); n >= 1; n -= 1) {
            const hit = match(words.slice(i, i + n));
            if (!hit) continue;
            if (!seen.has(hit)) {
              seen.add(hit);
              found.push(hit);
            }
            i += n - 1;
            break;
          }
        }
      }
      return found;
    },
  };
}
