/* ======================================================
   لوحة تحكم المدير
   ====================================================== */

let CURRENT_PROFILE = null;
let ELEMENTS_CACHE = [];
let TEACHERS_CACHE = [];
let ALL_EVIDENCES = [];

/* العناصر الرسمية الـ11 (نموذج تقييم أداء المعلم — داخل نطاق المدرسة)
   لكل عنصر أساسي "شواهد تحقيق العنصر" تُنشأ كعناصر فرعية يرفع عليها المعلم شواهده */
const DEFAULT_ELEMENTS = [
  { title: "أداء الواجبات الوظيفية", weight: 10, order: 1,
    subs: ["المشاركة في الفعاليات الوطنية", "تعزيز قيم المواطنة لدى الطلاب", "التعاون مع المؤسسات الحكومية"] },
  { title: "التفاعل مع المجتمع المهني", weight: 10, order: 2,
    subs: ["المشاركة الفاعلة في مجتمعات التعلم المهنية", "تبادل الزيارات", "حضور الدورات والورش التدريبية"] },
  { title: "التفاعل مع أولياء الأمور", weight: 10, order: 3,
    subs: ["التواصل الفعّال مع أولياء الأمور", "تزويدهم بمستويات الطلبة", "تفعيل الخطة الأسبوعية للتواصل"] },
  { title: "التنويع في استراتيجيات التدريس", weight: 10, order: 4,
    subs: ["استخدام استراتيجيات متنوعة تناسب مستويات الطلبة", "مراعاة الفروق الفردية"] },
  { title: "تحسين نتائج المتعلمين", weight: 10, order: 5,
    subs: ["معالجة الفاقد التعليمي", "وضع الخطط العلاجية", "وضع خطط الإثراء للمتميزين"] },
  { title: "إعداد وتنفيذ خطة التعلم", weight: 10, order: 6,
    subs: ["توزيع المنهج", "إعداد الدروس والواجبات والاختبارات", "تنفيذ الدروس"] },
  { title: "توظيف تقنيات ووسائل التعلم المناسبة", weight: 10, order: 7,
    subs: ["دمج التقنية في التعليم", "التنويع في الوسائل التعليمية"] },
  { title: "تهيئة بيئة تعليمية", weight: 5, order: 8,
    subs: ["مراعاة حاجات الطلبة النفسية", "التهيئة والتحفيز المادي والمعنوي"] },
  { title: "الإدارة الصفية", weight: 5, order: 9,
    subs: ["ضبط سلوك الطلبة", "متابعة الحضور والغياب والتأخر"] },
  { title: "تحليل نتائج المتعلمين وتشخيص مستوياتهم", weight: 10, order: 10,
    subs: ["تحليل نتائج الاختبارات الفترية والنهائية", "تصنيف الطلبة وفق نتائجهم"] },
  { title: "تنوع أساليب التقويم", weight: 10, order: 11,
    subs: ["تطبيق الاختبارات الورقية والإلكترونية", "المشاريع والمهام الأدائية"] },
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
/* مساعدات التسلسل الهرمي: عنصر أساسي (بدون parentId) وتحته عناصر فرعية */
function mainElements() {
  return ELEMENTS_CACHE.filter((e) => !e.parentId);
}
function childrenOf(parentId) {
  return ELEMENTS_CACHE.filter((e) => e.parentId === parentId);
}
/* العناصر التي يرفع عليها المعلم شواهده فعلياً:
   الفرعية إن وُجدت، وإلا العنصر الأساسي نفسه */
function leavesOf(mainEl) {
  const kids = childrenOf(mainEl.id);
  return kids.length ? kids : [mainEl];
}
function allLeaves() {
  return mainElements().flatMap(leavesOf);
}

function setupElementForm() {
  const form = document.getElementById("elementForm");
  const msg = document.getElementById("elementMsg");
  const cancelBtn = document.getElementById("elementCancelBtn");
  const parentSel = document.getElementById("eParent");
  const weightField = document.getElementById("eWeightField");

  // إخفاء حقل الوزن عند اختيار عنصر فرعي (الوزن يكون على العنصر الأساسي فقط)
  parentSel.addEventListener("change", () => {
    weightField.style.display = parentSel.value ? "none" : "";
  });

  cancelBtn.addEventListener("click", () => {
    form.reset();
    document.getElementById("eId").value = "";
    weightField.style.display = "";
    document.getElementById("elementFormTitle").textContent = "إضافة عنصر جديد";
    document.getElementById("elementBtn").textContent = "حفظ العنصر";
    cancelBtn.style.display = "none";
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideMsg(msg);
    const id = document.getElementById("eId").value;
    const title = document.getElementById("eTitle").value.trim();
    const parentId = parentSel.value || null;
    const weight = parentId ? 0 : Number(document.getElementById("eWeight").value);
    const examples = document.getElementById("eExamples").value.trim();

    if (!title) return;
    if (!parentId && !weight) {
      showMsg(msg, "الرجاء إدخال الوزن النسبي للعنصر الأساسي.", "error");
      return;
    }

    try {
      if (id) {
        await db.collection("elements").doc(id).update({ title, weight, examples, parentId });
        showMsg(msg, "تم تحديث العنصر بنجاح.", "success");
      } else {
        const order = parentId
          ? childrenOf(parentId).length + 1
          : mainElements().length + 1;
        await db.collection("elements").add({ title, weight, examples, parentId, order, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
        showMsg(msg, parentId ? "تمت إضافة العنصر الفرعي بنجاح." : "تمت إضافة العنصر الأساسي بنجاح.", "success");
      }
      form.reset();
      document.getElementById("eId").value = "";
      weightField.style.display = "";
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
  // تجاهل العناصر الأساسية الموجودة مسبقاً بنفس الاسم حتى لا تتكرر
  const existingTitles = new Set(mainElements().map((e) => (e.title || "").trim()));
  const toAdd = DEFAULT_ELEMENTS.filter((el) => !existingTitles.has(el.title));

  if (!toAdd.length) {
    alert("جميع العناصر الرسمية مضافة مسبقاً.");
    return;
  }

  const totalSubs = toAdd.reduce((s, el) => s + el.subs.length, 0);
  const skipped = DEFAULT_ELEMENTS.length - toAdd.length;

  confirmAction(
    "استيراد العناصر الرسمية",
    `سيتم إضافة ${toAdd.length} عنصراً أساسياً وفق نموذج وزارة التعليم، مع ${totalSubs} شاهد تحقيق كعناصر فرعية تحتها.` +
      (skipped ? ` (تم تجاهل ${skipped} عنصراً موجوداً مسبقاً.)` : "") +
      ` لن يتم حذف أي عناصر موجودة حالياً. هل تريد المتابعة؟`,
    async () => {
      const batch = db.batch();
      const stamp = firebase.firestore.FieldValue.serverTimestamp();

      toAdd.forEach((el) => {
        const mainRef = db.collection("elements").doc();
        batch.set(mainRef, {
          title: el.title,
          weight: el.weight,
          order: el.order,
          examples: "",
          parentId: null,
          createdAt: stamp,
        });

        el.subs.forEach((subTitle, i) => {
          const subRef = db.collection("elements").doc();
          batch.set(subRef, {
            title: subTitle,
            weight: 0,
            order: i + 1,
            examples: "",
            parentId: mainRef.id,
            createdAt: stamp,
          });
        });
      });

      try {
        await batch.commit();
        await loadElements();
        alert(`تمت الإضافة بنجاح ✅\nأُضيف ${toAdd.length} عنصراً أساسياً و${totalSubs} عنصراً فرعياً.`);
      } catch (err) {
        console.error(err);
        alert("تعذّر استيراد العناصر:\n" + (err.message || err));
      }
    },
    "استيراد"
  );
}

async function loadElements() {
  const wrap = document.getElementById("elementsTableWrap");
  const snap = await db.collection("elements").orderBy("order", "asc").get();
  ELEMENTS_CACHE = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

  const mains = mainElements();
  document.getElementById("statElements").textContent = mains.length;
  const sum = mains.reduce((s, e) => s + (Number(e.weight) || 0), 0);
  document.getElementById("weightSum").textContent = sum;

  // تحديث قائمة "نوع العنصر" بالعناصر الأساسية المتاحة
  const parentSel = document.getElementById("eParent");
  if (parentSel) {
    const cur = parentSel.value;
    parentSel.innerHTML =
      `<option value="">عنصر أساسي (رئيسي)</option>` +
      (mains.length
        ? mains.map((m) => `<option value="${m.id}">↳ عنصر فرعي تحت: ${escapeHtml(m.title)}</option>`).join("")
        : `<option value="" disabled>— لا توجد عناصر أساسية بعد، اضغط "استيراد العناصر الرسمية" أولاً —</option>`);
    parentSel.value = cur;
  }

  if (!mains.length) {
    wrap.innerHTML = `<div class="empty-state"><div class="icon">🗂️</div>لا توجد عناصر مضافة بعد. استخدم زر "استيراد العناصر الرسمية" أو أضف عنصراً يدوياً.</div>`;
  } else {
    wrap.innerHTML = `
      <table>
        <thead><tr><th>#</th><th>العنصر</th><th>الوزن</th><th></th></tr></thead>
        <tbody>
          ${mains.map((el, i) => {
            const kids = childrenOf(el.id);
            return `
            <tr>
              <td>${i + 1}</td>
              <td><strong>${escapeHtml(el.title)}</strong>
                ${kids.length ? `<br><small style="color:var(--text-3)">${kids.length} عنصر فرعي</small>` : ""}
              </td>
              <td><span class="tag-weight">${el.weight}%</span></td>
              <td>
                <div class="row-actions">
                  <button class="btn btn-ghost btn-sm" data-addsub="${el.id}">+ فرعي</button>
                  <button class="btn btn-ghost btn-sm" data-edit="${el.id}">تعديل</button>
                  <button class="btn btn-danger btn-sm" data-del="${el.id}">حذف</button>
                </div>
              </td>
            </tr>
            ${kids.map((k, j) => `
            <tr>
              <td style="color:var(--text-3)">${i + 1}.${j + 1}</td>
              <td style="padding-inline-start:28px; color:var(--text-2)">↳ ${escapeHtml(k.title)}</td>
              <td><span style="color:var(--text-3); font-size:12px">—</span></td>
              <td>
                <div class="row-actions">
                  <button class="btn btn-ghost btn-sm" data-edit="${k.id}">تعديل</button>
                  <button class="btn btn-danger btn-sm" data-del="${k.id}">حذف</button>
                </div>
              </td>
            </tr>`).join("")}`;
          }).join("")}
        </tbody>
      </table>`;

    wrap.querySelectorAll("[data-edit]").forEach((btn) =>
      btn.addEventListener("click", () => editElement(btn.dataset.edit))
    );
    wrap.querySelectorAll("[data-del]").forEach((btn) =>
      btn.addEventListener("click", () => deleteElement(btn.dataset.del))
    );
    wrap.querySelectorAll("[data-addsub]").forEach((btn) =>
      btn.addEventListener("click", () => {
        document.getElementById("eId").value = "";
        document.getElementById("eParent").value = btn.dataset.addsub;
        document.getElementById("eWeightField").style.display = "none";
        document.getElementById("eTitle").value = "";
        document.getElementById("elementFormTitle").textContent = "إضافة عنصر فرعي";
        document.getElementById("elementBtn").textContent = "حفظ العنصر الفرعي";
        window.scrollTo({ top: 0, behavior: "smooth" });
        document.getElementById("eTitle").focus();
      })
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
  document.getElementById("eWeight").value = el.weight || "";
  document.getElementById("eExamples").value = el.examples || "";
  document.getElementById("eParent").value = el.parentId || "";
  document.getElementById("eWeightField").style.display = el.parentId ? "none" : "";
  document.getElementById("elementFormTitle").textContent = el.parentId ? "تعديل عنصر فرعي" : "تعديل عنصر أساسي";
  document.getElementById("elementBtn").textContent = "حفظ التعديلات";
  document.getElementById("elementCancelBtn").style.display = "inline-flex";
  document.querySelector('[data-section="elements"]').scrollIntoView?.();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function deleteElement(id) {
  const el = ELEMENTS_CACHE.find((e) => e.id === id);
  const kids = childrenOf(id);
  const extra = kids.length
    ? ` وسيتم أيضاً حذف ${kids.length} عنصر فرعي تحته وجميع شواهدها`
    : "";
  confirmAction(
    "حذف عنصر التقييم",
    `سيتم حذف عنصر "${el?.title || ""}" وجميع الشواهد المرتبطة به لدى جميع المعلمين${extra}. هل أنت متأكد؟`,
    async () => {
      const idsToDelete = [id, ...kids.map((k) => k.id)];
      const batch = db.batch();
      for (const delId of idsToDelete) {
        const evSnap = await db.collection("evidences").where("elementId", "==", delId).get();
        evSnap.docs.forEach((d) => batch.delete(d.ref));
        batch.delete(db.collection("elements").doc(delId));
      }
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
        name, username, password, role: "teacher", contactEmail: email || null,
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
      <thead><tr><th>الاسم</th><th>اسم المستخدم</th><th>كلمة المرور</th><th>نسبة الإنجاز</th><th></th></tr></thead>
      <tbody>
        ${list.map((t) => {
          const pct = weightedPct(t.completedIds);
          const hasNote = t.adminNote && t.adminNote.trim();
          return `
          <tr>
            <td>${escapeHtml(t.name)} ${hasNote ? '<span title="يوجد ملاحظة" style="color:var(--accent-gold)">📝</span>' : ""}</td>
            <td>@${escapeHtml(t.username)}</td>
            <td>${t.password
              ? `<span class="pw-cell">
                   <code class="pw-value" data-pw="${escapeHtml(t.password)}" data-visible="0">••••••••</code>
                   <button type="button" class="btn-eye" data-toggle-pw title="إظهار/إخفاء كلمة المرور">👁️</button>
                 </span>`
              : '<span style="color:var(--text-3)">—</span>'}</td>
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
  wrap.querySelectorAll("[data-toggle-pw]").forEach((btn) =>
    btn.addEventListener("click", () => {
      const code = btn.previousElementSibling;
      const visible = code.dataset.visible === "1";
      code.textContent = visible ? "••••••••" : code.dataset.pw;
      code.dataset.visible = visible ? "0" : "1";
      btn.textContent = visible ? "👁️" : "🙈";
    })
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
  const mains = mainElements();
  if (!mains.length) return 0;
  const totalWeight = mains.reduce((s, e) => s + (Number(e.weight) || 0), 0) || 100;
  // كل عنصر أساسي يُحتسب بنسبة ما أُنجز من عناصره الفرعية
  const doneWeight = mains.reduce((s, m) => {
    const leaves = leavesOf(m);
    const done = leaves.filter((l) => completedIds.has(l.id)).length;
    return s + (Number(m.weight) || 0) * (done / leaves.length);
  }, 0);
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
            <td>${t.completedCount} / ${allLeaves().length}</td>
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
      let title = el ? el.title : "عنصر محذوف";
      // إظهار المسار الكامل: العنصر الأساسي ← العنصر الفرعي
      if (el && el.parentId) {
        const parent = ELEMENTS_CACHE.find((x) => x.id === el.parentId);
        if (parent) title = `${parent.title} ← ${el.title}`;
      }
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
