import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, onSnapshot, serverTimestamp, setDoc, getDoc } from 'firebase/firestore';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { db } from '@/lib/firebase';
import { useAuth } from './auth';

/**
 * مخزن محلّي لكل حساب: جهاز واحد قد يستعمله أكثر من حساب، فلو كان المفتاح
 * واحدًا لانتقل تقدّم الأوّل إلى الثاني عند تبديل الدخول.
 */
const KEY_PREFIX = 'fiqhSalahDuo.v3';
/** مخزن النسخة السابقة — يُقرأ مرّة ثم يُنقل إلى المخزن الجديد. */
const LEGACY_KEY = 'fiqhSalahDuo.v2';

const localKey = (uid: string | null) => `${KEY_PREFIX}.${uid ?? 'local'}`;

export const MAX_HEARTS = 5;
/** زمن استعادة قلب واحد. */
export const HEART_REFILL_MS = 20 * 60 * 1000;

type Persisted = {
  xp: number;
  /** القلوب المتبقية وقت آخر خسارة — يُحسب الرصيد الحالي منها ومن `heartsAt`. */
  hearts: number;
  /** طابع زمني (ms) لآخر خسارة قلب، أو null إن كان الرصيد ممتلئًا. */
  heartsAt: number | null;
  streak: number;
  /** مفتاح آخر يوم تمرّن فيه، بصيغة YYYY-M-D. */
  lastDay: string | null;
  /** مفاتيح الدروس المنجزة. */
  done: Record<string, true>;
};

const EMPTY: Persisted = { xp: 0, hearts: MAX_HEARTS, heartsAt: null, streak: 0, lastDay: null, done: {} };

const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;

const dayBefore = (key: string) => {
  const [y, m, d] = key.split('-').map(Number);
  const prev = new Date(y, m - 1, d - 1);
  return dayKey(prev);
};

/** قيمة قابلة للمقارنة من مفتاح يوم: المقارنة النصّية تخطئ بين ٩ و١٠. */
function dayValue(key: string | null): number {
  if (!key) return 0;
  const [y, m, d] = key.split('-').map(Number);
  return y * 10000 + m * 100 + d;
}

/** يعيد بناء رصيد القلوب من آخر خسارة ومرور الوقت. */
export function heartsNow(state: Persisted, now: number): number {
  if (state.heartsAt === null || state.hearts >= MAX_HEARTS) return MAX_HEARTS;
  const regained = Math.floor((now - state.heartsAt) / HEART_REFILL_MS);
  return Math.min(MAX_HEARTS, state.hearts + Math.max(0, regained));
}

/** ms حتى عودة القلب التالي، أو null إن كان الرصيد ممتلئًا. */
export function msToNextHeart(state: Persisted, now: number): number | null {
  if (heartsNow(state, now) >= MAX_HEARTS || state.heartsAt === null) return null;
  const elapsed = now - state.heartsAt;
  return HEART_REFILL_MS - (elapsed % HEART_REFILL_MS);
}

function normalize(value: Partial<Persisted> | null | undefined): Persisted {
  if (!value || typeof value !== 'object') return EMPTY;
  return {
    xp: typeof value.xp === 'number' ? value.xp : 0,
    hearts: typeof value.hearts === 'number' ? value.hearts : MAX_HEARTS,
    heartsAt: typeof value.heartsAt === 'number' ? value.heartsAt : null,
    streak: typeof value.streak === 'number' ? value.streak : 0,
    lastDay: typeof value.lastDay === 'string' ? value.lastDay : null,
    done: value.done && typeof value.done === 'object' ? (value.done as Record<string, true>) : {},
  };
}

function parse(raw: string | null): Persisted {
  if (!raw) return EMPTY;
  try {
    return normalize(JSON.parse(raw) as Partial<Persisted>);
  } catch {
    return EMPTY;
  }
}

function isEmpty(state: Persisted): boolean {
  return state.xp === 0 && state.streak === 0 && Object.keys(state.done).length === 0;
}

function same(a: Persisted, b: Persisted): boolean {
  if (a.xp !== b.xp || a.hearts !== b.hearts || a.heartsAt !== b.heartsAt) return false;
  if (a.streak !== b.streak || a.lastDay !== b.lastDay) return false;
  const keys = Object.keys(a.done);
  return keys.length === Object.keys(b.done).length && keys.every((k) => b.done[k]);
}

/**
 * يدمج تقدّمين.
 *
 * الدمج تراكمي: لا يسقط درسًا منجزًا ولا ينقص نقطة، فإعادة تطبيقه بلا أثر،
 * ومن ثَمّ يستقرّ الجهازان على حالة واحدة مهما تداخل ترتيب وصول التحديثات.
 * النقاط بالأكبر لا بالجمع، إذ الجمع يضاعف ما سُجّل على الجهازين معًا.
 */
