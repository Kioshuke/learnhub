// ============================================================================
// firebase-config.js
// ----------------------------------------------------------------------------
// File DUY NHẤT chịu trách nhiệm khởi tạo Firebase cho toàn bộ hệ thống LearnHub.
// Chỉ làm 3 việc: initializeApp() / getFirestore() / getAuth().
// KHÔNG chứa logic nghiệp vụ, KHÔNG render UI, KHÔNG thao tác Firestore khác
// ngoài việc khởi tạo.
//
// Tất cả file khác (index.html, filetest.html, learnhub-stats.js, ...) PHẢI
// import app/db/auth từ đây — không được copy firebaseConfig riêng nữa.
//
// Cách dùng:
//   import { app, db, auth } from "./firebase-config.js";
//
// An toàn khởi tạo trùng:
//   Dùng getApps()/getApp() nên dù file này được import ở nhiều nơi (index.html,
//   filetest.html bên trong iframe, learnhub-stats.js...), Firebase chỉ thực sự
//   initializeApp() đúng 1 lần cho mỗi context JS (mỗi document/iframe là 1 context
//   riêng của trình duyệt, nên iframe filetest.html và trang index.html vẫn có
//   instance riêng của mình — đây là hành vi đúng và không đổi so với trước).
// ============================================================================

import { initializeApp, getApps, getApp } 
  from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import { getAuth }
  from "https://www.gstatic.com/firebasejs/12.10.0/firebase-auth.js";
import { getFirestore }
  from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCOelxKPrcSeiLpYN2WwYPWysHwZjZLd9c",
  authDomain: "onthi12-thpttanhong.firebaseapp.com",
  projectId: "onthi12-thpttanhong",
  storageBucket: "onthi12-thpttanhong.firebasestorage.app",
  messagingSenderId: "109867981504",
  appId: "1:109867981504:web:e116346b0efcfb140cd55f",
  measurementId: "G-6EX7SBMF1K"
};

// Khởi tạo App an toàn
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const auth = getAuth(app);

// ⚠️ KHÔNG gọi setPersistence() ở đây nữa.
// File này được import ở NHIỀU nơi: index.html (trang chính) và filetest.html
// (chạy trong iframe, bị tạo mới mỗi lần mở bài trắc nghiệm). Mỗi lần
// setPersistence() chạy, nó ghi vào localStorage — và việc ghi đó kích hoạt
// sự kiện "storage" mà Auth instance của trang index.html đang lắng nghe,
// khiến onAuthStateChanged() của trang chính bị fire lại như thể vừa
// đăng nhập lần nữa (=> bug "tự signin lại" khi mở quiz mới).
// index.html đã tự gọi setPersistence() một lần cho riêng nó (xem script
// chính của trang), nên ở đây không cần và không nên gọi lại.

export { app, db, auth };
