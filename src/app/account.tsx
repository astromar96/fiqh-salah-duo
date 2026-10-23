import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { Txt } from '@/components/Txt';
import { counted, LESSON } from '@/engine/arabic';
import { useAuth, type SocialProvider } from '@/store/auth';
import { useProgress } from '@/store/progress';
import { radius, space } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

const PROVIDER_LABEL: Record<SocialProvider, string> = {
  google: 'المتابعة بحساب Google',
  apple: 'المتابعة بحساب Apple',
};

const PROVIDER_TINT: Record<SocialProvider, string> = {
  google: '#4285f4',
  apple: '#3a3a3c',
};

export default function AccountScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { account, ready, busy, error, social, clearError, leave } = useAuth();
  const { doneCount, xp, streak } = useProgress();

  const close = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  return (
    <View style={[styles.fill, { backgroundColor: theme.bg }]}>
      <View style={[styles.head, { paddingTop: insets.top + space.md, borderBottomColor: theme.border }]}>
        <Txt weight="black" size="title">
          {account ? 'حسابك' : 'احفظ تقدّمك'}
        </Txt>
        <Pressable accessibilityRole="button" accessibilityLabel="إغلاق" onPress={close} hitSlop={12}>
          <Txt size="title" color={theme.inkSoft}>
            ✕
          </Txt>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + space.xxl }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.summary, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}>
          <Txt size="small" color={theme.inkSoft}>
            أتممتَ {counted(doneCount, LESSON)} · {xp} نقطة · سلسلة {streak}
          </Txt>
        </View>

        {error ? (
          <View style={[styles.alert, { backgroundColor: theme.wrongBg }]}>
            <Txt size="small" color={theme.wrongInk}>
              {error}
            </Txt>
          </View>
        ) : null}

        {!ready ? (
          <Txt size="small" color={theme.inkFaint} center>
            لحظة…
          </Txt>
        ) : account && !account.guest ? (
          <SignedIn
            name={account.name}
            email={account.email}
            busy={busy}
            onLeave={async () => {
              await leave();
            }}
          />
        ) : (
          <SignIn guest={!!account?.guest} busy={busy} social={social} onDone={close} onTyping={clearError} />
        )}
      </ScrollView>
    </View>
  );
}

/** حساب قائم: ما يعرّفه، وزرّ الخروج. */
function SignedIn({
  name,
  email,
  busy,
  onLeave,
}: {
  name: string | null;
  email: string | null;
  busy: boolean;
  onLeave: () => void;
}) {
  const theme = useTheme();
  return (
    <View style={styles.block}>
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Txt weight="bold" size="lead">
          {name || email || 'حسابك'}
        </Txt>
        {email && name ? (
          <Txt size="small" color={theme.inkSoft} style={styles.ltr}>
            {email}
          </Txt>
        ) : null}
        <Txt size="small" color={theme.inkSoft}>
          تقدّمك محفوظ في حسابك، ويصل إلى أيّ جهاز تدخل منه.
        </Txt>
      </View>
      <Button label="تسجيل الخروج" variant="ghost" disabled={busy} onPress={onLeave} />
      <Txt size="caption" color={theme.inkFaint} center>
        الخروج لا يمحو تقدّمك — يعود كما هو عند دخولك ثانيةً.
      </Txt>
    </View>
  );
}

