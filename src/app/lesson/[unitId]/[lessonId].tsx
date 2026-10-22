import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { Txt } from '@/components/Txt';
import { isAnswerComplete, QuestionView } from '@/components/questions';
import curriculum from '@/content';
import { correctAnswerText, grade, type Answer } from '@/engine/grade';
import {
  advance,
  currentItem,
  finalXp,
  isComplete,
  itemKey,
  progress as sessionProgress,
  startSession,
  type Session,
} from '@/engine/session';
import { isQuestion } from '@/engine/types';
import { useProgress } from '@/store/progress';
import { palette, radius, space, unitColors } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

type Phase =
  | { kind: 'answering' }
  | { kind: 'checked'; correct: boolean }
  | { kind: 'finished' };

export default function LessonScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { unitId, lessonId } = useLocalSearchParams<{ unitId: string; lessonId: string }>();
  const { hearts, loseHeart, completeLesson } = useProgress();

  const found = useMemo(() => {
    const unit = curriculum.units.find((u) => u.id === unitId);
    const lesson = unit?.lessons.find((l) => l.id === lessonId);
    return unit && lesson ? { unit, lesson } : null;
  }, [unitId, lessonId]);

  const [session, setSession] = useState<Session | null>(() =>
    found ? startSession(found.lesson) : null,
  );
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [phase, setPhase] = useState<Phase>({ kind: 'answering' });

  const close = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }, [router]);

  if (!found || !session) {
    return (
      <Centered>
        <Txt weight="bold" size="title" center>
          تعذّر العثور على هذا الدرس
        </Txt>
        <Button label="رجوع" onPress={close} style={styles.wide} />
      </Centered>
    );
  }

  const { unit, lesson } = found;
  const tint = (unitColors[unit.color] ?? unitColors.green).base;
  const item = currentItem(session);
  const seed = `${lesson.id}:${item ? lesson.items.indexOf(item) : 0}`;

  // ── نفدت القلوب ───────────────────────────────────────────────
  if (hearts <= 0 && phase.kind !== 'finished') {
    return (
      <Centered>
        <Txt size="hero" center>
          💔
        </Txt>
        <Txt weight="bold" size="title" center>
          نفدت القلوب
        </Txt>
        <Txt color={theme.inkSoft} center>
          يعود قلب كل عشرين دقيقة. استرح قليلًا ثم عُد.
        </Txt>
        <Button label="رجوع إلى المسار" onPress={close} tint={tint} style={styles.wide} />
      </Centered>
    );
  }

  // ── انتهى الدرس ───────────────────────────────────────────────
  if (phase.kind === 'finished' || !item) {
    const gained = finalXp(session);
    return (
      <Centered>
        <Txt size="hero" center>
          {session.mistakes === 0 ? '🏅' : '✨'}
        </Txt>
        <Txt weight="black" size="display" center>
          أتممتَ الدرس
        </Txt>
        <Txt color={theme.inkSoft} center>
          {lesson.title}
        </Txt>
        <View style={styles.scoreRow}>
          <Score label="نقاط مكتسبة" value={String(gained)} tint={tint} />
          <Score label="أخطاء" value={String(session.mistakes)} tint={theme.inkSoft} />
        </View>
        {session.mistakes === 0 ? (
          <Txt size="small" color={theme.correctInk} center>
            بلا خطأ — مكافأة إضافية
          </Txt>
        ) : null}
        <Button
          label="متابعة"
          tint={tint}
          style={styles.wide}
          onPress={() => {
            completeLesson(`${unit.id}/${lesson.id}`, gained);
            close();
          }}
        />
      </Centered>
    );
  }

  // ── عنصر تعليمي ───────────────────────────────────────────────
  const onInfoNext = () => {
    const next = advance(session, { kind: 'info' });
    setSession(next);
    setAnswer(null);
    setPhase(isComplete(next) ? { kind: 'finished' } : { kind: 'answering' });
  };

  const onCheck = () => {
    if (!isQuestion(item) || !answer) return;
    const correct = grade(item, answer);
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(
        correct ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error,
      ).catch(() => {});
    }
    if (!correct) loseHeart();
    setPhase({ kind: 'checked', correct });
  };

  const onContinue = () => {
    if (phase.kind !== 'checked' || !isQuestion(item)) return;
    const key = itemKey(lesson.id, item, lesson.items.indexOf(item));
    const next = advance(
      session,
      phase.correct ? { kind: 'correct' } : { kind: 'wrong', key },
    );
    setSession(next);
    setAnswer(null);
    setPhase(isComplete(next) ? { kind: 'finished' } : { kind: 'answering' });
  };

  const revealed = phase.kind === 'checked';
  const pct = Math.round(sessionProgress(session) * 100);

  return (
    <View style={[styles.fill, { backgroundColor: theme.bg, paddingTop: insets.top + space.sm }]}>
      <View style={styles.topBar}>
        <Pressable accessibilityRole="button" accessibilityLabel="إغلاق الدرس" onPress={close} hitSlop={12}>
          <Txt size="title" color={theme.inkFaint}>
            ✕
          </Txt>
        </Pressable>
        <View style={[styles.track, { backgroundColor: theme.surfaceAlt }]}>
          <View style={[styles.trackFill, { width: `${pct}%`, backgroundColor: tint }]} />
        </View>
        <Txt weight="bold" color={hearts <= 2 ? '#e5484d' : theme.inkSoft}>
          ❤️ {hearts}
        </Txt>
      </View>

      <ScrollView
        contentContainerStyle={[styles.body, { paddingBottom: space.xxl }]}
        showsVerticalScrollIndicator={false}
      >
        <Txt size="caption" color={theme.inkFaint}>
          {unit.title} ·{' '}
          {item.t === 'info'
            ? 'بطاقة تعليمية'
            : `السؤال ${Math.min(session.cleared + 1, session.totalQuestions)} من ${session.totalQuestions}`}
        </Txt>

        {item.t === 'info' ? (
          <View style={[styles.infoCard, { backgroundColor: theme.surface, borderColor: tint }]}>
            <Txt weight="bold" size="title" color={tint}>
              {item.h}
            </Txt>
            <Txt size="lead" style={styles.infoBody}>
              {item.b}
            </Txt>
            <Txt size="caption" color={theme.inkFaint}>
              منهاج المسلم، ص {item.src}
            </Txt>
          </View>
        ) : (
          <>
            <Txt weight="bold" size="title" style={styles.prompt}>
              {item.q}
            </Txt>
            <QuestionView
              question={item}
              seed={seed}
              value={answer}
              onChange={setAnswer}
              revealed={revealed}
            />
          </>
        )}
      </ScrollView>

      <View
        style={[
          styles.footer,
          { paddingBottom: insets.bottom + space.lg, borderTopColor: theme.border },
          revealed && {
            backgroundColor: phase.correct ? theme.correctBg : theme.wrongBg,
            borderTopColor: 'transparent',
          },
        ]}
      >
        {revealed && isQuestion(item) ? (
          <View style={styles.feedback}>
            <Txt weight="black" size="lead" color={phase.correct ? theme.correctInk : theme.wrongInk}>
              {phase.correct ? '✓ أحسنت' : `✕ الصواب: ${correctAnswerText(item)}`}
            </Txt>
            <Txt size="small" color={phase.correct ? theme.correctInk : theme.wrongInk}>
              {item.e}
            </Txt>
            <Txt size="caption" color={phase.correct ? theme.correctInk : theme.wrongInk} style={styles.src}>
              منهاج المسلم، ص {item.src}
            </Txt>
          </View>
        ) : null}

        {item.t === 'info' ? (
          <Button label="فهمت" onPress={onInfoNext} tint={tint} />
        ) : revealed ? (
          // لون الحكم لا لون الوحدة: أخضر للصواب وأحمر للخطأ، كيلا يناقض الزرُّ لوحةَ التغذية الراجعة.
          <Button
            label="متابعة"
            onPress={onContinue}
            variant={phase.correct ? 'primary' : 'danger'}
            tint={phase.correct ? palette.emerald : undefined}
          />
        ) : (
          <Button
            label="تحقّق"
            onPress={onCheck}
            tint={tint}
            disabled={!isAnswerComplete(item, answer)}
          />
        )}
      </View>
    </View>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.centered,
        { backgroundColor: theme.bg, paddingTop: insets.top + space.xxl, paddingBottom: insets.bottom + space.xl },
      ]}
    >
      {children}
    </View>
  );
}

