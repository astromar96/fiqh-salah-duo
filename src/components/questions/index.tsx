import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { Answer } from '@/engine/grade';
import { seededShuffle, shuffleAway } from '@/engine/shuffle';
import type { FillItem, MatchItem, McqItem, OrderItem, Question, TfItem } from '@/engine/types';
import { radius, space } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';
import { Txt } from '../Txt';
import { Choice, type ChoiceTone } from './Choice';

export type QuestionProps = {
  question: Question;
  /** بذرة ثابتة لخلط الخيارات — نفس السؤال يُعرض بنفس الترتيب داخل الجلسة. */
  seed: string;
  value: Answer | null;
  onChange: (answer: Answer) => void;
  /** بعد الضغط على «تحقّق» تُقفل الإجابة ويُكشف الصواب. */
  revealed: boolean;
};

export function QuestionView(props: QuestionProps) {
  switch (props.question.t) {
    case 'mcq':
      return <Mcq {...props} question={props.question} />;
    case 'tf':
      return <Tf {...props} question={props.question} />;
    case 'fill':
      return <Fill {...props} question={props.question} />;
    case 'order':
      return <Order {...props} question={props.question} />;
    case 'match':
      return <Match {...props} question={props.question} />;
  }
}

/** هل السؤال جاهز للتصحيح؟ تُستعمل لتعطيل زر «تحقّق». */
export function isAnswerComplete(question: Question, answer: Answer | null): boolean {
  if (!answer || answer.t !== question.t) return false;
  switch (question.t) {
    case 'order':
      // لا نصحّح حتى يُرتَّب كل العناصر.
      return (answer as Extract<Answer, { t: 'order' }>).sequence.length === question.items.length;
    case 'match': {
      // كل طرف أيسر موصول بطرف أيمن فعلي (القيمة الفارغة تعني «بانتظار اختيار»).
      const { links } = answer as Extract<Answer, { t: 'match' }>;
      return question.pairs.every(([left]) => !!links[left]);
    }
    default:
      return true;
  }
}

// ── اختيار من متعدد ────────────────────────────────────────────────
function Mcq({ question, seed, value, onChange, revealed }: QuestionProps & { question: McqItem }) {
  const options = useMemo(
    () => seededShuffle(question.o.map((label, i) => ({ label, i })), seed),
    [question, seed],
  );
  const picked = value?.t === 'mcq' ? value.choice : null;

  return (
    <View style={styles.stack}>
      {options.map(({ label, i }) => {
        let tone: ChoiceTone = 'idle';
        if (revealed && i === question.a) tone = 'correct';
        else if (revealed && i === picked) tone = 'wrong';
        else if (!revealed && i === picked) tone = 'selected';
        return (
          <Choice
            key={i}
            label={label}
            tone={tone}
            disabled={revealed}
            onPress={() => onChange({ t: 'mcq', choice: i })}
          />
        );
      })}
    </View>
  );
}

// ── صح / خطأ ──────────────────────────────────────────────────────
function Tf({ question, value, onChange, revealed }: QuestionProps & { question: TfItem }) {
  const picked = value?.t === 'tf' ? value.choice : null;
  return (
    <View style={styles.stack}>
      {[true, false].map((option) => {
        let tone: ChoiceTone = 'idle';
        if (revealed && option === question.a) tone = 'correct';
        else if (revealed && option === picked) tone = 'wrong';
        else if (!revealed && option === picked) tone = 'selected';
        return (
          <Choice
            key={String(option)}
            label={option ? 'صحيحة' : 'خاطئة'}
            badge={option ? '✓' : '✕'}
            tone={tone}
            disabled={revealed}
            onPress={() => onChange({ t: 'tf', choice: option })}
          />
        );
      })}
    </View>
  );
}

