/* ======================================================
   صفحة المعلم
   ====================================================== */

let PROFILE = null;
let ELEMENTS = [];
let EVIDENCES = [];
const RING_CIRCUMFERENCE = 2 * Math.PI * 62;

document.addEventListener("DOMContentLoaded", () => {
  guardPage("teacher", async (profile) => {
    PROFILE = profile;
    document.getElementById("tAvatar").textContent = initials(profile.name);
    document.getElementById("tName").textContent = profile.name || "المعلم";
    document.getElementById("tUsername").textContent = "@" + profile.username;
    const jt = profile.jobType || "teacher";
    if (jt !== "teacher") {
      const badge = document.getElementById("tJobTypeBadge");
      badge.textContent = jobTypeLabel(jt);
      badge.style.display = "inline-flex";
    }

    guardWithBiometric(profile.uid, () => {
      setupNav();
      setupAccountForms();
      setupBiometricToggle(profile);
      renderAdminNote(profile.adminNote);
      setupNotifBell();
      setupElementSearch();
      document.getElementById("exportReportBtn").addEventListener("click", () => {
        printTeacherReport(PROFILE, ELEMENTS, EVIDENCES);
      });
      loadAll();
    });
  });
});

function setupBiometricToggle(profile) {
  const wrap = document.getElementById("bioStatusWrap");
  const btn = document.getElementById("bioToggleBtn");
  const msg = document.getElementById("bioMsg");

  function render() {
    const on = hasDeviceBiometric(profile.uid);
    wrap.innerHTML = `<span class="bio-status-pill ${on ? "on" : "off"}">${on ? "✓ مفعّلة على هذا الجهاز" : "غير مفعّلة على هذا الجهاز"}</span>`;
    btn.textContent = on ? "إلغاء تفعيل البصمة" : "تفعيل الدخول بالبصمة";
    btn.className = on ? "btn btn-danger btn-sm" : "btn btn-primary btn-sm";
  }
  render();

  btn.addEventListener("click", async () => {
    hideMsg(msg);
    if (hasDeviceBiometric(profile.uid)) {
      removeDeviceBiometric(profile.uid);
      showMsg(msg, "تم إلغاء تفعيل البصمة على هذا الجهاز.", "success");
      render();
      return;
    }
    btn.disabled = true;
    btn.textContent = "جارٍ التفعيل...";
    try {
      await registerDeviceBiometric(profile.uid, profile.name);
      showMsg(msg, "تم تفعيل الدخول بالبصمة بنجاح على هذا الجهاز.", "success");
    } catch (err) {
      console.error(err);
      showMsg(msg, err.message || "تعذّر التفعيل، تأكد أن جهازك يدعم البصمة أو الوجه.", "error");
    } finally {
      btn.disabled = false;
      render();
    }
  });
}

function renderAdminNote(note) {
  const wrap = document.getElementById("adminNoteWrap");
  if (!note || !note.trim()) {
    wrap.innerHTML = "";
    return;
  }
  wrap.innerHTML = `
    <div class="admin-note-banner">
      <div class="icon">📝</div>
      <div>
        <strong>ملاحظة من المدير</strong>
        <p>${escapeHtml(note)}</p>
      </div>
    </div>`;
}

function setupNav() {
  const links = document.querySelectorAll(".nav-link[data-section]");
  links.forEach((link) => {
    link.addEventListener("click", () => {
      links.forEach((l) => l.classList.remove("active"));
      link.classList.add("active");
      const target = link.dataset.section;
      document.querySelectorAll("section.section").forEach((sec) => {
        sec.hidden = sec.dataset.panel !== target;
      });
    });
  });
}

