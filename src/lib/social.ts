import {
  GoogleAuthProvider,
  linkWithPopup,
  signInWithCredential,
  signInWithPopup,
  type AuthProvider,
} from 'firebase/auth';
import { useCallback } from 'react';
import { errorCode } from './authError';
import { auth } from './firebase';

export type SocialProvider = 'google' | 'apple';

/**
 * مزوّدو الدخول الصالحون على الويب.
 *
 * Apple ليس منهم: دخوله على الويب يحتاج Services ID ومفتاح خادم من حساب
 * مطوّري Apple المدفوع، ولم يُضبطا في المشروع. إخفاء الزرّ أصدق من عرض
 * واحد يفشل عند الضغط. وهو يظهر على iOS لأن المنصّة تغني عن ذلك الضبط.
 */
const AVAILABLE: SocialProvider[] = ['google'];

/**
 * يفتح نافذة المزوّد ثم يُدخل بها.
 *
 * الضيف يُرقّى بالربط لا بدخول جديد، فيبقى معرّفه ووثيقته السحابية كما هي.
 * فإن كان الحساب مستعملًا سلفًا دخلنا إليه، ويتكفّل دمج التقدّم المحلّي
 * عند الدخول بنقل ما لعبه الضيف إلى حسابه.
 */
async function popupSignIn(provider: AuthProvider): Promise<void> {
  const current = auth.currentUser;
  if (current?.isAnonymous) {
    try {
      await linkWithPopup(current, provider);
      return;
    } catch (error) {
      if (errorCode(error) !== 'auth/credential-already-in-use') throw error;
      const credential = GoogleAuthProvider.credentialFromError(
        error as Parameters<typeof GoogleAuthProvider.credentialFromError>[0],
      );
      if (credential) {
        await signInWithCredential(auth, credential);
        return;
      }
    }
  }
  await signInWithPopup(auth, provider);
}

export function useSocialSignIn() {
  const signIn = useCallback(async (which: SocialProvider) => {
    if (which !== 'google') throw new Error(`مزوّد غير مدعوم على الويب: ${which}`);
    const provider = new GoogleAuthProvider();
    // يسأل عن الحساب في كل مرّة بدل الدخول الصامت بآخر حساب استُعمل.
    provider.setCustomParameters({ prompt: 'select_account' });
    await popupSignIn(provider);
  }, []);

  return { available: AVAILABLE, signIn };
}
