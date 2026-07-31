// ============================================================================
// import-supabase.js
// ----------------------------------------------------------------------------
// Import dữ liệu từ ./export (đã xuất bởi export-firestore.js) vào Supabase.
// Dùng SECRET KEY nên đi qua RLS. Không đưa secret key này vào code web.
//
// Cách chạy:
//   npm install
//   node import-supabase.js          # import bình thường (upsert)
//   node import-supabase.js --fresh  # xóa sạch bảng trước rồi import lại
// ============================================================================

import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EXPORT_DIR = path.join(__dirname, "export");
const BATCH = 500;

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;

if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
  console.error("Thiếu SUPABASE_URL hoặc SUPABASE_SECRET_KEY. Kiểm tra file .env (xem .env.example).");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
  auth: { persistSession: false }
});

const FRESH = process.argv.includes("--fresh");

function readJson(file) {
  const p = path.join(EXPORT_DIR, file);
  if (!fs.existsSync(p)) return [];
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function ts(v) {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "object" && v && typeof v._seconds === "number") {
    const ms = v._seconds * 1000 + (v._nanoseconds || 0) / 1e6;
    return new Date(ms).toISOString();
  }
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

async function upsert(table, rows, onConflict) {
  if (!rows.length) return rows.length;
  let done = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH);
    const { error } = await supabase.from(table).upsert(chunk, { onConflict });
    if (error) throw new Error(`[${table}] upsert lỗi: ${error.message}`);
    done += chunk.length;
  }
  return done;
}

async function insertReturning(table, rows, select) {
  const all = [];
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH);
    const { data, error } = await supabase.from(table).insert(chunk).select(select);
    if (error) throw new Error(`[${table}] insert lỗi: ${error.message}`);
    all.push(...(data || []));
  }
  return all;
}

async function clearTable(table) {
  const { error } = await supabase.from(table).delete().not("id", "is", null);
  if (error) throw new Error(`[${table}] xóa lỗi: ${error.message}`);
}

async function countTable(table) {
  const { count, error } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true });
  if (error) return `LỖI: ${error.message}`;
  return count;
}

// ------------------- MAPPING -------------------

function mapUser(doc) {
  const d = doc.data || {};
  const email = String(d.email || "").trim().toLowerCase();
  return {
    id: doc.id,
    email,
    name: d.name ?? d.displayName ?? null,
    photo: d.photo ?? d.photoURL ?? null,
    role: d.role || "Thành viên",
    bio: d.bio ?? null,
    phone: d.phone ?? null,
    birthdate: d.birthdate ?? null,
    gender: d.gender ?? null,
    school: d.school ?? null,
    disabled: Boolean(d.disabled),
    online: false,
    last_active: num(d.lastActive),
    last_login: ts(d.lastLogin),
    online_start_time: 0,
    online_timer: num(d.onlinetimer) ?? 0,
    created_at: ts(d.createdAt),
    updated_at: ts(d.updatedAt)
  };
}

function mapAccess(doc) {
  const d = doc.data || {};
  return {
    email: String(d.email || doc.id || "").trim().toLowerCase(),
    enabled: d.enabled !== false,
    source: d.source ?? null,
    added_at: ts(d.addedAt),
    updated_at: ts(d.updatedAt)
  };
}

function mapTestStats(doc) {
  const d = doc.data || {};
  return {
    user_id: doc.id,
    total_tests: num(d.totalTests) ?? 0,
    total_score: num(d.totalScore) ?? 0,
    best_score: num(d.bestScore) ?? 0,
    week_key: d.weekKey ?? null,
    created_at: ts(d.createdAt),
    last_played: ts(d.lastPlayed),
    updated_at: ts(d.updatedAt)
  };
}

function mapMaintenance(rows) {
  const d = rows[0]?.data || {};
  return [{
    id: true,
    enabled: Boolean(d.enabled),
    message: String(d.message || ""),
    updated_at: ts(d.updatedAt),
    updated_by: d.updatedBy ?? null
  }];
}

function mapWeeklyReset(rows) {
  const d = rows[0]?.data || {};
  return [{
    id: true,
    last_reset_at: ts(d.lastResetAt),
    last_reset_by: d.lastResetBy ?? null,
    reset_count: num(d.resetCount) ?? 0,
    users_reset: num(d.usersReset),
    reset_targets: d.resetTargets ?? null
  }];
}

function mapBroadcastCurrent(rows) {
  const d = rows[0]?.data || {};
  return [{
    id: true,
    broadcast_id: d.id ?? null,
    title: d.title ?? null,
    message: d.message ?? null,
    type: d.type ?? null,
    duration_ms: num(d.durationMs),
    target_mode: d.targetMode ?? null,
    target_email: d.targetEmail ?? null,
    active: Boolean(d.active),
    sender: d.sender ?? null,
    updated_at: ts(d.updatedAt)
  }];
}

function mapBroadcastWelcome(rows) {
  const d = rows[0]?.data || {};
  return [{
    id: true,
    title: d.title ?? null,
    message: d.message ?? null,
    active: Boolean(d.active),
    show_mode: d.showMode ?? null,
    updated_at: ts(d.updatedAt),
    updated_by: d.updatedBy ?? null
  }];
}

function mapWeeklyWinners(docs) {
  return docs.map((doc) => {
    const d = doc.data || {};
    let top = Array.isArray(d.top) ? d.top : [];
    if (!top.length && (d.top1 || d.top2 || d.top3)) {
      top = [
        { rank: 1, name: d.top1 },
        { rank: 2, name: d.top2 },
        { rank: 3, name: d.top3 }
      ].filter((x) => x.name);
    }
    return {
      week_key: doc.id,
      top,
      updated_at: ts(d.updatedAt)
    };
  });
}

