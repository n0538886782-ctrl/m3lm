/* ======================================================
   أدوات مشتركة
   ====================================================== */

// يحوّل اسم المستخدم إلى "بريد" داخلي يفهمه Firebase Auth
function usernameToEmail(username) {
  return `${username.trim().toLowerCase()}@${AUTH_EMAIL_DOMAIN}`;
}

function showMsg(el, text, type = "error") {
  if (!el) return;
  el.textContent = text;
  el.className = `form-msg show ${type}`;
}

function hideMsg(el) {
  if (!el) return;
  el.className = "form-msg";
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

function initials(name) {
  if (!name) return "؟";
  const parts = name.trim().split(/\s+/);
  return parts[0]?.charAt(0)?.toUpperCase() || "؟";
}

function evidenceIcon(type) {
  if (type === "image") return "🖼️";
  if (type === "video") return "🎬";
  if (type === "link") return "🔗";
  return "📄";
}

function formatDate(ts) {
  if (!ts) return "";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric" });
}

// حراسة الصفحات: يتأكد من تسجيل الدخول ومن الدور المطلوب، وإلا يعيد التوجيه
function guardPage(requiredRole, onReady) {
  auth.onAuthStateChanged(async (user) => {
    if (!user) {
      window.location.href = "index.html";
      return;
    }
    try {
      const doc = await db.collection("users").doc(user.uid).get();
      if (!doc.exists) {
        await auth.signOut();
        window.location.href = "index.html";
        return;
      }
      const profile = { uid: user.uid, ...doc.data() };
      if (requiredRole && profile.role !== requiredRole) {
        window.location.href = profile.role === "admin" ? "admin.html" : "teacher.html";
        return;
      }
      onReady(profile);
    } catch (err) {
      console.error(err);
      window.location.href = "index.html";
    }
  });
}

function logout() {
  auth.signOut().then(() => (window.location.href = "index.html"));
}

/* ---------- نافذة تأكيد عامة (تُستخدم في الحذف) ---------- */
function confirmAction(title, sub, onConfirm) {
  const overlay = document.getElementById("confirmOverlay");
  if (!overlay) return;
  document.getElementById("confirmTitle").textContent = title;
  document.getElementById("confirmSub").textContent = sub;
  overlay.classList.add("show");

  const okBtn = document.getElementById("confirmOk");
  const cancelBtn = document.getElementById("confirmCancel");

  const cleanup = () => {
    overlay.classList.remove("show");
    okBtn.replaceWith(okBtn.cloneNode(true));
    cancelBtn.replaceWith(cancelBtn.cloneNode(true));
  };

  document.getElementById("confirmOk").addEventListener("click", async () => {
    cleanup();
    await onConfirm();
  }, { once: true });

  document.getElementById("confirmCancel").addEventListener("click", cleanup, { once: true });
}

/* ---------- تغيير اسم المستخدم ---------- */
async function changeUsername(uid, oldUsername, newUsernameRaw) {
  const newUsername = newUsernameRaw.trim().toLowerCase();
  if (!/^[a-z0-9_.]{3,30}$/.test(newUsername)) {
    throw new Error("اسم المستخدم يجب أن يكون بالأحرف الإنجليزية أو أرقام (3 أحرف على الأقل) بدون مسافات.");
  }
  if (newUsername === oldUsername) {
    throw new Error("هذا هو اسم المستخدم الحالي بالفعل.");
  }
  const existing = await db.collection("usernames").doc(newUsername).get();
  if (existing.exists) {
    throw new Error("اسم المستخدم هذا مستخدم بالفعل، اختر اسماً آخر.");
  }
  const oldRef = db.collection("usernames").doc(oldUsername);
  const oldDoc = await oldRef.get();
  const role = oldDoc.exists ? oldDoc.data().role : "teacher";

  const batch = db.batch();
  batch.set(db.collection("usernames").doc(newUsername), { uid, role });
  batch.delete(oldRef);
  batch.update(db.collection("users").doc(uid), { username: newUsername });
  await batch.commit();
  return newUsername;
}

/* ---------- تغيير كلمة المرور (تتطلب إعادة التحقق) ---------- */
async function changePassword(currentPassword, newPassword) {
  if (newPassword.length < 6) {
    throw new Error("كلمة المرور الجديدة يجب ألا تقل عن 6 أحرف.");
  }
  const user = auth.currentUser;
  const cred = firebase.auth.EmailAuthProvider.credential(user.email, currentPassword);
  try {
    await user.reauthenticateWithCredential(cred);
  } catch (err) {
    throw new Error("كلمة المرور الحالية غير صحيحة.");
  }
  await user.updatePassword(newPassword);
}

// أزرار تبديل الأقسام في القوائم الجانبية للأجهزة الصغيرة (اختياري بسيط)
/* ---------- الوضع الفاتح / الداكن ---------- */
function initTheme() {
  const saved = localStorage.getItem("evalSystemTheme") || "dark";
  document.documentElement.setAttribute("data-theme", saved);
  updateThemeToggleIcon(saved);
}
function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme") === "light" ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", current);
  localStorage.setItem("evalSystemTheme", current);
  updateThemeToggleIcon(current);
}
function updateThemeToggleIcon(theme) {
  document.querySelectorAll("[data-theme-toggle]").forEach((btn) => {
    btn.innerHTML = theme === "light"
      ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg><span>الوضع الداكن</span>'
      : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="4" stroke="currentColor" stroke-width="2"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg><span>الوضع الفاتح</span>';
  });
}
initTheme();

