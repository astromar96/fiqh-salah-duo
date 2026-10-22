/** خلط ثابت لا يعتمد على Math.random حتى يبقى ترتيب الخيارات مستقرًا داخل الجلسة. */
function hash(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** خلط Fisher–Yates ببذرة نصية — نفس البذرة تعطي نفس الترتيب دائمًا. */
export function seededShuffle<T>(input: readonly T[], seed: string): T[] {
  const out = input.slice();
  const rand = mulberry32(hash(seed));
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** يخلط حتى يختلف الترتيب عن الأصل — لأسئلة الترتيب، كيلا تُعرض مرتَّبة سلفًا. */
export function shuffleAway<T>(input: readonly T[], seed: string): T[] {
  if (input.length < 2) return input.slice();
  for (let attempt = 0; attempt < 8; attempt++) {
    const out = seededShuffle(input, `${seed}#${attempt}`);
    if (out.some((v, i) => v !== input[i])) return out;
  }
  const out = input.slice();
  [out[0], out[1]] = [out[1], out[0]];
  return out;
}
