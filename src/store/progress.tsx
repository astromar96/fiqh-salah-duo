import AsyncStorage from '@react-native-async-storage/async-storage';
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

const STORAGE_KEY = 'fiqhSalahDuo.v2';

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

function parse(raw: string | null): Persisted {
  if (!raw) return EMPTY;
  try {
    const value = JSON.parse(raw) as Partial<Persisted>;
    return {
      xp: typeof value.xp === 'number' ? value.xp : 0,
      hearts: typeof value.hearts === 'number' ? value.hearts : MAX_HEARTS,
      heartsAt: typeof value.heartsAt === 'number' ? value.heartsAt : null,
      streak: typeof value.streak === 'number' ? value.streak : 0,
      lastDay: typeof value.lastDay === 'string' ? value.lastDay : null,
      done: value.done && typeof value.done === 'object' ? (value.done as Record<string, true>) : {},
    };
  } catch {
    return EMPTY;
  }
}

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
  const [state, setState] = useState<Persisted>(EMPTY);
  const [ready, setReady] = useState(false);
  /**
   * الوقت الحالي في الحالة لا في جسم العرض. قراءة `Date.now()` أثناء العرض
   * تجعله غير نقي: يختلف ناتجه بين رسمتين بلا تغيّر في الحالة. النبضة
   * تحدّثه كل نصف دقيقة فتعود القلوب دون انتظار تفاعل من المستخدم.
   */
  const [now, setNow] = useState(() => Date.now());
  const loaded = useRef(false);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (cancelled) return;
        setState(parse(raw));
      })
      .catch(() => {
        /* التخزين غير متاح — نكمل بحالة فارغة في الذاكرة. */
      })
      .finally(() => {
        if (cancelled) return;
        loaded.current = true;
        setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!loaded.current) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(() => {});
  }, [state]);

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

  const reset = useCallback(() => setState(EMPTY), []);

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