/* ---------- تطبيق الصورة والعبارة أسفل الترويسة (إن وُجدتا) على كل الصفحات ---------- */
document.addEventListener("DOMContentLoaded", async () => {
  try {
    const doc = await db.collection("meta").doc("branding").get();
    if (!doc.exists) return;
    const data = doc.data();

    const bannerWrap = document.getElementById("siteBannerWrap");
    if (bannerWrap && data.bannerDataUrl) {
      bannerWrap.innerHTML = `<img src="${data.bannerDataUrl}" alt="صورة الموقع" />`;
    }

    const tickerWrap = document.getElementById("tickerWrap");
    if (tickerWrap) {
      if (data.tickerText && data.tickerText.trim()) {
        const text = escapeHtml(data.tickerText.trim());
        tickerWrap.innerHTML = `<span class="ticker-track">${text}&nbsp;&nbsp;•&nbsp;&nbsp;${text}&nbsp;&nbsp;•&nbsp;&nbsp;${text}</span>`;
        tickerWrap.style.display = "";
      } else {
        tickerWrap.style.display = "none";
      }
    }
  } catch (err) {
    // تجاهل بصمت إن تعذّر الجلب
  }
});

document.addEventListener("click", (e) => {
  if (e.target.closest("[data-theme-toggle]")) toggleTheme();
});

/* ---------- طباعة / تصدير تقرير أداء معلم كملف PDF عبر الطباعة ---------- */
function printTeacherReport(profile, elements, evidences) {
  const totalWeight = elements.reduce((s, e) => s + (Number(e.weight) || 0), 0) || 100;
  const completedIds = new Set(evidences.map((e) => e.elementId));
  const doneWeight = elements.filter((e) => completedIds.has(e.id)).reduce((s, e) => s + (Number(e.weight) || 0), 0);
  const pct = elements.length ? Math.round((doneWeight / totalWeight) * 100) : 0;
  const today = new Date().toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric" });

  const rows = elements.map((el) => {
    const evs = evidences.filter((e) => e.elementId === el.id);
    const links = evs.length
      ? evs.map((e) => `<div class="pr-link">• ${escapeHtml(e.note || e.url)}</div>`).join("")
      : `<span class="pr-empty">لا يوجد</span>`;
    return `
      <tr>
        <td>${escapeHtml(el.title)}</td>
        <td>${el.weight}%</td>
        <td>${evs.length ? "مكتمل ✓" : "لم يبدأ"}</td>
        <td>${links}</td>
      </tr>`;
  }).join("");

  const win = window.open("", "_blank");
  win.document.write(`
    <!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><title>تقرير أداء ${escapeHtml(profile.name)}</title>
    <style>
      body{font-family:Tajawal,Arial,sans-serif; padding:32px; color:#0c1740; direction:rtl;}
      h1{font-size:20px; margin-bottom:2px;}
      .sub{color:#555; font-size:13px; margin-bottom:18px;}
      .meta{display:flex; gap:24px; margin-bottom:20px; font-size:13px;}
      .meta b{display:block; font-size:16px;}
      table{width:100%; border-collapse:collapse; font-size:12.5px;}
      th,td{border:1px solid #ccc; padding:8px 10px; text-align:right; vertical-align:top;}
      th{background:#f0f2fa;}
      .pr-link{margin-bottom:3px;}
      .pr-empty{color:#999;}
      .header-schools{font-weight:800; font-size:14px; margin-bottom:2px;}
    </style></head><body>
      <div class="header-schools">متوسطة أبي بن كعب | ابتدائية عروة بن الزبير</div>
      <div class="sub">وزارة التعليم — المملكة العربية السعودية</div>
      <h1>تقرير أداء المعلم: ${escapeHtml(profile.name)}</h1>
      <div class="sub">اسم المستخدم: ${escapeHtml(profile.username)} — تاريخ التصدير: ${today}</div>
      <div class="meta">
        <div><b>${pct}%</b>نسبة الإنجاز الإجمالية</div>
        <div><b>${elements.filter((e) => completedIds.has(e.id)).length} / ${elements.length}</b>عناصر مكتملة</div>
      </div>
      <table>
        <thead><tr><th>عنصر الأداء الوظيفي</th><th>الوزن</th><th>الحالة</th><th>الشواهد</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </body></html>
  `);
  win.document.close();
  setTimeout(() => win.print(), 400);
}

