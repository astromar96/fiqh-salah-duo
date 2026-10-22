import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { shade } from '@/components/Button';
import { Hud } from '@/components/Hud';
import { Txt } from '@/components/Txt';
import { curriculum } from '@/content';
import { counted, LESSON, UNIT } from '@/engine/arabic';
import { allLessons, flatten, type Section } from '@/engine/types';
import { useProgress } from '@/store/progress';
import { LIP, radius, space, unitColors } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

export default function HomeScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDone, ready } = useProgress();

  const total = useMemo(() => allLessons(curriculum).length, []);
  const done = useMemo(
    () => allLessons(curriculum).filter((n) => isDone(n.key)).length,
    [isDone],
  );
  const pct = total ? Math.round((done / total) * 100) : 0;

  if (!ready) return <View style={[styles.fill, { backgroundColor: theme.bg }]} />;

  return (
    <View style={[styles.fill, { backgroundColor: theme.bg }]}>
      <Hud />
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + space.xxl }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.intro}>
          <Txt weight="black" size="hero" center>
            {curriculum.meta.title}
          </Txt>
          <Txt size="small" color={theme.inkSoft} center style={styles.introSub}>
            {curriculum.meta.author} — {curriculum.meta.edition}
          </Txt>
          <View style={[styles.overall, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}>
            <View style={[styles.overallFill, { width: `${pct}%` }]} />
            <Txt size="caption" weight="bold" center color={theme.inkSoft} style={styles.overallLabel}>
              أتممتَ {done} من {counted(total, LESSON)}
            </Txt>
          </View>
        </View>

        {curriculum.sections.map((section) => (
          <SectionCard
            key={section.id}
            section={section}
            onPress={() => router.push(`/section/${section.id}`)}
          />
        ))}

        <Txt size="caption" color={theme.inkFaint} center style={styles.note}>
          {curriculum.meta.note}
        </Txt>
      </ScrollView>
    </View>
  );
}

/** بطاقة باب — عنوانه ونبذته وتقدّمه. الضغط يفتح مسار دروسه. */
function SectionCard({ section, onPress }: { section: Section; onPress: () => void }) {
  const theme = useTheme();
  const { isDone } = useProgress();
  const [down, setDown] = useState(false);

  const nodes = useMemo(() => flatten(section), [section]);
  const done = nodes.filter((n) => isDone(n.key)).length;
  const pct = nodes.length ? Math.round((done / nodes.length) * 100) : 0;
  const empty = nodes.length === 0;

  const tint = unitColors[section.color] ?? unitColors.green;
  const fill = empty ? theme.locked : tint.base;
  const ink = empty ? theme.lockedInk : '#ffffff';

  return (
    <View style={styles.cardWrap}>
      <View style={[styles.cardLip, { backgroundColor: empty ? theme.borderStrong : shade(fill) }]} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${section.subtitle}: ${section.title}`}
        accessibilityState={{ disabled: empty }}
        disabled={empty}
        onPressIn={() => setDown(true)}
        onPressOut={() => setDown(false)}
        onPress={onPress}
        style={[
          styles.card,
          { backgroundColor: fill, transform: [{ translateY: down && !empty ? LIP : 0 }] },
        ]}
      >
        <View style={styles.cardHead}>
          <Txt size="caption" weight="semibold" color={ink} style={styles.dim}>
            {section.subtitle} · ص {section.pages[0]}–{section.pages[1]}
          </Txt>
          <Txt size="caption" weight="bold" color={ink} style={styles.dim}>
            {empty ? 'قريبًا' : `${pct}%`}
          </Txt>
        </View>
        <Txt weight="black" size="title" color={ink}>
          {section.title}
        </Txt>
        <Txt size="small" color={ink} style={styles.dim}>
          {section.blurb}
        </Txt>
        {empty ? null : (
          <>
            <View style={styles.bar}>
              <View style={[styles.barFill, { width: `${pct}%` }]} />
            </View>
            <Txt size="caption" color={ink} style={styles.dim}>
              {counted(section.units.length, UNIT)} · {counted(nodes.length, LESSON)}
            </Txt>
          </>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  scroll: { paddingHorizontal: space.lg },
  intro: { paddingTop: space.xl, paddingBottom: space.sm, alignItems: 'center' },
  introSub: { marginTop: space.xs },
  overall: {
    marginTop: space.lg,
    width: '100%',
    maxWidth: 420,
    height: 26,
    borderRadius: radius.pill,
    borderWidth: 1,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  overallFill: {
    // يبدأ الامتلاء من اليمين، موافقةً لاتجاه القراءة.
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#17a673',
    opacity: 0.25,
  },
  overallLabel: { width: '100%' },
  cardWrap: { width: '100%', maxWidth: 480, alignSelf: 'center', marginTop: space.lg },
  cardLip: { position: 'absolute', left: 0, right: 0, bottom: 0, height: radius.lg + LIP, borderRadius: radius.lg },
  card: { borderRadius: radius.lg, padding: space.lg, marginBottom: LIP, alignItems: 'flex-end', gap: 2 },
  cardHead: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  dim: { opacity: 0.85 },
  bar: {
    width: '100%',
    height: 10,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(0,0,0,0.18)',
    overflow: 'hidden',
    marginTop: space.sm,
  },
  barFill: { position: 'absolute', right: 0, top: 0, bottom: 0, backgroundColor: '#ffffff', opacity: 0.9 },
  note: { marginTop: space.xl, paddingHorizontal: space.md },
});
