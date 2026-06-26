// ============================================================================
// LearnHub Stats Module (learnhub-stats.js)
// ----------------------------------------------------------------------------
// Module DUY NHẤT chịu trách nhiệm thao tác Firestore liên quan đến điểm số
// và hồ sơ người dùng trong hệ thống LearnHub Test. KHÔNG render giao diện,
// KHÔNG tạo HTML.
//
// filetest.html (và sau này profile.html, leaderboard.html) chỉ được gọi các
// hàm export ở đây — không tự viết doc()/getDoc()/setDoc() nữa. Các trang đó
// không cần biết Firestore hoạt động ra sao bên trong.
//
// Cách dùng:
//   import {
//     createUserStats, resetWeekIfNeeded, updateUserStats,
//     loadUserStats, loadLeaderboard
//   } from "./learnhub-stats.js";
//
//   await createUserStats(user);
//   await resetWeekIfNeeded(user.uid);
//   await updateUserStats(user.uid, score);
//
// Cấu trúc Firestore liên quan:
//   - users/{uid}            : { name, email, photo, ... }  (chỉ ĐỌC, không ghi từ module này)
//   - testStats/{uid}        : { uid, totalTests, totalScore, weekScore, bestScore, xp,
//                                weekKey, createdAt, updatedAt, lastPlayed }
//   - config/system          : { currentWeek, ... }          (chỉ ĐỌC — admin tự đổi tuần)
//   - weeklyWinners/{weekKey}: { weekKey, top: [ {uid, name, weekScore, ...}, ... ] }
//     (cấu trúc giả định cho lịch sử BXH đã "chốt" theo tuần; nếu cấu trúc thật
//      khác, chỉ cần sửa phần đọc trong loadLeaderboard(mode:"history").)
// ============================================================================

