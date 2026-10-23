import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { palette, radius, space } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';
import { useAuth } from '@/store/auth';
import { useProgress } from '@/store/progress';
import { Txt } from './Txt';

/** يحوّل ms إلى "م:ث" لعرض وقت عودة القلب. */
function countdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function Hud() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { streak, xp, hearts, nextHeartMs } = useProgress();

  return (
    <View
      style={[
        styles.bar,
        { paddingTop: insets.top + space.sm, backgroundColor: theme.bg, borderBottomColor: theme.border },
      ]}
    >
      <Stat icon="🔥" value={String(streak)} tint={palette.orange} />
      <Stat icon="💎" value={String(xp)} tint={palette.gold} />
      <Stat
        icon="❤️"
        value={String(hearts)}
        tint={palette.ruby}
        hint={hearts < 5 && nextHeartMs !== null ? countdown(nextHeartMs) : undefined}
      />
      <View style={styles.spacer} />
      <AccountButton />
    </View>
  );
}

/** مدخل الحساب — حرف الاسم إن كان داخلًا، وإلا أيقونة عامّة. */
function AccountButton() {
  const theme = useTheme();
  const router = useRouter();
  const { account } = useAuth();

  const named = account && !account.guest ? (account.name || account.email || '').trim() : '';
  const initial = named ? named[0].toUpperCase() : '';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={account && !account.guest ? 'حسابك' : 'ادخل لحفظ تقدّمك'}
      hitSlop={8}
      onPress={() => router.push('/account')}
      style={[
        styles.avatar,
        {
          backgroundColor: initial ? palette.emerald : theme.surfaceAlt,
          borderColor: theme.border,
        },
      ]}
    >
      <Txt size="small" weight="bold" center color={initial ? '#ffffff' : theme.inkSoft}>
        {initial || '👤'}
      </Txt>
    </Pressable>
  );
}

function Stat({ icon, value, tint, hint }: { icon: string; value: string; tint: string; hint?: string }) {
  return (
    <View style={styles.stat}>
      <Txt size="lead">{icon}</Txt>
      <Txt weight="bold" size="body" color={tint}>
        {value}
      </Txt>
      {hint ? (
        <Txt size="caption" color={tint} style={styles.hint}>
          {hint}
        </Txt>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    // صفٌّ معكوس: أوّل عنصر يظهر على اليمين، وهو ترتيب القراءة العربي.
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: space.lg,
    paddingHorizontal: space.lg,
    paddingBottom: space.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  stat: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: space.xs,
    paddingHorizontal: space.sm,
    paddingVertical: space.xs,
    borderRadius: radius.pill,
  },
  hint: { marginStart: space.xs, opacity: 0.8 },
  // يدفع زرّ الحساب إلى الطرف المقابل للإحصاءات.
  spacer: { flex: 1 },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
