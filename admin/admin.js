// admin.js
// Vào /admin sẽ hiện popup đăng nhập Google luôn
// chỉ đúng email admin mới được vào

import {
  collection,
  onSnapshot,
  doc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import { db, auth } from "./firebase.js";

const userList = document.getElementById("userList");
const totalUsers = document.getElementById("totalUsers");
const onlineUsers = document.getElementById("onlineUsers");

const adminEmail = "quanhao678@gmail.com"; // email admin của bạn
const provider = new GoogleAuthProvider();

/*
========================================
AUTO LOGIN GOOGLE
========================================
*/

onAuthStateChanged(auth, async (user) => {
  // chưa login -> tự bật popup login Google
  if (!user) {
    try {
      await signInWithPopup(auth, provider);
      return;
    } catch (error) {
      console.error(error);
      alert("Đăng nhập thất bại!");
      window.location.href = "/";
      return;
    }
  }

  console.log("Email hiện tại:", user.email);

  // kiểm tra quyền admin
  if (user.email !== adminEmail) {
    alert("Bạn không có quyền truy cập Admin Dashboard!");
    await signOut(auth);
    window.location.href = "/";
    return;
  }

  // đúng admin -> vào dashboard
  renderUsers();
});

/*
========================================
REALTIME USER LIST
========================================
*/

function renderUsers() {
  onSnapshot(collection(db, "users"), (snapshot) => {
    userList.innerHTML = "";

    let total = 0;
    let online = 0;

    snapshot.forEach((docSnap) => {
      total++;

      const user = docSnap.data();
      const uid = docSnap.id;

      if (user.online) online++;

      const div = document.createElement("div");
      div.className = "user-card";

      div.innerHTML = `
        <h3>${user.displayName || "No Name"}</h3>
        <p>Email: ${user.email || "Không có email"}</p>
        <p>Role: ${user.role || "member"}</p>
        <p>
          Trạng thái:
          ${
            user.banned
              ? "Bị khóa"
              : user.approved
              ? "Đã duyệt"
              : "Chờ duyệt"
          }
        </p>

        <div class="actions">
          <button class="approve" onclick="approveUser('${uid}')">
            Duyệt
          </button>

          <button class="ban" onclick="banUser('${uid}')">
            Ban
          </button>

          <button class="logout" onclick="forceLogout('${uid}')">
            Logout
          </button>
        </div>
      `;

      userList.appendChild(div);
    });

    totalUsers.textContent = total;
    onlineUsers.textContent = online;
  });
}

/*
========================================
ADMIN ACTIONS
========================================
*/

window.approveUser = async (uid) => {
  await updateDoc(doc(db, "users", uid), {
    approved: true
  });

  alert("Đã duyệt user!");
};

window.banUser = async (uid) => {
  await updateDoc(doc(db, "users", uid), {
    banned: true
  });

  alert("Đã khóa tài khoản!");
};

window.forceLogout = async (uid) => {
  await updateDoc(doc(db, "users", uid), {
    forceLogout: true
  });

  alert("Đã yêu cầu logout!");
};
