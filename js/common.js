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