/* ---------------- البحث عن عنصر (أساسي أو فرعي) ---------------- */
let CURRENT_SEARCH = "";
function setupElementSearch() {
  const input = document.getElementById("elementSearch");
  if (!input) return;
  input.addEventListener("input", () => {
    CURRENT_SEARCH = input.value.trim();
    applyElementSearch();
  });
}
function applyElementSearch() {
  const q = CURRENT_SEARCH.toLocaleLowerCase("ar");
  document.querySelectorAll(".element-card").forEach((card) => {
    const mainTitle = (card.querySelector(".element-titles strong")?.textContent || "").toLocaleLowerCase("ar");
    const subEls = card.querySelectorAll(".sub-element");
    let anyVisibleSub = false;

    if (subEls.length) {
      subEls.forEach((sub) => {
        const subTitleEl = sub.querySelector(".sub-element-head strong");
        const subTitle = (subTitleEl ? subTitleEl.textContent : mainTitle).toLocaleLowerCase("ar");
        const match = !q || subTitle.includes(q) || mainTitle.includes(q);
        sub.style.display = match ? "" : "none";
        if (match) anyVisibleSub = true;
      });
    }

    const show = !q || mainTitle.includes(q) || anyVisibleSub;
    card.style.display = show ? "" : "none";
    if (q && show) card.classList.add("open");
  });
}

async function loadAll() {
  const [elSnap, evSnap] = await Promise.all([
    db.collection("elements").orderBy("order", "asc").get(),
    db.collection("evidences").where("teacherUid", "==", PROFILE.uid).get(),
  ]);
  ELEMENTS = elSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  EVIDENCES = evSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

  renderProgress();
  renderElements();
  renderNotifications();
}

