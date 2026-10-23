import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { Platform, useColorScheme } from 'react-native';
import { schemes, type Scheme } from './tokens';

/**
 * تُصدَّر صفحات الويب مسبقًا بالنسق الفاتح — لا يعرف المُصدِّر نسقَ الجهاز.
 * وReact عند الإرواء (hydration) لا يصحّح أصناف الأنماط في HTML المصدَّر،
 * فلو أعاد `useColorScheme` «داكن» من أول رسمة لبقيت العقد المصدَّرة فاتحة
 * بينما يُرسم ما يُركَّب بعدها داكنًا، فيختلط النسقان في صفحة واحدة.
 * لذا نُرجِع «فاتح» في رسمة الإرواء وحدها — فتطابق HTML المصدَّر — ثم نرفع
 * هذه الراية بعد التركيب فتُعاد الرسمة ويُحدَّث النسق كلّه دفعة واحدة.
 * على الأجهزة لا إرواء، فالراية مرفوعة من البداية ولا رسمة زائدة.
 */
const HydratedContext = createContext(Platform.OS !== 'web');

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState(Platform.OS !== 'web');
  // القاعدة تمنع ضبط الحالة في جسم الأثر لأنه يُعيد الرسم. وهو المقصود هنا:
  // «تمّ الإرواء» حدثٌ لا يُعرف إلا بتنفيذ أوّل أثر، فلا سبيل إلى اشتقاقه من
  // الخصائص. والرسمة الزائدة واحدة عند الإقلاع على الويب وحده.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setHydrated(true), []);
  return <HydratedContext.Provider value={hydrated}>{children}</HydratedContext.Provider>;
}

/** ألوان النظام الحالي (فاتح/داكن). */
export function useTheme(): Scheme {
  return schemes[useIsDark() ? 'dark' : 'light'];
}

export function useIsDark(): boolean {
  const dark = useColorScheme() === 'dark';
  return useContext(HydratedContext) && dark;
}
