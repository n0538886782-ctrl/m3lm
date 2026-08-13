/* ======================================================
   ربط Google Drive — رفع شواهد المعلم مباشرة إلى Drive الخاص به
   ====================================================== */

let driveAccessToken = null;
let driveTokenClient = null;
const DRIVE_FOLDER_NAME = "شواهد الأداء الوظيفي";

// يطلب إذن المعلم للوصول إلى ملفاته على Drive (مرة واحدة لكل جلسة تصفح)
function getDriveToken() {
  return new Promise((resolve, reject) => {
    if (driveAccessToken) {
      resolve(driveAccessToken);
      return;
    }
    if (typeof google === "undefined" || !google.accounts) {
      reject(new Error("تعذّر تحميل خدمة تسجيل الدخول من جوجل. تحقق من الإنترنت وأعد المحاولة."));
      return;
    }
    if (!driveTokenClient) {
      driveTokenClient = google.accounts.oauth2.initTokenClient({
        client_id: DRIVE_CLIENT_ID,
        scope: "https://www.googleapis.com/auth/drive.file",
        callback: () => {},
      });
    }
    driveTokenClient.callback = (resp) => {
      if (resp.error) {
        reject(new Error("تم رفض الإذن، أو حدث خطأ أثناء تسجيل الدخول بجوجل."));
        return;
      }
      driveAccessToken = resp.access_token;
      resolve(driveAccessToken);
    };
    driveTokenClient.requestAccessToken({ prompt: "" });
  });
}

// يبحث عن مجلد "شواهد الأداء الوظيفي" في Drive المعلم، وينشئه إن لم يكن موجوداً
async function ensureEvidenceFolder(token) {
  const cacheKey = "driveEvidenceFolderId";
  const cached = localStorage.getItem(cacheKey);
  if (cached) return cached;

  const q = encodeURIComponent(
    `name='${DRIVE_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`
  );
  const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const searchData = await searchRes.json();
  if (searchData.files && searchData.files.length) {
    localStorage.setItem(cacheKey, searchData.files[0].id);
    return searchData.files[0].id;
  }

  const createRes = await fetch("https://www.googleapis.com/drive/v3/files", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ name: DRIVE_FOLDER_NAME, mimeType: "application/vnd.google-apps.folder" }),
  });
  const createData = await createRes.json();
  if (createData.error) throw new Error(createData.error.message || "تعذّر إنشاء مجلد الشواهد في Drive");
  localStorage.setItem(cacheKey, createData.id);
  return createData.id;
}

// يرفع الملف إلى مجلد الشواهد في Drive المعلم عبر "الرفع القابل للاستئناف"
// (الطريقة الموثوقة الموصى بها من جوجل لأي نوع ملف وأي حجم من داخل المتصفح)
// ثم يجعله قابلاً للعرض عبر رابط، ويعيد الرابط
async function uploadFileToDrive(file) {
  const token = await getDriveToken();
  const folderId = await ensureEvidenceFolder(token);
  const metadata = { name: file.name, parents: [folderId] };

  // الخطوة 1: بدء جلسة الرفع والحصول على رابط الرفع المؤقت
  const initRes = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id,webViewLink",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json; charset=UTF-8",
        "X-Upload-Content-Type": file.type || "application/octet-stream",
      },
      body: JSON.stringify(metadata),
    }
  );
  if (!initRes.ok) {
    const errData = await initRes.json().catch(() => null);
    throw new Error(errData?.error?.message || "تعذّر بدء عملية الرفع إلى Drive");
  }
  const uploadUrl = initRes.headers.get("Location");
  if (!uploadUrl) throw new Error("تعذّر الحصول على رابط الرفع من Drive");

  // الخطوة 2: رفع محتوى الملف نفسه مباشرة (يدعم أي نوع وأي حجم بأمان)
  const putRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type || "application/octet-stream" },
    body: file,
  });
  const uploadData = await putRes.json().catch(() => null);
  if (!putRes.ok || !uploadData || uploadData.error) {
    throw new Error(uploadData?.error?.message || "فشل رفع الملف إلى Drive");
  }

  // الخطوة 3: إتاحة الملف لأي شخص يملك الرابط (حتى يستطيع المدير فتحه)
  await fetch(`https://www.googleapis.com/drive/v3/files/${uploadData.id}/permissions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ role: "reader", type: "anyone" }),
  });

  return { url: uploadData.webViewLink, fileId: uploadData.id };
}
