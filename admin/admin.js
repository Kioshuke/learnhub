// admin/admin.js

import {
  collection,
  onSnapshot,
  doc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import { db } from "./firebase.js";

/*
=====================================
LOGIN RIÊNG CHO ADMIN
=====================================
*/

const adminPassword = "Admin@123";

const inputPass = prompt("Nhập mật khẩu Admin:");

if (inputPass !== adminPassword) {
  alert("Sai mật khẩu Admin!");
  window.location.href = "/";
} else {
  renderUsers();
}

/*
=====================================
RENDER USER TABLE
=====================================
*/

const userList = document.getElementById("userList");
const totalUsers = document.getElementById("totalUsers");
const onlineUsers = document.getElementById("onlineUsers");

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

      const status = user.banned
        ? "Bị khóa"
        : user.approved
        ? "Đã duyệt"
        : "Chờ duyệt";

      const tr = document.createElement("tr");

      tr.innerHTML = `
        <td>${user.displayName || "No Name"}</td>
        <td>${user.email || "Không có email"}</td>
        <td>${user.role || "member"}</td>
        <td>${status}</td>
        <td>
          <button onclick="approveUser('${uid}')">
            Duyệt
          </button>

          <button onclick="banUser('${uid}')">
            Ban
          </button>

          <button onclick="forceLogout('${uid}')">
            Logout
          </button>
        </td>
      `;

      userList.appendChild(tr);
    });

    totalUsers.textContent = total;
    onlineUsers.textContent = online;
  });
}

/*
=====================================
ADMIN ACTIONS
=====================================
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