function mapPost(doc) {
  const d = doc.data || {};
  return {
    legacy_id: doc.id,
    user_id: d.uid ?? null,
    user_name: d.user ?? null,
    role: d.role ?? "member",
    text: String(d.text || ""),
    parent_id: null,
    time: num(d.time),
    pinned: Boolean(d.pinned),
    pin_time: num(d.pinTime),
    is_edited: Boolean(d.isEdited),
    edit_time: num(d.editTime),
    reactions: d.reactions ?? {},
    likes: d.likes ?? {},
    dislikes: d.dislikes ?? {}
  };
}

function mapEvent(doc) {
  const d = doc.data || {};
  return {
    type: d.type ?? null,
    reaction_type: d.reactionType ?? null,
    time: num(d.time)
  };
}

// ------------------- MAIN -------------------

async function main() {
  const users = readJson("users.json");
  const accessList = readJson("accessList.json");
  const testStats = readJson("testStats.json");
  const weeklyWinners = readJson("weeklyWinners.json");
  const maintenance = readJson("settings-maintenance.json");
  const weeklyReset = readJson("settings-weeklyReset.json");
  const broadcastCurrent = readJson("broadcasts-current.json");
  const broadcastWelcome = readJson("broadcasts-welcomePopup.json");
  const posts = readJson("posts.json");
  const events = readJson("events.json");

  console.log(`Đọc dữ liệu: users=${users.length} accessList=${accessList.length} testStats=${testStats.length} winners=${weeklyWinners.length} posts=${posts.length} events=${events.length}`);

  if (FRESH) {
    console.log("=== --fresh: XÓA SẠCH dữ liệu cũ trong các bảng ===");
    for (const t of [
      "forum_posts", "forum_events", "test_stats", "weekly_winners",
      "broadcast_welcome", "broadcast_current", "maintenance_settings",
      "weekly_reset", "access_list", "users", "legacy_uid_map"
    ]) {
      await clearTable(t);
      console.log(`  Đã xóa: ${t}`);
    }
  }

  console.log("=== IMPORT ===");

  const userRows = users.map(mapUser);
  await upsert("users", userRows, "id");
  console.log(`  users: ${userRows.length}`);

  const accessRows = accessList.map(mapAccess);
  await upsert("access_list", accessRows, "email");
  console.log(`  access_list: ${accessRows.length}`);

  const statsRows = testStats.map(mapTestStats);
  await upsert("test_stats", statsRows, "user_id");
  console.log(`  test_stats: ${statsRows.length}`);

  await upsert("maintenance_settings", mapMaintenance(maintenance), "id");
  console.log("  maintenance_settings: 1");

  await upsert("weekly_reset", mapWeeklyReset(weeklyReset), "id");
  console.log("  weekly_reset: 1");

  await upsert("broadcast_current", mapBroadcastCurrent(broadcastCurrent), "id");
  console.log("  broadcast_current: 1");

  await upsert("broadcast_welcome", mapBroadcastWelcome(broadcastWelcome), "id");
  console.log("  broadcast_welcome: 1");

  const winnerRows = mapWeeklyWinners(weeklyWinners);
  await upsert("weekly_winners", winnerRows, "week_key");
  console.log(`  weekly_winners: ${winnerRows.length}`);

  const postRows = posts.map(mapPost);
  const insertedPosts = await insertReturning("forum_posts", postRows, "id, legacy_id");
  const legacyToId = new Map(insertedPosts.map((r) => [r.legacy_id, r.id]));
  console.log(`  forum_posts: ${insertedPosts.length}`);

  const parentUpdates = [];
  for (const doc of posts) {
    const pid = doc.data?.parentId;
    const newId = legacyToId.get(doc.id);
    if (pid && legacyToId.has(pid) && newId) {
      parentUpdates.push({ id: newId, parent_id: legacyToId.get(pid) });
    }
  }
  for (let i = 0; i < parentUpdates.length; i += BATCH) {
    const chunk = parentUpdates.slice(i, i + BATCH);
    for (const row of chunk) {
      const { error } = await supabase.from("forum_posts").update({ parent_id: row.parent_id }).eq("id", row.id);
      if (error) throw new Error(`[forum_posts] cập nhật parent lỗi: ${error.message}`);
    }
  }
  console.log(`  forum_posts parent remap: ${parentUpdates.length}`);

  const eventRows = events.map(mapEvent);
  await insertReturning("forum_events", eventRows, "id");
  console.log(`  forum_events: ${eventRows.length}`);

  const seen = new Set();
  const legacyMap = [];
  for (const u of users) {
    const email = String(u.data?.email || "").trim().toLowerCase();
    if (!email || seen.has(u.id) || legacyMap.some((r) => r.email === email)) continue;
    seen.add(u.id);
    legacyMap.push({ firebase_uid: u.id, email });
  }
  await upsert("legacy_uid_map", legacyMap, "firebase_uid");
  console.log(`  legacy_uid_map: ${legacyMap.length}`);

  console.log("=== KIỂM TRA SỐ LIỆU ===");
  for (const t of [
    "users", "access_list", "test_stats", "maintenance_settings", "weekly_reset",
    "broadcast_current", "broadcast_welcome", "weekly_winners",
    "forum_posts", "forum_events", "legacy_uid_map"
  ]) {
    console.log(`  ${t}: ${await countTable(t)}`);
  }

  console.log("=== IMPORT XONG ===");
  console.log("Tiếp theo: mở supabase/schema.sql đã chạy trước khi import, rồi test login.");
}

main().catch((e) => {
  console.error("Import thất bại:", e);
  process.exit(1);
});
