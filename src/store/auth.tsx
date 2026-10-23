import {
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  linkWithCredential,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInAnonymously,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { authMessage, errorCode, isCancelled } from '@/lib/authError';
import { auth } from '@/lib/firebase';
import { useSocialSignIn, type SocialProvider } from '@/lib/social';

export type { SocialProvider };

/** ما نعرضه عن الحساب الحاضر. الضيف حساب كامل بلا هويّة معلومة. */
export type Account = {
  uid: string;
  name: string | null;
  email: string | null;
  guest: boolean;
};

function describe(user: User): Account {
  return {
    uid: user.uid,
    name: user.displayName,
    email: user.email,
    guest: user.isAnonymous,
  };
}

type AuthApi = {
  /** عرفنا حالة الدخول — ولو كانت «لا أحد». */
  ready: boolean;
  account: Account | null;
  busy: boolean;
  error: string | null;
  /** مزوّدو الدخول الصالحون على هذه المنصّة بإعدادها الحالي. */
  social: SocialProvider[];
  clearError: () => void;
  signInWithProvider: (provider: SocialProvider) => Promise<boolean>;
  signInWithEmail: (email: string, password: string) => Promise<boolean>;
  registerWithEmail: (name: string, email: string, password: string) => Promise<boolean>;
  resetPassword: (email: string) => Promise<boolean>;
  continueAsGuest: () => Promise<boolean>;
  leave: () => Promise<boolean>;
};

const Context = createContext<AuthApi | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<Account | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { available, signIn } = useSocialSignIn();

  useEffect(() => {
    // يُطلق أوّل مرّة بعد استرجاع الجلسة المحفوظة، فهو أيضًا إشارة الجاهزية.
    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        setAccount(user ? describe(user) : null);
        setReady(true);
      },
      () => setReady(true),
    );
    return unsubscribe;
  }, []);

  /**
   * يلفّ كل عملية دخول: يمنع التزاحم، ويترجم الخطأ، ويبتلع إلغاء المستخدم.
   * الرجوع `true` يعني أن العملية تمّت، فتغلق الشاشة عندها.
   */
  const run = useCallback(async (task: () => Promise<void>): Promise<boolean> => {
    setBusy(true);
    setError(null);
    try {
      await task();
      return true;
    } catch (failure) {
      if (!isCancelled(failure)) setError(authMessage(failure));
      return false;
    } finally {
      setBusy(false);
    }
  }, []);

  const signInWithProvider = useCallback(
    (provider: SocialProvider) => run(() => signIn(provider)),
    [run, signIn],
  );

  const signInWithEmail = useCallback(
    (email: string, password: string) =>
      run(async () => {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      }),
    [run],
  );

  const registerWithEmail = useCallback(
    (name: string, email: string, password: string) =>
      run(async () => {
        const address = email.trim();
        const current = auth.currentUser;
        // الضيف يُرقّى بالربط فيبقى معرّفه وتقدّمه السحابي تحته كما هو.
        if (current?.isAnonymous) {
          try {
            const credential = EmailAuthProvider.credential(address, password);
            const linked = await linkWithCredential(current, credential);
            await updateProfile(linked.user, { displayName: name.trim() || null });
            setAccount(describe(linked.user));
            return;
          } catch (failure) {
            if (errorCode(failure) !== 'auth/email-already-in-use') throw failure;
            // البريد لحساب قائم: ندخل إليه، ويتكفّل دمج التقدّم بالباقي.
            await signInWithEmailAndPassword(auth, address, password);
            return;
          }
        }
        const created = await createUserWithEmailAndPassword(auth, address, password);
        await updateProfile(created.user, { displayName: name.trim() || null });
        setAccount(describe(created.user));
      }),
    [run],
  );

  const resetPassword = useCallback(
    (email: string) =>
      run(async () => {
        await sendPasswordResetEmail(auth, email.trim());
      }),
    [run],
  );

  const continueAsGuest = useCallback(
    () =>
      run(async () => {
        await signInAnonymously(auth);
      }),
    [run],
  );

  const leave = useCallback(() => run(() => signOut(auth)), [run]);

  const clearError = useCallback(() => setError(null), []);

  const value = useMemo<AuthApi>(
    () => ({
      ready,
      account,
      busy,
      error,
      social: available,
      clearError,
      signInWithProvider,
      signInWithEmail,
      registerWithEmail,
      resetPassword,
      continueAsGuest,
      leave,
    }),
    [
      ready,
      account,
      busy,
      error,
      available,
      clearError,
      signInWithProvider,
      signInWithEmail,
      registerWithEmail,
      resetPassword,
      continueAsGuest,
      leave,
    ],
  );

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useAuth(): AuthApi {
  const value = useContext(Context);
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>');
  return value;
}
