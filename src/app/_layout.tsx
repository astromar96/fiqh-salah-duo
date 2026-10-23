import {
  Cairo_400Regular,
  Cairo_500Medium,
  Cairo_600SemiBold,
  Cairo_700Bold,
  Cairo_900Black,
} from '@expo-google-fonts/cairo';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '@/store/auth';
import { ProgressProvider } from '@/store/progress';
import { ThemeProvider, useTheme } from '@/theme/useTheme';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Cairo_400Regular,
    Cairo_500Medium,
    Cairo_600SemiBold,
    Cairo_700Bold,
    Cairo_900Black,
  });

  useEffect(() => {
    // نُخفي شاشة البدء حتى لو فشل تحميل الخط، كيلا يعلق التطبيق على شاشة فارغة.
    if (fontsLoaded || fontError) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    // `lang` فقط، بلا `dir="rtl"`.
    // الاتجاه مضبوط صراحة في كل عنصر (row-reverse للصفوف، writingDirection للنصوص)،
    // فلو أضفنا dir على المستند لانعكس الصفُّ مرتين وظهر شريط الحالة معكوسًا على الويب
    // بخلاف الأجهزة. هذا يُبقي المنصّتين متطابقتين.
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.documentElement.setAttribute('lang', 'ar');
    }
  }, []);

  if (!fontsLoaded && !fontError) return null;

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <ThemeProvider>
          {/* التقدّم يتبع الحساب، فالمزوّد الخارجي هو مزوّد الدخول. */}
          <AuthProvider>
            <ProgressProvider>
              <Shell />
            </ProgressProvider>
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function Shell() {
  const theme = useTheme();
  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      <StatusBar style="auto" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.bg },
          animation: Platform.OS === 'web' ? 'none' : 'slide_from_left',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="account" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="section/[sectionId]" />
        <Stack.Screen name="lesson/[unitId]/[lessonId]" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
      </Stack>
    </View>
  );
}

const styles = StyleSheet.create({ root: { flex: 1 } });
