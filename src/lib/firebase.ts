import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, initializeAuth, type Auth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { persistence } from './authPersistence';

/**
 * إعداد تطبيق الويب في Firebase.
 *
 * هذه المفاتيح معرّفات علنية لا أسرار: التطبيق ثابت يُخدم من صفحات GitHub،
 * فأيّ زائر يقرؤها من الحزمة. الحماية في موضعين: قواعد Firestore — لا يقرأ
 * الحساب إلا وثيقته — وقائمة النطاقات المصرّح لها بتسجيل الدخول. ومع ذلك
 * تُقرأ من البيئة إن وُجدت ليتمكّن من نسخ المستودع أن يصل مشروعه هو.
 */
const env = process.env;

const firebaseConfig = {
  apiKey: env.EXPO_PUBLIC_FIREBASE_API_KEY ?? 'AIzaSyBQ1AQU7sWrUcO5qpmsn-ysj4TQKlL3m3s',
  authDomain: env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? 'minhaj-almuslim.firebaseapp.com',
  projectId: env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? 'minhaj-almuslim',
  storageBucket: env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? 'minhaj-almuslim.firebasestorage.app',
  messagingSenderId: env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '1081287525682',
  appId: env.EXPO_PUBLIC_FIREBASE_APP_ID ?? '1:1081287525682:web:ed0456fd5d68cf5bbc432b',
};

/** معرّف عميل الويب في Google — يصلح جمهورًا لرمز الهوية على الأجهزة أيضًا. */
export const GOOGLE_WEB_CLIENT_ID =
  env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ??
  '1081287525682-vppbb62o551rpts6m179qtudu5aksp9o.apps.googleusercontent.com';

/**
 * معرّفا عميل Google لـ iOS و Android. بدونهما يختفي زرّ جوجل على الأجهزة.
 * عميل iOS يحتاج كذلك مخطّط العنوان المعكوس في `app.json`، وعميل Android
 * مربوط ببصمة مفتاح التوقيع، فبصمة التنقيح وحدها مسجّلة الآن.
 */
export const GOOGLE_IOS_CLIENT_ID =
  env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ??
  '1081287525682-6vktk35qouuvrj26kgf0acbq3bjjhm93.apps.googleusercontent.com';
export const GOOGLE_ANDROID_CLIENT_ID =
  env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ??
  '1081287525682-sr3oovk6iu02ma9m93iva7k5rna23jpj.apps.googleusercontent.com';

/**
 * `initializeApp` يرفض التكرار، والتحديث الساخن يعيد تنفيذ الوحدة،
 * فنعيد استعمال التطبيق القائم إن وُجد.
 */
export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

/**
 * `initializeAuth` يضبط الحفظ، لكنّه يرمي إن نُودي مرّتين على التطبيق نفسه،
 * وهو ما يقع مع التحديث الساخن. نرجع حينها إلى المثيل المضبوط سلفًا.
 */
function authInstance(): Auth {
  try {
    return initializeAuth(app, { persistence });
  } catch {
    return getAuth(app);
  }
}

export const auth = authInstance();

export const db = getFirestore(app);