/* ---------------- إشعارات: الشواهد التي تحتاج تعديلاً ---------------- */
/* ---------------- إشعارات: الشواهد التي تحتاج تعديلاً ---------------- */
function setupNotifBell() {
  const btn = document.getElementById("notifBellBtn");
  const dropdown = document.getElementById("notifDropdown");
  if (!btn || !dropdown) return;

  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    dropdown.style.display = dropdown.style.display === "none" ? "block" : "none";
  });
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".notif-bell-wrap")) dropdown.style.display = "none";
  });
  dropdown.addEventListener("click", (e) => {
    const item = e.target.closest("[data-goto-main]");
    if (!item || !item.dataset.gotoMain) return;
    dropdown.style.display = "none";
    document.querySelector('[data-section="portfolio"]')?.click();
    setTimeout(() => {
      const card = document.querySelector(`.element-card[data-el-id="${item.dataset.gotoMain}"]`);
      if (card) {
        card.classList.add("open");
        card.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 150);
  });
}

function renderNotifications() {
  const flagged = EVIDENCES.filter((e) => e.status === "needs_review");
  const badge = document.getElementById("notifBadge");
  const dropdown = document.getElementById("notifDropdown");
  if (!badge || !dropdown) return;

  if (flagged.length) {
    badge.textContent = flagged.length > 99 ? "99+" : flagged.length;
    badge.style.display = "flex";
  } else {
    badge.style.display = "none";
  }

  dropdown.innerHTML = flagged.length
    ? flagged.map((ev) => {
        const el = ELEMENTS.find((x) => x.id === ev.elementId);
        const mainEl = el && el.parentId ? ELEMENTS.find((x) => x.id === el.parentId) : el;
        return `
          <button class="notif-item" data-goto-main="${mainEl ? mainEl.id : ""}">
            <strong>✏️ ${escapeHtml(el ? el.title : "عنصر")}</strong>
            <span>${escapeHtml(ev.note || ev.fileName || "شاهد يحتاج تعديل")}</span>
          </button>`;
      }).join("")
    : `<div class="notif-empty">لا توجد إشعارات جديدة 🎉</div>`;
}

/* ---------------- مساعدات التسلسل الهرمي ---------------- */
/* تُعاد فقط عناصر الدور الوظيفي الخاص بالمعلم الحالي (الأدوار القديمة بدون
   حقل jobType تُعامل كـ "teacher" افتراضياً للتوافق مع الحسابات السابقة) */
function mainElements() {
  const myJobType = PROFILE.jobType || "teacher";
  return ELEMENTS.filter((e) => !e.parentId && (e.jobType || "teacher") === myJobType);
}
function childrenOf(parentId) {
  return ELEMENTS.filter((e) => e.parentId === parentId);
}
function leavesOf(mainEl) {
  const kids = childrenOf(mainEl.id);
  return kids.length ? kids : [mainEl];
}

/* ---------------- شريط ودائرة التقدّم (العنصر المميز) ---------------- */
function renderProgress() {
  const mains = mainElements();
  const totalWeight = mains.reduce((s, e) => s + (Number(e.weight) || 0), 0) || 100;
  const completedIds = new Set(EVIDENCES.map((e) => e.elementId));

  const doneWeight = mains.reduce((s, m) => {
    const leaves = leavesOf(m);
    const done = leaves.filter((l) => completedIds.has(l.id)).length;
    return s + (Number(m.weight) || 0) * (done / leaves.length);
  }, 0);
  const pct = mains.length ? Math.round((doneWeight / totalWeight) * 100) : 0;

  // العدّاد يعتمد على العناصر التي تُرفع عليها الشواهد فعلياً
  const leaves = mains.flatMap(leavesOf);
  const doneLeaves = leaves.filter((l) => completedIds.has(l.id)).length;

  document.getElementById("ringPct").textContent = pct + "%";
  document.getElementById("mainBar").style.width = pct + "%";
  document.getElementById("doneCount").textContent = doneLeaves;
  document.getElementById("totalCount").textContent = leaves.length;

  const offset = RING_CIRCUMFERENCE - (pct / 100) * RING_CIRCUMFERENCE;
  const ring = document.getElementById("ringFill");
  requestAnimationFrame(() => { ring.style.strokeDashoffset = offset; });

  const segWrap = document.getElementById("segments");
  segWrap.innerHTML = leaves.map((e) => `<div class="seg ${completedIds.has(e.id) ? "done" : ""}"></div>`).join("");
}

/* ---------------- بطاقات العناصر ---------------- */
const TEACHER_STATUS_BADGE = {
  pending: '<span class="status-pill status-pending">قيد المراجعة</span>',
  approved: '<span class="status-pill status-approved">✅ مقبول</span>',
  needs_review: '<span class="status-pill status-needs-review">✏️ يحتاج تعديل</span>',
};

/* يبني كتلة الشواهد + نموذج الإضافة لعنصر واحد يرفع عليه المعلم شواهده */
function evidenceBlockHtml(leaf, isSub) {
  const evs = EVIDENCES.filter((e) => e.elementId === leaf.id);
  return `
    <div class="sub-element" data-leaf="${leaf.id}">
      ${isSub ? `
        <div class="sub-element-head">
          <span class="sub-dot ${evs.length ? "done" : ""}">${evs.length ? "✓" : ""}</span>
          <strong>${escapeHtml(leaf.title)}</strong>
          <small>${evs.length} ${evs.length === 1 ? "شاهد" : "شواهد"}</small>
        </div>` : ""}
      ${leaf.examples ? `<div class="element-examples">💡 أمثلة على تحقيق العنصر: ${escapeHtml(leaf.examples)}</div>` : ""}
      <div class="evidence-list" data-list>
        ${evs.length ? evs.map((ev) => `
          <div class="evidence-item">
            <div class="evidence-item-top">
              <div class="evidence-icon">${evidenceIcon(ev.type)}</div>
              <div class="evidence-info">
                <a href="${escapeHtml(ev.url)}" target="_blank" rel="noopener">${escapeHtml(ev.note || ev.fileName || ev.url)}</a>
                <span>${formatDate(ev.createdAt)} ${TEACHER_STATUS_BADGE[ev.status] || TEACHER_STATUS_BADGE.pending}</span>
              </div>
              <div class="evidence-actions">
                <button type="button" class="btn btn-ghost btn-sm" data-edit-evidence="${ev.id}" data-ev-type="${ev.type}">تعديل</button>
                <button type="button" class="btn btn-ghost btn-sm" data-move-evidence="${ev.id}">نقل</button>
                <button type="button" class="btn btn-danger btn-sm" data-del-evidence="${ev.id}" data-leaf-id="${leaf.id}">حذف</button>
              </div>
            </div>
            <div class="evidence-move-row" data-move-row="${ev.id}" style="display:none">
              <select data-move-select="${ev.id}"></select>
              <button type="button" class="btn btn-primary btn-sm" data-move-confirm="${ev.id}" data-cur-leaf="${leaf.id}">تأكيد النقل</button>
            </div>
          </div>`).join("") : `<div class="evidence-empty">لم تُضِف أي شاهد لهذا العنصر بعد</div>`}
      </div>

      <form class="evidence-form" data-form data-leaf-id="${leaf.id}">
        <div class="field field-type">
          <label>طريقة الإضافة</label>
          <select data-mode>
            <option value="drive">رفع ملف (يُحفظ في Google Drive تلقائياً)</option>
            <option value="link">لصق رابط جاهز</option>
          </select>
        </div>
        <div class="field" data-field-file style="flex:2">
          <label>اختر صورة أو ملف أو فيديو من جهازك</label>
          <input type="file" data-file />
        </div>
        <div class="field" data-field-url style="flex:2; display:none">
          <label>الرابط</label>
          <input type="url" placeholder="https://" data-url />
        </div>
        <div class="field">
          <label>وصف مختصر (اختياري)</label>
          <input type="text" placeholder="مثال: شهادة حضور دورة" data-note />
        </div>
        <button type="submit" class="btn btn-primary btn-sm" style="align-self:flex-end">إضافة</button>
      </form>
    </div>`;
}

function renderElements() {
  const wrap = document.getElementById("elementsWrap");
  const mains = mainElements();
  if (!mains.length) {
    wrap.innerHTML = `<div class="panel"><div class="empty-state"><div class="icon">🗂️</div>لم يقم مدير النظام بإضافة عناصر التقييم بعد.</div></div>`;
    return;
  }

  wrap.innerHTML = `<div class="panel" style="padding:10px 10px"><div style="display:flex; flex-direction:column; gap:10px" id="cardsList"></div></div>`;
  const list = document.getElementById("cardsList");

  // خيارات "نقل" — كل الشواهد التي يمكن نقل شاهد إليها، مجمّعة حسب العنصر الأساسي
  const moveOptionsHtml = mains.map((m) => {
    const leaves = childrenOf(m.id).length ? childrenOf(m.id) : [m];
    return `<optgroup label="${escapeHtml(m.title)}">${leaves.map((l) => `<option value="${l.id}">${escapeHtml(l.title)}</option>`).join("")}</optgroup>`;
  }).join("");

  mains.forEach((el, idx) => {
    const kids = childrenOf(el.id);
    const leaves = kids.length ? kids : [el];
    const doneLeaves = leaves.filter((l) => EVIDENCES.some((e) => e.elementId === l.id)).length;
    const allDone = doneLeaves === leaves.length;

    const card = document.createElement("div");
    card.className = "element-card";
    card.dataset.elId = el.id;
    card.innerHTML = `
      <div class="element-head" data-toggle>
        <div class="element-head-left">
          <div class="element-num ${allDone ? "done" : ""}">${allDone ? "✓" : idx + 1}</div>
          <div class="element-titles">
            <strong>${escapeHtml(el.title)}</strong>
            <small>${kids.length
              ? `${doneLeaves} من ${leaves.length} عنصر فرعي مكتمل`
              : `${EVIDENCES.filter((e) => e.elementId === el.id).length} شواهد مضافة`}</small>
          </div>
        </div>
        <div style="display:flex; align-items:center; gap:10px">
          <span class="element-badge">${el.weight}%</span>
          <svg class="chevron" width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </div>
      </div>
      <div class="element-body">
        ${kids.length && el.examples ? `<div class="element-examples">💡 ${escapeHtml(el.examples)}</div>` : ""}
        ${leaves.map((leaf) => evidenceBlockHtml(leaf, kids.length > 0)).join("")}
      </div>
    `;
    list.appendChild(card);

    // فتح/طي البطاقة
    card.querySelector("[data-toggle]").addEventListener("click", () => card.classList.toggle("open"));

    // تبديل بين رفع ملف / لصق رابط — لكل عنصر فرعي على حدة
    card.querySelectorAll("[data-form]").forEach((form) => {
      const modeSelect = form.querySelector("[data-mode]");
      const fileField = form.querySelector("[data-field-file]");
      const urlField = form.querySelector("[data-field-url]");
      modeSelect.addEventListener("change", () => {
        const isDrive = modeSelect.value === "drive";
        fileField.style.display = isDrive ? "" : "none";
        urlField.style.display = isDrive ? "none" : "";
      });
      form.addEventListener("submit", (e) =>
        handleAddEvidence(e, ELEMENTS.find((x) => x.id === form.dataset.leafId), el)
      );
    });

    // حذف شاهد
    card.querySelectorAll("[data-del-evidence]").forEach((btn) =>
      btn.addEventListener("click", () => handleDeleteEvidence(btn.dataset.delEvidence, el))
    );

    // تعديل شاهد (الوصف، والرابط إن كان النوع "رابط")
    card.querySelectorAll("[data-edit-evidence]").forEach((btn) =>
      btn.addEventListener("click", () => handleEditEvidence(btn.dataset.editEvidence, btn.dataset.evType, el))
    );

    // نقل شاهد لعنصر آخر
    card.querySelectorAll("[data-move-evidence]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const evId = btn.dataset.moveEvidence;
        const row = card.querySelector(`[data-move-row="${evId}"]`);
        if (!row) return;
        const select = row.querySelector("select");
        if (select && !select.dataset.filled) {
          select.innerHTML = moveOptionsHtml;
          select.dataset.filled = "1";
        }
        const ev = EVIDENCES.find((e) => e.id === evId);
        if (ev && select) select.value = ev.elementId;
        row.style.display = row.style.display === "none" ? "flex" : "none";
      });
    });
    card.querySelectorAll("[data-move-confirm]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const row = btn.closest(".evidence-move-row");
        const select = row.querySelector("select");
        handleMoveEvidence(btn.dataset.moveConfirm, select.value, el);
      });
    });
  });

  applyElementSearch();
}