export function merge(a: Persisted, b: Persisted, now: number): Persisted {
  const balance = Math.max(heartsNow(a, now), heartsNow(b, now));
  const full = balance >= MAX_HEARTS;
  // نُبقي مؤقّت `a` إن لم يتغيّر رصيده، كيلا يُصفَّر العدّ مع كل دمج.
  const keepTimer = heartsNow(a, now) === balance;
  const next: Persisted = {
    xp: Math.max(a.xp, b.xp),
    hearts: full ? MAX_HEARTS : balance,
    heartsAt: full ? null : keepTimer ? a.heartsAt : now,
    streak: Math.max(a.streak, b.streak),
    lastDay: dayValue(a.lastDay) >= dayValue(b.lastDay) ? a.lastDay : b.lastDay,
    done: { ...a.done, ...b.done },
  };
  return same(a, next) ? a : next;
}

/** شكل الوثيقة في Firestore. الدروس مصفوفة لا خريطة، تفاديًا لقيود أسماء الحقول. */
type Remote = {
  xp: number;
  hearts: number;
  heartsAt: number | null;
  streak: number;
  lastDay: string | null;
  done: string[];
};

function toRemote(state: Persisted): Remote {
  return {
    xp: state.xp,
    hearts: state.hearts,
    heartsAt: state.heartsAt,
    streak: state.streak,
    lastDay: state.lastDay,
    // مرتّبة ليكون التمثيل النصّي ثابتًا، فتصحّ مقارنته بآخر ما رُفع.
    done: Object.keys(state.done).sort(),
  };
}

function fromRemote(data: Record<string, unknown> | undefined): Persisted {
  const done: Record<string, true> = {};
  if (Array.isArray(data?.done)) {
    for (const key of data.done) if (typeof key === 'string') done[key] = true;
  }
  return normalize({ ...(data as Partial<Persisted>), done });
}

const read = (key: string) => AsyncStorage.getItem(key).catch(() => null);

type ProgressApi = {
  ready: boolean;
  xp: number;
  hearts: number;
  streak: number;
  nextHeartMs: number | null;
  isDone: (key: string) => boolean;
  doneCount: number;
  loseHeart: () => void;
  completeLesson: (key: string, xp: number) => void;
  reset: () => void;
};

const Context = createContext<ProgressApi | null>(null);

