/* schedules.js — الجداول المدرسية (م3لم)
   - لوحة المدير: رفع/استبدال/حذف ملف PDF لكل جدول + إضافة جداول أخرى.
   - صفحة المعلم: عرض كل الجداول (قراءة فقط).
   - الملفات تُرفع إلى Google Drive بنفس آلية الشواهد (drive.js)، والروابط تُحفظ في Firestore (مجموعة schedules). */
(function () {
  'use strict';

  var root = document.getElementById('schedulesRoot');
  if (!root) return;
  var isAdmin = root.getAttribute('data-mode') === 'admin';

  var DEFAULTS = [
    { id: 'general_primary', title: 'الجدول العام للمرحلة الابتدائية', order: 1 },
    { id: 'general_middle', title: 'الجدول العام للمرحلة المتوسطة', order: 2 },
    { id: 'waiting_primary', title: 'جدول الانتظار للمرحلة الابتدائية', order: 3 },
    { id: 'waiting_middle', title: 'جدول الانتظار للمرحلة المتوسطة', order: 4 },
    { id: 'supervision_daily', title: 'جدول الإشراف اليومي للمرحلتين', order: 5 },
    { id: 'duty_daily', title: 'جدول المناوبة اليومي للمرحلتين', order: 6 }
  ];
  var FOLDER_NAME = 'الجداول المدرسية';
  var FOLDER_KEY = 'driveSchedulesFolderId';
  var MAX_MB = 50;

  var items = [];
  var busy = {};
  var started = false;
  var seedChecked = false;

  function esc(t) {
    var d = document.createElement('div');
    d.textContent = t == null ? '' : t;
    return d.innerHTML;
  }
  function note(msg, isErr) {
    if (typeof toast === 'function') toast(msg, !!isErr);
    else alert(msg);
  }
  function fmtDate(ts) {
    if (!ts) return '';
    try {
      var d = ts.toDate ? ts.toDate() : new Date(ts);
      return d.toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch (e) { return ''; }
  }
  function safeUrl(u) { return typeof u === 'string' && /^https:\/\//i.test(u) ? u : ''; }

  /* ---------- التنسيق ---------- */
  var css = '' +
    '.sch-list{display:grid;gap:12px}' +
    '.sch-card{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;padding:14px 16px;border-radius:14px;border:1px solid rgba(128,128,128,.28);background:rgba(128,128,128,.07)}' +
    '.sch-card.sch-empty{opacity:.7}' +
    '.sch-info{display:flex;flex-direction:column;gap:4px;min-width:200px;flex:1}' +
    '.sch-info strong{font-size:16px}' +
    '.sch-info small{opacity:.75;font-size:13px}' +
    '.sch-actions{display:flex;gap:8px;flex-wrap:wrap;align-items:center}' +
    '.sch-add{display:flex;gap:8px;flex-wrap:wrap;margin-top:18px}' +
    '.sch-add input{flex:1;min-width:220px}' +
    '.sch-actions a.btn{text-decoration:none}' +
    '.sch-hidden-input{display:none}' +
    '.sch-addbox{margin-top:22px;padding-top:18px;border-top:1px dashed rgba(128,128,128,.4)}' +
    '.sch-addtitle{margin:0 0 6px;font-size:16px}' +
    '.sch-filename{display:block;margin-top:8px;opacity:.8}';
  function injectCss() {
    if (document.getElementById('sch-style')) return;
    var s = document.createElement('style');
    s.id = 'sch-style';
    s.textContent = css;
    document.head.appendChild(s);
  }

  /* ---------- Google Drive (مجلد مستقل للجداول) ---------- */
  async function ensureSchedulesFolder(token) {
    var cached = localStorage.getItem(FOLDER_KEY);
    if (cached) {
      var chk = await fetch('https://www.googleapis.com/drive/v3/files/' + cached + '?fields=id,trashed',
        { headers: { Authorization: 'Bearer ' + token } });
      if (chk.ok) {
        var cd = await chk.json();
        if (!cd.trashed) return cached;
      }
      localStorage.removeItem(FOLDER_KEY);
    }
    var q = encodeURIComponent("name='" + FOLDER_NAME + "' and mimeType='application/vnd.google-apps.folder' and trashed=false");
    var sr = await fetch('https://www.googleapis.com/drive/v3/files?q=' + q + '&fields=files(id,name)',
      { headers: { Authorization: 'Bearer ' + token } });
    var sd = await sr.json();
    if (sd.files && sd.files.length) {
      localStorage.setItem(FOLDER_KEY, sd.files[0].id);
      return sd.files[0].id;
    }
    var cr = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: FOLDER_NAME, mimeType: 'application/vnd.google-apps.folder' })
    });
    var cdata = await cr.json();
    if (cdata.error) throw new Error(cdata.error.message || 'تعذّر إنشاء مجلد الجداول في Drive');
    localStorage.setItem(FOLDER_KEY, cdata.id);
    return cdata.id;
  }

  async function uploadSchedule(file) {
    if (typeof getDriveToken !== 'function') throw new Error('ملفات ربط Google Drive غير محمّلة في هذه الصفحة');
    var token = await getDriveToken();
    var folderId = await ensureSchedulesFolder(token);

    var init = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id,webViewLink', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/json; charset=UTF-8',
        'X-Upload-Content-Type': 'application/pdf'
      },
      body: JSON.stringify({ name: file.name, parents: [folderId] })
    });
    if (!init.ok) {
      var ed = await init.json().catch(function () { return null; });
      throw new Error((ed && ed.error && ed.error.message) || 'تعذّر بدء عملية الرفع إلى Drive');
    }
    var uploadUrl = init.headers.get('Location');
    if (!uploadUrl) throw new Error('تعذّر الحصول على رابط الرفع من Drive');

    var put = await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': 'application/pdf' }, body: file });
    var data = await put.json().catch(function () { return null; });
    if (!put.ok || !data || data.error) {
      throw new Error((data && data.error && data.error.message) || 'فشل رفع الملف إلى Drive');
    }
    // إتاحة الملف لكل من يملك الرابط (حتى يفتحه المعلمون)
    await fetch('https://www.googleapis.com/drive/v3/files/' + data.id + '/permissions', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'reader', type: 'anyone' })
    });
    return { url: data.webViewLink, fileId: data.id };
  }

  // حذف الملف القديم من Drive (محاولة صامتة، وفقط إذا كان إذن Drive متاحًا في الجلسة الحالية)
  function deleteDriveFile(fileId) {
    try {
      if (!fileId || typeof driveAccessToken === 'undefined' || !driveAccessToken) return;
      fetch('https://www.googleapis.com/drive/v3/files/' + fileId, {
        method: 'DELETE', headers: { Authorization: 'Bearer ' + driveAccessToken }
      }).catch(function () {});
    } catch (e) { /* لا شيء */ }
  }

  /* ---------- العرض ---------- */
  function cardHtml(it) {
    var url = safeUrl(it.url);
    var isBusy = !!busy[it.id];
    var status;
    if (isBusy) status = 'جاري الرفع… لا تغلق الصفحة';
    else if (url) status = (it.fileName ? esc(it.fileName) : 'تم رفع الملف') + (it.updatedAt ? ' — ' + esc(fmtDate(it.updatedAt)) : '');
    else status = 'لم يُرفع بعد';

    var actions = '';
    if (url) actions += '<a class="btn btn-primary btn-sm" href="' + esc(url) + '" target="_blank" rel="noopener">عرض الجدول</a>';
    if (isAdmin) {
      actions += '<label class="btn btn-ghost btn-sm" style="cursor:pointer">' + (url ? 'استبدال الملف' : 'اختيار ملف') +
        '<input type="file" class="sch-hidden-input" accept="application/pdf,.pdf" data-up="' + esc(it.id) + '"' + (isBusy ? ' disabled' : '') + '></label>';
      if (url) actions += '<button class="btn btn-ghost btn-sm" data-act="delfile" data-id="' + esc(it.id) + '"' + (isBusy ? ' disabled' : '') + '>حذف الملف</button>';
      if (!it.builtin) actions += '<button class="btn btn-danger btn-sm" data-act="deltable" data-id="' + esc(it.id) + '"' + (isBusy ? ' disabled' : '') + '>حذف الجدول</button>';
    }
    return '<div class="sch-card' + (url ? '' : ' sch-empty') + '"><div class="sch-info"><strong>' + esc(it.title) +
      '</strong><small>' + status + '</small></div><div class="sch-actions">' + actions + '</div></div>';
  }

  function listEl() { return document.getElementById('schList'); }

  function render() {
    injectCss();
    var el = listEl();
    if (!el) return;
    el.innerHTML = items.length
      ? '<div class="sch-list">' + items.map(cardHtml).join('') + '</div>'
      : '<p class="panel-sub">' + (isAdmin ? 'جاري تجهيز قائمة الجداول…' : 'لا توجد جداول مضافة حتى الآن.') + '</p>';
  }

  // نموذج "إضافة جدول جديد" (للمدير) — يُبنى مرة واحدة ولا يُعاد رسمه عند تحديث القائمة
  function buildAddForm() {
    var f = document.getElementById('schForm');
    if (!f) return;
    f.innerHTML = '' +
      '<div class="sch-addbox">' +
      '<h3 class="sch-addtitle">إضافة جدول جديد</h3>' +
      '<p class="panel-sub" style="margin:0 0 10px">اكتب اسم الجدول، واختر ملف PDF (اختياري — يمكنك رفعه لاحقاً من بطاقة الجدول)، ثم اضغط إضافة.</p>' +
      '<div class="sch-add">' +
      '<input type="text" id="schNewTitle" placeholder="اسم الجدول (مثال: جدول الاختبارات النهائية)" maxlength="120" />' +
      '<label class="btn btn-ghost btn-sm" style="cursor:pointer" id="schNewFileLbl">اختيار ملف PDF' +
      '<input type="file" class="sch-hidden-input" id="schNewFile" accept="application/pdf,.pdf"></label>' +
      '<button class="btn btn-primary btn-sm" id="schAddBtn" data-act="add">+ إضافة الجدول</button>' +
      '</div>' +
      '<small id="schNewFileName" class="sch-filename"></small>' +
      '</div>';
  }

  function validatePdf(file) {
    var okType = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
    if (!okType) return 'الملف يجب أن يكون بصيغة PDF';
    if (file.size > MAX_MB * 1024 * 1024) return 'حجم الملف أكبر من ' + MAX_MB + ' ميجابايت';
    return '';
  }

  /* ---------- العمليات ---------- */
  function col() { return firebase.firestore().collection('schedules'); }

  async function seedIfEmpty() {
    if (seedChecked) return;
    seedChecked = true;
    try {
      var snap = await col().limit(1).get({ source: 'server' });
      if (!snap.empty) return;
      var batch = firebase.firestore().batch();
      DEFAULTS.forEach(function (d) {
        batch.set(col().doc(d.id), {
          title: d.title, order: d.order, builtin: true,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      });
      await batch.commit();
    } catch (e) { console.error('schedules seed:', e); }
  }

  async function handleUpload(id, file) {
    if (!file) return;
    var verr = validatePdf(file);
    if (verr) { note(verr, true); render(); return; }
    var it = items.filter(function (x) { return x.id === id; })[0];
    var oldFileId = it && it.fileId;
    busy[id] = true; render();
    try {
      var res = await uploadSchedule(file);
      await col().doc(id).update({
        url: res.url, fileId: res.fileId, fileName: file.name,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      deleteDriveFile(oldFileId);
      note('تم رفع الجدول بنجاح');
    } catch (e) {
      console.error(e);
      note('تعذّر رفع الجدول: ' + (e.message || e), true);
    } finally {
      busy[id] = false; render();
    }
  }

  var adding = false;
  async function handleAdd() {
    if (adding) return;
    var inp = document.getElementById('schNewTitle');
    var fileInp = document.getElementById('schNewFile');
    var btn = document.getElementById('schAddBtn');
    var title = inp ? inp.value.trim() : '';
    var file = fileInp && fileInp.files && fileInp.files[0];
    if (!title) { note('اكتب اسم الجدول أولاً', true); return; }
    if (file) {
      var verr = validatePdf(file);
      if (verr) { note(verr, true); return; }
    }
    adding = true;
    if (btn) { btn.disabled = true; btn.textContent = file ? 'جاري الرفع والإضافة…' : 'جاري الإضافة…'; }
    try {
      var data = {
        title: title, order: Date.now(), builtin: false,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      };
      if (file) {
        var res = await uploadSchedule(file);
        data.url = res.url; data.fileId = res.fileId; data.fileName = file.name;
        data.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
      }
      await col().add(data);
      if (inp) inp.value = '';
      if (fileInp) fileInp.value = '';
      var nm = document.getElementById('schNewFileName');
      if (nm) nm.textContent = '';
      note('تمت إضافة الجدول' + (file ? ' ورفع ملفه' : ''));
    } catch (err) {
      console.error(err);
      note('تعذّرت الإضافة: ' + (err.message || err), true);
    } finally {
      adding = false;
      if (btn) { btn.disabled = false; btn.textContent = '+ إضافة الجدول'; }
    }
  }

  function handleClick(e) {
    var btn = e.target.closest('[data-act]');
    if (!btn || !isAdmin) return;
    var act = btn.getAttribute('data-act');
    var id = btn.getAttribute('data-id');
    var it = items.filter(function (x) { return x.id === id; })[0];

    if (act === 'add') { handleAdd(); return; }
    if (act === 'delfile' && it) {
      confirmAction('حذف ملف الجدول', 'سيُزال الملف من «' + it.title + '» ويظهر للمعلمين أنه لم يُرفع بعد.', async function () {
        try {
          await col().doc(id).update({
            url: firebase.firestore.FieldValue.delete(),
            fileId: firebase.firestore.FieldValue.delete(),
            fileName: firebase.firestore.FieldValue.delete(),
            updatedAt: firebase.firestore.FieldValue.delete()
          });
          deleteDriveFile(it.fileId);
          note('تم حذف الملف');
        } catch (err) { note('تعذّر الحذف: ' + err.message, true); }
      });
    }
    if (act === 'deltable' && it) {
      confirmAction('حذف الجدول', 'سيُحذف «' + it.title + '» نهائيًا من قائمة الجداول.', async function () {
        try {
          await col().doc(id).delete();
          deleteDriveFile(it.fileId);
          note('تم حذف الجدول');
        } catch (err) { note('تعذّر الحذف: ' + err.message, true); }
      });
    }
  }

  function handleChange(e) {
    var inp = e.target;
    if (isAdmin && inp.id === 'schNewFile') {
      var nm = document.getElementById('schNewFileName');
      if (nm) nm.textContent = inp.files && inp.files[0] ? 'الملف المختار: ' + inp.files[0].name : '';
      return;
    }
    if (!isAdmin || !inp.matches || !inp.matches('input[type=file][data-up]')) return;
    var file = inp.files && inp.files[0];
    var id = inp.getAttribute('data-up');
    inp.value = '';
    handleUpload(id, file);
  }

  /* ---------- التشغيل ---------- */
  function start() {
    if (started) return;
    started = true;
    col().orderBy('order').onSnapshot(function (snap) {
      items = snap.docs.map(function (d) { var o = d.data(); o.id = d.id; return o; });
      render();
      if (isAdmin && snap.empty) seedIfEmpty();
    }, function (err) {
      console.error('schedules:', err);
      var le = listEl();
      if (le) le.innerHTML = '<p class="panel-sub">تعذّر تحميل الجداول. تأكد من نشر قاعدة schedules في Firebase.</p>';
    });
  }

  function init() {
    injectCss();
    root.addEventListener('click', handleClick);
    root.addEventListener('change', handleChange);
    root.innerHTML = '<div id="schList"><div class="loader"></div></div>' + (isAdmin ? '<div id="schForm"></div>' : '');
    if (isAdmin) buildAddForm();
    if (!window.firebase || !firebase.auth) { console.warn('schedules.js: Firebase غير محمّل'); return; }
    firebase.auth().onAuthStateChanged(function (u) { if (u) start(); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