/* إعادة فتح البطاقة الأساسية بعد إعادة الرسم */
function reopenCard(mainEl) {
  if (!mainEl) return;
  const card = document.querySelector(`.element-card[data-el-id="${mainEl.id}"]`);
  if (card) card.classList.add("open");
}

async function handleAddEvidence(e, leaf, mainEl) {
  e.preventDefault();
  const form = e.target;
  if (!leaf) return;
  const submitBtn = form.querySelector("button[type=submit]");
  const mode = form.querySelector("[data-mode]").value;
  const note = form.querySelector("[data-note]").value.trim();
  const urlInput = form.querySelector("[data-url]");
  const fileInput = form.querySelector("[data-file]");

  submitBtn.disabled = true;

  try {
    let url, fileName = null, type = "link";

    if (mode === "drive") {
      const file = fileInput.files[0];
      if (!file) throw new Error("اختر ملفاً أولاً");
      if (file.size > 80 * 1024 * 1024) throw new Error("حجم الملف يجب ألا يتجاوز 80 ميجابايت");
      submitBtn.textContent = "جارٍ الرفع إلى Drive...";
      const result = await uploadFileToDrive(file);
      url = result.url;
      fileName = file.name;
      type = file.type.startsWith("image/") ? "image" : file.type.startsWith("video/") ? "video" : "file";
    } else {
      url = urlInput.value.trim();
      if (!url) throw new Error("أدخل رابطاً صحيحاً");
      submitBtn.textContent = "جارٍ الإضافة...";
    }

    await db.collection("evidences").add({
      teacherUid: PROFILE.uid,
      teacherUsername: PROFILE.username,
      elementId: leaf.id,
      type, url, fileName, note,
      status: "pending",
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });

    await loadAll();
    // إعادة فتح نفس البطاقة بعد إعادة الرسم
    reopenCard(mainEl);
  } catch (err) {
    console.error(err);
    alert(err.message || "حدث خطأ أثناء إضافة الشاهد");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "إضافة";
  }
}

