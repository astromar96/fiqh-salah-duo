/**
 * عامل الخدمة: يجعل التطبيق يعمل بلا شبكة بعد أوّل زيارة.
 *
 * الملفات المُجزَّأة (_expo/static/...) أسماؤها تحمل بصمة محتواها، فهي
 * ثابتة لا تتغيّر، ولذلك تُقرأ من المخزن أوّلًا. أمّا صفحات التنقّل فمن
 * الشبكة أوّلًا لتصل التحديثات، وتعود إلى المخزن عند انقطاعها.
 */
const VERSION = 'v1';
const CACHE = `minhaj-${VERSION}`;
// نشتقّ المسار من نطاق العامل نفسه، فيعمل على الجذر وعلى مسار فرعي سواء.
const BASE = new URL(self.registration.scope).pathname;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      // `reload` يتخطّى مخزن المتصفّح، وإلا خُزّنت نسخةٌ قديمة وقت التنصيب.
      .then((cache) =>
        cache.addAll([BASE, `${BASE}manifest.json`].map((u) => new Request(u, { cache: 'reload' }))),
      )
      // فشل التخزين المسبق لا يمنع التنصيب؛ التخزين وقت الطلب يغطّيه.
      .catch(() => {})
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // صفحة: الشبكة أوّلًا، ثم المخزن، ثم صفحة البداية — كيلا يرى القارئ خطأ المتصفّح.
  if (request.mode === 'navigate') {
    event.respondWith(
      // `no-store` يتخطّى مخزن المتصفّح. بدونه يردّ المتصفّح من ترويسة
      // `max-age` (عشر دقائق على GitHub Pages)، فيصل بعد كل نشرٍ مستندٌ
      // قديم يشير إلى حزمةٍ قديمة — وهي مخزَّنة عندنا ببصمتها فتُقدَّم
      // فورًا، فيبقى القارئ على النسخة السابقة كاملةً والشبكةُ متاحة.
      fetch(request.url, { cache: 'no-store', credentials: 'same-origin' })
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(request, copy));
          return res;
        })
        .catch(() => caches.match(request).then((hit) => hit || caches.match(BASE))),
    );
    return;
  }

  // أصل ثابت: المخزن أوّلًا، وما غاب يُجلب ويُخزَّن.
  event.respondWith(
    caches.match(request).then(
      (hit) =>
        hit ||
        fetch(request).then((res) => {
          if (res.ok && res.type === 'basic') {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(request, copy));
          }
          return res;
        }),
    ),
  );
});