export function ProgressProvider({ children }: { children: ReactNode }) {
  const { account, ready: authReady } = useAuth();
  const uid = account?.uid ?? null;

  const [state, setState] = useState<Persisted>(EMPTY);
  /**
   * الحساب الذي حُمّلت حالته. مقارنته بالحساب الحاضر تُعطي الجاهزية اشتقاقًا،
   * فلا نحتاج إلى تصفير حالة ثانية في جسم الأثر عند كل تبديل حساب.
   * القيمة الأولى `undefined` لتتميّز عن `null` الذي يعني «بلا حساب».
   */
  const [loadedUid, setLoadedUid] = useState<string | null | undefined>(undefined);
  /**
   * الوقت الحالي في الحالة لا في جسم العرض. قراءة `Date.now()` أثناء العرض
   * تجعله غير نقي: يختلف ناتجه بين رسمتين بلا تغيّر في الحالة. النبضة
   * تحدّثه كل نصف دقيقة فتعود القلوب دون انتظار تفاعل من المستخدم.
   */
  const [now, setNow] = useState(() => Date.now());

  /** المفتاح الحاضر — يُقرأ عند الحفظ كيلا يُكتب تقدّم حساب تحت مفتاح آخر. */
  const keyRef = useRef(localKey(null));
  const hydrated = useRef(false);
  /** يمنع ردّ لقطة قديمة بعد المحو، إلى أن يصل المحو إلى السحابة. */
  const suppressRemote = useRef(false);
  /** آخر ما رُفع، كيلا يُعاد رفع ما وصل للتوّ من السحابة. */
  const lastPushed = useRef<string | null>(null);

  const ready = authReady && loadedUid === uid;

  useEffect(() => {
    if (!authReady) return;
    let cancelled = false;
    hydrated.current = false;
    lastPushed.current = null;

    (async () => {
      // ما لُعب قبل تسجيل الدخول، مع ترحيل مخزن النسخة السابقة.
      const [loose, legacy] = await Promise.all([read(localKey(null)), read(LEGACY_KEY)]);
      const pool = merge(parse(loose), parse(legacy), Date.now());

      let next = pool;
      if (uid) {
        const mine = parse(await read(localKey(uid)));
        // أوّل دخول بحساب يتبنّى ما لُعب قبله، ثم يُفرَغ المخزن العام كيلا
        // ينتقل التقدّم نفسه إلى حساب آخر يدخل على الجهاز بعده.
        next = isEmpty(pool) ? mine : merge(mine, pool, Date.now());
        if (!isEmpty(pool)) {
          await AsyncStorage.multiRemove([localKey(null), LEGACY_KEY]).catch(() => {});
        }
      } else if (!isEmpty(parse(legacy))) {
        await AsyncStorage.removeItem(LEGACY_KEY).catch(() => {});
      }

      if (cancelled) return;
      keyRef.current = localKey(uid);
      hydrated.current = true;
      setState(next);
      setLoadedUid(uid);
    })();

    return () => {
      cancelled = true;
    };
  }, [authReady, uid]);

  useEffect(() => {
    if (!hydrated.current) return;
    AsyncStorage.setItem(keyRef.current, JSON.stringify(state)).catch(() => {
      /* التخزين غير متاح — نكمل بحالة في الذاكرة. */
    });
  }, [state]);

  // يقرأ وثيقة الحساب مرّة ثم يتابع تغيّرها، فيصل تقدّم الأجهزة الأخرى.
  useEffect(() => {
    if (!ready || !uid) return;
    const ref = doc(db, 'users', uid);
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    const take = (data: Record<string, unknown> | undefined) => {
      if (suppressRemote.current) return;
      setState((prev) => merge(prev, fromRemote(data), Date.now()));
    };

    (async () => {
      try {
        const snapshot = await getDoc(ref);
        if (cancelled) return;
        if (snapshot.exists()) take(snapshot.data());
      } catch {
        /* لا شبكة — نكمل محليًّا، ويُرفع التقدّم عند أوّل اتصال. */
      }
      if (cancelled) return;
      unsubscribe = onSnapshot(
        ref,
        (snapshot) => {
          if (snapshot.exists()) take(snapshot.data());
        },
        () => {
          /* انقطع البثّ — المحلّي هو المرجع، ويُعاد الاشتراك بتغيّر الحساب. */
        },
      );
    })();

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [ready, uid]);

  // يرفع التقدّم بعد سكون قصير، فلا تُكتب وثيقة عند كل إجابة.
  useEffect(() => {
    if (!ready || !uid || !hydrated.current) return;
    const remote = toRemote(state);
    const payload = JSON.stringify(remote);
    if (payload === lastPushed.current) return;

    const id = setTimeout(() => {
      lastPushed.current = payload;
      setDoc(doc(db, 'users', uid), { ...remote, updatedAt: serverTimestamp() }).catch(() => {
        // فشل الرفع: ننسى آخر ما رُفع ليُعاد مع التغيير التالي.
        lastPushed.current = null;
      });
    }, 1200);

    return () => clearTimeout(id);
  }, [ready, uid, state]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const hearts = heartsNow(state, now);
  const nextHeartMs = msToNextHeart(state, now);

  const loseHeart = useCallback(() => {
    setState((prev) => {
      const current = heartsNow(prev, Date.now());
      if (current <= 0) return prev;
      return { ...prev, hearts: current - 1, heartsAt: Date.now() };
    });
  }, []);

  const completeLesson = useCallback((key: string, gained: number) => {
    setState((prev) => {
      const today = dayKey(new Date());
      let streak = prev.streak;
      if (prev.lastDay !== today) {
        streak = prev.lastDay === dayBefore(today) ? prev.streak + 1 : 1;
      }
      return {
        ...prev,
        xp: prev.xp + gained,
        streak,
        lastDay: today,
        done: { ...prev.done, [key]: true },
      };
    });
  }, []);

  /**
   * المحو استثناء من تراكمية الدمج: لو اكتُفي بالمحلّي لعادت اللقطة التالية
   * بالتقدّم كلّه. فنكتب الفراغ في السحابة، ونصمّ عن اللقطات حتى يصل.
   */
  const reset = useCallback(() => {
    setState(EMPTY);
    if (!uid) return;
    const remote = toRemote(EMPTY);
    suppressRemote.current = true;
    lastPushed.current = JSON.stringify(remote);
    setDoc(doc(db, 'users', uid), { ...remote, updatedAt: serverTimestamp() })
      .catch(() => {
        lastPushed.current = null;
      })
      .finally(() => {
        suppressRemote.current = false;
      });
  }, [uid]);

  const value = useMemo<ProgressApi>(
    () => ({
      ready,
      xp: state.xp,
      hearts,
      streak: state.streak,
      nextHeartMs,
      isDone: (key: string) => !!state.done[key],
      doneCount: Object.keys(state.done).length,
      loseHeart,
      completeLesson,
      reset,
    }),
    [ready, state, hearts, nextHeartMs, loseHeart, completeLesson, reset],
  );

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useProgress(): ProgressApi {
  const value = useContext(Context);
  if (!value) throw new Error('useProgress must be used inside <ProgressProvider>');
  return value;
}
