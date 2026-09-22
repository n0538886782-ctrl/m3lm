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
    subs: ["حصص الانتظار وتفعيلها", "المشاركة في اللجان وتفعيلها", "تفعيل حصص الانتظار", "المشاركة في الأنشطة والمناسبات الوطنية", "مبادرة للمدرسة", "تفعيل الإذاعة الصباحية", "اتباع الأساليب التربوية مع الطلاب ومراعاة المرحلة العمرية", "تفعيل منصة مدرستي"] },
  { title: "التفاعل مع المجتمع المهني", weight: 10, order: 2,
    subs: ["تنفيذ البرامج التدريبية", "حضور البرامج التدريبية والمؤتمرات", "الزيارات التبادلية", "المجتمعات المهنية", "الدروس التطبيقية والحلقات التنشيطية", "تقديم إنتاج معرفي أو تجارب عملية أو وسيلة تعليمية أو تطوير مناهج أو ساعات", "تطوع", "صورة للرخصة المهنية"] },
  { title: "التفاعل مع أولياء الأمور", weight: 10, order: 3,
    subs: ["التواصل الفعال مع أولياء الأمور", "إرسال تقارير بمستويات الطلاب", "حضور اجتماعات أولياء الأمور", "مشاركة أولياء الأمور بالعملية التعليمية", "تفعيل سجل المتابعة"] },
  { title: "التنويع في استراتيجيات التدريس", weight: 10, order: 4,
    subs: ["مهارات التفكير", "الاستراتيجيات", "استراتيجيات تنمي مهارات الفهم القرائي", "ربط الدرس بالواقع والخبرات الحياتية"] },
  { title: "تحسين نتائج المتعلمين", weight: 10, order: 5,
    subs: ["الاختبارات التشخيصية", "المهارات المفقودة", "خطة علاجية للمهارة المتدنية", "خطة إثرائية للمهارة الجيدة", "صور من ملفات إنجاز الطلاب ومتابعتها", "تصحيح الكتب / الدفاتر", "تحليل النتائج مع التقارير", "التحفيز والتكريم", "تحسين نتائج الطلاب في الاختبارات الوطنية", "نافس والتحصيل"] },
  { title: "إعداد وتنفيذ خطة التعلم", weight: 10, order: 6,
    subs: ["تسليم توزيع المنهج بالوقت المحدد", "تسليم الخطة الأسبوعية بالوقت المحدد", "تحضير الدروس بالمنصة", "خطة علاجية للمهارات المفقودة", "الخطة الإثرائية", "تنفيذ خطة النشاط في الوقت المحدد"] },
  { title: "توظيف تقنيات ووسائل التعلم المناسبة", weight: 10, order: 7,
    subs: ["تفعيل سجل مصادر التعلم", "استخدام وسائل وتقنيات مناسبة لحاجات وأنماط المتعلمين تراعي الفروق الفردية", "تنمية قدرة التأمل والملاحظة والتفكير العلمي", "تفعيل تطبيقات وبرامج الذكاء الاصطناعي", "تفعيل قنوات عين", "تفعيل الأنشطة والإثرائيات والواجبات", "الاختبارات ومنصة مدرستي"] },
  { title: "تهيئة بيئة تعليمية", weight: 5, order: 8,
    subs: ["بيئة تعليمية آمنة (صور للفصل مرتب)", "توفير بيئة تعليمية تحقق الأمان النفسي والاحترام المتبادل (تفعيل قيمة الاحترام)", "إتاحة فرصة التعبير ومشاركة أفكارهم مع أقرانهم", "إثارة الدافعية من خلال التنويع في أساليب التعلم"] },
  { title: "الإدارة الصفية", weight: 5, order: 9,
    subs: ["ضبط سلوك الطلبة", "متابعة الحضور والغياب والتأخر"] },
  { title: "تحليل نتائج المتعلمين وتشخيص مستوياتهم", weight: 10, order: 10,
    subs: ["تحليل نتائج الاختبارات الفترية والنهائية", "تصنيف الطلبة وفق نتائجهم"] },
  { title: "تنوع أساليب التقويم", weight: 10, order: 11,
    subs: ["تنوع مصادر التقويم (ملاحظات صفية - استبيانات - تقارير ذاتية - تحليل نتائج)", "تنوع أساليب التقويم (اختبارات شفهية - تحريرية - مهام أدائية)", "التغذية الراجعة", "التقويم التكويني والبنائي", "التقويم الختامي", "بناء الاختبارات الفصلية والنهائية وفق معايير الاختبار الجيد"] },
];

