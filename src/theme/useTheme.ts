import { useColorScheme } from 'react-native';
import { schemes, type Scheme } from './tokens';

/** ألوان النظام الحالي (فاتح/داكن). */
export function useTheme(): Scheme {
  return schemes[useColorScheme() === 'dark' ? 'dark' : 'light'];
}

export function useIsDark(): boolean {
  return useColorScheme() === 'dark';
}
