/* ======================================================
   لوحة تحكم المدير
   ====================================================== */

let CURRENT_PROFILE = null;
let ELEMENTS_CACHE = [];
let TEACHERS_CACHE = [];
let ALL_EVIDENCES = [];

const DEFAULT_ELEMENTS = [
  { title: "أداء الواجبات الوظيفية", weight: 10, order: 1, examples: "المشاركة في الفعاليات الوطنية / تعزيز قيم المواطنة لدى الطلاب / التعاون مع المؤسسات الحكومية" },
  { title: "التفاعل مع المجتمع", weight: 10, order: 2, examples: "المشاركة الفاعلة في مجتمعات التعلم المهنية / تبادل الزيارات / حضور الدورات والورش التدريبية" },
  { title: "التفاعل مع أولياء الأمور", weight: 10, order: 3, examples: "التواصل الفعّال مع أولياء الأمور / تزويدهم بمستويات الطلبة / تفعيل الخطة الأسبوعية للتواصل" },
  { title: "التنويع في استراتيجيات التدريس", weight: 10, order: 4, examples: "استخدام استراتيجيات متنوعة تناسب مستويات الطلبة / مراعاة الفروق الفردية" },
  { title: "تحسين نتائج المتعلمين", weight: 10, order: 5, examples: "معالجة الفاقد التعليمي / وضع الخطط العلاجية / وضع خطط الإثراء للمتميزين" },
  { title: "إعداد وتنفيذ خطة التعلم", weight: 10, order: 6, examples: "توزيع المنهج / إعداد الدروس والواجبات والاختبارات / تنفيذ الدروس" },
  { title: "توظيف تقنيات ووسائل التعلم المناسبة", weight: 10, order: 7, examples: "دمج التقنية في التعليم / التنويع في الوسائل التعليمية" },
  { title: "تهيئة البيئة التعليمية", weight: 5, order: 8, examples: "مراعاة حاجات الطلبة النفسية / التهيئة والتحفيز المادي والمعنوي" },
  { title: "الإدارة الصفية", weight: 5, order: 9, examples: "ضبط سلوك الطلبة / متابعة الحضور والغياب والتأخر" },
  { title: "تحليل نتائج المتعلمين وتشخيص مستوياتهم", weight: 10, order: 10, examples: "تحليل نتائج الاختبارات الفترية والنهائية / تصنيف الطلبة وفق نتائجهم" },
  { title: "تنوع أساليب التقويم", weight: 10, order: 11, examples: "تطبيق الاختبارات الورقية والإلكترونية / المشاريع والمهام الأدائية" },
];

