import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { LIP, radius, space } from '@/theme/tokens';
import { useIsDark, useTheme } from '@/theme/useTheme';
import { shade } from './Button';
import { Txt } from './Txt';

export type NodeState = 'done' | 'current' | 'locked';

type Props = {
  index: number;
  label: string;
  state: NodeState;
  tint: string;
  onPress: () => void;
};

const SIZE = 72;

/** الفجوة بين الدائرة وهالة الدرس الحالي. */
const HALO_GAP = 6;

/** دائرة درس على المسار. الحالة تحدّد اللون والرمز وإمكان الضغط. */
export function PathNodeButton({ index, label, state, tint, onPress }: Props) {
  const theme = useTheme();
  const dark = useIsDark();
  const [down, setDown] = useState(false);
  const locked = state === 'locked';

  const fill = locked ? theme.locked : tint;
  const ink = locked ? theme.lockedInk : '#ffffff';
  const glyph = state === 'done' ? '✓' : locked ? '🔒' : String(index + 1);

  return (
    <View style={styles.cell}>
      <View style={styles.circleWrap}>
        {state === 'current' ? (
          // على الداكن تذوب الهالة الشفيفة في الخلفية وتبدو لطخة رمادية، فنزيد كثافتها.
          <View style={[styles.halo, { borderColor: tint, opacity: dark ? 0.6 : 0.35 }]} />
        ) : null}
        <View style={[styles.lip, { backgroundColor: locked ? theme.borderStrong : shade(tint) }]} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${label}${locked ? ' — مُقفل' : ''}`}
          accessibilityState={{ disabled: locked }}
          disabled={locked}
          onPress={() => {
            if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
            onPress();
          }}
          onPressIn={() => setDown(true)}
          onPressOut={() => setDown(false)}
          style={[
            styles.circle,
            { backgroundColor: fill, transform: [{ translateY: down && !locked ? LIP : 0 }] },
          ]}
        >
          <Txt weight="black" size={state === 'done' ? 'title' : 'lead'} color={ink} center>
            {glyph}
          </Txt>
        </Pressable>
      </View>
      <Txt
        size="caption"
        weight={state === 'current' ? 'bold' : 'medium'}
        center
        color={locked ? theme.lockedInk : theme.inkSoft}
        numberOfLines={2}
        style={styles.label}
      >
        {label}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  cell: { alignItems: 'center', width: 124 },
  circleWrap: { width: SIZE, height: SIZE + LIP, justifyContent: 'center' },
  halo: {
    position: 'absolute',
    // الدائرة متوسّطة في صندوق أطول منها بمقدار LIP، فتُزاح الهالة بنصفه
    // رأسيًّا كي تبقى متّحدة المركز معها بدل أن تعلو عنها.
    top: LIP / 2 - HALO_GAP,
    bottom: LIP / 2 - HALO_GAP,
    left: -HALO_GAP,
    right: -HALO_GAP,
    borderRadius: radius.pill,
    borderWidth: 3,
  },
  lip: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: LIP,
    height: SIZE,
    borderRadius: radius.pill,
  },
  circle: {
    width: SIZE,
    height: SIZE,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { marginTop: space.sm, paddingHorizontal: space.xs },
});
