/** رمز الخطأ كما يرسله Firebase، أو سلسلة فارغة إن لم يكن خطأ منه. */
export function errorCode(error: unknown): string {
  if (error && typeof error === 'object' && 'code' in error) {
    const code = (error as { code: unknown }).code;
    if (typeof code === 'string') return code;
  }
  return '';
}

/** إلغاء المستخدم للنافذة ليس عطلًا، فلا يُعرض له خطأ. */
const CANCELLED = new Set([
  'auth/popup-closed-by-user',
  'auth/cancelled-popup-request',
  'auth/user-cancelled',
  // ما ترسله Apple عند إغلاق ورقة الدخول على iOS.
  'ERR_REQUEST_CANCELED',
]);

export function isCancelled(error: unknown): boolean {
  return CANCELLED.has(errorCode(error));
}

const MESSAGES: Record<string, string> = {
  'auth/invalid-email': 'البريد غير صحيح.',
  'auth/missing-password': 'اكتب كلمة المرور.',
  'auth/weak-password': 'كلمة المرور قصيرة — ستّة أحرف فأكثر.',
  'auth/email-already-in-use': 'هذا البريد مسجّل. ادخل به بدل إنشاء حساب.',
  'auth/invalid-credential': 'البريد أو كلمة المرور غير صحيحة.',
  'auth/wrong-password': 'البريد أو كلمة المرور غير صحيحة.',
  'auth/user-not-found': 'لا حساب بهذا البريد.',
  'auth/too-many-requests': 'محاولات كثيرة. انتظر قليلًا ثم أعد المحاولة.',
  'auth/network-request-failed': 'تعذّر الاتصال. تقدّمك محفوظ على الجهاز.',
  'auth/popup-blocked': 'المتصفّح منع النافذة. اسمح بالنوافذ لهذا الموقع ثم أعد المحاولة.',
  'auth/operation-not-allowed': 'طريقة الدخول هذه غير مفعّلة في المشروع.',
  'auth/unauthorized-domain': 'هذا النطاق غير مصرّح له بتسجيل الدخول.',
  'auth/account-exists-with-different-credential':
    'لك حساب بهذا البريد بطريقة دخول أخرى. ادخل بها أوّلًا.',
};

/** رسالة عربية مفهومة لخطأ الدخول، مع عبارة عامة لما لا نعرفه. */
export function authMessage(error: unknown): string {
  return MESSAGES[errorCode(error)] ?? 'تعذّر إتمام العملية. أعد المحاولة.';
}