import { db } from "./firebase-config.js";
import {
  doc, getDoc, setDoc, increment, serverTimestamp,
  collection, getDocs, query, orderBy, limit
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

// ----------------------------------------------------------------------------
// Hàm nội bộ (không export): đọc config/system.currentWeek
// Không còn tự tính tuần bằng JavaScript (đã bỏ getCurrentWeekKey()).
// Tuần hiện tại luôn lấy trực tiếp từ Firestore, do admin quyết định.
// ----------------------------------------------------------------------------
async function getCurrentWeekFromConfig() {
  const configRef = doc(db, "config", "system");
  const configSnap = await getDoc(configRef);
  if (!configSnap.exists()) return null;
  return configSnap.data().currentWeek ?? null;
}

/**
 * createUserStats(user)
 * ----------------------------------------------------------------------------
 * Tạo hồ sơ testStats/{uid} nếu chưa tồn tại. Nếu đã tồn tại thì KHÔNG ghi đè,
 * chỉ đọc và trả về dữ liệu hiện có.
 * weekKey khi tạo mới lấy từ config/system.currentWeek (không tự tính tuần).
 * Thêm createdAt, updatedAt, lastPlayed bằng serverTimestamp() khi tạo mới.
 *
 * @param {object} user - { uid, email, photo, displayName }
 * @returns {Promise<object|null>} Dữ liệu testStats hiện có (sau khi đảm bảo tồn tại),
 *          hoặc null nếu thiếu uid.
 */
export async function createUserStats(user) {
  if (!user || !user.uid) return null;

  try {
    const statsRef = doc(db, "testStats", user.uid);
    const statsSnap = await getDoc(statsRef);

    if (statsSnap.exists()) {
      return statsSnap.data();
    }

    const currentWeek = await getCurrentWeekFromConfig();

    const defaultStats = {
      uid: user.uid,
      totalTests: 0,
      totalScore: 0,
      weekScore: 0,
      bestScore: 0,
      xp: 0,
      weekKey: currentWeek,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastPlayed: serverTimestamp()
    };

    await setDoc(statsRef, defaultStats);
    return defaultStats;
  } catch (e) {
    console.log("[learnhub-stats] createUserStats lỗi:", e);
    throw e;
  }
}

/**
 * resetWeekIfNeeded(uid)
 * ----------------------------------------------------------------------------
 * Kiểm tra testStats/{uid}.weekKey so với config/system.currentWeek.
 * Nếu khác nhau: weekScore = 0, weekKey = currentWeek. Các trường khác giữ nguyên.
 * Không tạo document mới, không ảnh hưởng người dùng khác.
 *
 * @param {string} uid
 * @returns {Promise<void>}
 */
export async function resetWeekIfNeeded(uid) {
  if (!uid) return;

  try {
    const currentWeek = await getCurrentWeekFromConfig();
    if (!currentWeek) return;

    const statsRef = doc(db, "testStats", uid);
    const statsSnap = await getDoc(statsRef);
    if (!statsSnap.exists()) return;

    const statsData = statsSnap.data();

    if (statsData.weekKey !== currentWeek) {
      await setDoc(statsRef, {
        weekScore: 0,
        weekKey: currentWeek,
        updatedAt: serverTimestamp()
      }, { merge: true });
    }
  } catch (e) {
    console.log("[learnhub-stats] resetWeekIfNeeded lỗi:", e);
    throw e;
  }
}

/**
 * updateUserStats(uid, score)
 * ----------------------------------------------------------------------------
 * Cập nhật testStats/{uid} sau khi người dùng hoàn thành một bài làm.
 * Nơi gọi chỉ cần truyền `score` — toàn bộ logic cộng điểm xử lý bên trong:
 *   totalTests+=1, totalScore+=score, weekScore+=score, xp+=score,
 *   bestScore=score (nếu score>bestScore), updatedAt/lastPlayed=serverTimestamp().
 * Dùng increment() cho field cộng dồn. Điểm số giữ kiểu Number (double).
 *
 * @param {string} uid
 * @param {number} score
 * @returns {Promise<boolean>} true nếu lưu thành công, false nếu lỗi.
 */
export async function updateUserStats(uid, score) {
  if (!uid) {
    console.log("[learnhub-stats] updateUserStats: thiếu uid");
    return false;
  }

  const numericScore = Number(score);
  if (Number.isNaN(numericScore)) {
    console.log("[learnhub-stats] updateUserStats: score không hợp lệ:", score);
    return false;
  }

  try {
    const statsRef = doc(db, "testStats", uid);

    const statsSnap = await getDoc(statsRef);
    const currentBest = statsSnap.exists() ? Number(statsSnap.data().bestScore || 0) : 0;

    const updatePayload = {
      totalTests: increment(1),
      totalScore: increment(numericScore),
      weekScore: increment(numericScore),
      xp: increment(numericScore),
      updatedAt: serverTimestamp(),
      lastPlayed: serverTimestamp()
    };

    if (numericScore > currentBest) {
      updatePayload.bestScore = numericScore;
    }

    await setDoc(statsRef, updatePayload, { merge: true });
    return true;
  } catch (e) {
    console.log("[learnhub-stats] updateUserStats lỗi:", e);
    return false;
  }
}

/**
 * loadUserStats(uid, fallbackUser)
 * ----------------------------------------------------------------------------
 * Đọc thông tin hồ sơ người dùng, gộp users/{uid} (nguồn chính, chỉ đọc) và
 * testStats/{uid} (điểm số). fallbackUser chỉ dùng khi field không có trong users/{uid}.
 *
 * @param {string} uid
 * @param {object} [fallbackUser] - vd từ Firebase Auth/postMessage.
 * @returns {Promise<object|null>}
 */
export async function loadUserStats(uid, fallbackUser = null) {
  if (!uid) return null;

  try {
    const userRef = doc(db, "users", uid);
    const statsRef = doc(db, "testStats", uid);

    const [userSnap, statsSnap] = await Promise.all([
      getDoc(userRef),
      getDoc(statsRef)
    ]);

    if (!userSnap.exists() && !statsSnap.exists() && !fallbackUser) {
      return null;
    }

    const userData = userSnap.exists() ? userSnap.data() : {};
    const statsData = statsSnap.exists() ? statsSnap.data() : {};
    const fb = fallbackUser || {};

    return {
      uid,
      name: userData.name ?? userData.displayName ?? fb.displayName ?? fb.name ?? null,
      email: userData.email ?? fb.email ?? null,
      photo: userData.photo ?? fb.photoURL ?? fb.photo ?? null,
      totalTests: statsData.totalTests ?? 0,
      totalScore: statsData.totalScore ?? 0,
      weekScore: statsData.weekScore ?? 0,
      bestScore: statsData.bestScore ?? 0,
      xp: statsData.xp ?? 0,
      weekKey: statsData.weekKey ?? null
    };
  } catch (e) {
    console.log("[learnhub-stats] loadUserStats lỗi:", e);
    throw e;
  }
}

/**
 * loadLeaderboard(options)
 * ----------------------------------------------------------------------------
 * mode "current" (mặc định): đọc testStats theo thời gian thực, sort theo orderByField.
 * mode "history": đọc weeklyWinners/{weekKey} đã chốt sẵn.
 *
 * @param {object} [options]
 * @param {"current"|"history"} [options.mode="current"]
 * @param {string} [options.orderByField="weekScore"]
 * @param {number} [options.limitCount=10]
 * @param {string} [options.weekKey]
 * @returns {Promise<Array<object>>}
 */
export async function loadLeaderboard(options = {}) {
  const {
    mode = "current",
    orderByField = "weekScore",
    limitCount = 10,
    weekKey = null
  } = options;

  try {
    if (mode === "history") {
      if (!weekKey) {
        console.log("[learnhub-stats] loadLeaderboard(history): thiếu weekKey");
        return [];
      }

      const winnersRef = doc(db, "weeklyWinners", weekKey);
      const winnersSnap = await getDoc(winnersRef);

      if (!winnersSnap.exists()) return [];

      const winnersData = winnersSnap.data();
      return Array.isArray(winnersData.top) ? winnersData.top : [];
    }

    const statsCol = collection(db, "testStats");
    const leaderboardQuery = query(
      statsCol,
      orderBy(orderByField, "desc"),
      limit(limitCount)
    );

    const snap = await getDocs(leaderboardQuery);
    const results = [];
    snap.forEach((docSnap) => {
      results.push({ uid: docSnap.id, ...docSnap.data() });
    });

    return results;
  } catch (e) {
    console.log("[learnhub-stats] loadLeaderboard lỗi:", e);
    throw e;
  }
}