/** لا حساب بعدُ، أو ضيف يريد ترقية حسابه. */
function SignIn({
  guest,
  busy,
  social,
  onDone,
  onTyping,
}: {
  guest: boolean;
  busy: boolean;
  social: SocialProvider[];
  onDone: () => void;
  onTyping: () => void;
}) {
  const theme = useTheme();
  const { signInWithProvider, signInWithEmail, registerWithEmail, resetPassword, continueAsGuest } =
    useAuth();
  const [newAccount, setNewAccount] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [sent, setSent] = useState(false);

  const change = (set: (value: string) => void) => (value: string) => {
    onTyping();
    setSent(false);
    set(value);
  };

  const submit = async () => {
    const ok = newAccount
      ? await registerWithEmail(name, email, password)
      : await signInWithEmail(email, password);
    if (ok) onDone();
  };

  return (
    <View style={styles.block}>
      <Txt size="small" color={theme.inkSoft}>
        {guest
          ? 'أنت تلعب كضيف. اربط حسابًا ليبقى تقدّمك إن بدّلت الجهاز أو مسحت بيانات المتصفّح.'
          : 'ادخل ليُحفظ تقدّمك في حسابك ويصل إلى أجهزتك كلّها.'}
      </Txt>

      {social.map((provider) => (
        <Button
          key={provider}
          label={PROVIDER_LABEL[provider]}
          tint={PROVIDER_TINT[provider]}
          disabled={busy}
          onPress={async () => {
            if (await signInWithProvider(provider)) onDone();
          }}
        />
      ))}

      <View style={styles.rule}>
        <View style={[styles.line, { backgroundColor: theme.border }]} />
        <Txt size="caption" color={theme.inkFaint}>
          أو بالبريد
        </Txt>
        <View style={[styles.line, { backgroundColor: theme.border }]} />
      </View>

      {newAccount ? (
        <Field label="الاسم" value={name} onChange={change(setName)} autoComplete="name" />
      ) : null}
      <Field
        label="البريد"
        value={email}
        onChange={change(setEmail)}
        keyboardType="email-address"
        autoComplete="email"
        latin
      />
      <Field
        label="كلمة المرور"
        value={password}
        onChange={change(setPassword)}
        secureTextEntry
        autoComplete={newAccount ? 'new-password' : 'current-password'}
        latin
      />

      <Button
        label={newAccount ? 'إنشاء حساب' : 'دخول'}
        disabled={busy || !email.trim() || !password}
        onPress={submit}
      />

      <View style={styles.links}>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            onTyping();
            setSent(false);
            setNewAccount((value) => !value);
          }}
        >
          <Txt size="small" color={theme.inkSoft}>
            {newAccount ? 'لي حساب — أدخل' : 'لا حساب لي — أنشئ واحدًا'}
          </Txt>
        </Pressable>
        {newAccount ? null : (
          <Pressable
            accessibilityRole="button"
            disabled={busy || !email.trim()}
            onPress={async () => {
              if (await resetPassword(email)) setSent(true);
            }}
          >
            <Txt size="small" color={email.trim() ? theme.inkSoft : theme.inkFaint}>
              نسيت كلمة المرور
            </Txt>
          </Pressable>
        )}
      </View>

      {sent ? (
        <Txt size="small" color={theme.correctInk}>
          أرسلنا رابط إعادة التعيين إلى بريدك.
        </Txt>
      ) : null}

      {guest ? null : (
        <>
          <View style={[styles.line, { backgroundColor: theme.border, marginVertical: space.md }]} />
          <Button
            label="المتابعة كضيف"
            variant="neutral"
            disabled={busy}
            onPress={async () => {
              if (await continueAsGuest()) onDone();
            }}
          />
          <Txt size="caption" color={theme.inkFaint} center>
            الضيف يُحفظ تقدّمه كذلك، ويبقى على هذا الجهاز حتى تربط به حسابًا.
          </Txt>
        </>
      )}
    </View>
  );
}

function Field({
  label,
  value,
  onChange,
  latin,
  ...rest
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** حقل لاتيني — يُكتب من اليسار ويبقى محاذيًا لليمين كبقيّة الواجهة. */
  latin?: boolean;
} & Omit<React.ComponentProps<typeof TextInput>, 'value' | 'onChange' | 'onChangeText' | 'style'>) {
  const theme = useTheme();
  return (
    <View style={styles.field}>
      <Txt size="caption" color={theme.inkSoft}>
        {label}
      </Txt>
      <TextInput
        {...rest}
        value={value}
        onChangeText={onChange}
        autoCapitalize="none"
        placeholderTextColor={theme.inkFaint}
        style={[
          styles.input,
          latin ? styles.ltr : styles.rtl,
          { backgroundColor: theme.surface, borderColor: theme.border, color: theme.ink },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  head: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.lg,
    paddingBottom: space.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  scroll: { padding: space.lg, gap: space.lg },
  summary: { padding: space.md, borderRadius: radius.md, borderWidth: 1 },
  alert: { padding: space.md, borderRadius: radius.md },
  block: { gap: space.md },
  card: { padding: space.lg, borderRadius: radius.lg, borderWidth: 1, gap: space.xs },
  rule: { flexDirection: 'row-reverse', alignItems: 'center', gap: space.sm },
  line: { flex: 1, height: StyleSheet.hairlineWidth },
  field: { gap: space.xs },
  input: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: space.md,
    fontFamily: 'Cairo_400Regular',
    fontSize: 16,
    minHeight: 48,
  },
  rtl: { textAlign: 'right', writingDirection: 'rtl' },
  ltr: { textAlign: 'right', writingDirection: 'ltr' },
  links: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
});