/* عناصر تقييم وكيل المدرسة — وفق نموذج وزارة التعليم (بدون شواهد فرعية) */
const WAKIL_ELEMENTS = [
  { title: "أداء الواجبات الوظيفية", weight: 5, order: 1 },
  { title: "التفاعل مع المجتمع المهني", weight: 5, order: 2 },
  { title: "التفاعل مع أولياء الأمور", weight: 5, order: 3 },
  { title: "مرن وقادر على تنفيذ أعماله في ظل ظروف العمل المختلفة", weight: 5, order: 4 },
  { title: "يدعم ويشارك في المبادرات النوعية", weight: 10, order: 5 },
  { title: "يتخذ إجراءات تربوية تحقق الانضباط المدرسي", weight: 5, order: 6 },
  { title: "يدير الموارد في المدرسة بكفاءة", weight: 5, order: 7 },
  { title: "يشارك في إعداد خطة للتطوير المهني", weight: 5, order: 8 },
  { title: "يقدم التغذية الراجعة ويتابع تحقق مؤشرات الأداء الوظيفي", weight: 5, order: 9 },
  { title: "يدعم تنفيذ برامج التطوير المهني", weight: 5, order: 10 },
  { title: "يقيم أداء منسوبي المدرسة", weight: 5, order: 11 },
  { title: "ينفذ إجراءات علمية لتحسين نتائج التعلم", weight: 15, order: 12 },
  { title: "يسهم في تحسين مستوى أداء المدرسة", weight: 5, order: 13 },
  { title: "يشارك في إعداد الخطط المدرسية اللازمة", weight: 5, order: 14 },
  { title: "يتابع تنفيذ الخطط المدرسية بمختلف أنواعها", weight: 5, order: 15 },
  { title: "يُرئ الفرص والإمكانات الداعمة لمشاركة الطلاب في الأنشطة الصفية وغير الصفية", weight: 5, order: 16 },
  { title: "يوظف المنصات الرقمية وتطبيقاتها المعتمدة في دعم عمليات التعليم والتعلم", weight: 5, order: 17 },
  { title: "يتابع تعزيز السلوك الإيجابي للطلاب", weight: 5, order: 18 },
  { title: "يُرئ بيئة مدرسية آمنة ومحفزة على التعلم", weight: 5, order: 19 },
];

/* عناصر تقييم الموجّه الطلابي — الأوزان موزّعة بالتساوي (10% لكل عنصر) بانتظار
   الجدول الرسمي بالأوزان الدقيقة؛ يمكن تعديلها لاحقاً من لوحة التحكم */
