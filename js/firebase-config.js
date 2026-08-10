/* ======================================================
   إعدادات Firebase
   ------------------------------------------------------
   استبدل القيم التالية بالقيم الخاصة بمشروعك في Firebase
   (Project settings → General → Your apps → SDK setup and configuration)
   راجع ملف README.md لمعرفة خطوات الحصول عليها بالتفصيل.
   ====================================================== */

const firebaseConfig = {
  apiKey: "ضع_API_KEY_هنا",
  authDomain: "ضع_PROJECT_ID_هنا.firebaseapp.com",
  projectId: "ضع_PROJECT_ID_هنا",
  storageBucket: "ضع_PROJECT_ID_هنا.appspot.com",
  messagingSenderId: "ضع_SENDER_ID_هنا",
  appId: "ضع_APP_ID_هنا"
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