function handleDeleteEvidence(evidenceId, mainEl) {
  confirmAction("حذف الشاهد", "هل أنت متأكد من حذف هذا الشاهد؟ لا يمكن التراجع عن هذا الإجراء.", async () => {
    try {
      await db.collection("evidences").doc(evidenceId).delete();
      await loadAll();
      reopenCard(mainEl);
    } catch (err) {
      console.error(err);
      alert("تعذّر حذف الشاهد");
    }
  });
}

async function handleEditEvidence(evidenceId, type, mainEl) {
  const ev = EVIDENCES.find((e) => e.id === evidenceId);
  if (!ev) return;

  const newNote = prompt("وصف مختصر للشاهد:", ev.note || "");
  if (newNote === null) return; // إلغاء

  const updates = { note: newNote.trim() };

  if (type === "link") {
    const newUrl = prompt("الرابط:", ev.url || "");
    if (newUrl === null) return; // إلغاء
    if (!newUrl.trim()) { alert("الرابط لا يمكن أن يكون فارغاً"); return; }
    updates.url = newUrl.trim();
  }

  try {
    await db.collection("evidences").doc(evidenceId).update(updates);
    await loadAll();
    reopenCard(mainEl);
  } catch (err) {
    console.error(err);
    alert("تعذّر تعديل الشاهد");
  }
}

