import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { glossIndex } from '@/engine/glossary';
import type { Item, Question } from '@/engine/types';
import { radius, space } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';
import { Txt } from './Txt';

/** أكثر ما يُعرض قبل الطلب — ٩٢٪ من العناصر لا تبلغه، فلا يطول الصندوق. */
const CAP = 6;
/** الفوتر لوحةٌ ثابتة لا تُمرَّر، فنكتفي فيه بأقلّ ما يَفي. */
const FOOTER_CAP = 3;

/** نصوص العنصر المعروضة مع السؤال — ما خلا التفسير، فموضعه الفوتر. */
function prompt(item: Item): string[] {
  if (item.t === 'info') return [item.h, item.b];
  const texts: string[] = [item.q];
  if (item.t === 'mcq') texts.push(...item.o);
  if (item.t === 'order') texts.push(...item.items);
  if (item.t === 'fill') texts.push(...item.bank);
  if (item.t === 'match') texts.push(...item.pairs.flat());
  return texts;
}

function more(n: number): string {
  if (n === 1) return 'إظهار كلمة أخرى';
  if (n === 2) return 'إظهار كلمتين أخريين';
  return `إظهار ${n} كلمات أخرى`;
}

/**
 * معاني الكلمات الصعبة الواردة في السؤال، تحته.
 *
 * الكلمة تُعرض مشكولةً كما في المعجم لا كما وردت في النص، فصورتها المعجمية
 * واحدة مهما تغيّر إعرابها أو لحقها ضميرٌ في موضعها.
 *
 * موضعه تحت الخيارات لا بينها وبين السؤال، كيلا يدفعها عن الشاشة. ولا يدخل
 * فيه التفسير، فلا يطول الصندوق عند الكشف ولا تتزحزح الواجهة تحت الإصبع.
 */
export function Glossary({ item, tint }: { item: Item; tint: string }) {
  const theme = useTheme();
  const [showAll, setShowAll] = useState(false);
  const glosses = useMemo(() => glossIndex.find(prompt(item)), [item]);

  if (!glosses.length) return null;
  const shown = showAll ? glosses : glosses.slice(0, CAP);
  const rest = glosses.length - shown.length;

  return (
    <View style={[styles.box, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}>
      <Txt size="caption" weight="bold" color={theme.inkFaint}>
        معاني الكلمات
      </Txt>
      {shown.map((gloss) => (
        <Txt key={gloss.w} size="small" color={theme.inkSoft}>
          <Txt size="small" weight="bold" color={tint}>
            {gloss.w}
          </Txt>
          {`: ${gloss.m}`}
        </Txt>
      ))}
      {rest > 0 ? (
        <Pressable accessibilityRole="button" onPress={() => setShowAll(true)} hitSlop={8}>
          <Txt size="caption" weight="bold" color={tint}>
            {more(rest)}
          </Txt>
        </Pressable>
      ) : null}
    </View>
  );
}

/**
 * ما استجدَّ من الكلمات في التفسير وحده، سطرًا واحدًا داخل لوحة التغذية
 * الراجعة. القارئ وقت الكشف ينظر إلى الفوتر لا إلى أعلى الصفحة، فلو أُضيفت
 * هذه الكلمات إلى الصندوق فوق لَنَمَت حيث لا يرى.
 */
export function GlossaryNote({ item, ink }: { item: Question; ink: string }) {
  const glosses = useMemo(() => {
    const already = new Set(glossIndex.find(prompt(item)));
    return glossIndex.find([item.e]).filter((g) => !already.has(g)).slice(0, FOOTER_CAP);
  }, [item]);

  if (!glosses.length) return null;
  return (
    <Txt size="caption" color={ink} style={styles.note}>
      {glosses.map((gloss, i) => (
        <Txt key={gloss.w} size="caption" color={ink}>
          {i ? ' · ' : ''}
          <Txt size="caption" weight="bold" color={ink}>
            {gloss.w}
          </Txt>
          {`: ${gloss.m}`}
        </Txt>
      ))}
    </Txt>
  );
}

const styles = StyleSheet.create({
  box: {
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: space.md,
    paddingHorizontal: space.lg,
    gap: space.xs,
  },
  note: { opacity: 0.85 },
});
