// ============================================================================
// export-firestore.js
// ----------------------------------------------------------------------------
// Xuất toàn bộ dữ liệu LearnHub từ Firebase (Firestore + Realtime Database)
// ra các file JSON trong thư mục ./export để import-supabase.js sử dụng.
//
// Cách chạy:
//   npm install
//   node export-firestore.js
// ============================================================================

import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getDatabase } from "firebase-admin/database";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, "export");

const FIREBASE_DB_URL =
  "https://onthi12-thpttanhong-default-rtdb.asia-southeast1.firebasedatabase.app/";

function getCredentialPath() {
  const raw = process.env.GOOGLE_APPLICATION_CREDENTIALS || "";
  const resolved = path.resolve(__dirname, raw);
  if (!fs.existsSync(resolved)) {
    console.error("KHÔNG TÌM THẤY service account tại:", resolved);
    console.error("Vui lòng tạo file .env (xem .env.example) và đặt service account JSON vào đó.");
    process.exit(1);
  }
  return resolved;
}

function writeJson(fileName, rows) {
  fs.writeFileSync(
    path.join(OUT_DIR, fileName),
    JSON.stringify(rows, null, 2),
    "utf8"
  );
  console.log(`  -> ${fileName}: ${rows.length} dòng`);
}

async function dumpCollection(db, name) {
  const snap = await db.collection(name).get();
  const rows = [];
  snap.forEach((d) => rows.push({ id: d.id, data: d.data() }));
  return rows;
}

async function dumpDoc(db, collectionName, docId) {
  const snap = await db.collection(collectionName).doc(docId).get();
  if (!snap.exists) return [];
  return [{ id: docId, data: snap.data() }];
}

async function dumpNode(ref, name) {
  const snap = await ref.once("value");
  const val = snap.val() || {};
  const rows = Object.entries(val).map(([id, data]) => ({ id, data }));
  return rows;
}

async function main() {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  const serviceAccount = JSON.parse(fs.readFileSync(getCredentialPath(), "utf8"));

  initializeApp({
    credential: cert(serviceAccount),
    databaseURL: FIREBASE_DB_URL
  });

  const db = getFirestore();
  const rtdb = getDatabase();

  console.log("=== BẮT ĐẦU EXPORT ===");

  const users = await dumpCollection(db, "users");
  writeJson("users.json", users);

  const accessList = await dumpCollection(db, "accessList");
  writeJson("accessList.json", accessList);

  const testStats = await dumpCollection(db, "testStats");
  writeJson("testStats.json", testStats);

  const maintenance = await dumpDoc(db, "settings", "maintenance");
  writeJson("settings-maintenance.json", maintenance);

  const weeklyReset = await dumpDoc(db, "settings", "weeklyReset");
  writeJson("settings-weeklyReset.json", weeklyReset);

  const broadcastCurrent = await dumpDoc(db, "broadcasts", "current");
  writeJson("broadcasts-current.json", broadcastCurrent);

  const broadcastWelcome = await dumpDoc(db, "broadcasts", "welcomePopup");
  writeJson("broadcasts-welcomePopup.json", broadcastWelcome);

  const posts = await dumpNode(rtdb.ref("posts"), "posts");
  writeJson("posts.json", posts);

  const events = await dumpNode(rtdb.ref("events"), "events");
  writeJson("events.json", events);

  console.log("=== EXPORT XONG. Kiểm tra thư mục ./export ===");
}

main().catch((e) => {
  console.error("Export thất bại:", e);
  process.exit(1);
});
