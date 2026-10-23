import * as AppleAuthentication from 'expo-apple-authentication';
import * as Google from 'expo-auth-session/providers/google';
import * as Crypto from 'expo-crypto';
import {
  GoogleAuthProvider,
  linkWithCredential,
  OAuthProvider,
  signInWithCredential,
  type AuthCredential,
} from 'firebase/auth';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import { errorCode } from './authError';
import { auth, GOOGLE_ANDROID_CLIENT_ID, GOOGLE_IOS_CLIENT_ID, GOOGLE_WEB_CLIENT_ID } from './firebase';

export type SocialProvider = 'google' | 'apple';

/** معرّف عميل Google لهذه المنصّة — فارغ يعني أن الدخول بجوجل غير مضبوط. */
const googleClientId = Platform.OS === 'ios' ? GOOGLE_IOS_CLIENT_ID : GOOGLE_ANDROID_CLIENT_ID;

/** خطأ بالرمز الذي يعرفه `isCancelled`، ليمرّ الإلغاء بلا رسالة خطأ. */
function cancelled(): Error {
  return Object.assign(new Error('أُلغي الدخول.'), { code: 'auth/user-cancelled' });
}

/** رقم عشوائي لمرّة واحدة، يربط طلب Apple بجوابه فيمنع إعادة التشغيل. */
function randomNonce(): string {
  return Array.from(Crypto.getRandomBytes(16))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * يُدخل باعتماد مزوّد.
 *
 * الضيف يُرقّى بالربط لا بدخول جديد، فيبقى معرّفه ووثيقته السحابية كما هي.
 * فإن كان الاعتماد مستعملًا في حساب آخر دخلنا إليه، ويتكفّل دمج التقدّم
 * المحلّي عند الدخول بنقل ما لعبه الضيف إلى حسابه.
 */
async function linkOrSignIn(credential: AuthCredential): Promise<void> {
  const current = auth.currentUser;
  if (current?.isAnonymous) {
    try {
      await linkWithCredential(current, credential);
      return;
    } catch (error) {
      if (errorCode(error) !== 'auth/credential-already-in-use') throw error;
    }
  }
  await signInWithCredential(auth, credential);
}

type Prompt = ReturnType<typeof Google.useIdTokenAuthRequest>[2];

async function googleCredential(prompt: Prompt): Promise<AuthCredential> {
  const result = await prompt();
  if (result.type !== 'success') throw cancelled();
  const idToken = result.params.id_token;
  if (!idToken) throw new Error('لم يصل رمز الهوية من جوجل.');
  return GoogleAuthProvider.credential(idToken);
}

async function appleCredential(): Promise<AuthCredential> {
  // Apple تستقبل بصمة الرقم العشوائي، وFirebase يستقبل أصله فيطابق بينهما.
  const rawNonce = randomNonce();
  const hashedNonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce);
  const apple = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
    nonce: hashedNonce,
  });
  if (!apple.identityToken) throw new Error('لم يصل رمز الهوية من Apple.');
  return new OAuthProvider('apple.com').credential({ idToken: apple.identityToken, rawNonce });
}

export function useSocialSignIn() {
  const [appleReady, setAppleReady] = useState(false);

  const [, , promptGoogle] = Google.useIdTokenAuthRequest({
    iosClientId: GOOGLE_IOS_CLIENT_ID || undefined,
    androidClientId: GOOGLE_ANDROID_CLIENT_ID || undefined,
    webClientId: GOOGLE_WEB_CLIENT_ID,
  });

  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    let alive = true;
    AppleAuthentication.isAvailableAsync()
      .then((ok) => {
        if (alive) setAppleReady(ok);
      })
      .catch(() => {
        /* الجهاز لا يدعمه — يبقى الزرّ مخفيًّا. */
      });
    return () => {
      alive = false;
    };
  }, []);

  const available = useMemo(() => {
    const list: SocialProvider[] = [];
    if (googleClientId) list.push('google');
    if (appleReady) list.push('apple');
    return list;
  }, [appleReady]);

  const signIn = useCallback(
    async (which: SocialProvider) => {
      const credential =
        which === 'google' ? await googleCredential(promptGoogle) : await appleCredential();
      await linkOrSignIn(credential);
    },
    [promptGoogle],
  );

  return { available, signIn };
}