async function handleMoveEvidence(evidenceId, newElementId, mainEl) {
  if (!newElementId) return;
  const ev = EVIDENCES.find((e) => e.id === evidenceId);
  if (ev && ev.elementId === newElementId) return; // لم يتغيّر شيء

  try {
    await db.collection("evidences").doc(evidenceId).update({ elementId: newElementId });
    await loadAll();
    const newMain = ELEMENTS.find((x) => x.id === newElementId);
    const newMainEl = newMain && newMain.parentId ? ELEMENTS.find((x) => x.id === newMain.parentId) : newMain;
    reopenCard(newMainEl || mainEl);
  } catch (err) {
    console.error(err);
    alert("تعذّر نقل الشاهد");
  }
}

/* ---------------- إعدادات الحساب ---------------- */
function setupAccountForms() {
  const uForm = document.getElementById("usernameForm");
  const uMsg = document.getElementById("usernameMsg");
  uForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideMsg(uMsg);
    try {
      const newU = await changeUsername(PROFILE.uid, PROFILE.username, document.getElementById("newUsername").value);
      PROFILE.username = newU;
      document.getElementById("tUsername").textContent = "@" + newU;
      showMsg(uMsg, "تم تحديث اسم المستخدم بنجاح. استخدمه في المرة القادمة لتسجيل الدخول.", "success");
      uForm.reset();
    } catch (err) {
      showMsg(uMsg, err.message, "error");
    }
  });

  const pForm = document.getElementById("passwordForm");
  const pMsg = document.getElementById("passwordMsg");
  pForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideMsg(pMsg);
    try {
      await changePassword(document.getElementById("curPassword").value, document.getElementById("newPassword").value);
      showMsg(pMsg, "تم تحديث كلمة المرور بنجاح.", "success");
      pForm.reset();
    } catch (err) {
      showMsg(pMsg, err.message, "error");
    }
  });
}