const MOWAJEH_ELEMENTS = [
  { title: "يقدم التدخلات المناسبة لتعزيز الانضباط", weight: 10, order: 1,
    examples: "تقديم برامج وممارسات داعمة للانضباط المدرسي." },
  { title: "تقديم برامج تربوية لتعزيز دافعية الطلبة للتعلم", weight: 10, order: 2,
    examples: "تقديم برامج نوعية لتنمية مهارات واتجاهات الطلبة نحو التعلم وفق خصائص النمو لكل مرحلة." },
  { title: "إعداد خطة لبرامج التوجيه الطلابي", weight: 10, order: 3,
    examples: "تصميم خطة للبرامج مكتملة العناصر ومبنية على معلومات وتحليل لواقع العمل الفعلي." },
  { title: "يصنف الحالات ويقدم برامج الدعم المناسبة", weight: 10, order: 4,
    examples: "تقديم برامج نوعية بناءً على تصنيف حالات الطلبة، والبرامج المناسبة لكل فئة." },
  { title: "يعزز القيم والسلوكيات للمتعلمين", weight: 10, order: 5,
    examples: "تزويد الطلبة ومنسوبي المدرسة بالقيم والسلوكيات الإيجابية، والعمل على تعزيزها." },
  { title: "يقدم التدخلات النفسية والاجتماعية", weight: 10, order: 6,
    examples: "استخدام استراتيجيات فعالة للوقاية والحد من المشكلات النفسية والاجتماعية للطلبة (المقابلة، دراسة الحالة، التوجيه الجمعي، التحويل للجهات ذات العلاقة)." },
  { title: "يساعد المتعلمين على التخطيط المهني والتعليمي", weight: 10, order: 7,
    examples: "تنفيذ برامج التوجيه المهني وتطبيق مقاييس الميول لاكتشاف قدرات الطلبة وتوجيههم للتخصصات المناسبة." },
  { title: "يعزز التفوق الدراسي", weight: 10, order: 8,
    examples: "تقديم برامج نوعية بناء على تحليل نتائج الطلبة؛ لتعزيز المتفوقين وتحفيز التفوق لدى بقية الطلبة." },
  { title: "يقدم تدخلات تربوية للمتأخرين دراسياً والمعيدين", weight: 10, order: 9,
    examples: "تقديم برامج مناسبة بناء على تحليل نتائج الطلاب؛ للرفع من مستوى التحصيل الدراسي." },
  { title: "توعية المتعلمين وأولياء أمورهم بقواعد السلوك والمواظبة", weight: 10, order: 10,
    examples: "نشر قواعد السلوك والمواظبة في المجتمع المدرسي والمحلي." },
];

/* خريطة العناصر الرسمية لكل دور وظيفي، تُستخدم في الاستيراد.
   "رائد نشاط" لا توجد له عناصر رسمية بعد — يُضاف يدوياً من لوحة التحكم عند توفر النموذج. */
const ELEMENTS_BY_JOBTYPE = {
  teacher: DEFAULT_ELEMENTS,
  wakil: WAKIL_ELEMENTS,
  mowajeh_talabi: MOWAJEH_ELEMENTS,
  nashat: [],
};

/* الدور المعروض حالياً في تبويب "عناصر التقييم" بلوحة التحكم */
let ELEMENTS_VIEW_JOBTYPE = "teacher";

