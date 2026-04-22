// admin.js

import {
  collection,
  onSnapshot,
  doc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import { db, auth } from "./firebase.js";

const userList = document.getElementById("userList");
const totalUsers = document.getElementById("totalUsers");
const onlineUsers = document.getElementById("onlineUsers");

/*
==================================================
CHECK ADMIN LOGIN
==================================================
*/

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    alert("Bạn chưa đăng nhập!");
    window.location.href = "/";
    return;
  }

  // Tạm thời check email admin
  // Sau này sẽ đổi sang role/custom claims
  const adminEmail = "youradmin@gmail.com";

  if (user.email !== adminEmail) {
    alert("Bạn không có quyền truy cập Admin Dashboard!");
    await signOut(auth);
    window.location.href = "/";
    return;
  }

  renderUsers();
});

/*
==================================================
REALTIME USER LIST
==================================================
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

      if (user.online) {
        online++;
      }

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
==================================================
ADMIN ACTIONS
==================================================
*/

window.approveUser = async (uid) => {
  try {
    await updateDoc(doc(db, "users", uid), {
      approved: true
    });

    alert("Đã duyệt user!");
  } catch (error) {
    console.error(error);
    alert("Lỗi khi duyệt user");
  }
};

window.banUser = async (uid) => {
  try {
    await updateDoc(doc(db, "users", uid), {
      banned: true
    });

    alert("Đã khóa tài khoản!");
  } catch (error) {
    console.error(error);
    alert("Lỗi khi ban user");
  }
};

window.forceLogout = async (uid) => {
  try {
    await updateDoc(doc(db, "users", uid), {
      forceLogout: true
    });

    alert("Đã yêu cầu logout!");
  } catch (error) {
    console.error(error);
    alert("Lỗi khi force logout");
  }
};
