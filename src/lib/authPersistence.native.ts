import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Persistence } from 'firebase/auth';
import * as auth from 'firebase/auth';

/**
 * حفظ الجلسة على الأجهزة في `AsyncStorage`.
 *
 * `getReactNativePersistence` موجود في نسخة react-native من الحزمة فقط،
 * والأنواع المنشورة لـ `firebase/auth` هي أنواع المتصفح فلا تذكره. metro
 * يختار النسخة الصحيحة وقت البناء، فنصل إليه بتحويل صريح هنا بدل تعطيل
 * المدقّق في موضع الاستعمال.
 */
type PersistenceFactory = (storage: typeof AsyncStorage) => Persistence;

const getReactNativePersistence = (
  auth as unknown as { getReactNativePersistence: PersistenceFactory }
).getReactNativePersistence;

export const persistence: Persistence[] = [getReactNativePersistence(AsyncStorage)];