document.addEventListener("DOMContentLoaded", () => {
  guardPage("admin", (profile) => {
    CURRENT_PROFILE = profile;
    document.getElementById("adminAvatar").textContent = initials(profile.name);
    document.getElementById("adminName").textContent = profile.name || "المدير";
    document.getElementById("adminUsername").textContent = "@" + profile.username;

    guardWithBiometric(profile.uid, () => {
      setupNav();
      setupTeacherForm();
      setupBulkImport();
      setupElementForm();
      setupAccountForms();
      setupBannerAndTicker();
      setupListToolbar();
      setupBiometricToggle(profile);
      setupRoleTabs();
      document.getElementById("seedBtn").addEventListener("click", () => seedElementsFor(ELEMENTS_VIEW_JOBTYPE));
      document.getElementById("updateSubsBtn").addEventListener("click", updateTeacherSubs);

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
/* مساعدات التسلسل الهرمي: عنصر أساسي (بدون parentId) وتحته عناصر فرعية.
   jobType اختياري: إن مُرِّر، يُقتصر على عناصر ذلك الدور الوظيفي فقط
   (وإلا فتُعاد كل العناصر الأساسية من كل الأدوار). */
function mainElements(jobType) {
  return ELEMENTS_CACHE.filter(
    (e) => !e.parentId && (!jobType || (e.jobType || "teacher") === jobType)
  );
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
function allLeaves(jobType) {
  return mainElements(jobType).flatMap(leavesOf);
}

/* ---------------- تبويبات الدور الوظيفي في قسم عناصر التقييم ---------------- */
function setupRoleTabs() {
  const tabs = document.querySelectorAll("[data-role-tab]");
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      ELEMENTS_VIEW_JOBTYPE = tab.dataset.roleTab;
      document.getElementById("seedBtn").textContent =
        `استيراد عناصر ${jobTypeLabel(ELEMENTS_VIEW_JOBTYPE)} الرسمية`;
      document.getElementById("updateSubsBtn").style.display = ELEMENTS_VIEW_JOBTYPE === "teacher" ? "" : "none";
      loadElements();
    });
  });
  const initial = document.querySelector("[data-role-tab].active");
  if (initial) {
    document.getElementById("seedBtn").textContent = `استيراد عناصر ${jobTypeLabel(initial.dataset.roleTab)} الرسمية`;
    document.getElementById("updateSubsBtn").style.display = initial.dataset.roleTab === "teacher" ? "" : "none";
  }
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
        const jobType = parentId
          ? (ELEMENTS_CACHE.find((e) => e.id === parentId)?.jobType || "teacher")
          : ELEMENTS_VIEW_JOBTYPE;
        const order = parentId
          ? childrenOf(parentId).length + 1
          : mainElements(jobType).length + 1;
        await db.collection("elements").add({ title, weight, examples, parentId, jobType, order, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
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

/* تحديث الشواهد الفرعية (العناصر الفرعية) لعناصر المعلم الموجودة فعلياً في قاعدة
   البيانات لتطابق DEFAULT_ELEMENTS الحالية — يُستخدم عند تحديث النموذج الرسمي بعد
   استيراده مسبقاً. يحذف الفرعية القديمة تحت كل عنصر أساسي للمعلم ويستبدلها بالجديدة. */
async function updateTeacherSubs() {
  const mains = mainElements("teacher");
  if (!mains.length) {
    alert("لا توجد عناصر معلم أساسية بعد — استخدمي زر الاستيراد أولاً.");
    return;
  }
  const totalOldSubs = mains.reduce((s, m) => s + childrenOf(m.id).length, 0);
  const totalNewSubs = DEFAULT_ELEMENTS.reduce((s, e) => s + (e.subs ? e.subs.length : 0), 0);

  confirmAction(
    "تحديث العناصر الفرعية للمعلم",
    `سيتم حذف كل العناصر الفرعية الحالية تحت عناصر المعلم الأساسية (${totalOldSubs} عنصراً فرعياً) واستبدالها بـ ${totalNewSubs} عنصراً فرعياً جديداً وفق آخر نموذج رسمي.\n\n` +
      `⚠️ تنبيه مهم: أي شواهد رفعها المعلمون سابقاً تحت العناصر الفرعية القديمة ستبقى محفوظة في قاعدة البيانات لكنها لن تظهر مرتبطة بأي عنصر ظاهر بعد الآن (لأن العنصر الفرعي القديم سيُحذف). ` +
      `هل تريدين المتابعة؟`,
    async () => {
      try {
        const batch = db.batch();
        const stamp = firebase.firestore.FieldValue.serverTimestamp();

        mains.forEach((m) => {
          const def = DEFAULT_ELEMENTS.find((d) => d.title === m.title);
          if (!def) return; // عنصر أساسي أضافته الإدارة يدوياً ولا يطابق أي عنصر رسمي — يُترك كما هو
          childrenOf(m.id).forEach((child) => batch.delete(db.collection("elements").doc(child.id)));
          (def.subs || []).forEach((subTitle, i) => {
            const subRef = db.collection("elements").doc();
            batch.set(subRef, {
              title: subTitle, weight: 0, order: i + 1,
              examples: "", parentId: m.id, jobType: "teacher", createdAt: stamp,
            });
          });
        });

        await batch.commit();
        await loadElements();
        alert("تم تحديث العناصر الفرعية للمعلم بنجاح ✅");
      } catch (err) {
        console.error(err);
        alert("تعذّر التحديث:\n" + (err.message || err));
      }
    },
    "تحديث"
  );
}

async function seedElementsFor(jobType) {
  const source = ELEMENTS_BY_JOBTYPE[jobType] || [];
  const label = jobTypeLabel(jobType);

  if (!source.length) {
    alert(`لا توجد عناصر رسمية جاهزة لدور "${label}" بعد.\nيمكنك إضافتها يدوياً من نموذج "إضافة عنصر جديد" أعلاه.`);
    return;
  }

  // تجاهل العناصر الأساسية الموجودة مسبقاً بنفس الاسم لنفس الدور حتى لا تتكرر
  const existingTitles = new Set(mainElements(jobType).map((e) => (e.title || "").trim()));
  const toAdd = source.filter((el) => !existingTitles.has(el.title));

  if (!toAdd.length) {
    alert(`جميع عناصر ${label} الرسمية مضافة مسبقاً.`);
    return;
  }

  const totalSubs = toAdd.reduce((s, el) => s + (el.subs ? el.subs.length : 0), 0);
  const skipped = source.length - toAdd.length;
  const sum = source.reduce((s, e) => s + (Number(e.weight) || 0), 0);

  confirmAction(
    `استيراد عناصر ${label} الرسمية`,
    `سيتم إضافة ${toAdd.length} عنصراً أساسياً وفق نموذج وزارة التعليم لدور "${label}"` +
      (totalSubs ? `، مع ${totalSubs} شاهد تحقيق كعناصر فرعية تحتها` : "") + `.` +
      (skipped ? ` (تم تجاهل ${skipped} عنصراً موجوداً مسبقاً.)` : "") +
      (sum !== 100 ? ` تنبيه: مجموع الأوزان في النموذج المصدر ${sum}% (يمكنك تعديل الأوزان لاحقاً من هذه الشاشة).` : "") +
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
          examples: el.examples || "",
          parentId: null,
          jobType,
          createdAt: stamp,
        });

        (el.subs || []).forEach((subTitle, i) => {
          const subRef = db.collection("elements").doc();
          batch.set(subRef, {
            title: subTitle,
            weight: 0,
            order: i + 1,
            examples: "",
            parentId: mainRef.id,
            jobType,
            createdAt: stamp,
          });
        });
      });

      try {
        await batch.commit();
        await loadElements();
        alert(`تمت الإضافة بنجاح ✅\nأُضيف ${toAdd.length} عنصراً أساسياً${totalSubs ? ` و${totalSubs} عنصراً فرعياً` : ""} لدور ${label}.`);
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

  const mains = mainElements(ELEMENTS_VIEW_JOBTYPE);
  document.getElementById("statElements").textContent = mainElements().length;
  const sum = mains.reduce((s, e) => s + (Number(e.weight) || 0), 0);
  document.getElementById("weightSum").textContent = sum;

  // تحديث قائمة "نوع العنصر" بالعناصر الأساسية المتاحة (ضمن الدور المعروض حالياً فقط)
  const parentSel = document.getElementById("eParent");
  if (parentSel) {
    const cur = parentSel.value;
    parentSel.innerHTML =
      `<option value="">عنصر أساسي (رئيسي) — ${escapeHtml(jobTypeLabel(ELEMENTS_VIEW_JOBTYPE))}</option>` +
      (mains.length
        ? mains.map((m) => `<option value="${m.id}">↳ عنصر فرعي تحت: ${escapeHtml(m.title)}</option>`).join("")
        : `<option value="" disabled>— لا توجد عناصر أساسية بعد لهذا الدور —</option>`);
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
    const jobType = document.getElementById("tJobType").value || "teacher";

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
        name, username, password, role: "teacher", jobType, contactEmail: email || null,
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

/* ---------------- استيراد عدة معلمين من ملف Excel ---------------- */
function setupBulkImport() {
  const downloadBtn = document.getElementById("downloadTemplateBtn");
  const fileInput = document.getElementById("importFile");
  const importBtn = document.getElementById("importBtn");
  const msg = document.getElementById("importMsg");
  const results = document.getElementById("importResults");
  if (!importBtn) return;

  downloadBtn?.addEventListener("click", () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ["الاسم", "اسم المستخدم", "كلمة المرور", "الدور الوظيفي"],
      ["مثال: عبدالله سالم", "abdullah.salem", "", "معلم"],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "معلمون");
    XLSX.writeFile(wb, "نموذج_استيراد_معلمين.xlsx");
  });

  // مطابقة نص عمود "الدور الوظيفي" (عربي بأي صياغة) إلى قيمة jobType داخلية
  const matchJobType = (text) => {
    const t = (text || "").trim();
    if (!t) return "teacher";
    if (t.includes("وكيل")) return "wakil";
    if (t.includes("موجّه") || t.includes("موجه")) return "mowajeh_talabi";
    if (t.includes("نشاط") || t.includes("رائد")) return "nashat";
    return "teacher";
  };

  importBtn.addEventListener("click", async () => {
    hideMsg(msg);
    results.innerHTML = "";
    const file = fileInput.files[0];
    if (!file) { showMsg(msg, "الرجاء اختيار ملف أولاً.", "error"); return; }

    importBtn.disabled = true;
    importBtn.textContent = "جارٍ القراءة...";

    let rows;
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
    } catch (err) {
      console.error(err);
      showMsg(msg, "تعذّر قراءة الملف، تأكد أنه بصيغة Excel صحيحة.", "error");
      importBtn.disabled = false;
      importBtn.textContent = "استيراد المعلمين";
      return;
    }

    // مطابقة أسماء الأعمدة بمرونة (عربي/إنجليزي، بمسافات أو بدونها)
    const pick = (row, keys) => {
      for (const k of Object.keys(row)) {
        const norm = k.trim().toLowerCase();
        if (keys.some((x) => norm.includes(x))) return String(row[k]).trim();
      }
      return "";
    };

    const entries = rows
      .map((row) => ({
        name: pick(row, ["الاسم", "name"]),
        username: pick(row, ["اسم المستخدم", "username"]).toLowerCase(),
        password: pick(row, ["كلمة المرور", "password"]),
        jobType: matchJobType(pick(row, ["الدور الوظيفي", "الدور", "jobtype", "role"])),
      }))
      .filter((e) => e.name || e.username);

    if (!entries.length) {
      showMsg(msg, "لم يتم العثور على أي صفوف صالحة في الملف.", "error");
      importBtn.disabled = false;
      importBtn.textContent = "استيراد المعلمين";
      return;
    }

    importBtn.textContent = `جارٍ الاستيراد (0/${entries.length})...`;
    const outcomes = [];

    for (let i = 0; i < entries.length; i++) {
      const { name, username, jobType } = entries[i];
      let password = entries[i].password;
      importBtn.textContent = `جارٍ الاستيراد (${i + 1}/${entries.length})...`;

      if (!name || !username) {
        outcomes.push({ name: name || "(بدون اسم)", ok: false, reason: "الاسم أو اسم المستخدم فارغ" });
        continue;
      }
      if (!/^[a-z0-9_.]{3,30}$/.test(username)) {
        outcomes.push({ name, ok: false, reason: "اسم المستخدم يجب أن يكون إنجليزي/أرقام فقط" });
        continue;
      }
      if (!password) password = Math.random().toString(36).slice(-8);
      if (password.length < 6) password = password.padEnd(6, "0");

      try {
        const existing = await db.collection("usernames").doc(username).get();
        if (existing.exists) throw new Error("اسم المستخدم مستخدم بالفعل");

        const internalEmail = usernameToEmail(username);
        const cred = await secondaryAuth.createUserWithEmailAndPassword(internalEmail, password);
        const uid = cred.user.uid;
        await secondaryAuth.signOut();

        const batch = db.batch();
        batch.set(db.collection("users").doc(uid), {
          name, username, password, role: "teacher", jobType,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
        batch.set(db.collection("usernames").doc(username), { uid, role: "teacher" });
        await batch.commit();

        outcomes.push({ name, username, password, ok: true });
      } catch (err) {
        console.error(err);
        let reason = err.message || "خطأ غير متوقع";
        if (err.code === "auth/email-already-in-use") reason = "اسم المستخدم مستخدم بالفعل";
        if (err.code === "auth/weak-password") reason = "كلمة المرور ضعيفة";
        outcomes.push({ name, ok: false, reason });
      }
    }

    const okCount = outcomes.filter((o) => o.ok).length;
    const failCount = outcomes.length - okCount;
    showMsg(msg, `تم استيراد ${okCount} معلماً بنجاح${failCount ? `، وفشل ${failCount}` : ""}.`, failCount ? "error" : "success");

    results.innerHTML = `
      <table>
        <thead><tr><th>الاسم</th><th>اسم المستخدم</th><th>كلمة المرور</th><th>الحالة</th></tr></thead>
        <tbody>
          ${outcomes.map((o) => `
            <tr>
              <td>${escapeHtml(o.name)}</td>
              <td>${o.ok ? "@" + escapeHtml(o.username) : "—"}</td>
              <td>${o.ok ? `<code>${escapeHtml(o.password)}</code>` : "—"}</td>
              <td>${o.ok ? '<span class="status-pill status-approved">تم ✅</span>' : `<span class="status-pill status-needs-review">${escapeHtml(o.reason)}</span>`}</td>
            </tr>`).join("")}
        </tbody>
      </table>`;

    fileInput.value = "";
    importBtn.disabled = false;
    importBtn.textContent = "استيراد المعلمين";
    if (okCount) loadTeachersAndProgress();
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
  renderWeakestElements();
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
    if (sortBy === "pct-desc") return weightedPct(b.completedIds, b.jobType) - weightedPct(a.completedIds, a.jobType);
    if (sortBy === "pct-asc") return weightedPct(a.completedIds, a.jobType) - weightedPct(b.completedIds, b.jobType);
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
      <thead><tr><th>الاسم</th><th>الدور</th><th>اسم المستخدم</th><th>كلمة المرور</th><th>نسبة الإنجاز</th><th></th></tr></thead>
      <tbody>
        ${list.map((t) => {
          const pct = weightedPct(t.completedIds, t.jobType);
          const hasNote = t.adminNote && t.adminNote.trim();
          const jt = t.jobType || "teacher";
          return `
          <tr>
            <td>${escapeHtml(t.name)} ${hasNote ? '<span title="يوجد ملاحظة" style="color:var(--accent-gold)">📝</span>' : ""}</td>
            <td><span class="pill ${jt}">${escapeHtml(jobTypeLabel(jt))}</span></td>
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
  const sorted = [...TEACHERS_CACHE].sort((a, b) => weightedPct(b.completedIds, b.jobType) - weightedPct(a.completedIds, a.jobType));
  wrap.innerHTML = sorted.map((t) => {
    const pct = weightedPct(t.completedIds, t.jobType);
    return `
      <div class="chart-bar-row">
        <div class="chart-bar-label">${escapeHtml(t.name)}</div>
        <div class="chart-bar-track"><div class="chart-bar-fill" style="width:${pct}%"></div></div>
        <div class="chart-bar-pct">${pct}%</div>
      </div>`;
  }).join("");
}

/* ---------------- العناصر الأقل إنجازاً عبر جميع المعلمين ---------------- */
function renderWeakestElements() {
  const wrap = document.getElementById("weakestElementsWrap");
  const mains = mainElements();
  if (!mains.length || !TEACHERS_CACHE.length) {
    wrap.innerHTML = `<div class="empty-state"><div class="icon">🔻</div>لا توجد بيانات كافية بعد.</div>`;
    return;
  }
  const rolesPresent = new Set(TEACHERS_CACHE.map((t) => t.jobType || "teacher")).size > 1;

  const stats = mains.map((m) => {
    const jt = m.jobType || "teacher";
    const relevantTeachers = TEACHERS_CACHE.filter((t) => (t.jobType || "teacher") === jt);
    if (!relevantTeachers.length) return null;
    const leaves = leavesOf(m);
    const pcts = relevantTeachers.map((t) => {
      const done = leaves.filter((l) => t.completedIds.has(l.id)).length;
      return (done / leaves.length) * 100;
    });
    const avg = Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length);
    const title = rolesPresent ? `${jobTypeLabel(jt)} — ${m.title}` : m.title;
    return { title, avg };
  }).filter(Boolean).sort((a, b) => a.avg - b.avg);

  if (!stats.length) {
    wrap.innerHTML = `<div class="empty-state"><div class="icon">🔻</div>لا توجد بيانات كافية بعد.</div>`;
    return;
  }

  wrap.innerHTML = stats.map((s) => `
    <div class="chart-bar-row">
      <div class="chart-bar-label">${escapeHtml(s.title)}</div>
      <div class="chart-bar-track"><div class="chart-bar-fill" style="width:${s.avg}%; ${s.avg < 40 ? "background:var(--accent-danger, #e05252)" : ""}"></div></div>
      <div class="chart-bar-pct">${s.avg}%</div>
    </div>`).join("");
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

function weightedPct(completedIds, jobType) {
  const mains = mainElements(jobType || "teacher");
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
  const pcts = TEACHERS_CACHE.map((t) => weightedPct(t.completedIds, t.jobType));
  const avg = Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length);
  document.getElementById("statAvg").textContent = avg + "%";

  wrap.innerHTML = `
    <table>
      <thead><tr><th>المعلم</th><th>العناصر المكتملة</th><th>نسبة الإنجاز الموزونة</th></tr></thead>
      <tbody>
        ${TEACHERS_CACHE.map((t) => {
          const pct = weightedPct(t.completedIds, t.jobType);
          return `
          <tr>
            <td>${escapeHtml(t.name)}</td>
            <td>${t.completedCount} / ${allLeaves(t.jobType).length}</td>
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
                  <span>${formatDate(ev.createdAt)} ${REVIEW_BADGE[ev.status] || REVIEW_BADGE.pending}</span>
                </div>
                <div class="row-actions">
                  <button class="btn btn-ghost btn-sm" data-review="approved" data-ev="${ev.id}" title="قبول الشاهد">✅ قبول</button>
                  <button class="btn btn-ghost btn-sm" data-review="needs_review" data-ev="${ev.id}" title="طلب تعديل">✏️ يحتاج تعديل</button>
                </div>
              </div>`).join("")}
          </div>
        </div>`;
    }).join("");
  }

  overlay.classList.add("show");

  body.querySelectorAll("[data-review]").forEach((btn) =>
    btn.addEventListener("click", () => setEvidenceStatus(btn.dataset.ev, btn.dataset.review, EVIDENCE_MODAL_TEACHER))
  );
}

const REVIEW_BADGE = {
  pending: '<span class="status-pill status-pending">قيد المراجعة</span>',
  approved: '<span class="status-pill status-approved">✅ مقبول</span>',
  needs_review: '<span class="status-pill status-needs-review">✏️ يحتاج تعديل</span>',
};

async function setEvidenceStatus(evidenceId, status, teacher) {
  try {
    await db.collection("evidences").doc(evidenceId).update({
      status,
      reviewedAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
    toast(status === "approved" ? "تم قبول الشاهد ✅" : "تم إرسال طلب التعديل للمعلم");
    const evIdx = ALL_EVIDENCES.findIndex((e) => e.id === evidenceId);
    if (evIdx > -1) { ALL_EVIDENCES[evIdx].status = status; ALL_EVIDENCES[evIdx].reviewedAt = { toMillis: () => Date.now() }; }
    if (teacher) showTeacherEvidences(teacher.uid, teacher.name);
  } catch (err) {
    console.error(err);
    toast("تعذّر تحديث حالة الشاهد", true);
  }
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
