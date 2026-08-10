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

    setupNav();
    setupAccountForms();
    await loadAll();
  });
});

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

async function loadAll() {
  const [elSnap, evSnap] = await Promise.all([
    db.collection("elements").orderBy("order", "asc").get(),
    db.collection("evidences").where("teacherUid", "==", PROFILE.uid).get(),
  ]);
  ELEMENTS = elSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  EVIDENCES = evSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

  renderProgress();
  renderElements();
}

/* ---------------- شريط ودائرة التقدّم (العنصر المميز) ---------------- */
function renderProgress() {
  const totalWeight = ELEMENTS.reduce((s, e) => s + (Number(e.weight) || 0), 0) || 100;
  const completedIds = new Set(EVIDENCES.map((e) => e.elementId));
  const doneWeight = ELEMENTS.filter((e) => completedIds.has(e.id)).reduce((s, e) => s + (Number(e.weight) || 0), 0);
  const pct = ELEMENTS.length ? Math.round((doneWeight / totalWeight) * 100) : 0;

  document.getElementById("ringPct").textContent = pct + "%";
  document.getElementById("mainBar").style.width = pct + "%";
  document.getElementById("doneCount").textContent = ELEMENTS.filter((e) => completedIds.has(e.id)).length;
  document.getElementById("totalCount").textContent = ELEMENTS.length;

  const offset = RING_CIRCUMFERENCE - (pct / 100) * RING_CIRCUMFERENCE;
  const ring = document.getElementById("ringFill");
  requestAnimationFrame(() => { ring.style.strokeDashoffset = offset; });

  const segWrap = document.getElementById("segments");
  segWrap.innerHTML = ELEMENTS.map((e) => `<div class="seg ${completedIds.has(e.id) ? "done" : ""}"></div>`).join("");
}

/* ---------------- بطاقات العناصر ---------------- */
function renderElements() {
  const wrap = document.getElementById("elementsWrap");
  if (!ELEMENTS.length) {
    wrap.innerHTML = `<div class="panel"><div class="empty-state"><div class="icon">🗂️</div>لم يقم مدير النظام بإضافة عناصر التقييم بعد.</div></div>`;
    return;
  }

  wrap.innerHTML = `<div class="panel" style="padding:10px 10px"><div style="display:flex; flex-direction:column; gap:10px" id="cardsList"></div></div>`;
  const list = document.getElementById("cardsList");

  ELEMENTS.forEach((el, idx) => {
    const evs = EVIDENCES.filter((e) => e.elementId === el.id);
    const card = document.createElement("div");
    card.className = "element-card";
    card.innerHTML = `
      <div class="element-head" data-toggle>
        <div class="element-head-left">
          <div class="element-num ${evs.length ? "done" : ""}">${evs.length ? "✓" : idx + 1}</div>
          <div class="element-titles">
            <strong>${escapeHtml(el.title)}</strong>
            <small>${evs.length} ${evs.length === 1 ? "شاهد مضاف" : "شواهد مضافة"}</small>
          </div>
        </div>
        <div style="display:flex; align-items:center; gap:10px">
          <span class="element-badge">${el.weight}%</span>
          <svg class="chevron" width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </div>
      </div>
      <div class="element-body">
        ${el.examples ? `<div class="element-examples">💡 أمثلة على تحقيق العنصر: ${escapeHtml(el.examples)}</div>` : ""}
        <div class="evidence-list" data-list>
          ${evs.length ? evs.map((ev) => `
            <div class="evidence-item">
              <div class="evidence-icon">${evidenceIcon(ev.type)}</div>
              <div class="evidence-info">
                <a href="${escapeHtml(ev.url)}" target="_blank" rel="noopener">${escapeHtml(ev.note || ev.fileName || ev.url)}</a>
                <span>${formatDate(ev.createdAt)}</span>
              </div>
              <button class="btn btn-danger btn-sm" data-del-evidence="${ev.id}">حذف</button>
            </div>`).join("") : `<div class="evidence-empty">لم تُضِف أي شاهد لهذا العنصر بعد</div>`}
        </div>

        <form class="evidence-form" data-form>
          <div class="field" data-field-url style="flex:2">
            <label>رابط الشاهد (من Google Drive أو أي تخزين سحابي)</label>
            <input type="url" placeholder="https://drive.google.com/..." data-url required />
          </div>
          <div class="field">
            <label>وصف مختصر (اختياري)</label>
            <input type="text" placeholder="مثال: شهادة حضور دورة" data-note />
          </div>
          <button type="submit" class="btn btn-primary btn-sm" style="align-self:flex-end">إضافة</button>
        </form>
      </div>
    `;
    list.appendChild(card);

    // فتح/طي البطاقة
    card.querySelector("[data-toggle]").addEventListener("click", () => card.classList.toggle("open"));

    // إضافة شاهد
    card.querySelector("[data-form]").addEventListener("submit", (e) => handleAddEvidence(e, el, card));

    // حذف شاهد
    card.querySelectorAll("[data-del-evidence]").forEach((btn) =>
      btn.addEventListener("click", () => handleDeleteEvidence(btn.dataset.delEvidence, el))
    );
  });
}

async function handleAddEvidence(e, el, card) {
  e.preventDefault();
  const form = e.target;
  const submitBtn = form.querySelector("button[type=submit]");
  const note = form.querySelector("[data-note]").value.trim();
  const urlInput = form.querySelector("[data-url]");

  submitBtn.disabled = true;
  submitBtn.textContent = "جارٍ الإضافة...";

  try {
    const url = urlInput.value.trim();
    if (!url) throw new Error("أدخل رابطاً صحيحاً");

    await db.collection("evidences").add({
      teacherUid: PROFILE.uid,
      teacherUsername: PROFILE.username,
      elementId: el.id,
      type: "link", url, fileName: null, note,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });

    await loadAll();
    // إعادة فتح نفس البطاقة بعد إعادة الرسم
    const cards = document.querySelectorAll(".element-card");
    const idx = ELEMENTS.findIndex((x) => x.id === el.id);
    if (cards[idx]) cards[idx].classList.add("open");
  } catch (err) {
    console.error(err);
    alert(err.message || "حدث خطأ أثناء إضافة الشاهد");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "إضافة";
  }
}

function handleDeleteEvidence(evidenceId, el) {
  confirmAction("حذف الشاهد", "هل أنت متأكد من حذف هذا الشاهد؟ لا يمكن التراجع عن هذا الإجراء.", async () => {
    try {
      await db.collection("evidences").doc(evidenceId).delete();
      await loadAll();
      const cards = document.querySelectorAll(".element-card");
      const idx = ELEMENTS.findIndex((x) => x.id === el.id);
      if (cards[idx]) cards[idx].classList.add("open");
    } catch (err) {
      console.error(err);
      alert("تعذّر حذف الشاهد");
    }
  });
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