document.addEventListener("DOMContentLoaded", () => {
  guardPage("admin", (profile) => {
    CURRENT_PROFILE = profile;
    document.getElementById("adminAvatar").textContent = initials(profile.name);
    document.getElementById("adminName").textContent = profile.name || "المدير";
    document.getElementById("adminUsername").textContent = "@" + profile.username;

    guardWithBiometric(profile.uid, () => {
      setupNav();
      setupTeacherForm();
      setupElementForm();
      setupAccountForms();
      setupBannerAndTicker();
      setupListToolbar();
      setupBiometricToggle(profile);
      document.getElementById("seedBtn").addEventListener("click", seedDefaultElements);

      loadElements();
      loadTeachersAndProgress();
      loadCurrentBrandingPreview();
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

/* ---------------- التنقّل بين الأقسام ---------------- */
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
      if (target === "teachers") markEvidenceAsSeen();
    });
  });
}

/* ---------------- عناصر التقييم ---------------- */
function setupElementForm() {
  const form = document.getElementById("elementForm");
  const msg = document.getElementById("elementMsg");
  const cancelBtn = document.getElementById("elementCancelBtn");

  cancelBtn.addEventListener("click", () => {
    form.reset();
    document.getElementById("eId").value = "";
    document.getElementById("elementFormTitle").textContent = "إضافة عنصر جديد";
    document.getElementById("elementBtn").textContent = "حفظ العنصر";
    cancelBtn.style.display = "none";
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideMsg(msg);
    const id = document.getElementById("eId").value;
    const title = document.getElementById("eTitle").value.trim();
    const weight = Number(document.getElementById("eWeight").value);
    const examples = document.getElementById("eExamples").value.trim();

    if (!title || !weight) return;

    try {
      if (id) {
        await db.collection("elements").doc(id).update({ title, weight, examples });
        showMsg(msg, "تم تحديث العنصر بنجاح.", "success");
      } else {
        const order = ELEMENTS_CACHE.length + 1;
        await db.collection("elements").add({ title, weight, examples, order, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
        showMsg(msg, "تمت إضافة العنصر بنجاح.", "success");
      }
      form.reset();
      document.getElementById("eId").value = "";
      document.getElementById("elementFormTitle").textContent = "إضافة عنصر جديد";
      document.getElementById("elementBtn").textContent = "حفظ العنصر";
      cancelBtn.style.display = "none";
      loadElements();
    } catch (err) {
      console.error(err);
      showMsg(msg, "حدث خطأ أثناء الحفظ، حاول مرة أخرى.", "error");
    }
  });
}

async function seedDefaultElements() {
  confirmAction(
    "استيراد العناصر الرسمية",
    "سيتم إضافة 11 عنصراً وفق نموذج وزارة التعليم. لن يتم حذف أي عناصر موجودة حالياً. هل تريد المتابعة؟",
    async () => {
      const batch = db.batch();
      DEFAULT_ELEMENTS.forEach((el) => {
        const ref = db.collection("elements").doc();
        batch.set(ref, { ...el, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
      });
      await batch.commit();
      loadElements();
    }
  );
}

async function loadElements() {
  const wrap = document.getElementById("elementsTableWrap");
  const snap = await db.collection("elements").orderBy("order", "asc").get();
  ELEMENTS_CACHE = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

  document.getElementById("statElements").textContent = ELEMENTS_CACHE.length;
  const sum = ELEMENTS_CACHE.reduce((s, e) => s + (Number(e.weight) || 0), 0);
  document.getElementById("weightSum").textContent = sum;

  if (!ELEMENTS_CACHE.length) {
    wrap.innerHTML = `<div class="empty-state"><div class="icon">🗂️</div>لا توجد عناصر مضافة بعد. استخدم زر "استيراد العناصر الرسمية" أو أضف عنصراً يدوياً.</div>`;
  } else {
    wrap.innerHTML = `
      <table>
        <thead><tr><th>#</th><th>العنصر</th><th>الوزن</th><th></th></tr></thead>
        <tbody>
          ${ELEMENTS_CACHE.map((el, i) => `
            <tr>
              <td>${i + 1}</td>
              <td>${escapeHtml(el.title)}</td>
              <td><span class="tag-weight">${el.weight}%</span></td>
              <td>
                <div class="row-actions">
                  <button class="btn btn-ghost btn-sm" data-edit="${el.id}">تعديل</button>
                  <button class="btn btn-danger btn-sm" data-del="${el.id}">حذف</button>
                </div>
              </td>
            </tr>`).join("")}
        </tbody>
      </table>`;

    wrap.querySelectorAll("[data-edit]").forEach((btn) =>
      btn.addEventListener("click", () => editElement(btn.dataset.edit))
    );
    wrap.querySelectorAll("[data-del]").forEach((btn) =>
      btn.addEventListener("click", () => deleteElement(btn.dataset.del))
    );
  }

  // إعادة حساب التقدّم إن كانت العناصر قد تغيّرت
  if (TEACHERS_CACHE.length) renderOverview();
}

function editElement(id) {
  const el = ELEMENTS_CACHE.find((e) => e.id === id);
  if (!el) return;
  document.getElementById("eId").value = el.id;
  document.getElementById("eTitle").value = el.title;
  document.getElementById("eWeight").value = el.weight;
  document.getElementById("eExamples").value = el.examples || "";
  document.getElementById("elementFormTitle").textContent = "تعديل عنصر";
  document.getElementById("elementBtn").textContent = "حفظ التعديلات";
  document.getElementById("elementCancelBtn").style.display = "inline-flex";
  document.querySelector('[data-section="elements"]').scrollIntoView?.();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function deleteElement(id) {
  const el = ELEMENTS_CACHE.find((e) => e.id === id);
  confirmAction(
    "حذف عنصر التقييم",
    `سيتم حذف عنصر "${el?.title || ""}" وجميع الشواهد المرتبطة به لدى جميع المعلمين. هل أنت متأكد؟`,
    async () => {
      const evSnap = await db.collection("evidences").where("elementId", "==", id).get();
      const batch = db.batch();
      evSnap.docs.forEach((d) => batch.delete(d.ref));
      batch.delete(db.collection("elements").doc(id));
      await batch.commit();
      loadElements();
      loadTeachersAndProgress();
    }
  );
}

/* ---------------- إدارة المعلمين ---------------- */
function setupTeacherForm() {
  const form = document.getElementById("teacherForm");
  const msg = document.getElementById("teacherMsg");
  const btn = document.getElementById("teacherBtn");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideMsg(msg);
    const name = document.getElementById("tName").value.trim();
    const username = document.getElementById("tUsername").value.trim().toLowerCase();
    const email = document.getElementById("tEmail").value.trim();
    const password = document.getElementById("tPassword").value;

    if (!/^[a-z0-9_.]{3,30}$/.test(username)) {
      showMsg(msg, "اسم المستخدم يجب أن يكون بالأحرف الإنجليزية أو أرقام فقط (بدون مسافات).", "error");
      return;
    }

    btn.disabled = true;
    btn.textContent = "جارٍ الإنشاء...";

    try {
      const existing = await db.collection("usernames").doc(username).get();
      if (existing.exists) throw new Error("اسم المستخدم هذا مستخدم بالفعل.");

      const internalEmail = usernameToEmail(username);
      const cred = await secondaryAuth.createUserWithEmailAndPassword(internalEmail, password);
      const uid = cred.user.uid;
      await secondaryAuth.signOut();

      const batch = db.batch();
      batch.set(db.collection("users").doc(uid), {
        name, username, role: "teacher", contactEmail: email || null,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
      batch.set(db.collection("usernames").doc(username), { uid, role: "teacher" });
      await batch.commit();

      showMsg(msg, `تم إنشاء حساب المعلم "${name}" بنجاح.`, "success");
      form.reset();
      loadTeachersAndProgress();
    } catch (err) {
      console.error(err);
      let text = err.message || "حدث خطأ أثناء إنشاء الحساب.";
      if (err.code === "auth/email-already-in-use") text = "اسم المستخدم هذا مستخدم بالفعل.";
      if (err.code === "auth/weak-password") text = "كلمة المرور ضعيفة، استخدم 6 أحرف على الأقل.";
      showMsg(msg, text, "error");
    } finally {
      btn.disabled = false;
      btn.textContent = "إضافة المعلم";
    }
  });
}

async function loadTeachersAndProgress() {
  const [teachersSnap, evidenceSnap] = await Promise.all([
    db.collection("users").where("role", "==", "teacher").get(),
    db.collection("evidences").get(),
  ]);

  TEACHERS_CACHE = teachersSnap.docs.map((d) => ({ uid: d.id, ...d.data() }));
  const evidences = evidenceSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  ALL_EVIDENCES = evidences;

  TEACHERS_CACHE.forEach((t) => {
    const teacherElements = new Set(evidences.filter((e) => e.teacherUid === t.uid).map((e) => e.elementId));
    t.completedCount = teacherElements.size;
    t.completedIds = teacherElements;
  });

  document.getElementById("statTeachers").textContent = TEACHERS_CACHE.length;

  renderTeachersTable();
  renderOverview();
  renderChart();
  updateEvidenceBadge();
}

/* ---------------- بحث وترتيب قائمة المعلمين ---------------- */
function setupListToolbar() {
  document.getElementById("teacherSearch").addEventListener("input", renderTeachersTable);
  document.getElementById("teacherSort").addEventListener("change", renderTeachersTable);
}

function renderTeachersTable() {
  const wrap = document.getElementById("teachersTableWrap");
  const search = (document.getElementById("teacherSearch")?.value || "").trim().toLowerCase();
  const sortBy = document.getElementById("teacherSort")?.value || "name";

  let list = TEACHERS_CACHE.filter((t) =>
    !search || t.name.toLowerCase().includes(search) || t.username.toLowerCase().includes(search)
  );

  list = [...list].sort((a, b) => {
    if (sortBy === "pct-desc") return weightedPct(b.completedIds) - weightedPct(a.completedIds);
    if (sortBy === "pct-asc") return weightedPct(a.completedIds) - weightedPct(b.completedIds);
    return a.name.localeCompare(b.name, "ar");
  });

  if (!TEACHERS_CACHE.length) {
    wrap.innerHTML = `<div class="empty-state"><div class="icon">👩‍🏫</div>لا يوجد معلمون مضافون بعد.</div>`;
    return;
  }
  if (!list.length) {
    wrap.innerHTML = `<div class="empty-state"><div class="icon">🔍</div>لا توجد نتائج مطابقة للبحث.</div>`;
    return;
  }

  wrap.innerHTML = `
    <table>
      <thead><tr><th>الاسم</th><th>اسم المستخدم</th><th>نسبة الإنجاز</th><th></th></tr></thead>
      <tbody>
        ${list.map((t) => {
          const pct = weightedPct(t.completedIds);
          const hasNote = t.adminNote && t.adminNote.trim();
          return `
          <tr>
            <td>${escapeHtml(t.name)} ${hasNote ? '<span title="يوجد ملاحظة" style="color:var(--accent-gold)">📝</span>' : ""}</td>
            <td>@${escapeHtml(t.username)}</td>
            <td style="min-width:140px">
              <div class="progress-bar-track" style="width:120px"><div class="progress-bar-fill" style="width:${pct}%"></div></div>
              <small style="color:var(--text-3)">${pct}%</small>
            </td>
            <td><div class="row-actions">
              <button class="btn btn-ghost btn-sm" data-note="${t.uid}" data-name="${escapeHtml(t.name)}">ملاحظة</button>
              <button class="btn btn-ghost btn-sm" data-view-evidence="${t.uid}" data-name="${escapeHtml(t.name)}">عرض الشواهد</button>
              <button class="btn btn-danger btn-sm" data-del-teacher="${t.uid}" data-name="${escapeHtml(t.name)}">حذف</button>
            </div></td>
          </tr>`;
        }).join("")}
      </tbody>
    </table>`;

  wrap.querySelectorAll("[data-del-teacher]").forEach((btn) =>
    btn.addEventListener("click", () => deleteTeacher(btn.dataset.delTeacher, btn.dataset.name))
  );
  wrap.querySelectorAll("[data-view-evidence]").forEach((btn) =>
    btn.addEventListener("click", () => showTeacherEvidences(btn.dataset.viewEvidence, btn.dataset.name))
  );
  wrap.querySelectorAll("[data-note]").forEach((btn) =>
    btn.addEventListener("click", () => openNoteModal(btn.dataset.note, btn.dataset.name))
  );
}

/* ---------------- رسم بياني لمقارنة أداء المعلمين ---------------- */
function renderChart() {
  const wrap = document.getElementById("chartWrap");
  if (!TEACHERS_CACHE.length) {
    wrap.innerHTML = `<div class="empty-state"><div class="icon">📈</div>أضف معلمين أولاً لعرض المقارنة.</div>`;
    return;
  }
  const sorted = [...TEACHERS_CACHE].sort((a, b) => weightedPct(b.completedIds) - weightedPct(a.completedIds));
  wrap.innerHTML = sorted.map((t) => {
    const pct = weightedPct(t.completedIds);
    return `
      <div class="chart-bar-row">
        <div class="chart-bar-label">${escapeHtml(t.name)}</div>
        <div class="chart-bar-track"><div class="chart-bar-fill" style="width:${pct}%"></div></div>
        <div class="chart-bar-pct">${pct}%</div>
      </div>`;
  }).join("");
}

/* ---------------- شارة الشواهد الجديدة ---------------- */
async function updateEvidenceBadge() {
  const lastSeen = CURRENT_PROFILE.lastSeenEvidenceAt ? CURRENT_PROFILE.lastSeenEvidenceAt.toMillis() : 0;
  const newCount = ALL_EVIDENCES.filter((e) => e.createdAt && e.createdAt.toMillis() > lastSeen).length;
  const badge = document.getElementById("newEvidenceBadge");
  if (newCount > 0) {
    badge.textContent = newCount > 99 ? "99+" : newCount;
    badge.style.display = "flex";
  } else {
    badge.style.display = "none";
  }
}

async function markEvidenceAsSeen() {
  const badge = document.getElementById("newEvidenceBadge");
  if (badge.style.display === "none") return;
  badge.style.display = "none";
  await db.collection("users").doc(CURRENT_PROFILE.uid).update({
    lastSeenEvidenceAt: firebase.firestore.FieldValue.serverTimestamp(),
  });
  CURRENT_PROFILE.lastSeenEvidenceAt = { toMillis: () => Date.now() };
}

function weightedPct(completedIds) {
  if (!ELEMENTS_CACHE.length) return 0;
  const totalWeight = ELEMENTS_CACHE.reduce((s, e) => s + (Number(e.weight) || 0), 0) || 100;
  const doneWeight = ELEMENTS_CACHE.filter((e) => completedIds.has(e.id)).reduce((s, e) => s + (Number(e.weight) || 0), 0);
  return Math.round((doneWeight / totalWeight) * 100);
}

function renderOverview() {
  const wrap = document.getElementById("overviewTableWrap");
  if (!TEACHERS_CACHE.length) {
    wrap.innerHTML = `<div class="empty-state"><div class="icon">📊</div>أضف معلمين أولاً لعرض ملخص الأداء.</div>`;
    document.getElementById("statAvg").textContent = "0%";
    return;
  }
  const pcts = TEACHERS_CACHE.map((t) => weightedPct(t.completedIds));
  const avg = Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length);
  document.getElementById("statAvg").textContent = avg + "%";

  wrap.innerHTML = `
    <table>
      <thead><tr><th>المعلم</th><th>العناصر المكتملة</th><th>نسبة الإنجاز الموزونة</th></tr></thead>
      <tbody>
        ${TEACHERS_CACHE.map((t) => {
          const pct = weightedPct(t.completedIds);
          return `
          <tr>
            <td>${escapeHtml(t.name)}</td>
            <td>${t.completedCount} / ${ELEMENTS_CACHE.length}</td>
            <td style="min-width:180px">
              <div style="display:flex; align-items:center; gap:10px">
                <div class="progress-bar-track" style="flex:1"><div class="progress-bar-fill" style="width:${pct}%"></div></div>
                <span class="tag-weight">${pct}%</span>
              </div>
            </td>
          </tr>`;
        }).join("")}
      </tbody>
    </table>`;
}

function deleteTeacher(uid, name) {
  confirmAction(
    "حذف حساب معلم",
    `سيتم حذف حساب "${name}" وجميع الشواهد التي أضافها. لن يستطيع تسجيل الدخول بعد الآن. هل أنت متأكد؟`,
    async () => {
      const [userDoc, evSnap] = await Promise.all([
        db.collection("users").doc(uid).get(),
        db.collection("evidences").where("teacherUid", "==", uid).get(),
      ]);
      const username = userDoc.exists ? userDoc.data().username : null;

      const batch = db.batch();
      evSnap.docs.forEach((d) => batch.delete(d.ref));
      batch.delete(db.collection("users").doc(uid));
      if (username) batch.delete(db.collection("usernames").doc(username));
      await batch.commit();

      loadTeachersAndProgress();
    }
  );
}

/* ---------------- عرض شواهد معلم معيّن (الروابط المضافة) ---------------- */
let EVIDENCE_MODAL_TEACHER = null;

function showTeacherEvidences(uid, name) {
  const overlay = document.getElementById("evidenceModalOverlay");
  const body = document.getElementById("evidenceModalBody");
  document.getElementById("evidenceModalTitle").textContent = `شواهد المعلم: ${name}`;
  EVIDENCE_MODAL_TEACHER = TEACHERS_CACHE.find((t) => t.uid === uid);

  const evs = ALL_EVIDENCES.filter((e) => e.teacherUid === uid);

  if (!evs.length) {
    body.innerHTML = `<div class="evidence-empty">لم يُضِف هذا المعلم أي شاهد بعد.</div>`;
  } else {
    // تجميع الشواهد حسب العنصر
    const byElement = {};
    evs.forEach((e) => {
      if (!byElement[e.elementId]) byElement[e.elementId] = [];
      byElement[e.elementId].push(e);
    });

    body.innerHTML = Object.keys(byElement).map((elId) => {
      const el = ELEMENTS_CACHE.find((x) => x.id === elId);
      const title = el ? el.title : "عنصر محذوف";
      const items = byElement[elId];
      return `
        <div style="margin-bottom:16px">
          <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px">
            <strong style="font-size:13.5px">${escapeHtml(title)}</strong>
            <span class="tag-weight">${items.length}</span>
          </div>
          <div class="evidence-list">
            ${items.map((ev) => `
              <div class="evidence-item">
                <div class="evidence-icon">${evidenceIcon(ev.type)}</div>
                <div class="evidence-info">
                  <a href="${escapeHtml(ev.url)}" target="_blank" rel="noopener">${escapeHtml(ev.note || ev.url)}</a>
                  <span>${formatDate(ev.createdAt)}</span>
                </div>
              </div>`).join("")}
          </div>
        </div>`;
    }).join("");
  }

  overlay.classList.add("show");
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("evidenceModalClose")?.addEventListener("click", () => {
    document.getElementById("evidenceModalOverlay").classList.remove("show");
  });
  document.getElementById("evidenceModalOverlay")?.addEventListener("click", (e) => {
    if (e.target.id === "evidenceModalOverlay") e.currentTarget.classList.remove("show");
  });
  document.getElementById("evidenceModalPrint")?.addEventListener("click", () => {
    if (!EVIDENCE_MODAL_TEACHER) return;
    const evs = ALL_EVIDENCES.filter((e) => e.teacherUid === EVIDENCE_MODAL_TEACHER.uid);
    printTeacherReport(EVIDENCE_MODAL_TEACHER, ELEMENTS_CACHE, evs);
  });

  // نافذة ملاحظة المدير
  document.getElementById("noteCancel")?.addEventListener("click", () => {
    document.getElementById("noteModalOverlay").classList.remove("show");
  });
  document.getElementById("noteModalOverlay")?.addEventListener("click", (e) => {
    if (e.target.id === "noteModalOverlay") e.currentTarget.classList.remove("show");
  });
  document.getElementById("noteSave")?.addEventListener("click", saveTeacherNote);
});

let NOTE_MODAL_UID = null;
function openNoteModal(uid, name) {
  NOTE_MODAL_UID = uid;
  const teacher = TEACHERS_CACHE.find((t) => t.uid === uid);
  document.getElementById("noteModalTitle").textContent = `ملاحظة للمعلم: ${name}`;
  document.getElementById("noteText").value = teacher?.adminNote || "";
  hideMsg(document.getElementById("noteMsg"));
  document.getElementById("noteModalOverlay").classList.add("show");
}

async function saveTeacherNote() {
  const msg = document.getElementById("noteMsg");
  const text = document.getElementById("noteText").value.trim();
  try {
    await db.collection("users").doc(NOTE_MODAL_UID).update({ adminNote: text });
    const teacher = TEACHERS_CACHE.find((t) => t.uid === NOTE_MODAL_UID);
    if (teacher) teacher.adminNote = text;
    showMsg(msg, "تم حفظ الملاحظة بنجاح.", "success");
    renderTeachersTable();
    setTimeout(() => document.getElementById("noteModalOverlay").classList.remove("show"), 700);
  } catch (err) {
    console.error(err);
    showMsg(msg, "تعذّر حفظ الملاحظة.", "error");
  }
}

/* ---------------- الصورة والعبارة أسفل الترويسة ---------------- */
async function loadCurrentBrandingPreview() {
  try {
    const doc = await db.collection("meta").doc("branding").get();
    if (!doc.exists) return;
    const data = doc.data();
    if (data.bannerDataUrl) {
      document.getElementById("bannerPreview").src = data.bannerDataUrl;
      document.getElementById("bannerPreview").style.display = "block";
      document.getElementById("bannerPreviewEmpty").style.display = "none";
    }
    if (data.tickerText) {
      document.getElementById("tickerInput").value = data.tickerText;
    }
  } catch (err) { console.error(err); }
}

function setupBannerAndTicker() {
  const input = document.getElementById("bannerInput");
  const saveBtn = document.getElementById("bannerSaveBtn");
  const resetBtn = document.getElementById("bannerResetBtn");
  const preview = document.getElementById("bannerPreview");
  const previewEmpty = document.getElementById("bannerPreviewEmpty");
  const msg = document.getElementById("bannerMsg");
  let pendingDataUrl = null;

  input.addEventListener("change", () => {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        // تصغير الصورة وضغطها لتبقى أصغر بكثير من الحد الأقصى لحجم مستند قاعدة البيانات (1 ميجابايت)
        const maxW = 480;
        const scale = Math.min(1, maxW / img.width);
        const canvas = document.createElement("canvas");
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        pendingDataUrl = canvas.toDataURL("image/jpeg", 0.78);

        if (pendingDataUrl.length > 700 * 1024) {
          showMsg(msg, "الصورة كبيرة جداً حتى بعد الضغط، جرّب صورة أبسط أو أصغر أبعاداً.", "error");
          saveBtn.disabled = true;
          return;
        }
        hideMsg(msg);
        preview.src = pendingDataUrl;
        preview.style.display = "block";
        previewEmpty.style.display = "none";
        saveBtn.disabled = false;
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });

  saveBtn.addEventListener("click", async () => {
    if (!pendingDataUrl) return;
    hideMsg(msg);
    saveBtn.disabled = true;
    saveBtn.textContent = "جارٍ الحفظ...";
    try {
      await db.collection("meta").doc("branding").set({ bannerDataUrl: pendingDataUrl }, { merge: true });
      showMsg(msg, "تم حفظ الصورة، وستظهر لجميع المستخدمين فوراً أسفل الترويسة.", "success");
    } catch (err) {
      console.error(err);
      showMsg(msg, "تعذّر حفظ الصورة (" + (err.code || err.message || "خطأ غير معروف") + ").", "error");
    } finally {
      saveBtn.textContent = "حفظ الصورة";
    }
  });

  resetBtn.addEventListener("click", () => {
    confirmAction("إزالة الصورة", "ستُحذف الصورة الظاهرة أسفل الترويسة لدى جميع المستخدمين. هل تريد المتابعة؟", async () => {
      try {
        await db.collection("meta").doc("branding").set({ bannerDataUrl: firebase.firestore.FieldValue.delete() }, { merge: true });
        preview.style.display = "none";
        previewEmpty.style.display = "block";
        pendingDataUrl = null;
        saveBtn.disabled = true;
        input.value = "";
        showMsg(msg, "تمت إزالة الصورة.", "success");
      } catch (err) {
        console.error(err);
      }
    });
  });

  const tickerInput = document.getElementById("tickerInput");
  const tickerMsg = document.getElementById("tickerMsg");
  document.getElementById("tickerSaveBtn").addEventListener("click", async () => {
    hideMsg(tickerMsg);
    const text = tickerInput.value.trim();
    try {
      await db.collection("meta").doc("branding").set({ tickerText: text }, { merge: true });
      showMsg(tickerMsg, "تم حفظ العبارة، وستظهر في صفحة المعلمين فوراً.", "success");
    } catch (err) {
      console.error(err);
      showMsg(tickerMsg, "تعذّر حفظ العبارة (" + (err.code || err.message || "خطأ غير معروف") + ").", "error");
    }
  });

  document.getElementById("tickerResetBtn").addEventListener("click", () => {
    confirmAction("إزالة العبارة", "ستختفي العبارة المتحركة من صفحة المعلمين. هل تريد المتابعة؟", async () => {
      try {
        await db.collection("meta").doc("branding").set({ tickerText: firebase.firestore.FieldValue.delete() }, { merge: true });
        tickerInput.value = "";
        showMsg(tickerMsg, "تمت إزالة العبارة.", "success");
      } catch (err) {
        console.error(err);
      }
    });
  });
}

function setupAccountForms() {
  const uForm = document.getElementById("usernameForm");
  const uMsg = document.getElementById("usernameMsg");
  uForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideMsg(uMsg);
    try {
      const newU = await changeUsername(CURRENT_PROFILE.uid, CURRENT_PROFILE.username, document.getElementById("newUsername").value);
      CURRENT_PROFILE.username = newU;
      document.getElementById("adminUsername").textContent = "@" + newU;
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
