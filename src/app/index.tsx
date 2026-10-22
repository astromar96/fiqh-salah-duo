import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Hud } from '@/components/Hud';
import { PathNodeButton, type NodeState } from '@/components/PathNodeButton';
import { Txt } from '@/components/Txt';
import curriculum from '@/content';
import { flatten, type Unit } from '@/engine/types';
import { useProgress } from '@/store/progress';
import { radius, space, unitColors } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

/** إزاحة أفقية متعرّجة تعطي المسار شكل الأفعى: 0, +1, 0, -1, ... */
const WEAVE = [0, 1, 0, -1];
const WEAVE_PX = 56;

export default function PathScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDone, ready, doneCount } = useProgress();

  const nodes = useMemo(() => flatten(curriculum), []);
  /** أوّل درس غير منجز — هو الدرس المفتوح، وما بعده مُقفل. */
  const currentIndex = useMemo(() => {
    const i = nodes.findIndex((n) => !isDone(n.key));
    return i === -1 ? nodes.length : i;
  }, [nodes, isDone]);

  const total = nodes.length;
  const pct = total ? Math.round((doneCount / total) * 100) : 0;

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
            من كتاب «{curriculum.meta.book}» — {curriculum.meta.author}
          </Txt>
          <View style={[styles.overall, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}>
            <View style={[styles.overallFill, { width: `${pct}%` }]} />
            <Txt size="caption" weight="bold" center color={theme.inkSoft} style={styles.overallLabel}>
              أتممتَ {doneCount} من {total} درسًا
            </Txt>
          </View>
        </View>

        {curriculum.units.map((unit, unitIndex) => (
          <UnitSection
            key={unit.id}
            unit={unit}
            unitIndex={unitIndex}
            nodes={nodes}
            currentIndex={currentIndex}
            onOpen={(unitId, lessonId) => router.push(`/lesson/${unitId}/${lessonId}`)}
          />
        ))}

        <Txt size="caption" color={theme.inkFaint} center style={styles.note}>
          {curriculum.meta.note}
        </Txt>
      </ScrollView>
    </View>
  );
}

function UnitSection({
  unit,
  unitIndex,
  nodes,
  currentIndex,
  onOpen,
}: {
  unit: Unit;
  unitIndex: number;
  nodes: ReturnType<typeof flatten>;
  currentIndex: number;
  onOpen: (unitId: string, lessonId: string) => void;
}) {
  const theme = useTheme();
  const tint = unitColors[unit.color] ?? unitColors.green;

  return (
    <View style={styles.unit}>
      <View style={[styles.banner, { backgroundColor: tint.base }]}>
        <Txt size="caption" weight="semibold" color="rgba(255,255,255,0.85)">
          الوحدة {unitIndex + 1} · {unit.subtitle}
        </Txt>
        <Txt weight="bold" size="lead" color="#ffffff">
          {unit.title}
        </Txt>
        <Txt size="caption" color="rgba(255,255,255,0.75)">
          منهاج المسلم، ص {unit.source.pages[0]}–{unit.source.pages[1]}
        </Txt>
      </View>

      {unit.lessons.map((lesson, lessonIndex) => {
        const flatIndex = nodes.findIndex((n) => n.unit.id === unit.id && n.lesson.id === lesson.id);
        const state: NodeState =
          flatIndex < currentIndex ? 'done' : flatIndex === currentIndex ? 'current' : 'locked';
        const offset = WEAVE[lessonIndex % WEAVE.length] * WEAVE_PX;
        return (
          <View key={lesson.id} style={[styles.row, { transform: [{ translateX: offset }] }]}>
            <PathNodeButton
              index={lessonIndex}
              label={lesson.title}
              state={state}
              tint={tint.base}
              onPress={() => onOpen(unit.id, lesson.id)}
            />
          </View>
        );
      })}

      <View style={[styles.divider, { backgroundColor: theme.border }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  scroll: { paddingHorizontal: space.lg },
  intro: { paddingTop: space.xl, paddingBottom: space.lg, alignItems: 'center' },
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
    position: 'absolute',
    // يبدأ الامتلاء من اليمين، موافقةً لاتجاه القراءة.
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#17a673',
    opacity: 0.25,
  },
  overallLabel: { width: '100%' },
  unit: { alignItems: 'center' },
  banner: {
    width: '100%',
    maxWidth: 480,
    borderRadius: radius.lg,
    padding: space.lg,
    marginTop: space.lg,
    marginBottom: space.md,
    alignItems: 'flex-end',
    gap: 2,
  },
  row: { marginVertical: space.sm },
  divider: { height: 1, alignSelf: 'stretch', marginTop: space.lg, opacity: 0.6 },
  note: { marginTop: space.xl, paddingHorizontal: space.md },
});
