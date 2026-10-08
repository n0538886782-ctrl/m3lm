/* countdown.js — عداد العطلة القادمة (م3لم)
   ملف مستقل: يحقن تنسيقه وواجهته بنفسه، ويقرأ العطل من Firestore (meta/holidays).
   المدير يرى زر "إدارة العطل" داخل البطاقة نفسها. */
(function () {
  'use strict';

  var DOC = { col: 'meta', id: 'holidays' };
  var timer = null;
  var items = [];
  var isAdmin = false;

  /* ---------- Firebase (نسخة compat، أو المتغيرين db/auth إن كانا معرّفين في common.js) ---------- */
  function getDb() {
    if (window.db && typeof window.db.collection === 'function') return window.db;
    if (window.firebase && firebase.firestore) return firebase.firestore();
    return null;
  }
  function getAuth() {
    if (window.auth && typeof window.auth.onAuthStateChanged === 'function') return window.auth;
    if (window.firebase && firebase.auth) return firebase.auth();
    return null;
  }

  /* ---------- التنسيق ---------- */
  var css = '' +
    '.cd-card{direction:rtl;margin:14px auto;max-width:760px;padding:16px 18px;border-radius:16px;' +
    'background:linear-gradient(135deg,#0f3d3e,#1b6b5a);color:#fff;box-shadow:0 6px 20px rgba(0,0,0,.18);font-family:inherit;text-align:center}' +
    '.cd-title{font-size:15px;opacity:.85;margin-bottom:2px}' +
    '.cd-name{font-size:20px;font-weight:700;margin-bottom:12px}' +
    '.cd-boxes{display:flex;gap:10px;justify-content:center;flex-wrap:wrap}' +
    '.cd-box{min-width:68px;padding:10px 8px;border-radius:12px;background:rgba(255,255,255,.14)}' +
    '.cd-num{display:block;font-size:30px;font-weight:700;font-variant-numeric:tabular-nums;line-height:1.1}' +
    '.cd-lbl{display:block;font-size:12px;opacity:.85;margin-top:4px}' +
    '.cd-box.sec .cd-num{color:#ffd98a}' +
    '.cd-foot{margin-top:10px;font-size:13px;opacity:.85}' +
    '.cd-btn{margin-top:10px;padding:6px 14px;border:0;border-radius:10px;background:#ffd98a;color:#0f3d3e;font-weight:700;cursor:pointer;font-family:inherit}' +
    '.cd-modal{position:fixed;inset:0;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;z-index:99999;direction:rtl;padding:12px}' +
    '.cd-panel{background:#fff;color:#222;width:100%;max-width:480px;max-height:90vh;overflow:auto;border-radius:16px;padding:18px;font-family:inherit}' +
    '.cd-panel h3{margin:0 0 12px}' +
    '.cd-row{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid #eee;font-size:14px}' +
    '.cd-row button{border:0;background:#fde8e8;color:#b00020;border-radius:8px;padding:4px 10px;cursor:pointer;font-family:inherit}' +
    '.cd-form{display:grid;gap:8px;margin-top:12px}' +
    '.cd-form input{padding:8px;border:1px solid #ccc;border-radius:8px;font-family:inherit;font-size:14px}' +
    '.cd-form label{font-size:13px;color:#555}' +
    '.cd-actions{display:flex;gap:8px;margin-top:12px}' +
    '.cd-actions button{flex:1;padding:9px;border:0;border-radius:10px;cursor:pointer;font-weight:700;font-family:inherit}' +
    '.cd-save{background:#1b6b5a;color:#fff}.cd-close{background:#eee}';

  function injectCss() {
    if (document.getElementById('cd-style')) return;
    var s = document.createElement('style');
    s.id = 'cd-style';
    s.textContent = css;
    document.head.appendChild(s);
  }

  /* ---------- أدوات ---------- */
  function pad(n) { return String(n).padStart(2, '0'); }
  function startOf(d) { var p = d.split('-'); return new Date(+p[0], +p[1] - 1, +p[2], 0, 0, 0); }
  function endOf(d) { var p = d.split('-'); return new Date(+p[0], +p[1] - 1, +p[2], 23, 59, 59); }
  function fmt(d) {
    try { return startOf(d).toLocaleDateString('ar-SA-u-nu-latn', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }); }
    catch (e) { return d; }
  }
  function esc(t) { var d = document.createElement('div'); d.textContent = t == null ? '' : t; return d.innerHTML; }

  function findState(now) {
    var active = null, next = null;
    items.forEach(function (h) {
      var s = startOf(h.start), e = endOf(h.end || h.start);
      if (now >= s && now <= e) { if (!active || s > startOf(active.start)) active = h; }
      else if (s > now && (!next || s < startOf(next.start))) next = h;
    });
    return { active: active, next: next };
  }

  /* ---------- البطاقة ---------- */
  function ensureCard() {
    var card = document.getElementById('cd-card');
    if (card) return card;
    card = document.createElement('div');
    card.id = 'cd-card';
    card.className = 'cd-card';
    var anchor = document.getElementById('tickerWrap') || document.getElementById('siteBannerWrap');
    if (anchor && anchor.parentNode) {
      anchor.parentNode.insertBefore(card, anchor.nextSibling);
    } else {
      var host = document.querySelector('main, .container, .wrap') || document.body;
      host.insertBefore(card, host.firstChild);
    }
    return card;
  }

  function render() {
    injectCss();
    if (timer) { clearInterval(timer); timer = null; }
    var card = ensureCard();
    var st = findState(new Date());

    if (!st.active && !st.next) {
      if (!isAdmin) { card.style.display = 'none'; return; }
      card.style.display = '';
      card.innerHTML = '<div class="cd-name">لا توجد عطلات قادمة</div>' +
        '<div class="cd-foot">أضف عطلات الفصل من زر الإدارة</div>' +
        '<button class="cd-btn" id="cd-manage">إدارة العطل</button>';
      bindManage();
      return;
    }
    card.style.display = '';

    if (st.active) {
      card.innerHTML = '<div class="cd-title">الحمد لله، بدأت العطلة</div>' +
        '<div class="cd-name">🎉 ' + esc(st.active.name) + '</div>' +
        '<div class="cd-foot">حتى ' + esc(fmt(st.active.end || st.active.start)) + '</div>' +
        (isAdmin ? '<button class="cd-btn" id="cd-manage">إدارة العطل</button>' : '');
      bindManage();
      // أعد الحساب عند انتهاء العطلة
      var ms = endOf(st.active.end || st.active.start) - new Date() + 1000;
      timer = setTimeout(render, Math.min(ms, 2147483000));
      return;
    }

    var target = startOf(st.next.start);
    card.innerHTML = '<div class="cd-title">العطلة القادمة</div>' +
      '<div class="cd-name">' + esc(st.next.name) + '</div>' +
      '<div class="cd-boxes">' +
      box('d', 'يوم') + box('h', 'ساعة') + box('m', 'دقيقة') + box('s', 'ثانية', 'sec') +
      '</div>' +
      '<div class="cd-foot">تبدأ ' + esc(fmt(st.next.start)) + '</div>' +
      (isAdmin ? '<button class="cd-btn" id="cd-manage">إدارة العطل</button>' : '');
    bindManage();

    function tick() {
      var diff = target - new Date();
      if (diff <= 0) { render(); return; }
      var s = Math.floor(diff / 1000);
      set('d', Math.floor(s / 86400));
      set('h', pad(Math.floor((s % 86400) / 3600)));
      set('m', pad(Math.floor((s % 3600) / 60)));
      set('s', pad(s % 60));
    }
    tick();
    timer = setInterval(tick, 1000);
  }

  function box(k, label, extra) {
    return '<div class="cd-box ' + (extra || '') + '"><span class="cd-num" id="cd-' + k + '">0</span><span class="cd-lbl">' + label + '</span></div>';
  }
  function set(k, v) { var el = document.getElementById('cd-' + k); if (el) el.textContent = v; }
  function bindManage() {
    var b = document.getElementById('cd-manage');
    if (b) b.onclick = openManager;
  }

  /* ---------- إدارة العطل (للمدير) ---------- */
  function openManager() {
    var work = items.map(function (x) { return { name: x.name, start: x.start, end: x.end || '' }; });
    var modal = document.createElement('div');
    modal.className = 'cd-modal';
    document.body.appendChild(modal);

    function draw() {
      work.sort(function (a, b) { return a.start < b.start ? -1 : 1; });
      var rows = work.length ? work.map(function (h, i) {
        return '<div class="cd-row"><span><b>' + esc(h.name) + '</b><br><small>' + esc(h.start) + (h.end ? ' ← ' + esc(h.end) : '') +
          '</small></span><button data-i="' + i + '">حذف</button></div>';
      }).join('') : '<p style="color:#777">لا توجد عطلات مضافة.</p>';
      modal.innerHTML = '<div class="cd-panel"><h3>إدارة العطل والإجازات</h3>' + rows +
        '<div class="cd-form">' +
        '<label>اسم العطلة</label><input id="cd-in-name" placeholder="مثال: إجازة منتصف الفصل">' +
        '<label>تاريخ البداية</label><input id="cd-in-start" type="date">' +
        '<label>تاريخ النهاية (اختياري)</label><input id="cd-in-end" type="date">' +
        '<button class="cd-save" id="cd-add" style="padding:8px;border:0;border-radius:8px;cursor:pointer;font-family:inherit">+ إضافة للقائمة</button>' +
        '</div>' +
        '<div class="cd-actions"><button class="cd-save" id="cd-commit">حفظ</button><button class="cd-close" id="cd-cancel">إلغاء</button></div></div>';

      modal.querySelectorAll('.cd-row button').forEach(function (b) {
        b.onclick = function () { work.splice(+b.getAttribute('data-i'), 1); draw(); };
      });
      modal.querySelector('#cd-add').onclick = function () {
        var n = modal.querySelector('#cd-in-name').value.trim();
        var s = modal.querySelector('#cd-in-start').value;
        var e = modal.querySelector('#cd-in-end').value;
        if (!n || !s) { alert('اكتب اسم العطلة وتاريخ البداية'); return; }
        if (e && e < s) { alert('تاريخ النهاية قبل البداية'); return; }
        work.push({ name: n, start: s, end: e });
        draw();
      };
      modal.querySelector('#cd-cancel').onclick = function () { modal.remove(); };
      modal.querySelector('#cd-commit').onclick = function () {
        var db = getDb();
        if (!db) return;
        db.collection(DOC.col).doc(DOC.id).set({ items: work, updatedAt: Date.now() })
          .then(function () { items = work; modal.remove(); render(); })
          .catch(function (err) { alert('تعذر الحفظ. تأكد من نشر قاعدة meta/holidays في Firebase.\n' + err.message); });
      };
    }
    draw();
  }

  /* ---------- التشغيل ---------- */
  function load() {
    var db = getDb();
    if (!db) { console.warn('countdown.js: لم يتم العثور على Firestore'); return; }
    db.collection(DOC.col).doc(DOC.id).get()
      .then(function (snap) { items = (snap.exists && snap.data().items) || []; })
      .catch(function () { items = []; })
      .then(render);
  }

  function init() {
    var auth = getAuth(), db = getDb();
    if (!auth || !db) { load(); return; }
    auth.onAuthStateChanged(function (u) {
      if (!u) return;
      db.collection('users').doc(u.uid).get()
        .then(function (s) { isAdmin = !!(s.exists && s.data().role === 'admin'); })
        .catch(function () { isAdmin = false; })
        .then(load);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
