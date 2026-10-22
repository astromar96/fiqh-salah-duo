import * as Haptics from 'expo-haptics';
import { useCallback, useState } from 'react';
import { Platform, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import { LIP, radius, space } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';
import { Txt } from './Txt';

type Variant = 'primary' | 'danger' | 'ghost' | 'neutral';

type Props = {
  label: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  tint?: string;
  style?: ViewStyle;
};

/**
 * زر بحافة سفلية تغوص عند الضغط — هو ما يعطي الواجهة طابعها اللعبي.
 * الحافة جزء من ارتفاع الزر، فيُزاح المحتوى لأسفل بدل أن يتغيّر حجم الصندوق.
 */
export function Button({ label, onPress, variant = 'primary', disabled, tint, style }: Props) {
  const theme = useTheme();
  const [down, setDown] = useState(false);

  const colors: Record<Variant, { fill: string; lip: string; ink: string; border?: string }> = {
    primary: { fill: tint ?? '#17a673', lip: shade(tint ?? '#17a673'), ink: '#ffffff' },
    danger: { fill: '#e5484d', lip: shade('#e5484d'), ink: '#ffffff' },
    neutral: { fill: theme.surfaceAlt, lip: theme.borderStrong, ink: theme.ink },
    ghost: { fill: 'transparent', lip: 'transparent', ink: theme.inkSoft, border: theme.border },
  };
  const c = colors[variant];

  const handlePress = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    onPress();
  }, [onPress]);

  const pressed = down && !disabled;

  return (
    <View style={[styles.wrap, style]}>
      <View style={[styles.lip, { backgroundColor: disabled ? theme.locked : c.lip }]} />
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: !!disabled }}
        disabled={disabled}
        onPress={handlePress}
        onPressIn={() => setDown(true)}
        onPressOut={() => setDown(false)}
        style={[
          styles.face,
          {
            backgroundColor: disabled ? theme.locked : c.fill,
            transform: [{ translateY: pressed ? LIP : 0 }],
          },
          c.border ? { borderWidth: 2, borderColor: c.border } : null,
        ]}
      >
        <Txt weight="bold" size="body" center color={disabled ? theme.lockedInk : c.ink}>
          {label}
        </Txt>
      </Pressable>
    </View>
  );
}

/** يعتم اللون ٢٢٪ تقريبًا لتوليد لون الحافة من لون الوجه. */
export function shade(hex: string, amount = 0.78): string {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((x) => x + x).join('') : h;
  const n = parseInt(full, 16);
  const r = Math.round(((n >> 16) & 255) * amount);
  const g = Math.round(((n >> 8) & 255) * amount);
  const b = Math.round((n & 255) * amount);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

const styles = StyleSheet.create({
  wrap: { position: 'relative' },
  lip: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: LIP,
    bottom: 0,
    borderRadius: radius.lg,
  },
  face: {
    borderRadius: radius.lg,
    paddingVertical: space.md + 2,
    paddingHorizontal: space.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
});