// ── ملء الفراغ ────────────────────────────────────────────────────
function Fill({ question, seed, value, onChange, revealed }: QuestionProps & { question: FillItem }) {
  const theme = useTheme();
  const bank = useMemo(() => seededShuffle(question.bank, seed), [question, seed]);
  const picked = value?.t === 'fill' ? value.choice : null;
  const [before, after] = question.q.split('____');

  return (
    <View style={styles.stack}>
      <View style={[styles.sentence, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Txt size="lead" weight="medium">
          {before}
          <Txt
            size="lead"
            weight="bold"
            color={revealed ? (picked === question.a ? theme.correctInk : theme.wrongInk) : '#17a673'}
          >
            {picked ?? '______'}
          </Txt>
          {after}
        </Txt>
      </View>
      {bank.map((option) => {
        let tone: ChoiceTone = 'idle';
        if (revealed && option === question.a) tone = 'correct';
        else if (revealed && option === picked) tone = 'wrong';
        else if (!revealed && option === picked) tone = 'selected';
        return (
          <Choice
            key={option}
            label={option}
            tone={tone}
            disabled={revealed}
            onPress={() => onChange({ t: 'fill', choice: option })}
          />
        );
      })}
    </View>
  );
}

// ── الترتيب ───────────────────────────────────────────────────────
function Order({ question, seed, value, onChange, revealed }: QuestionProps & { question: OrderItem }) {
  const theme = useTheme();
  const pool = useMemo(() => shuffleAway(question.items, seed), [question, seed]);
  const chosen = value?.t === 'order' ? value.sequence : [];
  const remaining = pool.filter((x) => !chosen.includes(x));
  const allRight = chosen.length === question.items.length && chosen.every((x, i) => x === question.items[i]);

  const push = (token: string) => onChange({ t: 'order', sequence: [...chosen, token] });
  const pop = (token: string) => onChange({ t: 'order', sequence: chosen.filter((x) => x !== token) });

  return (
    <View style={styles.stack}>
      <View style={[styles.tray, { borderColor: theme.border, backgroundColor: theme.surface }]}>
        {chosen.length === 0 ? (
          <Txt size="small" color={theme.inkFaint}>
            اضغط العناصر بالترتيب الصحيح
          </Txt>
        ) : (
          chosen.map((token, i) => {
            const right = revealed && question.items[i] === token;
            return (
              <Token
                key={token}
                label={`${i + 1}. ${token}`}
                tone={revealed ? (right ? 'correct' : 'wrong') : 'selected'}
                onPress={() => !revealed && pop(token)}
              />
            );
          })
        )}
      </View>
      <View style={styles.pool}>
        {remaining.map((token) => (
          <Token key={token} label={token} tone="idle" onPress={() => !revealed && push(token)} />
        ))}
      </View>
      {revealed && !allRight ? (
        <Txt size="small" color={theme.inkSoft}>
          الترتيب الصحيح: {question.items.join(' ← ')}
        </Txt>
      ) : null}
    </View>
  );
}

// ── التوصيل ───────────────────────────────────────────────────────
function Match({ question, seed, value, onChange, revealed }: QuestionProps & { question: MatchItem }) {
  const theme = useTheme();
  const lefts = useMemo(() => seededShuffle(question.pairs.map((p) => p[0]), `${seed}L`), [question, seed]);
  const rights = useMemo(() => seededShuffle(question.pairs.map((p) => p[1]), `${seed}R`), [question, seed]);
  const links = value?.t === 'match' ? value.links : {};
  // الطرف الأيسر المنتظر ربطه — نختار يمينًا بعده فيكتمل الزوج.
  const pending = Object.keys(links).find((k) => links[k] === '') ?? null;

  const expected = useMemo(
    () => Object.fromEntries(question.pairs) as Record<string, string>,
    [question],
  );
  const usedRights = new Set(Object.values(links).filter(Boolean));

  const tapLeft = (left: string) => {
    if (revealed) return;
    const next = { ...links };
    if (next[left] !== undefined) delete next[left];
    else {
      if (pending) delete next[pending];
      next[left] = '';
    }
    onChange({ t: 'match', links: next });
  };

  const tapRight = (right: string) => {
    if (revealed || !pending) return;
    onChange({ t: 'match', links: { ...links, [pending]: right } });
  };

  const toneFor = (left: string): ChoiceTone => {
    const linked = links[left];
    if (revealed) return linked && linked === expected[left] ? 'correct' : 'wrong';
    if (left === pending) return 'selected';
    return linked ? 'selected' : 'idle';
  };

  return (
    <View style={styles.columns}>
      <View style={styles.column}>
        {lefts.map((left) => (
          <Choice
            key={left}
            label={left}
            badge={links[left] ? '•' : undefined}
            tone={toneFor(left)}
            disabled={revealed}
            onPress={() => tapLeft(left)}
          />
        ))}
      </View>
      <View style={styles.column}>
        {rights.map((right) => {
          const owner = Object.keys(links).find((k) => links[k] === right);
          let tone: ChoiceTone = 'idle';
          if (revealed && owner) tone = expected[owner] === right ? 'correct' : 'wrong';
          else if (owner) tone = 'selected';
          return (
            <Choice
              key={right}
              label={right}
              tone={tone}
              disabled={revealed || (usedRights.has(right) && !owner)}
              onPress={() => (owner ? tapLeft(owner) : tapRight(right))}
            />
          );
        })}
      </View>
      {revealed && !question.pairs.every(([l, r]) => links[l] === r) ? (
        <Txt size="small" color={theme.inkSoft} style={styles.full}>
          الصواب: {question.pairs.map(([l, r]) => `${l} ← ${r}`).join('، ')}
        </Txt>
      ) : null}
    </View>
  );
}

function Token({ label, tone, onPress }: { label: string; tone: ChoiceTone; onPress: () => void }) {
  const theme = useTheme();
  const look = {
    idle: { bg: theme.surface, border: theme.border, ink: theme.ink },
    selected: { bg: theme.surfaceAlt, border: '#17a673', ink: theme.ink },
    correct: { bg: theme.correctBg, border: theme.correctInk, ink: theme.correctInk },
    wrong: { bg: theme.wrongBg, border: theme.wrongInk, ink: theme.wrongInk },
  }[tone];
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.token, { backgroundColor: look.bg, borderColor: look.border }]}
    >
      <Txt weight="medium" size="small" color={look.ink}>
        {label}
      </Txt>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  stack: { gap: space.md },
  sentence: { borderRadius: radius.lg, borderWidth: 2, padding: space.lg, marginBottom: space.sm },
  tray: {
    minHeight: 72,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderStyle: 'dashed',
    padding: space.md,
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: space.sm,
    alignItems: 'center',
  },
  pool: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: space.sm },
  token: { borderRadius: radius.md, borderWidth: 2, paddingVertical: space.sm, paddingHorizontal: space.md },
  columns: { flexDirection: 'row-reverse', gap: space.md, flexWrap: 'wrap' },
  column: { flex: 1, minWidth: 130, gap: space.sm },
  full: { width: '100%' },
});
