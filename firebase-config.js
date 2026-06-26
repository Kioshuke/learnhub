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
  messagingSenderId: "922115936320",
  appId: "1:922115936320:web:67b86c06af9149ff584fa5"
};

// Không khởi tạo Firebase lần thứ hai trong cùng 1 context.
export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
