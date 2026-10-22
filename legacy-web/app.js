(function () {
  'use strict';

  var KEY = 'fiqhSalahDuo.v1';
  var MAX_HEARTS = 5;
  var REFILL_MS = 20 * 60 * 1000;
  var XP_PER_CORRECT = 4;
  var XP_BONUS_PERFECT = 10;

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  function shuffle(a) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = (Math.random() * (i + 1)) | 0; var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]; }); }

  /* ---------------- state ---------------- */
  var BLANK = { xp: 0, hearts: MAX_HEARTS, emptyAt: 0, streak: 0, lastDay: null, done: {} };
  var S = (function () {
    try {
      var r = JSON.parse(localStorage.getItem(KEY));
      if (r && typeof r === 'object') { var o = {}; for (var k in BLANK) o[k] = BLANK[k]; for (var k2 in r) o[k2] = r[k2]; return o; }
    } catch (e) {}
    var d = {}; for (var k3 in BLANK) d[k3] = BLANK[k3]; return d;
  })();
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
  function dayKey(d) { d = d || new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }

  function refill() {
    if (S.hearts >= MAX_HEARTS) return;
    if (S.emptyAt && Date.now() - S.emptyAt >= REFILL_MS) { S.hearts = MAX_HEARTS; S.emptyAt = 0; save(); }
  }
  function loseHeart() {
    S.hearts = Math.max(0, S.hearts - 1);
    if (S.hearts === 0) S.emptyAt = Date.now();
    save(); drawHud();
  }
  function bumpStreak() {
    var t = dayKey(), y = dayKey(new Date(Date.now() - 864e5));
    if (S.lastDay === t) return;
    S.streak = (S.lastDay === y) ? S.streak + 1 : 1;
    S.lastDay = t;
  }

  /* ---------------- lesson index ---------------- */
  var FLAT = [];
  CONTENT.units.forEach(function (u, ui) {
    u.lessons.forEach(function (l, li) { FLAT.push({ u: u, l: l, ui: ui, li: li, key: l.id, idx: FLAT.length }); });
  });
  function isDone(k) { return !!S.done[k]; }
  function nextIdx() { var i = 0; while (i < FLAT.length && isDone(FLAT[i].key)) i++; return i; }

  /* ---------------- chrome ---------------- */
  function drawHud() {
    refill();
    $('#hud-streak .val').textContent = S.streak;
    $('#hud-xp .val').textContent = S.xp;
    $('#hud-hearts .val').textContent = S.hearts;
    $('#hud-hearts').classList.toggle('empty', S.hearts === 0);
  }
  function show(name) {
    $$('#screens .screen').forEach(function (s) { s.classList.remove('active'); });
    $('#screen-' + name).classList.add('active');
    $('#hud').classList.toggle('hidden', name === 'lesson');
    window.scrollTo(0, 0);
    $('#screens').scrollTop = 0;
  }
  var toastT;
  function toast(msg) {
    var n = $('#toast'); n.textContent = msg; n.classList.add('on');
    clearTimeout(toastT); toastT = setTimeout(function () { n.classList.remove('on'); }, 2200);
  }

  /* ---------------- path screen ---------------- */
  function drawPath() {
    var cur = nextIdx(), html = '';
    html += '<div class="path-intro"><h1>' + esc(CONTENT.meta.title) + '</h1><p>' + esc(CONTENT.meta.note) + '</p></div>';
    CONTENT.units.forEach(function (u) {
      var lessonsHtml = '';
      u.lessons.forEach(function (l) {
        var f = FLAT.filter(function (x) { return x.key === l.id; })[0];
        var st = isDone(l.key) ? 'done' : (f.idx === cur ? 'cur' : 'lock');
        var face = st === 'done' ? '★' : (st === 'cur' ? '▶' : '🔒');
        lessonsHtml +=
          '<div class="node-wrap off' + (f.idx % 4) + '">' +
          (st === 'cur' ? '<div class="start-tag">ابدأ</div>' : '') +
          '<button class="node ' + st + '" data-idx="' + f.idx + '" ' + (st === 'lock' ? 'disabled' : '') + '>' +
          '<span class="node-face">' + face + '</span></button>' +
          '<div class="node-label">' + esc(l.title) + '</div>' +
          '</div>';
      });
      var total = u.lessons.length;
      var doneN = u.lessons.filter(function (l) { return isDone(l.id); }).length;
      html +=
        '<section class="unit u-' + u.color + '">' +
        '<header class="unit-head"><div><div class="unit-sub">' + esc(u.subtitle) + '</div>' +
        '<div class="unit-title">' + esc(u.title) + '</div></div>' +
        '<div class="unit-count">' + doneN + '/' + total + '</div></header>' +
        '<div class="nodes">' + lessonsHtml + '</div></section>';
    });
    html += '<footer class="path-foot"><button id="resetBtn" class="link-btn">تصفير التقدّم</button></footer>';
    var root = $('#screen-path');
    root.innerHTML = html;
    root.onclick = function (e) {
      var n = e.target.closest('.node');
      if (n) { startLesson(+n.dataset.idx); return; }
      if (e.target.id === 'resetBtn') {
        if (confirm('هل تريد تصفير كل التقدّم (النقاط والسلسلة والدروس)؟')) {
          S = JSON.parse(JSON.stringify(BLANK)); save(); drawHud(); drawPath();
        }
      }
    };
  }

  /* ---------------- lesson engine ---------------- */
  var L = null;   // {f, queue, solved, correct, wrong}
  var Q = null;   // current item
  var ANS = null; // answer scratch
  var graded = false;

  function startLesson(i) {
    refill();
    if (S.hearts <= 0) {
      var left = Math.ceil((REFILL_MS - (Date.now() - S.emptyAt)) / 60000);
      toast('نفدت القلوب. تعود بعد ' + left + ' دقيقة.');
      return;
    }
    var f = FLAT[i];
    var infos = f.l.items.filter(function (x) { return x.t === 'info'; });
    var qs = shuffle(f.l.items.filter(function (x) { return x.t !== 'info'; }));
    L = { f: f, queue: infos.concat(qs), solved: 0, correct: 0, wrong: 0, scored: qs.length };
    show('lesson');
    nextItem();
  }

  function lessonShell() {
    $('#screen-lesson').innerHTML =
      '<div class="lesson-top">' +
      '<button class="x-btn" id="quitBtn" aria-label="إغلاق">✕</button>' +
      '<div class="pbar"><div class="pfill" id="pfill"></div></div>' +
      '<div class="l-hearts" id="lHearts">❤️ <b>' + S.hearts + '</b></div>' +
      '</div>' +
      '<div class="lesson-body"><div class="qkind" id="qkind"></div><h2 class="prompt" id="prompt"></h2><div class="qarea" id="qarea"></div></div>' +
      '<div class="lesson-foot"><button class="btn btn-grey" id="actBtn" disabled>تحقّق</button></div>' +
      '<div class="sheet" id="sheet"><div class="sheet-in"><div class="sheet-head" id="sheetHead"></div>' +
      '<div class="sheet-exp" id="sheetExp"></div><button class="btn" id="contBtn">تابع</button></div></div>';
    $('#quitBtn').onclick = function () { if (confirm('إنهاء الدرس؟ لن يُحتسب التقدّم.')) { show('path'); drawPath(); drawHud(); } };
    $('#actBtn').onclick = onAct;
    $('#contBtn').onclick = onCont;
  }

  function progress() {
    var tot = L.solved + L.queue.length;
    return tot ? Math.round((L.solved / tot) * 100) : 0;
  }

  function nextItem() {
    if (!$('#qarea')) lessonShell();
    if (!L.queue.length) return finish(true);
    Q = L.queue[0];
    graded = false; ANS = null;
    $('#sheet').className = 'sheet';
    $('#pfill').style.width = progress() + '%';
    $('#lHearts').innerHTML = '❤️ <b>' + S.hearts + '</b>';
    var act = $('#actBtn');
    act.className = 'btn btn-grey'; act.disabled = true;
    act.textContent = Q.t === 'info' ? 'فهمت' : 'تحقّق';
    $('#qkind').textContent = KIND[Q.t] || '';
    $('#prompt').textContent = Q.t === 'info' ? Q.h : Q.q;
    var area = $('#qarea'); area.innerHTML = ''; area.className = 'qarea q-' + Q.t;
    RENDER[Q.t](Q, area);
    if (Q.t === 'info') ready();
  }

  var KIND = {
    info: 'تعلّم', mcq: 'اختر الإجابة الصحيحة', tf: 'صحيح أم خطأ؟',
    order: 'رتّب بالترتيب الصحيح', match: 'وصّل المتقابلات', fill: 'أكمل الفراغ'
  };

  function ready(on) {
    var b = $('#actBtn');
    var ok = on !== false;
    b.disabled = !ok;
    b.className = 'btn ' + (ok ? 'btn-green' : 'btn-grey');
  }

  /* ---- renderers ---- */
  var RENDER = {
    info: function (q, el) { el.innerHTML = '<div class="info-card">' + esc(q.b).replace(/\n/g, '<br>') + '</div>'; },

    mcq: function (q, el) {
      el.innerHTML = q.o.map(function (o, i) { return '<button class="opt" data-i="' + i + '">' + esc(o) + '</button>'; }).join('');
      el.onclick = function (e) {
        var b = e.target.closest('.opt'); if (!b || graded) return;
        $$('.opt', el).forEach(function (x) { x.classList.remove('sel'); });
        b.classList.add('sel'); ANS = +b.dataset.i; ready();
      };
    },

    tf: function (q, el) {
      el.innerHTML = '<button class="opt big" data-v="1">صحيح ✔</button><button class="opt big" data-v="0">خطأ ✘</button>';
      el.onclick = function (e) {
        var b = e.target.closest('.opt'); if (!b || graded) return;
        $$('.opt', el).forEach(function (x) { x.classList.remove('sel'); });
        b.classList.add('sel'); ANS = b.dataset.v === '1'; ready();
      };
    },

    order: function (q, el) {
      ANS = [];
      el.innerHTML = '<div class="slot" id="slot"></div><div class="bank" id="bank">' +
        shuffle(q.items).map(function (s) { return '<button class="chip" data-v="' + esc(s) + '">' + esc(s) + '</button>'; }).join('') + '</div>';
      el.onclick = function (e) {
        var c = e.target.closest('.chip'); if (!c || graded) return;
        if (c.parentNode.id === 'bank') { $('#slot').appendChild(c); } else { $('#bank').appendChild(c); }
        ANS = $$('#slot .chip').map(function (x) { return x.dataset.v; });
        ready(ANS.length === q.items.length);
      };
    },

    match: function (q, el) {
      ANS = { hit: 0, need: q.pairs.length, bad: 0 };
      var A = shuffle(q.pairs.map(function (p, i) { return { v: p[0], i: i }; }));
      var B = shuffle(q.pairs.map(function (p, i) { return { v: p[1], i: i }; }));
      var col = function (arr, side) {
        return '<div class="mcol">' + arr.map(function (x) {
          return '<button class="mchip" data-side="' + side + '" data-i="' + x.i + '">' + esc(x.v) + '</button>';
        }).join('') + '</div>';
      };
      el.innerHTML = '<div class="match">' + col(A, 'a') + col(B, 'b') + '</div>';
      var pick = null;
      el.onclick = function (e) {
        var c = e.target.closest('.mchip'); if (!c || graded || c.classList.contains('ok')) return;
        if (!pick) {
          if (c.dataset.side !== 'a') return;
          $$('.mchip', el).forEach(function (x) { x.classList.remove('pick'); });
          c.classList.add('pick'); pick = c; return;
        }
        if (c.dataset.side === 'a') { pick.classList.remove('pick'); c.classList.add('pick'); pick = c; return; }
        if (c.dataset.i === pick.dataset.i) {
          c.classList.add('ok'); pick.classList.remove('pick'); pick.classList.add('ok');
          pick = null; ANS.hit++;
          if (ANS.hit === ANS.need) ready();
        } else {
          ANS.bad++;
          var p = pick; c.classList.add('no'); p.classList.add('no');
          setTimeout(function () { c.classList.remove('no'); p.classList.remove('no', 'pick'); }, 420);
          pick = null;
        }
      };
    },

    fill: function (q, el) {
      var parts = q.q.split('____');
      el.innerHTML = '<div class="sentence">' + esc(parts[0]) +
        '<span class="blank" id="blank"></span>' + esc(parts[1] || '') + '</div>' +
        '<div class="bank" id="bank">' + shuffle(q.bank).map(function (s) {
          return '<button class="chip" data-v="' + esc(s) + '">' + esc(s) + '</button>';
        }).join('') + '</div>';
      el.onclick = function (e) {
        var c = e.target.closest('.chip'); if (!c || graded) return;
        if (c.parentNode.id === 'bank') {
          var ex = $('#blank').firstChild; if (ex) $('#bank').appendChild(ex);
          $('#blank').appendChild(c);
        } else { $('#bank').appendChild(c); }
        var inBlank = $('#blank .chip');
        ANS = inBlank ? inBlank.dataset.v : null;
        ready(!!ANS);
      };
    }
  };

  /* ---- grading ---- */
  var GRADE = {
    info: function () { return true; },
    mcq: function (q) { return ANS === q.a; },
    tf: function (q) { return ANS === q.a; },
    order: function (q) { return ANS && ANS.join('|') === q.items.join('|'); },
    match: function (q) { return ANS && ANS.hit === ANS.need; },
    fill: function (q) { return ANS === q.a; }
  };
  var SOLUTION = {
    mcq: function (q) { return q.o[q.a]; },
    tf: function (q) { return q.a ? 'صحيح' : 'خطأ'; },
    order: function (q) { return q.items.join(' ← '); },
    match: function () { return ''; },
    fill: function (q) { return q.a; }
  };

  function onAct() {
    if (Q.t === 'info') { L.queue.shift(); nextItem(); return; }
    graded = true;
    var ok = GRADE[Q.t](Q);
    var sheet = $('#sheet'), head = $('#sheetHead'), exp = $('#sheetExp');
    $('#actBtn').disabled = true;
    if (Q.t === 'mcq' || Q.t === 'tf') {
      $$('.opt').forEach(function (b) {
        var mine = b.classList.contains('sel');
        var correct = Q.t === 'mcq' ? (+b.dataset.i === Q.a) : ((b.dataset.v === '1') === Q.a);
        if (correct) b.classList.add('right');
        if (mine && !correct) b.classList.add('wrong');
      });
    }
    var sol = (SOLUTION[Q.t] ? SOLUTION[Q.t](Q) : '');
    if (ok) {
      L.solved++; L.correct++;
      L.queue.shift();
      head.innerHTML = '<span class="tick">✔</span> أحسنت!';
      exp.textContent = Q.e || '';
      sheet.className = 'sheet on good';
    } else {
      L.wrong++;
      var item = L.queue.shift(); L.queue.push(item);
      head.innerHTML = '<span class="tick">✘</span> الإجابة الصحيحة' + (sol ? ': ' + sol : '');
      exp.textContent = Q.e || '';
      sheet.className = 'sheet on bad';
      loseHeart();
      $('#lHearts').innerHTML = '❤️ <b>' + S.hearts + '</b>';
      $('#lHearts').classList.add('shake');
      setTimeout(function () { $('#lHearts') && $('#lHearts').classList.remove('shake'); }, 400);
    }
    $('#pfill').style.width = progress() + '%';
    $('#contBtn').focus();
  }

  function onCont() {
    if (S.hearts <= 0) return finish(false);
    nextItem();
  }

  /* ---------------- end screens ---------------- */
  function finish(win) {
    var total = L.correct + L.wrong;
    var acc = total ? Math.round((L.correct / total) * 100) : 0;
    var html;
    if (win) {
      var first = !isDone(L.f.key);
      var xp = L.correct * XP_PER_CORRECT + (L.wrong === 0 ? XP_BONUS_PERFECT : 0);
      if (!first) xp = Math.round(xp / 2);
      S.xp += xp;
      S.done[L.f.key] = { acc: Math.max(acc, (S.done[L.f.key] || {}).acc || 0) };
      bumpStreak(); save(); drawHud();
      html =
        '<div class="end win">' +
        '<div class="end-ico">🏅</div>' +
        '<h2>أكملت الدرس!</h2><p class="end-sub">' + esc(L.f.l.title) + '</p>' +
        '<div class="stats">' +
        '<div class="stat"><span>النقاط</span><b>+' + xp + '</b></div>' +
        '<div class="stat"><span>الدقّة</span><b>' + acc + '%</b></div>' +
        '<div class="stat"><span>السلسلة</span><b>' + S.streak + ' 🔥</b></div>' +
        '</div>' +
        '<button class="btn btn-green" id="endBtn">متابعة</button></div>';
    } else {
      html =
        '<div class="end lose">' +
        '<div class="end-ico">💔</div>' +
        '<h2>نفدت القلوب</h2>' +
        '<p class="end-sub">تمتلئ القلوب تلقائيًا بعد ٢٠ دقيقة، أو املأها الآن للتدريب.</p>' +
        '<div class="stats"><div class="stat"><span>صحيح</span><b>' + L.correct + '</b></div>' +
        '<div class="stat"><span>خطأ</span><b>' + L.wrong + '</b></div></div>' +
        '<button class="btn btn-blue" id="fillBtn">املأ القلوب</button>' +
        '<button class="btn btn-grey" id="endBtn">رجوع</button></div>';
    }
    $('#screen-done').innerHTML = html;
    show('done');
    var eb = $('#endBtn');
    if (eb) eb.onclick = function () { show('path'); drawPath(); drawHud(); };
    var fb = $('#fillBtn');
    if (fb) fb.onclick = function () { S.hearts = MAX_HEARTS; S.emptyAt = 0; save(); drawHud(); startLesson(L.f.idx); };
  }

  /* ---------------- boot ---------------- */
  drawHud();
  drawPath();
  show('path');
  window.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter') return;
    var lesson = $('#screen-lesson').classList.contains('active');
    if (!lesson) return;
    var sheetOn = $('#sheet') && $('#sheet').classList.contains('on');
    if (sheetOn) { onCont(); } else if ($('#actBtn') && !$('#actBtn').disabled) { onAct(); }
  });
})();
