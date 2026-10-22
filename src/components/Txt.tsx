import { StyleSheet, Text, type TextProps, type TextStyle } from 'react-native';
import { font, size } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

type Weight = keyof typeof font;
type Size = keyof typeof size;

type Props = TextProps & {
  weight?: Weight;
  size?: Size;
  color?: string;
  center?: boolean;
};

/**
 * نص عربي بخط القاهرة واتجاه من اليمين لليسار.
 * الاتجاه مضبوط صراحة في كل نص بدل الاعتماد على I18nManager،
 * لأن تفعيله على الأجهزة يحتاج إعادة تشغيل التطبيق ويختلف سلوكه عن الويب.
 */
export function Txt({ weight = 'regular', size: s = 'body', color, center, style, ...rest }: Props) {
  const theme = useTheme();
  return (
    <Text
      {...rest}
      style={[
        styles.base,
        { fontFamily: font[weight], fontSize: size[s], color: color ?? theme.ink },
        // ارتفاع السطر يتبع حجم الخط: العربية تحتاج فسحة أكبر من اللاتينية.
        { lineHeight: Math.round(size[s] * 1.7) },
        center && styles.center,
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  base: { writingDirection: 'rtl', textAlign: 'right' } as TextStyle,
  center: { textAlign: 'center' },
});
