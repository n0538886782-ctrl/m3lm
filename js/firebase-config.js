/* ======================================================
   إعدادات Firebase
   ------------------------------------------------------
   استبدل القيم التالية بالقيم الخاصة بمشروعك في Firebase
   (Project settings → General → Your apps → SDK setup and configuration)
   راجع ملف README.md لمعرفة خطوات الحصول عليها بالتفصيل.
   ====================================================== */

const firebaseConfig = {
  apiKey: "AIzaSyArYalXVXZ0WBWyp_Ac10LR0ONaDg5Cqz0",
  authDomain: "m3lm-f7452.firebaseapp.com",
  projectId: "m3lm-f7452",
  storageBucket: "m3lm-f7452.firebasestorage.app",
  messagingSenderId: "388423628695",
  appId: "1:388423628695:web:b5706fb0c9873bf5aeb6d2"
};

// نطاق البريد الداخلي المستخدم لتحويل "اسم المستخدم" إلى بريد إلكتروني
// يفهمه Firebase Authentication (لا داعي لتغييره)
const AUTH_EMAIL_DOMAIN = "teacher-eval.local";

// تطبيق Firebase الرئيسي (تسجيل الدخول الحالي)
firebase.initializeApp(firebaseConfig);

// تطبيق ثانوي منعزل يُستخدم فقط عند إنشاء المدير لحسابات معلمين جدد،
// حتى لا يفقد المدير جلسة دخوله الحالية أثناء إنشاء الحساب
const secondaryApp = firebase.initializeApp(firebaseConfig, "SecondaryApp");

const auth = firebase.auth();
const secondaryAuth = secondaryApp.auth();
const db = firebase.firestore();
const storage = firebase.storage();