/* ---------- الدخول بالبصمة / الوجه (قفل الجهاز) ----------
   ملاحظة أمنية مهمة: هذه الميزة تستخدم حساس البصمة/الوجه في الجهاز
   (عبر معيار WebAuthn) كـ"قفل محلي" فوق جلسة الدخول المحفوظة أصلاً
   من Firebase على هذا الجهاز تحديداً. وهي مريحة جداً وتمنع فتح
   الحساب لمن لا يملك بصمة صاحبه على هذا الجهاز بعينه، لكنها ليست
   تحققاً مشفّراً من الخادم (يتطلب ذلك خادماً خلفياً لا نملكه هنا). */

function isWebAuthnSupported() {
  return typeof PublicKeyCredential !== "undefined" && !!(navigator.credentials && navigator.credentials.create);
}

function b64urlEncode(buffer) {
  let binary = "";
  new Uint8Array(buffer).forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(str) {
  str = str.replace(/-/g, "+").replace(/_/g, "/");
  while (str.length % 4) str += "=";
  const bin = atob(str);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

function hasDeviceBiometric(uid) {
  return !!localStorage.getItem(`bioCred_${uid}`);
}

function removeDeviceBiometric(uid) {
  localStorage.removeItem(`bioCred_${uid}`);
}

async function registerDeviceBiometric(uid, displayName) {
  if (!isWebAuthnSupported()) {
    throw new Error("جهازك أو متصفحك الحالي لا يدعم الدخول بالبصمة.");
  }
  const challenge = crypto.getRandomValues(new Uint8Array(32));
  const userIdBytes = new TextEncoder().encode(uid);

  const credential = await navigator.credentials.create({
    publicKey: {
      challenge,
      rp: { name: "نظام تقييم الأداء الوظيفي" },
      user: { id: userIdBytes, name: displayName || uid, displayName: displayName || "مستخدم" },
      pubKeyCredParams: [
        { type: "public-key", alg: -7 },
        { type: "public-key", alg: -257 },
      ],
      authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required" },
      timeout: 60000,
      attestation: "none",
    },
  });
  if (!credential) throw new Error("لم تكتمل عملية التفعيل.");

  localStorage.setItem(`bioCred_${uid}`, b64urlEncode(credential.rawId));
  return true;
}

async function verifyDeviceBiometric(uid) {
  if (!isWebAuthnSupported()) return false;
  const stored = localStorage.getItem(`bioCred_${uid}`);
  if (!stored) return false;

  const challenge = crypto.getRandomValues(new Uint8Array(32));
  try {
    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge,
        allowCredentials: [{ id: b64urlDecode(stored), type: "public-key" }],
        userVerification: "required",
        timeout: 60000,
      },
    });
    return !!assertion;
  } catch (err) {
    return false;
  }
}

// يعرض قفل البصمة إن كان مفعّلاً على هذا الجهاز لهذا المستخدم، وينفّذ onUnlock عند النجاح
function guardWithBiometric(uid, onUnlock) {
  if (!hasDeviceBiometric(uid)) {
    onUnlock();
    return;
  }
  const overlay = document.getElementById("bioLockOverlay");
  if (!overlay) {
    onUnlock();
    return;
  }
  overlay.classList.add("show");

  const unlockBtn = document.getElementById("bioUnlockBtn");
  const statusEl = document.getElementById("bioLockStatus");

  const tryUnlock = async () => {
    if (statusEl) statusEl.textContent = "";
    unlockBtn.disabled = true;
    unlockBtn.textContent = "جارٍ التحقق...";
    const ok = await verifyDeviceBiometric(uid);
    unlockBtn.disabled = false;
    unlockBtn.textContent = "فتح ببصمتك";
    if (ok) {
      overlay.classList.remove("show");
      onUnlock();
    } else if (statusEl) {
      statusEl.textContent = "تعذّر التحقق من البصمة، حاول مرة أخرى.";
    }
  };

  unlockBtn.addEventListener("click", tryUnlock);
  // محاولة تلقائية أولى فور ظهور القفل
  tryUnlock();
}

document.addEventListener("click", (e) => {
  const trigger = e.target.closest("[data-logout]");
  if (trigger) logout();

  const menuBtn = e.target.closest("[data-menu-toggle]");
  if (menuBtn) {
    document.querySelector(".sidebar")?.classList.toggle("menu-open");
  }
});

// إغلاق القائمة المنسدلة تلقائياً على الجوال عند اختيار قسم
document.addEventListener("click", (e) => {
  if (e.target.closest(".nav-link[data-section]")) {
    document.querySelector(".sidebar")?.classList.remove("menu-open");
  }
});