function Score({ label, value, tint }: { label: string; value: string; tint: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.score, { borderColor: tint }]}>
      <Txt size="caption" color={theme.inkSoft}>
        {label}
      </Txt>
      <Txt weight="black" size="title" color={tint}>
        {value}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.md,
    paddingHorizontal: space.xl,
  },
  wide: { alignSelf: 'stretch', marginTop: space.lg, maxWidth: 420, width: '100%' },
  topBar: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingBottom: space.md,
  },
  track: { flex: 1, height: 14, borderRadius: radius.pill, overflow: 'hidden' },
  // يمتلئ الشريط من اليمين لليسار موافقةً لاتجاه القراءة.
  trackFill: { position: 'absolute', right: 0, top: 0, bottom: 0, borderRadius: radius.pill },
  body: { paddingHorizontal: space.lg, gap: space.lg },
  prompt: { marginBottom: space.xs },
  infoCard: { borderRadius: radius.lg, borderWidth: 2, padding: space.lg, gap: space.sm },
  infoBody: { marginBottom: space.xs },
  footer: {
    paddingHorizontal: space.lg,
    paddingTop: space.lg,
    gap: space.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  feedback: { gap: space.xs },
  src: { opacity: 0.75 },
  scoreRow: { flexDirection: 'row-reverse', gap: space.lg, marginTop: space.sm },
  score: {
    borderWidth: 2,
    borderRadius: radius.lg,
    paddingVertical: space.md,
    paddingHorizontal: space.xl,
    alignItems: 'center',
    minWidth: 110,
  },
});
