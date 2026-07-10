// ============================================================================
// LearnHub Stats Module (learnhub-stats.js)
// ----------------------------------------------------------------------------
// Module thao tác Firestore cho thống kê cơ bản.
// ============================================================================

import { db } from "./firebase-config.js";
import {
  doc, getDoc, setDoc, serverTimestamp,
  collection, getDocs, query, orderBy, limit
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

async function getCurrentWeekFromConfig() {
  const configRef = doc(db, "config", "system");
  const configSnap = await getDoc(configRef);
  if (!configSnap.exists()) return null;
  return configSnap.data().currentWeek ?? null;
}


export async function createUserStats(user) {
  if (!user || !user.uid) return null;

  try {
    const statsRef = doc(db, "testStats", user.uid);
    const statsSnap = await getDoc(statsRef);
    const currentWeek = await getCurrentWeekFromConfig();

    if (statsSnap.exists()) {
      const existingData = statsSnap.data();
      const isNewWeek = existingData.weekKey && currentWeek && existingData.weekKey !== currentWeek;
      
      const payload = {
        weekScore: isNewWeek ? 0 : Number(existingData.weekScore || 0),
        weeklyTests: isNewWeek ? 0 : Number(existingData.weeklyTests || 0),
        weeklyBestScore: isNewWeek ? 0 : Number(existingData.weeklyBestScore || 0),
        weekKey: currentWeek,
        updatedAt: serverTimestamp()
      };
      await setDoc(statsRef, payload, { merge: true });
      return { ...existingData, ...payload };
    }

    const defaultStats = {
      weekScore: 0,
      weeklyTests: 0,
      weeklyBestScore: 0,
      weekKey: currentWeek,
      createdAt: serverTimestamp(),
      lastPlayed: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    await setDoc(statsRef, defaultStats);
    return defaultStats;
  } catch (e) {
    console.log("[learnhub-stats] createUserStats lỗi:", e);
    throw e;
  }
}

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
        weeklyTests: 0,
        weeklyBestScore: 0,
        weekKey: currentWeek,
        updatedAt: serverTimestamp()
      }, { merge: true });
    }
  } catch (e) {
    console.log("[learnhub-stats] resetWeekIfNeeded lỗi:", e);
    throw e;
  }
}

export async function updateUserStats(uid, score) {
  if (!uid) {
    console.log("[learnhub-stats] updateUserStats: thiếu uid");
    return false;
  }

  const numericScore = Number(score);
  if (!Number.isFinite(numericScore)) {
    console.log("[learnhub-stats] updateUserStats: score không hợp lệ:", score);
    return false;
  }

  try {
    const statsRef = doc(db, "testStats", uid);
    const statsSnap = await getDoc(statsRef);
    const currentWeek = await getCurrentWeekFromConfig();
    const currentData = statsSnap.exists() ? statsSnap.data() : {};

    const isNewWeek = currentData.weekKey && currentWeek && currentData.weekKey !== currentWeek;
    
    const weekScore = isNewWeek ? numericScore : Number(currentData.weekScore || 0) + numericScore;
    const weeklyTests = isNewWeek ? 1 : Number(currentData.weeklyTests || 0) + 1;
    const weeklyBestScore = isNewWeek ? numericScore : Math.max(Number(currentData.weeklyBestScore || 0), numericScore);

    const payload = {
      weekScore,
      weeklyTests,
      weeklyBestScore,
      weekKey: currentWeek,
      lastPlayed: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    if (!statsSnap.exists()) {
      payload.createdAt = serverTimestamp();
    }

    await setDoc(statsRef, payload, { merge: true });
    return true;
  } catch (e) {
    console.log("[learnhub-stats] updateUserStats lỗi:", e);
    return false;
  }
}

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
      weekScore: statsData.weekScore ?? 0,
      weeklyTests: statsData.weeklyTests ?? 0,
      weeklyBestScore: statsData.weeklyBestScore ?? 0,
      weekKey: statsData.weekKey ?? null
    };
  } catch (e) {
    console.log("[learnhub-stats] loadUserStats lỗi:", e);
    throw e;
  }
}

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
