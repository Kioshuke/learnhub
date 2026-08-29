
import { createLearnHubClient, logAppError } from "./supabase-config.js";
window.logAppError = logAppError;

// Admin dùng client với storage key riêng để không đánh lộn account với web chính
const supabase = createLearnHubClient({ storageKey: "learnhub-admin-auth" });

const adminEmail = "learnhubadmin@gmail.com";
let allowDocs = [];
let userDocs = [];

// Finalize/cleanup thời gian online qua RPC atomic (chống mất giờ + online ảo).
async function adminFinalizeOnline(uid) {
  if (!uid) return;
  try { const { error } = await supabase.rpc("users_finalize_online", { p_uid: uid }); if (error) throw error; } catch (e) { console.error("[admin] finalize online lỗi:", e); if (window.logAppError) window.logAppError({ source: "admin", category: "dashboard", level: "error", code: "ADMIN_FINALIZE_ONLINE_FAIL", message: "Finalize online của user thất bại: " + (e.message || e), detail: { uid } }); }
}
async function adminCleanupStaleOnline() {
  try { const { error } = await supabase.rpc("users_cleanup_stale_online", { p_stale_ms: 120000 }); if (error) throw error; } catch (e) { console.error("[admin] cleanup stale online lỗi:", e); if (window.logAppError) window.logAppError({ source: "admin", category: "dashboard", level: "error", code: "ADMIN_CLEANUP_FAIL", message: "Cleanup stale online thất bại: " + (e.message || e) }); }
}

const loginView = document.getElementById("loginView");
const dashboardView = document.getElementById("dashboardView");
const totalUsersEl = document.getElementById("totalUsers");
const onlineUsersEl = document.getElementById("onlineUsers");
const disabledUsersEl = document.getElementById("disabledUsers");
const totalWhitelistEl = document.getElementById("totalWhitelist");
const directoryTableBody = document.getElementById("directoryTableBody");
const directorySearchInput = document.getElementById("directorySearchInput");
const directoryFilterSelect = document.getElementById("directoryFilterSelect");
const directoryPagination = document.getElementById("directoryPagination");
const PAGE_SIZE = 15;
let currentPage = 1;
const adminTabButtons = document.querySelectorAll("[data-admin-tab]");
const usersTabPanel = document.getElementById("usersTabPanel");
const broadcastsTabPanel = document.getElementById("broadcastsTabPanel");
const mailboxTabPanel = document.getElementById("mailboxTabPanel");
const welcomePopupTabPanel = document.getElementById("welcomePopupTabPanel");
const broadcastTargetEmailInput = document.getElementById("broadcastTargetEmailInput");
const welcomePopupTitleInput = document.getElementById("welcomePopupTitleInput");
const welcomePopupMessageInput = document.getElementById("welcomePopupMessageInput");
const welcomePopupActiveInput = document.getElementById("welcomePopupActiveInput");
const welcomePopupMeta = document.getElementById("welcomePopupMeta");
const tickerTabPanel = document.getElementById("tickerTabPanel");
const tickerTextInput = document.getElementById("tickerTextInput");
const tickerSpeedInput = document.getElementById("tickerSpeedInput");
const tickerSpeedValue = document.getElementById("tickerSpeedValue");
const tickerMeta = document.getElementById("tickerMeta");
const maintenanceTabPanel = document.getElementById("maintenanceTabPanel");
const maintenanceEnabledInput = document.getElementById("maintenanceEnabledInput");
const maintenanceMessageInput = document.getElementById("maintenanceMessageInput");
const maintenanceStatusBanner = document.getElementById("maintenanceStatusBanner");
const maintenanceMeta = document.getElementById("maintenanceMeta");
const registrationTabPanel = document.getElementById("registrationTabPanel");
const registrationEnabledInput = document.getElementById("registrationEnabledInput");
const registrationMessageInput = document.getElementById("registrationMessageInput");
const registrationStatusBanner = document.getElementById("registrationStatusBanner");
const registrationMeta = document.getElementById("registrationMeta");
const renameTabPanel = document.getElementById("renameTabPanel");
const renameSearchInput = document.getElementById("renameSearchInput");
const renameListBody = document.getElementById("renameListBody");
const weeklyResetTabPanel = document.getElementById("weeklyResetTabPanel");
const weeklyResetCurrentWeek = document.getElementById("weeklyResetCurrentWeek");
const weeklyResetLastTime = document.getElementById("weeklyResetLastTime");
const weeklyResetLastBy = document.getElementById("weeklyResetLastBy");
const weeklyResetStatusBanner = document.getElementById("weeklyResetStatusBanner");
const pageTitle = document.getElementById("pageTitle");
const pageSubtitle = document.getElementById("pageSubtitle");
const scheduleTabPanel = document.getElementById("scheduleTabPanel");
const scheduleEventsList = document.getElementById("scheduleEventsList");
const scheduleMeta = document.getElementById("scheduleMeta");
let scheduleEvents = [];
let scheduleWeekStart = getMonday(new Date());
let scheduleEditingEventId = null;

const errorLogsTabPanel = document.getElementById("errorLogsTabPanel");
const errorLogsTableBody = document.getElementById("errorLogsTableBody");
const errorLogsStats = document.getElementById("errorLogsStats");
const errorLogsSearchInput = document.getElementById("errorLogsSearchInput");
const errorLogsLevelSelect = document.getElementById("errorLogsLevelSelect");
const errorLogsStatusSelect = document.getElementById("errorLogsStatusSelect");
const errorLogsCategorySelect = document.getElementById("errorLogsCategorySelect");
const errorLogsPagination = document.getElementById("errorLogsPagination");
let errorLogsData = [];
let errorLogsPage = 1;
let errorLogsChannel = null;

const pageTitles = {
  users: ["Quản lý user", "Quản lý whitelist, khóa/mở khóa user."],
  rename: ["Tên hiển thị", "Đổi tên hiển thị cho từng user đã có tài khoản."],
  broadcasts: ["Gửi thông báo", "Gửi thông báo realtime đến toàn bộ user hoặc từng người."],
  mailbox: ["Hộp Thư", "Gửi thư đến hộp thư của user. Thư được lưu lại và xem lại bất kỳ lúc nào."],
  welcomePopup: ["Popup chào mừng", "Chỉnh popup hiển thị sau khi user đăng nhập."],
  ticker: ["Dòng chữ chạy", "Chỉnh nội dung và tốc độ dòng chữ chạy trên cùng web chính."],
  maintenance: ["Bảo trì hệ thống", "Bật/tắt chế độ bảo trì toàn hệ thống."],
  registration: ["Đăng ký", "Bật/tắt chức năng đăng ký tài khoản mới."],
  weeklyReset: ["BXH & Reset tuần", "Bảng xếp hạng học viên và reset điểm theo tuần."],
  schedule: ["Lịch học & thi", "Chỉnh lịch học và lịch thi hiển thị trên trang Phòng Học."],
  errorLogs: ["Lỗi hệ thống", "Xem lỗi từ user và tính năng, đánh dấu đã fix hoặc xóa."]
};

function switchAdminTab(tab) {
  adminTabButtons.forEach(b => b.classList.toggle("active", b.dataset.adminTab === tab));
  usersTabPanel.classList.toggle("hidden", tab !== "users");
  renameTabPanel.classList.toggle("hidden", tab !== "rename");
  broadcastsTabPanel.classList.toggle("hidden", tab !== "broadcasts");
  mailboxTabPanel.classList.toggle("hidden", tab !== "mailbox");
  welcomePopupTabPanel.classList.toggle("hidden", tab !== "welcomePopup");
  tickerTabPanel.classList.toggle("hidden", tab !== "ticker");
  maintenanceTabPanel.classList.toggle("hidden", tab !== "maintenance");
  registrationTabPanel.classList.toggle("hidden", tab !== "registration");
  weeklyResetTabPanel.classList.toggle("hidden", tab !== "weeklyReset");
  scheduleTabPanel.classList.toggle("hidden", tab !== "schedule");
  errorLogsTabPanel.classList.toggle("hidden", tab !== "errorLogs");
  const t = pageTitles[tab] || ["", ""];
  pageTitle.textContent = t[0];
  pageSubtitle.textContent = t[1];
  if (tab === "welcomePopup") loadWelcomePopupForm();
  if (tab === "mailbox") loadMailboxHistory();
  if (tab === "ticker") loadTickerForm();
  if (tab === "maintenance") loadMaintenanceForm();
  if (tab === "registration") loadRegistrationForm();
  if (tab === "rename") renderRenameList();
  if (tab === "weeklyReset") loadWeeklyResetForm();
  if (tab === "schedule") loadScheduleForm();
  if (tab === "errorLogs") loadErrorLogs();
  // close mobile sidebar
  document.querySelector('.sidebar').classList.remove('open');
  document.querySelector('.sidebar-overlay').classList.remove('active');
}
window.switchAdminTab = switchAdminTab;

adminTabButtons.forEach(b => b.addEventListener("click", () => switchAdminTab(b.dataset.adminTab)));

document.querySelectorAll('input[name="broadcastTargetMode"]').forEach(r => {
  r.addEventListener("change", () => {
    const s = r.value === "single";
    broadcastTargetEmailInput.disabled = !s;
    if (!s) broadcastTargetEmailInput.value = "";
  });
});

function showNotice(message, type = "info") {
  if (window.lhToast) {
    lhToast(message, { type: type === "warn" ? "warning" : type });
  }
}

function normalizeEmail(e) { return String(e || "").trim().toLowerCase(); }

function formatDate(v) {
  if (!v) return "Chưa có";
  let d = typeof v === "number" ? new Date(v) : new Date(v);
  if (Number.isNaN(d.getTime())) return "Chưa có";
  return d.toLocaleString("vi-VN");
}

function escapeHtml(t) {
  return String(t || "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#39;");
}

async function importWhitelistFromFile(file) {
  const text = await file.text();
  const emails = [...new Set(
    text.split(/[\n,;]+/)
      .map(e => normalizeEmail(e))
      .filter(e => e && e.includes("@") && e.includes("."))
  )];
  if (!emails.length) { showNotice("File không có email hợp lệ.", "error"); return; }
  const { data } = await supabase.from("access_list").select("email");
  const existing = new Set((data || []).map(d => normalizeEmail(d.email)));
  const newEmails = emails.filter(e => !existing.has(e));
  if (!newEmails.length) { showNotice(`Tất cả ${emails.length} email đã có trong whitelist.`, "info"); return; }
  let added = 0;
  for (const e of newEmails) {
    await supabase.from("access_list").upsert({ email: e, enabled: true, source: "file-import", added_at: new Date().toISOString() }, { onConflict: "email" });
    added++;
  }
  showNotice(`Đã nạp ${added} email mới từ file (bỏ qua ${emails.length - added} email đã tồn tại).`, "success");
}

function updateStats() {
  const now = Date.now();
  const THRESHOLD = 10000; // presence theo heartbeat: quá 10s không có tín hiệu = offline
  totalUsersEl.textContent = String(userDocs.length);
  totalWhitelistEl.textContent = String(allowDocs.length);
  onlineUsersEl.textContent = String(userDocs.filter(i => i.online && i.last_active && (now - i.last_active) < THRESHOLD).length);
  disabledUsersEl.textContent = String(userDocs.filter(i => i.disabled).length);
}

function buildDirectoryRows() {
  const aMap = new Map(allowDocs.map(i => [normalizeEmail(i.email), i]));
  const uMap = new Map(); userDocs.forEach(i => { if (i.email) uMap.set(normalizeEmail(i.email), i); });
  const all = new Set([...aMap.keys(), ...uMap.keys()]);
  const rows = [];
  const now = Date.now();
  const THRESHOLD = 10000; // presence theo heartbeat: quá 10s không có tín hiệu = offline
  all.forEach(email => {
    const a = aMap.get(email), u = uMap.get(email);
    rows.push({
      email, uid: u?.id || "", name: u?.name || u?.email || a?.email || "Chưa có tên",
      photo: u?.photo || "https://i.imgur.com/6VBx3io.png", role: u?.role || "Thành viên",
      online: Boolean(u?.online) && u?.last_active && (now - u.last_active) < THRESHOLD, disabled: Boolean(u?.disabled),
      whitelisted: a ? a.enabled !== false : false, allowId: a?.email || email,
      lastLogin: u?.last_login || "", lastActive: u?.last_active || "",
      createdAt: u?.created_at || "", updatedAt: u?.updated_at || a?.updated_at || "",
      hasUserDoc: Boolean(u)
    });
  });
  return rows.sort((a, b) => normalizeEmail(a.name).localeCompare(normalizeEmail(b.name)));
}

function renderDirectory() {
  const kw = normalizeEmail(directorySearchInput.value), fl = directoryFilterSelect.value;
  const filtered = buildDirectoryRows().filter(i => {
    const h = [i.uid, i.name, i.email].map(v => normalizeEmail(v)).join(" ");
    if (kw && !h.includes(kw)) return false;
    if (fl === "whitelisted" && !i.whitelisted) return false;
    if (fl === "not-whitelisted" && i.whitelisted) return false;
    if (fl === "disabled" && !i.disabled) return false;
    return true;
  });
  const total = filtered.length, totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (currentPage > totalPages) currentPage = totalPages;
  const start = (currentPage - 1) * PAGE_SIZE, paged = filtered.slice(start, start + PAGE_SIZE);
  if (!paged.length) { directoryTableBody.innerHTML = `<tr><td colspan="5"><div class="empty">${total ? "Trang này không có user." : "Chưa có người dùng nào khớp bộ lọc."}</div></td></tr>`; renderPagination(total, totalPages); return; }
  directoryTableBody.innerHTML = paged.map(i => {
    const su = escapeHtml(i.uid), se = escapeHtml(i.email||""), sn = escapeHtml(i.name||i.email||"Chưa đặt tên"), sp = escapeHtml(i.photo||"https://i.imgur.com/6VBx3io.png");
    const chips = [`<span class="dot-indicator ${i.whitelisted?'dot-green':'dot-red'}"></span>`, i.disabled?`<span class="chip red">Đã khóa</span>`:``, i.online?`<span class="chip green">Online</span>`:``].filter(Boolean).join("");
    const cr = i.role || "Thành viên";
    return `<tr>
      <td><div class="identity-cell"><img class="mini-avatar" src="${sp}" alt=""><div><div class="identity-name">${sn}</div><div class="identity-email">${se||"Chưa có email"}</div><div class="mini-meta">UID: ${su||"Chưa có"}${i.hasUserDoc?"":"<br>Chưa tạo hồ sơ"}</div></div></div></td>
      <td><div class="status-stack">${chips}</div></td>
      <td>${i.hasUserDoc?`<div class="role-select" data-uid="${su}" data-role="${cr}"><div class="role-trigger"><span class="role-dot ${cr==='Admin'?'r-admin':cr==='Giáo viên'?'r-teacher':'r-member'}"></span><span class="role-label">${cr}</span></div><div class="role-dropdown" role="menu" aria-label="Chọn vai trò">${["Thành viên","Giáo viên","Admin"].map(r=>`<div class="role-option${r===cr?' active':''}" data-role="${r}" role="menuitem"><span class="role-dot"></span>${r}<svg class="check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>`).join("")}</div></div>`:`<div class="mini-meta">Chưa kích hoạt</div>`}</td>
      <td><div class="mini-meta"><b>Đăng nhập cuối:</b> ${formatDate(i.lastLogin)}<br><b>Hoạt động cuối:</b> ${formatDate(i.lastActive)}<br><b>Tạo lúc:</b> ${formatDate(i.createdAt)}</div></td>
      <td><div class="row-actions"><button class="btn ${i.whitelisted?"btn-warning":"btn-success"}" onclick="toggleWhitelist('${escapeHtml(i.allowId)}',${i.whitelisted})">${i.whitelisted?"Tắt whitelist":"Cấp quyền"}</button>${i.hasUserDoc?`<button class="btn ${i.disabled?"btn-success":"btn-warning"}" onclick="toggleDisable('${su}',${i.disabled?"true":"false"})">${i.disabled?"Mở khóa":"Khóa user"}</button>`:``}<button class="btn btn-danger" onclick="deleteUserData('${su}','${se}')">${i.hasUserDoc?"Xóa user":"Xóa email"}</button></div></td>
    </tr>`;
  }).join("");
  renderPagination(total, totalPages);
}

function renderPagination(total, totalPages) {
  if (totalPages <= 1) { directoryPagination.innerHTML = `<div class="pagination-info">Tổng: ${total} user</div>`; return; }
  const from = (currentPage - 1) * PAGE_SIZE + 1, to = Math.min(currentPage * PAGE_SIZE, total);
  let btns = "";
  btns += `<button class="page-btn" onclick="goPage(${currentPage-1})" ${currentPage===1?"disabled":""}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M15 18l-6-6 6-6"/></svg></button>`;
  const pages = [];
  pages.push(1);
  if (currentPage > 3) pages.push("...");
  for (let p = Math.max(2, currentPage - 1); p <= Math.min(totalPages - 1, currentPage + 1); p++) pages.push(p);
  if (currentPage < totalPages - 2) pages.push("...");
  if (totalPages > 1) pages.push(totalPages);
  pages.forEach(p => {
    if (p === "...") btns += `<span class="page-ellipsis">...</span>`;
    else btns += `<button class="page-btn${p===currentPage?' active':''}" onclick="goPage(${p})">${p}</button>`;
  });
  btns += `<button class="page-btn" onclick="goPage(${currentPage+1})" ${currentPage===totalPages?"disabled":""}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 18l6-6-6-6"/></svg></button>`;
  directoryPagination.innerHTML = `<div class="pagination-info">Hiển thị ${from}–${to} / ${total} user</div><div class="pagination-controls">${btns}</div>`;
}
window.goPage = (p) => { currentPage = p; renderDirectory(); };

function renderRenameList() {
  const kw = normalizeEmail(renameSearchInput.value);
  const users = buildDirectoryRows().filter(i => i.hasUserDoc).filter(i => {
    if (!kw) return true;
    return [i.uid, i.name, i.email].map(v => normalizeEmail(v)).join(" ").includes(kw);
  });
  if (!users.length) { renameListBody.innerHTML = `<div class="empty">Không tìm thấy user nào${kw ? " khớp bộ lọc" : ""}.</div>`; return; }
  renameListBody.innerHTML = users.map(i => {
    const su = escapeHtml(i.uid), se = escapeHtml(i.email||""), sn = escapeHtml(i.name||i.email||""), sp = escapeHtml(i.photo||"https://i.imgur.com/6VBx3io.png");
    return `<div class="rename-row">
      <img src="${sp}" alt="">
      <div class="rename-info"><div class="rename-name">${sn}</div><div class="rename-email">${se||"Chưa có email"}</div></div>
      <div class="rename-field"><input id="rename-${su}" class="input" type="text" value="${sn}" placeholder="Tên mới"><button class="btn btn-primary" onclick="renameUser('${su}')">Lưu</button></div>
    </div>`;
  }).join("");
}
renameSearchInput.addEventListener("input", renderRenameList);

async function refreshCollections() {
  const [aRes, uRes] = await Promise.all([
    supabase.from("access_list").select("*"),
    supabase.from("users").select("*")
  ]);
  allowDocs = (aRes.data || []).map(d => ({ id: d.email, ...d })).sort((a,b)=>normalizeEmail(a.email).localeCompare(normalizeEmail(b.email)));
  userDocs = (uRes.data || []).map(d => ({ uid: d.id, ...d })).sort((a,b)=>normalizeEmail(a.name||a.email).localeCompare(normalizeEmail(b.name||b.email)));
  updateStats(); renderDirectory(); renderRenameList();
}

async function ensureAdmin(user) {
  if (!user?.email || normalizeEmail(user.email) !== adminEmail) {
    showNotice("Email này không có quyền vào dashboard admin.", "error");
    await supabase.auth.signOut(); return false;
  }
  return true;
}

document.getElementById("adminLoginBtn").addEventListener("click", async () => {
  try {
    const email = normalizeEmail(document.getElementById("adminEmailInput").value);
    const password = document.getElementById("adminPasswordInput").value;
    if (email !== adminEmail) { showNotice("Chỉ được đăng nhập bằng learnhubadmin@gmail.com", "error"); return; }
    if (!password) { showNotice("Vui lòng nhập mật khẩu admin.", "error"); return; }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  } catch (error) {
    console.error(error); if (window.logAppError) window.logAppError({ source: "admin", category: "dashboard", level: "error", code: "ADMIN_OP_FAIL", message: String((error && error.message) || error || "") });
    let message = "Đăng nhập admin thất bại.";
    const em = String(error?.message || "");
    if (em.includes("Invalid login credentials")) message = "Sai mật khẩu hoặc tài khoản admin không hợp lệ.";
    else if (em.includes("rate limit")) message = "Đăng nhập quá nhiều lần. Vui lòng thử lại sau.";
    showNotice(message, "error");
  }
});

document.getElementById("logoutBtn").addEventListener("click", async () => {
  try { const { data } = await supabase.auth.getUser(); if (data?.user?.id) await adminFinalizeOnline(data.user.id); } catch(e){}
  await supabase.auth.signOut();
});
document.getElementById("seedBtn").addEventListener("click", () => document.getElementById("whitelistFileInput").click());
document.getElementById("whitelistFileInput").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  await importWhitelistFromFile(file);
  e.target.value = "";
});
document.getElementById("refreshBtn").addEventListener("click", refreshCollections);

document.getElementById("sendBroadcastBtn").addEventListener("click", async () => {
  const ti = document.getElementById("broadcastTitleInput"), mi = document.getElementById("broadcastMessageInput");
  const tp = document.querySelector('input[name="broadcastType"]:checked'), dp = document.querySelector('input[name="broadcastDuration"]:checked');
  const mp = document.querySelector('input[name="broadcastTargetMode"]:checked');
  const title = String(ti.value||"").trim(), message = String(mi.value||"").trim();
  const tm = mp?mp.value:"all", te = normalizeEmail(broadcastTargetEmailInput.value);
  if (!message) { showNotice("Vui lòng nhập nội dung thông báo.", "error"); return; }
  if (tm==="single"&&(!te||!te.includes("@"))) { showNotice("Vui lòng nhập email hợp lệ.", "error"); return; }
  try {
    const now = new Date().toISOString();
    await supabase.from("broadcast_current").upsert({
      id: true,
      broadcast_id: now,
      title: title||"Thông báo",
      message,
      type: tp?tp.value:"info",
      duration_ms: Number(dp?dp.value:3000),
      target_mode: tm,
      target_email: tm==="single"?te:"",
      active: true,
      sender: adminEmail,
      updated_at: now
    }, { onConflict: "id" });
    ti.value=""; mi.value="";
    document.querySelector('input[name="broadcastType"][value="info"]').checked=true;
    document.querySelector('input[name="broadcastDuration"][value="3000"]').checked=true;
    document.querySelector('input[name="broadcastTargetMode"][value="all"]').checked=true;
    broadcastTargetEmailInput.value=""; broadcastTargetEmailInput.disabled=true;
    showNotice(tm==="single"?`Đã gửi thông báo đến ${te}.`:"Đã gửi thông báo đến toàn bộ user đang mở LearnHub.","success");
  } catch(e) { console.error(e); if (window.logAppError) window.logAppError({ source: "admin", category: "dashboard", level: "error", code: "ADMIN_OP_FAIL", message: String((e && e.message) || e || "") }); showNotice("Gửi thông báo thất bại.", "error"); }
});

document.getElementById("clearBroadcastBtn").addEventListener("click", async () => {
  try { await supabase.from("broadcast_current").upsert({ id: true, active: false, updated_at: new Date().toISOString(), sender: adminEmail }, { onConflict: "id" }); showNotice("Đã tắt thông báo hiện tại.", "success"); }
  catch(e) { console.error(e); if (window.logAppError) window.logAppError({ source: "admin", category: "dashboard", level: "error", code: "ADMIN_OP_FAIL", message: String((e && e.message) || e || "") }); showNotice("Không tắt được thông báo.", "error"); }
});

// ==================== MAILBOX ====================
document.getElementById("sendMailboxBtn").addEventListener("click", async () => {
  const btn = document.getElementById("sendMailboxBtn");
  const ti = document.getElementById("mailboxTitleInput");
  const mi = document.getElementById("mailboxMessageInput");
  const title = String(ti.value || "").trim();
  const message = String(mi.value || "").trim();
  if (!message) { showNotice("Vui lòng nhập nội dung thư.", "error"); return; }
  var mailboxSignature = '<p style="margin-top:24px">Trân trọng,<br><strong>Đội ngũ phát triển!</strong></p>';
  var fullMessage = message + mailboxSignature;
  try {
    if (btn.dataset.mode === "edit" && ti.dataset.editId) {
      await supabase.from("mailbox_messages").update({ title: title || "Thông báo từ Admin", message: fullMessage }).eq("id", ti.dataset.editId);
      showNotice("Đã cập nhật thư.", "success");
      delete ti.dataset.editId;
      btn.textContent = "Gửi thư";
      delete btn.dataset.mode;
    } else {
      await supabase.from("mailbox_messages").insert({
        title: title || "Thông báo từ Admin",
        message: fullMessage,
        sender: adminEmail,
        target_mode: "all",
        target_email: null
      });
      showNotice("Đã gửi thư đến tất cả user.", "success");
    }
    ti.value = "";
    mi.value = "";
    loadMailboxHistory();
  } catch (e) { console.error(e); if (window.logAppError) window.logAppError({ source: "admin", category: "dashboard", level: "error", code: "ADMIN_OP_FAIL", message: String((e && e.message) || e || "") }); showNotice("Thao tác thất bại: " + (e.message || e), "error"); }
});

async function loadMailboxHistory() {
  const container = document.getElementById("mailboxHistory");
  if (!container) return;
  try {
    const { data: messages } = await supabase.from("mailbox_messages").select("*").order("created_at", { ascending: false }).limit(10);
    if (!messages || messages.length === 0) { container.innerHTML = '<p style="color:var(--text-2);font-size:13px">Chưa có thư nào.</p>'; return; }
    let html = '<div style="font-weight:700;font-size:14px;margin-bottom:10px">Thư đã gửi</div>';
    messages.forEach(m => {
      const d = new Date(m.created_at);
      const dateStr = d.toLocaleDateString("vi-VN") + " " + d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
      html += `<div style="padding:10px 12px;border:1px solid var(--border);border-radius:8px;margin-bottom:8px;font-size:13px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
          <b style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;margin-right:8px">${escapeHtml(m.title || "Không tiêu đề")}</b>
          <span style="color:var(--text-2);font-size:11px;white-space:nowrap">${dateStr}</span>
        </div>
        <div style="color:var(--text-2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml((m.message || "").replace(/<[^>]+>/g,"").substring(0, 100))}</div>
        <div style="display:flex;gap:6px;margin-top:8px">
          <button onclick="mailboxEditMsg('${m.id}')" style="background:#2563eb;color:#fff;border:none;border-radius:6px;padding:4px 10px;font-size:11px;cursor:pointer">Sửa</button>
          <button onclick="mailboxDeleteMsg('${m.id}')" style="background:#ef4444;color:#fff;border:none;border-radius:6px;padding:4px 10px;font-size:11px;cursor:pointer">Xoá</button>
        </div>
      </div>`;
    });
    container.innerHTML = html;
  } catch (e) { container.innerHTML = '<p style="color:var(--text-2);font-size:13px">Không tải được lịch sử.</p>'; }
}

window.mailboxDeleteMsg = async function(id) {
  if (!confirm("Xoá thư này?")) return;
  try {
    const { error } = await supabase.from("mailbox_messages").delete().eq("id", id);
    if (error) throw error;
    showNotice("Đã xoá thư.", "success");
    loadMailboxHistory();
  } catch(e) { showNotice("Xoá thất bại: " + (e.message || e), "error"); }
};

window.mailboxEditMsg = async function(id) {
  const ti = document.getElementById("mailboxTitleInput");
  const mi = document.getElementById("mailboxMessageInput");
  try {
    const { data: m, error } = await supabase.from("mailbox_messages").select("*").eq("id", id).single();
    if (error || !m) throw error || new Error("Không tìm thấy");
    ti.value = m.title || "";
    mi.value = m.message || "";
    ti.dataset.editId = id;
    document.getElementById("sendMailboxBtn").textContent = "Cập nhật";
    document.getElementById("sendMailboxBtn").dataset.mode = "edit";
  } catch(e) { showNotice("Không tải được thư: " + (e.message || e), "error"); }
};

async function loadWelcomePopupForm() {
  try {
    const { data: d } = await supabase.from("broadcast_welcome").select("*").eq("id", true).maybeSingle();
    if (!d) { welcomePopupTitleInput.value="📢 Thông báo"; welcomePopupMessageInput.value="CẢM ƠN CÁC BẠN ĐÃ TIN TƯỞNG VÀ SỬ DỤNG HỆ SINH THÁI LEARNHUB PLATFORM"; welcomePopupActiveInput.checked=true; document.querySelector('input[name="welcomePopupShowMode"][value="every_time"]').checked=true; welcomePopupMeta.textContent="Chưa có bản lưu. Lưu lần đầu để áp dụng."; return; }
    welcomePopupTitleInput.value=d.title||"📢 Thông báo"; welcomePopupMessageInput.value=d.message||""; welcomePopupActiveInput.checked=d.active!==false;
    const mode=d.show_mode==="daily"?"daily":"every_time";
    document.querySelector(`input[name="welcomePopupShowMode"][value="${mode}"]`).checked=true;
    welcomePopupMeta.textContent=d.updated_at?`Cập nhật: ${formatDate(d.updated_at)}${d.updated_by?` · bởi ${d.updated_by}`:""}`:"";
  } catch(e) { console.error(e); if (window.logAppError) window.logAppError({ source: "admin", category: "dashboard", level: "error", code: "ADMIN_OP_FAIL", message: String((e && e.message) || e || "") }); showNotice("Không tải được popup.", "error"); }
}

document.getElementById("saveWelcomePopupBtn").addEventListener("click", async () => {
  const title=String(welcomePopupTitleInput.value||"").trim(), message=String(welcomePopupMessageInput.value||"").trim(), active=welcomePopupActiveInput.checked;
  const showModeRadio=document.querySelector('input[name="welcomePopupShowMode"]:checked');
  const showMode=showModeRadio?showModeRadio.value:"every_time";
  if (!message) { showNotice("Vui lòng nhập nội dung popup.", "error"); return; }
  try {
    const now=new Date().toISOString();
    await supabase.from("broadcast_welcome").upsert({ id: true, title: title||"📢 Thông báo", message, active, show_mode: showMode, updated_at: now, updated_by: adminEmail }, { onConflict: "id" });
    welcomePopupMeta.textContent=`Cập nhật: ${formatDate(now)} · bởi ${adminEmail}`; showNotice("Đã lưu popup cố định.", "success");
  } catch(e) { console.error(e); if (window.logAppError) window.logAppError({ source: "admin", category: "dashboard", level: "error", code: "ADMIN_OP_FAIL", message: String((e && e.message) || e || "") }); showNotice("Lưu popup thất bại.", "error"); }
});

document.getElementById("disableWelcomePopupBtn").addEventListener("click", async () => {
  try {
    const now=new Date().toISOString();
    await supabase.from("broadcast_welcome").upsert({ id: true, active: false, updated_at: now, updated_by: adminEmail }, { onConflict: "id" });
    welcomePopupActiveInput.checked=false; welcomePopupMeta.textContent=`Đã tắt popup · ${formatDate(now)}`; showNotice("Đã tắt popup cố định.", "success");
  } catch(e) { console.error(e); if (window.logAppError) window.logAppError({ source: "admin", category: "dashboard", level: "error", code: "ADMIN_OP_FAIL", message: String((e && e.message) || e || "") }); showNotice("Không tắt được popup.", "error"); }
});

tickerSpeedInput.addEventListener("input", () => {
  tickerSpeedValue.textContent = `${tickerSpeedInput.value}s`;
});

async function loadTickerForm() {
  try {
    const { data: d } = await supabase.from("ticker_settings").select("*").eq("id", true).maybeSingle();
    if (!d) {
      tickerTextInput.value="LearnHub - Hệ sinh thái học tập trực tuyến dành cho học sinh và sinh viên. Cung cấp tài liệu, bài kiểm tra, công cụ ôn tập và nhiều tiện ích hỗ trợ học tập hiện đại trên một nền tảng duy nhất.";
      tickerSpeedInput.value="18"; tickerSpeedValue.textContent="18s";
      tickerMeta.textContent="Chưa có bản lưu. Lưu lần đầu để áp dụng.";
      return;
    }
    tickerTextInput.value=d.text||"";
    tickerSpeedInput.value=String(d.speed_seconds||18);
    tickerSpeedValue.textContent=`${tickerSpeedInput.value}s`;
    tickerMeta.textContent=d.updated_at?`Cập nhật: ${formatDate(d.updated_at)}${d.updated_by?` · bởi ${d.updated_by}`:""}`:"";
  } catch(e) { console.error(e); if (window.logAppError) window.logAppError({ source: "admin", category: "dashboard", level: "error", code: "ADMIN_OP_FAIL", message: String((e && e.message) || e || "") }); showNotice("Không tải được cấu hình dòng chữ.", "error"); }
}

document.getElementById("saveTickerBtn").addEventListener("click", async () => {
  const text=String(tickerTextInput.value||"").trim();
  const speed=Math.max(5, Math.min(60, Number(tickerSpeedInput.value)||18));
  if (!text) { showNotice("Vui lòng nhập nội dung dòng chữ.", "error"); return; }
  try {
    const now=new Date().toISOString();
    await supabase.from("ticker_settings").upsert({ id: true, text, speed_seconds: speed, updated_at: now, updated_by: adminEmail }, { onConflict: "id" });
    tickerMeta.textContent=`Cập nhật: ${formatDate(now)} · bởi ${adminEmail}`;
    showNotice("Đã lưu dòng chữ chạy.", "success");
  } catch(e) { console.error(e); if (window.logAppError) window.logAppError({ source: "admin", category: "dashboard", level: "error", code: "ADMIN_OP_FAIL", message: String((e && e.message) || e || "") }); showNotice("Lưu dòng chữ thất bại.", "error"); }
});

document.getElementById("refreshTickerBtn").addEventListener("click", loadTickerForm);

// ================= SCHEDULE (LỊCH HỌC & THI) =================
const SCHEDULE_SUBJECTS = [
  { value: "ly", label: "Vật Lý" },
  { value: "sinh", label: "Sinh Học" },
  { value: "tin", label: "Tin Học" },
  { value: "su", label: "Lịch Sử" },
  { value: "hoa", label: "Hoá Học" },
  { value: "anh", label: "Anh Văn" },
  { value: "toan", label: "Toán Học" }
];

function scheduleSubjectOptions(sel) {
  return SCHEDULE_SUBJECTS.map(s => `<option value="${s.value}"${s.value === sel ? " selected" : ""}>${s.label}</option>`).join("");
}

function pad2(n) { return String(n).padStart(2, "0"); }
function toIsoDate(d) { return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate()); }
function addDays(d, days) { const next = new Date(d); next.setDate(next.getDate() + days); return next; }
function getMonday(d) { const date = new Date(d.getFullYear(), d.getMonth(), d.getDate()); date.setDate(date.getDate() - ((date.getDay() + 6) % 7)); return date; }
function scheduleEventId() { return crypto.randomUUID ? crypto.randomUUID() : "e" + Date.now() + Math.random().toString(16).slice(2); }

function scheduleEditorCard(e) {
  const id = e.id || scheduleEventId();
  const session = e.session || guessScheduleSession(e.time);
  const sessionInfo = { morning: ["🌅", "Sáng"], noon: ["☀️", "Trưa"], afternoon: ["🌤️", "Chiều"], evening: ["🌙", "Tối"] }[session] || ["🕒", "Buổi học"];
  const time = [e.time, e.endTime].filter(Boolean).join(" – ") || "Chưa chọn giờ";
  const subjInfo = { ly: ["Lý", "#2563eb"], sinh: ["Sinh", "#16a34a"], tin: ["Tin", "#7c3aed"], su: ["Sử", "#ea580c"], hoa: ["Hoá", "#dc2626"], anh: ["Anh", "#0891b2"], toan: ["Toán", "#4f46e5"] }[e.subject] || [String(e.subject || "Môn"), "#2563eb"];
  return `<div class="schedule-event-row ${e.type === "thi" ? "type-thi" : ""}" style="border-left-color:${subjInfo[1]}" data-id="${escapeHtml(id)}" data-date="${escapeHtml(e.date)}">
    <button class="se-delete" type="button" title="Xóa lịch" onclick="removeScheduleEvent('${escapeHtml(id)}')">×</button>
    <div onclick="editScheduleEvent('${escapeHtml(id)}')"><div class="admin-schedule-top"><span class="admin-schedule-tag ${e.type === "thi" ? "thi" : ""}">${e.type === "thi" ? "Thi" : "Học"}</span><span class="admin-schedule-session ${session}">${sessionInfo[0]} ${sessionInfo[1]}</span><span class="admin-schedule-subj" style="background:${subjInfo[1]}">${escapeHtml(subjInfo[0])}</span></div><div class="admin-schedule-title">${escapeHtml(e.title || "")}</div><div class="admin-schedule-time">🕒 ${escapeHtml(time)}</div>${e.note ? `<div class="admin-schedule-note">${escapeHtml(e.note)}</div>` : ""}</div>
  </div>`;
}

function renderScheduleEvents() {
  if (!scheduleEventsList) return;
  const weekdays = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
  const today = toIsoDate(new Date());
  const weekDates = Array.from({ length: 7 }, (_, i) => toIsoDate(addDays(scheduleWeekStart, i)));
  const label = document.getElementById("scheduleWeekLabel");
  if (label) label.innerHTML = `Tuần đang chỉnh<small>${weekDates[0].split("-").reverse().join("/")} – ${weekDates[6].split("-").reverse().join("/")}</small>`;
  scheduleEventsList.innerHTML = '<div class="schedule-week-grid">' + weekDates.map((date, i) => {
    const dayEvents = scheduleEvents.filter(e => e && e.date === date);
    const classes = "schedule-day-column" + (date === today ? " is-today" : "") + (i === 6 ? " is-sunday" : "");
    return `<div class="${classes}"><div class="schedule-day-head"><div><div class="schedule-day-name">${weekdays[i]}</div><div class="schedule-day-date">${date.split("-").reverse().slice(0, 2).join("/")}</div></div><button class="schedule-day-add" type="button" title="Thêm lịch ngày này" onclick="addScheduleEvent('${date}')">+</button></div>${dayEvents.length ? dayEvents.map(scheduleEditorCard).join("") : '<div class="schedule-day-empty">Chưa có lịch</div>'}</div>`;
  }).join("") + "</div>";
}

window.removeScheduleEvent = (id) => { scheduleEvents = scheduleEvents.filter(e => e.id !== id); renderScheduleEvents(); };
function guessScheduleSession(time) {
  const hour = Number(String(time || "08:00").split(":")[0]);
  if (hour < 11) return "morning";
  if (hour < 14) return "noon";
  if (hour < 18) return "afternoon";
  return "evening";
}
function openScheduleModal(date, eventId) {
  const event = eventId ? scheduleEvents.find(e => e.id === eventId) : null;
  scheduleEditingEventId = event ? event.id : null;
  document.getElementById("scheduleModalTitle").textContent = event ? "✏️ Chỉnh sửa lịch" : "📅 Thêm lịch học / lịch thi";
  document.getElementById("scheduleModalDate").value = event ? event.date : (date || toIsoDate(scheduleWeekStart));
  document.getElementById("scheduleModalSubject").innerHTML = scheduleSubjectOptions(event ? event.subject : "ly");
  document.getElementById("scheduleModalType").value = event ? event.type : "hoc";
  document.getElementById("scheduleModalSession").value = event ? (event.session || guessScheduleSession(event.time)) : "morning";
  document.getElementById("scheduleModalStart").value = event ? (event.time || "") : "08:00";
  document.getElementById("scheduleModalEnd").value = event ? (event.endTime || "") : "10:00";
  document.getElementById("scheduleModalTitleInput").value = event ? event.title : "";
  document.getElementById("scheduleModalNote").value = event ? (event.note || "") : "";
  document.getElementById("scheduleEventModal").classList.add("show");
  document.getElementById("scheduleModalTitleInput").focus();
}
function closeScheduleModal() { document.getElementById("scheduleEventModal").classList.remove("show"); }
window.addScheduleEvent = openScheduleModal;
window.editScheduleEvent = (id) => { const event = scheduleEvents.find(e => e.id === id); if (event) openScheduleModal(event.date, id); };
window.closeScheduleModal = closeScheduleModal;
document.getElementById("saveScheduleModalBtn").addEventListener("click", () => {
  const date = document.getElementById("scheduleModalDate").value;
  const title = document.getElementById("scheduleModalTitleInput").value.trim();
  if (!date || !title) { showNotice("Vui lòng chọn ngày và nhập nội dung lịch.", "warning"); return; }
  const time = document.getElementById("scheduleModalStart").value;
  const nextEvent = { id: scheduleEditingEventId || scheduleEventId(), date, subject: document.getElementById("scheduleModalSubject").value, type: document.getElementById("scheduleModalType").value, session: document.getElementById("scheduleModalSession").value || guessScheduleSession(time), time, endTime: document.getElementById("scheduleModalEnd").value, title, note: document.getElementById("scheduleModalNote").value.trim() };
  if (scheduleEditingEventId) scheduleEvents = scheduleEvents.map(e => e.id === scheduleEditingEventId ? nextEvent : e); else scheduleEvents.push(nextEvent);
  closeScheduleModal();
  scheduleWeekStart = getMonday(new Date(date + "T00:00:00"));
  renderScheduleEvents();
});

document.getElementById("addScheduleEventBtn").addEventListener("click", () => window.addScheduleEvent(toIsoDate(scheduleWeekStart)));
document.getElementById("schedulePrevWeekBtn").addEventListener("click", () => { scheduleWeekStart = addDays(scheduleWeekStart, -7); renderScheduleEvents(); });
document.getElementById("scheduleNextWeekBtn").addEventListener("click", () => { scheduleWeekStart = addDays(scheduleWeekStart, 7); renderScheduleEvents(); });
document.getElementById("scheduleTodayBtn").addEventListener("click", () => { scheduleWeekStart = getMonday(new Date()); renderScheduleEvents(); });

async function loadScheduleForm() {
  try {
    const { data: d } = await supabase.from("schedule_settings").select("*").eq("id", true).maybeSingle();
    scheduleEvents = (d && Array.isArray(d.events)) ? d.events.map(e => ({ id: e.id || scheduleEventId(), ...e })) : [];
    renderScheduleEvents();
    scheduleMeta.textContent = d && d.updated_at ? `Cập nhật: ${formatDate(d.updated_at)}${d.updated_by ? ` · bởi ${d.updated_by}` : ""}` : "Chưa có bản lưu. Lưu lần đầu để áp dụng.";
  } catch (e) {
    console.error(e); if (window.logAppError) window.logAppError({ source: "admin", category: "dashboard", level: "error", code: "ADMIN_OP_FAIL", message: String((e && e.message) || e || "") });
    showNotice("Không tải được lịch học & thi.", "error");
  }
}

document.getElementById("saveScheduleBtn").addEventListener("click", async () => {
  const dropped = scheduleEvents.filter(Boolean).filter(e => !e.date || !String(e.title || "").trim()).length;
  const events = scheduleEvents.filter(e => e && e.date && String(e.title || "").trim());
  if (dropped > 0) showNotice(`Có ${dropped} lịch thiếu ngày/tiêu đề sẽ bị bỏ qua khi lưu.`, "warning");

  try {
    const now = new Date().toISOString();
    await supabase.from("schedule_settings").upsert({
      id: true,
      active: true,
      events,
      updated_at: now,
      updated_by: adminEmail
    }, { onConflict: "id" });
    scheduleEvents = events;
    renderScheduleEvents();
    scheduleMeta.textContent = `Cập nhật: ${formatDate(now)} · bởi ${adminEmail}`;
    showNotice("Đã lưu lịch học & thi.", "success");
  } catch (e) {
    console.error(e); if (window.logAppError) window.logAppError({ source: "admin", category: "dashboard", level: "error", code: "ADMIN_OP_FAIL", message: String((e && e.message) || e || "") });
    showNotice("Lưu lịch thất bại. Kiểm tra lại bảng schedule_settings đã tạo chưa.", "error");
  }
});

document.getElementById("refreshScheduleBtn").addEventListener("click", loadScheduleForm);

function renderMaintenanceBanner(d) {
  const on=Boolean(d&&d.enabled);
  maintenanceStatusBanner.textContent=on?"🔴 ĐANG BẬT BẢO TRÌ — Toàn bộ user bị chặn truy cập.":"🟢 Đang tắt — Web hoạt động bình thường.";
  maintenanceStatusBanner.style.background=on?"#fee2e2":"#dcfce7"; maintenanceStatusBanner.style.color=on?"#b91c1c":"#166534";
  maintenanceStatusBanner.style.border=on?"1px solid #fecaca":"1px solid #bbf7d0";
}

async function loadMaintenanceForm() {
  try {
    const { data: d } = await supabase.from("maintenance_settings").select("*").eq("id", true).maybeSingle();
    maintenanceEnabledInput.checked=Boolean(d && d.enabled); maintenanceMessageInput.value=(d && d.message)||""; renderMaintenanceBanner(d||{});
    maintenanceMeta.textContent=d && d.updated_at ? `Cập nhật: ${formatDate(d.updated_at)}${d.updated_by?` · bởi ${d.updated_by}`:""}`:"Chưa từng bật bảo trì.";
    updateMaintenanceBadge(d && d.enabled);
  } catch(e) { console.error(e); if (window.logAppError) window.logAppError({ source: "admin", category: "dashboard", level: "error", code: "ADMIN_OP_FAIL", message: String((e && e.message) || e || "") }); showNotice("Không tải được trạng thái bảo trì.", "error"); }
}

function updateMaintenanceBadge(enabled) {
  const badge = document.getElementById("maintenanceBadge");
  if (!badge) return;
  badge.textContent = enabled ? "On" : "Off";
  badge.classList.add("visible");
  badge.classList.toggle("on", Boolean(enabled));
  badge.classList.toggle("off", !enabled);
}

document.getElementById("saveMaintenanceBtn").addEventListener("click", () => {
  const enabled = maintenanceEnabledInput.checked, message = String(maintenanceMessageInput.value || "").trim();
  const apply = async () => {
    try {
      const now = new Date().toISOString();
      await supabase.from("maintenance_settings").upsert({ id: true, enabled, message, updated_at: now, updated_by: adminEmail }, { onConflict: "id" });
      renderMaintenanceBanner({ enabled }); maintenanceMeta.textContent = `Cập nhật: ${formatDate(now)} · bởi ${adminEmail}`;
      updateMaintenanceBadge(enabled);
      showNotice(enabled ? "Đã BẬT bảo trì." : "Đã TẮT bảo trì.", "success"); await loadMaintenanceForm();
    } catch (e) { console.error(e); if (window.logAppError) window.logAppError({ source: "admin", category: "dashboard", level: "error", code: "ADMIN_OP_FAIL", message: String((e && e.message) || e || "") }); showNotice("Cập nhật bảo trì thất bại.", "error"); }
  };
  if (enabled) {
    openConfirmDialog("Bật chế độ bảo trì?", "Toàn bộ user sẽ bị đăng xuất và mọi truy cập mới bị chặn. Tiếp tục?", apply);
  } else {
    openConfirmDialog("Tắt chế độ bảo trì?", "User có thể đăng nhập và truy cập web bình thường. Tiếp tục?", apply);
  }
});

document.getElementById("refreshMaintenanceBtn").addEventListener("click", loadMaintenanceForm);

// ---------- REGISTRATION ----------
function renderRegistrationBanner(d) {
  if (!registrationStatusBanner) return;
  const on = d && d.enabled;
  registrationStatusBanner.style.background = on ? "rgba(34,197,94,.12)" : "rgba(239,68,68,.10)";
  registrationStatusBanner.style.color = on ? "#16a34a" : "#dc2626";
  registrationStatusBanner.textContent = on ? "✅ Đăng ký đang MỞ — user mới có thể đăng ký." : "🚫 Đăng ký đang ĐÓNG — chỉ user trong whitelist mới đăng ký được.";
}

function updateRegistrationBadge(enabled) {
  const badge = document.getElementById("registrationBadge");
  if (!badge) return;
  badge.textContent = enabled ? "On" : "Off";
  badge.classList.add("visible");
  badge.classList.toggle("on", Boolean(enabled));
  badge.classList.toggle("off", !enabled);
}

async function loadRegistrationForm() {
  try {
    const { data: d } = await supabase.from("registration_settings").select("*").eq("id", true).maybeSingle();
    registrationEnabledInput.checked = Boolean(d && d.enabled);
    registrationMessageInput.value = (d && d.message) || "";
    renderRegistrationBanner(d || {});
    registrationMeta.textContent = d && d.updated_at ? `Cập nhật: ${formatDate(d.updated_at)}${d.updated_by ? ` · bởi ${d.updated_by}` : ""}` : "Chưa từng chỉnh sửa.";
    updateRegistrationBadge(d && d.enabled);
  } catch (e) { console.error(e); if (window.logAppError) window.logAppError({ source: "admin", category: "dashboard", level: "error", code: "ADMIN_OP_FAIL", message: String((e && e.message) || e || "") }); showNotice("Không tải được trạng thái đăng ký.", "error"); }
}

document.getElementById("saveRegistrationBtn").addEventListener("click", () => {
  const enabled = registrationEnabledInput.checked, message = String(registrationMessageInput.value || "").trim();
  const apply = async () => {
    try {
      const now = new Date().toISOString();
      await supabase.from("registration_settings").upsert({ id: true, enabled, message, updated_at: now, updated_by: adminEmail }, { onConflict: "id" });
      renderRegistrationBanner({ enabled }); registrationMeta.textContent = `Cập nhật: ${formatDate(now)} · bởi ${adminEmail}`;
      updateRegistrationBadge(enabled);
      showNotice(enabled ? "Đã MỞ đăng ký." : "Đã ĐÓNG đăng ký.", "success"); await loadRegistrationForm();
    } catch (e) { console.error(e); if (window.logAppError) window.logAppError({ source: "admin", category: "dashboard", level: "error", code: "ADMIN_OP_FAIL", message: String((e && e.message) || e || "") }); showNotice("Cập nhật trạng thái đăng ký thất bại.", "error"); }
  };
  if (!enabled) {
    openConfirmDialog("Đóng đăng ký?", "User mới sẽ không thể đăng ký (trừ khi có trong whitelist). Tiếp tục?", apply);
  } else {
    openConfirmDialog("Mở đăng ký?", "User mới có thể đăng ký tài khoản. Tiếp tục?", apply);
  }
});

document.getElementById("refreshRegistrationBtn").addEventListener("click", loadRegistrationForm);

document.getElementById("addWhitelistBtn").addEventListener("click", async () => {
  const input=document.getElementById("allowEmailInput"), email=normalizeEmail(input.value);
  if (!email||!email.includes("@")) { showNotice("Vui lòng nhập email hợp lệ.", "error"); return; }
  await supabase.from("access_list").upsert({ email, enabled: true, added_at: new Date().toISOString(), updated_at: new Date().toISOString() }, { onConflict: "email" });
  input.value=""; showNotice("Đã thêm email vào whitelist.", "success");
});

directorySearchInput.addEventListener("input", () => { currentPage = 1; renderDirectory(); });
directoryFilterSelect.addEventListener("change", () => { currentPage = 1; renderDirectory(); });

window.toggleWhitelist = async (email, cur) => {
  await supabase.from("access_list").upsert({ email, enabled: !cur, updated_at: new Date().toISOString() }, { onConflict: "email" });
  showNotice(cur?"Đã tắt quyền email này.":"Đã bật lại quyền email này.", "success");
};
window.removeWhitelist = async (email) => {
  if (!(await lhConfirm("Xóa email này khỏi whitelist?"))) return;
  await supabase.from("access_list").delete().eq("email", email); showNotice("Đã xóa email khỏi whitelist.", "success");
};
window.renameUser = async (uid) => {
  const input=document.getElementById(`rename-${uid}`), name=String(input?.value||"").trim();
  if (name.length<2) { showNotice("Tên phải có ít nhất 2 ký tự.", "error"); return; }
  await supabase.from("users").update({ name, updated_at: new Date().toISOString() }).eq("id", uid); showNotice("Đã cập nhật tên user.", "success");
};
window.toggleDisable = async (uid, cur) => {
  if (!uid) return;
  if(!cur){ await adminFinalizeOnline(uid); } // finalize giờ online đang chạy trước khi khóa, không mất công sức
  await supabase.from("users").update({ disabled: !cur, online: false, updated_at: new Date().toISOString() }).eq("id", uid);
  showNotice(cur?"Đã mở khóa user.":"Đã disable user.", "success");
};
window.changeUserRole = async (uid, role) => {
  if (!uid) return; try { await supabase.from("users").update({ role, updated_at: new Date().toISOString() }).eq("id", uid); showNotice(`Đã chuyển quyền thành: ${role}`, "success"); }
  catch(e) { console.error(e); if (window.logAppError) window.logAppError({ source: "admin", category: "dashboard", level: "error", code: "ADMIN_OP_FAIL", message: String((e && e.message) || e || "") }); showNotice("Không thể cập nhật quyền.", "error"); }
};
function openRoleDropdown(trigger) {
  const wrap = trigger.closest(".role-select");
  if (!wrap) return;
  const dd = wrap.querySelector(".role-dropdown");
  if (!dd) return;
  const wasOpen = dd.classList.contains("open");
  document.querySelectorAll(".role-dropdown.open").forEach(d => {
    d.classList.remove("open");
    d.style.top = "";
    d.style.left = "";
    d.style.transform = "";
  });
  if (!wasOpen) {
    const r = trigger.getBoundingClientRect();
    dd.style.left = `${Math.min(r.left, window.innerWidth - 190)}px`;
    dd.style.top = `${Math.max(8, r.top - 8)}px`;
    dd.style.transform = "translateY(-100%)";
    dd.classList.add("open");
  }
}
window.toggleRoleDropdown = (trigger) => {
  openRoleDropdown(trigger);
};
window.pickRole = async (uid, role, source) => {
  const wrap = source?.closest ? source.closest(".role-select") : source;
  if (!wrap) return;
  const dd = wrap.querySelector(".role-dropdown");
  if (dd) dd.classList.remove("open");
  if (wrap.dataset.role === role) return;
  await changeUserRole(uid, role);
  wrap.dataset.role = role;
  const trigger = wrap.querySelector(".role-trigger");
  const dot = trigger?.querySelector(".role-dot");
  const label = trigger?.querySelector(".role-label");
  if (dot) dot.className = "role-dot " + (role==='Admin'?'r-admin':role==='Giáo viên'?'r-teacher':'r-member');
  if (label) label.textContent = role;
  wrap.querySelectorAll(".role-option").forEach(o => o.classList.toggle("active", o.dataset.role === role));
};
directoryTableBody.addEventListener("click", (e) => {
  const trigger = e.target.closest(".role-trigger");
  if (trigger) {
    e.stopPropagation();
    openRoleDropdown(trigger);
    return;
  }

  const option = e.target.closest(".role-option");
  if (option) {
    e.stopPropagation();
    const wrap = option.closest(".role-select");
    const uid = wrap?.dataset?.uid || "";
    const role = option.dataset.role;
    if (wrap && role) {
      void window.pickRole(uid, role, option);
    }
  }
});
document.addEventListener("click", (e) => {
  if (!e.target.closest(".role-select")) {
    document.querySelectorAll(".role-dropdown.open").forEach(d => {
      d.classList.remove("open");
      d.style.top = "";
      d.style.left = "";
      d.style.transform = "";
    });
  }
});
window.deleteUserData = async (uid, email) => {
  const has=Boolean(uid);
  if (!(await lhConfirm(has?"Xóa hồ sơ và gỡ khỏi whitelist?":"Xóa email khỏi whitelist?"))) return;
  if (has) await supabase.from("users").delete().eq("id", uid);
  const ne=normalizeEmail(email);
  if (ne) { const { data } = await supabase.from("access_list").select("email").eq("email", ne).maybeSingle(); if (data) await supabase.from("access_list").delete().eq("email", ne); }
  showNotice(has?"Đã xóa hồ sơ user và gỡ whitelist.":"Đã xóa email khỏi whitelist.", "success");
};

// ================= WEEKLY RESET =================
function getCurrentWeekKey() {
  const now = new Date();
  const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

async function loadWeeklyResetForm() {
  const currentWeek = getCurrentWeekKey();
  weeklyResetCurrentWeek.textContent = currentWeek;
  try {
    const { data: d } = await supabase.from("weekly_reset").select("*").eq("id", true).maybeSingle();
    if (d) {
      weeklyResetLastTime.textContent = d.last_reset_at ? formatDate(d.last_reset_at) : "Chưa từng reset";
      weeklyResetLastBy.textContent = d.last_reset_by || "—";
      weeklyResetStatusBanner.textContent = `Tuần ${currentWeek} · Đã reset ${d.reset_count || 0} lần`;
      weeklyResetStatusBanner.style.background = "#eff6ff";
      weeklyResetStatusBanner.style.color = "#1e40af";
      weeklyResetStatusBanner.style.border = "1px solid #bfdbfe";
    } else {
      weeklyResetLastTime.textContent = "Chưa từng reset";
      weeklyResetLastBy.textContent = "—";
      weeklyResetStatusBanner.textContent = `Tuần ${currentWeek} · Chưa từng reset`;
      weeklyResetStatusBanner.style.background = "#f8fafc";
      weeklyResetStatusBanner.style.color = "#64748b";
      weeklyResetStatusBanner.style.border = "1px solid #e2e8f0";
    }
  } catch (e) {
    console.error(e); if (window.logAppError) window.logAppError({ source: "admin", category: "dashboard", level: "error", code: "ADMIN_OP_FAIL", message: String((e && e.message) || e || "") });
    weeklyResetStatusBanner.textContent = "Không tải được thông tin reset.";
    weeklyResetStatusBanner.style.background = "#fef2f2";
    weeklyResetStatusBanner.style.color = "#b91c1c";
    weeklyResetStatusBanner.style.border = "1px solid #fecaca";
  }
}

document.getElementById("manualResetBtn").addEventListener("click", async () => {
  const resetScore = document.getElementById("resetScoreCheck").checked;
  const resetTime = document.getElementById("resetTimeCheck").checked;

  if(!resetScore && !resetTime){
    showNotice("Vui lòng chọn ít nhất một mục cần reset.", "warning");
    return;
  }

  const modal = document.getElementById("confirmModal");
  const mI = document.getElementById("confirmModalIcon");
  const mT = document.getElementById("confirmModalTitle");
  const mM = document.getElementById("confirmModalMessage");
  const cB = document.getElementById("confirmModalConfirm");

  const targets = [];
  if(resetScore) targets.push("điểm số");
  if(resetTime) targets.push("thời gian online");

  mI.textContent = "⚠️";
  mT.textContent = `Reset ${targets.join(" & ")}?`;
  mM.textContent = `Hành động này sẽ reset ${targets.join(" và ")}. Bạn có chắc?`;
  modal.classList.add("active");

  const onConfirm = async () => {
    modal.classList.remove("active");
    cB.removeEventListener("click", onConfirm);
    document.getElementById("confirmModalCancel").removeEventListener("click", onCancel);

    const btn = document.getElementById("manualResetBtn");
    btn.disabled = true;
    btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="animation:spin .8s linear infinite"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>Đang reset...';

    try {
      const currentWeek = getCurrentWeekKey();
      let count = 0;

      // Reset điểm số
      if(resetScore){
        const { data: stats } = await supabase.from("test_stats").select("user_id");
        for (const s of (stats || [])) {
          await supabase.from("test_stats").update({
            total_tests: 0,
            total_score: 0,
            best_score: 0,
            week_key: currentWeek,
            updated_at: new Date().toISOString()
          }).eq("user_id", s.user_id);
          count++;
        }
      }

      // Reset thời gian online
      if(resetTime){
        const { data: users } = await supabase.from("users").select("id");
        for (const s of (users || [])) {
          // online_start_time = 0 để profile/leaderboard KHÔNG tự cộng phần phiên đang online
          // (condition `online_start_time > 0` fail) -> hiển thị về 0 ngay lập tức.
          // Phiên online của user sẽ đếm lại từ đầu khi họ mở lại (users_begin_online thấy start=0).
          await supabase.from("users").update({
            online_timer: 0,
            online_start_time: 0,
            online_week_key: currentWeek
          }).eq("id", s.id);
          if(!resetScore) count++;
        }
      }

      const now = new Date().toISOString();
      const { data: resetDoc } = await supabase.from("weekly_reset").select("reset_count").eq("id", true).maybeSingle();
      const prevCount = resetDoc ? (resetDoc.reset_count || 0) : 0;

      await supabase.from("weekly_reset").upsert({
        id: true,
        last_reset_at: now,
        last_reset_by: adminEmail,
        week_key: currentWeek,
        reset_count: prevCount + 1,
        users_reset: count,
        reset_targets: targets.join(", ")
      }, { onConflict: "id" });

      showNotice(`Đã reset ${targets.join(" & ")} thành công cho ${count} user.`, "success");
      await loadWeeklyResetForm();
    } catch (e) {
      console.error(e); if (window.logAppError) window.logAppError({ source: "admin", category: "dashboard", level: "error", code: "ADMIN_OP_FAIL", message: String((e && e.message) || e || "") });
      showNotice("Reset thất bại.", "error");
    }

    btn.disabled = false;
    btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>Reset ngay bây giờ';
  };

  const onCancel = () => {
    modal.classList.remove("active");
    cB.removeEventListener("click", onConfirm);
    document.getElementById("confirmModalCancel").removeEventListener("click", onCancel);
  };

  cB.addEventListener("click", onConfirm);
  document.getElementById("confirmModalCancel").addEventListener("click", onCancel);
});

document.getElementById("logoutAllBtn").addEventListener("click", async () => {
  const onlineCount = userDocs.filter(i => i.online && i.last_active && (Date.now() - i.last_active) < 10000).length;
  if(onlineCount === 0){ showNotice("Không có user nào đang online.", "info"); return; }

  const modal = document.getElementById("confirmModal");
  const mI = document.getElementById("confirmModalIcon");
  const mT = document.getElementById("confirmModalTitle");
  const mM = document.getElementById("confirmModalMessage");
  const cB = document.getElementById("confirmModalConfirm");

  mI.textContent = "⚠️";
  mT.textContent = `Đăng xuất ${onlineCount} user đang online?`;
  mM.textContent = "Tất cả user đang online sẽ bị đánh dấu offline. User đang mở tab sẽ tự động online lại sau 5 giây.";
  modal.classList.add("active");

  const onConfirm = async () => {
    modal.classList.remove("active");
    cB.removeEventListener("click", onConfirm);
    document.getElementById("confirmModalCancel").removeEventListener("click", onCancel);

    const btn = document.getElementById("logoutAllBtn");
    btn.disabled = true;
    btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="animation:spin .8s linear infinite"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>Đang xử lý...';

    try {
      const { data: users } = await supabase.from("users").select("id, online");
      let count = 0;
      for (const u of (users || [])) {
        if(u.online){
          await adminFinalizeOnline(u.id);
          count++;
        }
      }
      showNotice(`Đã đăng xuất ${count} user.`, "success");
    } catch (e) {
      console.error(e); if (window.logAppError) window.logAppError({ source: "admin", category: "dashboard", level: "error", code: "ADMIN_OP_FAIL", message: String((e && e.message) || e || "") });
      showNotice("Đăng xuất tất cả thất bại.", "error");
    }

    btn.disabled = false;
    btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>Đăng xuất tất cả';
  };

  const onCancel = () => {
    modal.classList.remove("active");
    cB.removeEventListener("click", onConfirm);
    document.getElementById("confirmModalCancel").removeEventListener("click", onCancel);
  };

  cB.addEventListener("click", onConfirm);
  document.getElementById("confirmModalCancel").addEventListener("click", onCancel);
});

// ============================== ERROR LOGS ==============================
const ERROR_LOG_PAGE_SIZE = 15;
const ERROR_LOG_LEVELS = { error: ["Nghiêm trọng", "var(--red)"], warning: ["Cảnh báo", "var(--amber)"], info: ["Bình thường", "var(--blue)"] };
const ERROR_LOG_CATS = { ai: "AI", whitelist: "Whitelist", disabled: "Khóa user", auth: "Xác thực", feature: "Tính năng", test: "Tải bài test" };
let errorLogsLoaded = false;

async function loadErrorLogs() {
  if (!errorLogsLoaded) {
    errorLogsLoaded = true;
    try { await supabase.rpc("cleanup_error_logs", { p_days: 7 }); }
    catch (e) { console.error("cleanup_error_logs:", e); }
    subscribeErrorLogsRealtime();
  }
  await fetchErrorLogs();
}

async function fetchErrorLogs(preservePage = false) {
  errorLogsTableBody.innerHTML = `<tr><td colspan="8"><div class="empty">Đang tải log...</div></td></tr>`;
  try {
    const { data, error } = await supabase
      .from("error_logs")
      .select("id, created_at, url, email, source, category, level, code, message, detail, status, resolved_at, resolved_by")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw error;
    errorLogsData = data || [];
    if (!preservePage) errorLogsPage = 1;
    renderErrorLogs();
  } catch (e) {
    console.error(e); if (window.logAppError) window.logAppError({ source: "admin", category: "dashboard", level: "error", code: "ADMIN_OP_FAIL", message: String((e && e.message) || e || "") });
    errorLogsTableBody.innerHTML = `<tr><td colspan="8"><div class="empty">Không tải được log. Kiểm tra quyền admin hoặc bảng <b>error_logs</b> chưa được tạo trong Supabase (xem supabase/schema.sql).</div></td></tr>`;
    renderErrorLogsStats([]);
  }
}

function filteredErrorLogs() {
  const kw = normalizeEmail(errorLogsSearchInput.value);
  const lv = errorLogsLevelSelect.value, st = errorLogsStatusSelect.value, ca = errorLogsCategorySelect.value;
  return errorLogsData.filter(l => {
    if (lv !== "all" && l.level !== lv) return false;
    if (st === "open" && l.status === "fixed") return false;
    if (st === "fixed" && l.status !== "fixed") return false;
    if (ca !== "all" && l.category !== ca) return false;
    if (kw) {
      const dMsg = (l.detail && typeof l.detail === "object" && l.detail.message) || "";
      if (!normalizeEmail([l.email, l.source, l.code, l.message, dMsg].join(" ")).includes(kw)) return false;
    }
    return true;
  });
}

function renderErrorLogsStats() {
  const open = errorLogsData.filter(l => l.status !== "fixed").length;
  const err = errorLogsData.filter(l => l.level === "error").length;
  const warn = errorLogsData.filter(l => l.level === "warning").length;
  const info = errorLogsData.filter(l => l.level === "info").length;
  const card = (label, value, color) => `<div style="padding:10px 16px;background:var(--bg);border:1px solid var(--border);border-radius:var(--r-sm);min-width:110px"><div style="font-size:20px;font-weight:800;color:${color}">${value}</div><div style="font-size:10.5px;color:var(--text-3);font-weight:600;text-transform:uppercase;letter-spacing:.04em">${label}</div></div>`;
  errorLogsStats.innerHTML = card("Còn lỗi", open, "var(--red)") + card("Nghiêm trọng", err, "var(--red)") + card("Cảnh báo", warn, "var(--amber)") + card("Bình thường", info, "var(--blue)");
  const badge = document.getElementById("errorLogsBadge");
  if (badge) {
    const total = errorLogsData.length;
    badge.textContent = total;
    badge.classList.toggle("visible", total > 0);
    badge.classList.toggle("all-fixed", open === 0);
  }
}

function renderErrorLogs() {
  renderErrorLogsStats();
  const filtered = filteredErrorLogs();
  const total = filtered.length, totalPages = Math.max(1, Math.ceil(total / ERROR_LOG_PAGE_SIZE));
  if (errorLogsPage > totalPages) errorLogsPage = totalPages;
  const start = (errorLogsPage - 1) * ERROR_LOG_PAGE_SIZE;
  const paged = filtered.slice(start, start + ERROR_LOG_PAGE_SIZE);
  if (!paged.length) {
    errorLogsTableBody.innerHTML = `<tr><td colspan="8"><div class="empty">${total ? "Trang này không có log." : "Chưa có log nào khớp bộ lọc."}</div></td></tr>`;
    renderErrorLogsPagination(total, totalPages);
    return;
  }
  errorLogsTableBody.innerHTML = paged.map(l => {
    const lv = ERROR_LOG_LEVELS[l.level] || ["—", "var(--text-3)"];
    const cat = ERROR_LOG_CATS[l.category] || escapeHtml(l.category || "—");
    const fixed = l.status === "fixed";
    const detail = (l.detail && typeof l.detail === "object") ? l.detail : {};
    const detailSnippet = detail.models || detail.model || "";
    const sid = escapeHtml(l.id);
    return `<tr>
      <td><div class="mini-meta" style="white-space:nowrap">${formatDate(l.created_at)}</div></td>
      <td><span style="display:inline-block;padding:2px 9px;border-radius:20px;font-size:11px;font-weight:700;color:#fff;background:${lv[1]};white-space:nowrap">${lv[0]}</span></td>
      <td><span class="mini-meta" style="white-space:nowrap">${cat}</span></td>
      <td><span class="mini-meta">${escapeHtml(l.email || "—")}</span></td>
      <td><code style="font-size:11px;white-space:nowrap">${escapeHtml(l.code || "—")}</code></td>
      <td><div class="mini-meta" style="max-width:260px;cursor:pointer" onclick="viewErrorLogDetail('${sid}')" title="Bấm để xem nội dung đầy đủ"><div style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--blue);text-decoration:underline;text-decoration-style:dotted">${escapeHtml(l.message || "—")}</div>${detailSnippet ? `<div style="color:var(--text-3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:11px">${escapeHtml(detailSnippet)}</div>` : ""}</div></td>
      <td style="white-space:nowrap">${fixed ? `<span class="chip green" style="min-width:58px;text-align:center;display:inline-block">Đã fix</span>` : `<span class="chip red" style="min-width:58px;text-align:center;display:inline-block">Còn lỗi</span>`}</td>
      <td><div class="row-actions">
        <button class="btn ${fixed ? "btn-soft" : "btn-success"}" onclick="toggleErrorLogFixed('${sid}', ${fixed})" title="${fixed ? "Mở lại" : "Đánh dấu đã fix"}" style="padding:8px 10px">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:15px;height:15px"><polyline points="20 6 9 17 4 12"/></svg>
        </button>
        <button class="btn btn-danger" onclick="deleteErrorLog('${sid}')" title="Xóa log" style="padding:8px 10px">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:15px;height:15px"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
        </button>
      </div></td>
    </tr>`;
  }).join("");
  renderErrorLogsPagination(total, totalPages);
}

function renderErrorLogsPagination(total, totalPages) {
  if (totalPages <= 1) { errorLogsPagination.innerHTML = `<div class="pagination-info">Tổng: ${total} log</div>`; return; }
  const from = (errorLogsPage - 1) * ERROR_LOG_PAGE_SIZE + 1, to = Math.min(errorLogsPage * ERROR_LOG_PAGE_SIZE, total);
  let btns = `<button class="page-btn" onclick="goErrorLogsPage(${errorLogsPage - 1})" ${errorLogsPage === 1 ? "disabled" : ""}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M15 18l-6-6 6-6"/></svg></button>`;
  const pages = [1];
  if (errorLogsPage > 3) pages.push("...");
  for (let p = Math.max(2, errorLogsPage - 1); p <= Math.min(totalPages - 1, errorLogsPage + 1); p++) pages.push(p);
  if (errorLogsPage < totalPages - 2) pages.push("...");
  if (totalPages > 1) pages.push(totalPages);
  pages.forEach(p => {
    if (p === "...") btns += `<span class="page-ellipsis">...</span>`;
    else btns += `<button class="page-btn${p === errorLogsPage ? " active" : ""}" onclick="goErrorLogsPage(${p})">${p}</button>`;
  });
  btns += `<button class="page-btn" onclick="goErrorLogsPage(${errorLogsPage + 1})" ${errorLogsPage === totalPages ? "disabled" : ""}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 18l6-6-6-6"/></svg></button>`;
  errorLogsPagination.innerHTML = `<div class="pagination-info">Hiển thị ${from}–${to} / ${total} log</div><div class="pagination-controls">${btns}</div>`;
}
window.goErrorLogsPage = (p) => { errorLogsPage = p; renderErrorLogs(); };

window.toggleErrorLogFixed = async (id, fixed) => {
  const target = !fixed;
  const update = target
    ? { status: "fixed", resolved_by: adminEmail, resolved_at: new Date().toISOString() }
    : { status: "open", resolved_by: null, resolved_at: null };
  const { error } = await supabase.from("error_logs").update(update).eq("id", id);
  if (error) { console.error(error); if (window.logAppError) window.logAppError({ source: "admin", category: "dashboard", level: "error", code: "ADMIN_OP_FAIL", message: String((error && error.message) || error || "") }); showNotice("Không cập nhật được log.", "error"); return; }
  const item = errorLogsData.find(x => x.id === id);
  if (item) item.status = target ? "fixed" : "open";
  renderErrorLogs();
  showNotice(target ? "Đã đánh dấu log đã fix." : "Đã mở lại log.", "success");
};

let confirmDialogHandler = null;
function openConfirmDialog(title, message, onYes) {
  const modal = document.getElementById("confirmModal");
  const cB = document.getElementById("confirmModalConfirm");
  const cC = document.getElementById("confirmModalCancel");
  document.getElementById("confirmModalIcon").textContent = "⚠️";
  document.getElementById("confirmModalTitle").textContent = title;
  document.getElementById("confirmModalMessage").textContent = message;
  if (confirmDialogHandler) {
    cB.removeEventListener("click", confirmDialogHandler);
    cC.removeEventListener("click", confirmDialogHandler);
  }
  confirmDialogHandler = () => {
    modal.classList.remove("active");
    cB.removeEventListener("click", confirmDialogHandler);
    cC.removeEventListener("click", confirmDialogHandler);
    confirmDialogHandler = null;
    onYes();
  };
  cB.addEventListener("click", confirmDialogHandler);
  cC.addEventListener("click", confirmDialogHandler);
  modal.classList.add("active");
}

window.deleteErrorLog = (id) => {
  openConfirmDialog("Xóa log này?", "Log sẽ bị xóa vĩnh viễn và không thể khôi phục.", async () => {
    const { error } = await supabase.from("error_logs").delete().eq("id", id);
    if (error) { console.error(error); if (window.logAppError) window.logAppError({ source: "admin", category: "dashboard", level: "error", code: "ADMIN_OP_FAIL", message: String((error && error.message) || error || "") }); showNotice("Xóa log thất bại.", "error"); return; }
    errorLogsData = errorLogsData.filter(x => x.id !== id);
    renderErrorLogs();
    showNotice("Đã xóa log.", "success");
  });
};

function viewErrorLogDetail(id) {
  const l = errorLogsData.find(x => x.id === id);
  if (!l) return;
  const detail = (l.detail && typeof l.detail === "object") ? l.detail : {};
  const lvl = ERROR_LOG_LEVELS[l.level] || ["—", "var(--text-3)"];
  const levelColor = lvl[1];
  const fixed = l.status === "fixed";
  const statusColor = fixed ? "var(--green)" : "var(--red)";

  const head = document.getElementById("logDetailHead");
  head.style.background = `linear-gradient(135deg, ${levelColor} 0%, color-mix(in srgb, ${levelColor} 65%, #0f172a) 100%)`;
  document.getElementById("logDetailLevelChip").textContent = lvl[0];
  document.getElementById("logDetailTitle").textContent = l.code ? `Chi tiết log · ${l.code}` : "Chi tiết log";

  const cell = (k, v, cls = "") => `<div class="cell ${cls}"><div class="log-detail-key">${escapeHtml(k)}</div><div class="log-detail-val">${v}</div></div>`;
  const grid = [
    cell("Thời gian", escapeHtml(formatDate(l.created_at))),
    cell("Mức độ", `<span style="color:${levelColor};font-weight:800">${lvl[0]}</span>`),
    cell("Loại", escapeHtml(ERROR_LOG_CATS[l.category] || l.category || "—")),
    cell("Nguồn", escapeHtml(l.source || "—")),
    cell("User", escapeHtml(l.email || "—")),
    cell("Mã lỗi", `<code style="font-size:12px;font-weight:700">${escapeHtml(l.code || "—")}</code>`),
    cell("Trạng thái", `<span style="color:${statusColor};font-weight:800">${fixed ? "Đã fix" : "Còn lỗi"}</span>`),
    cell("URL", escapeHtml(l.url || "—"), "span2")
  ].join("");

  let html = `<div class="log-detail-grid">${grid}</div>`;
  html += `<div style="margin-bottom:14px"><div class="log-detail-key">Nội dung đầy đủ</div><div style="margin-top:4px;padding:12px 14px;background:var(--bg);border:1px solid var(--border);border-radius:var(--r-sm);white-space:pre-wrap;word-break:break-word;color:var(--text);font-size:13px;line-height:1.6">${escapeHtml(l.message || "—")}</div></div>`;
  const entries = Object.entries(detail);
  if (entries.length) {
    html += `<div class="log-detail-key" style="margin-bottom:4px">Thông tin thêm (detail)</div><pre style="background:#0f172a;color:#e2e8f0;border:1px solid var(--border);border-radius:var(--r-sm);padding:12px;font-size:12px;overflow:auto;white-space:pre-wrap;word-break:break-word;margin:0">${escapeHtml(JSON.stringify(detail, null, 2))}</pre>`;
  }
  document.getElementById("logDetailBody").innerHTML = html;
  document.getElementById("logDetailModal").classList.add("active");
}

function closeLogDetail() {
  document.getElementById("logDetailModal").classList.remove("active");
}
window.viewErrorLogDetail = viewErrorLogDetail;
window.closeLogDetail = closeLogDetail;
document.getElementById("logDetailModal").addEventListener("click", (e) => {
  if (e.target === document.getElementById("logDetailModal")) closeLogDetail();
});

function subscribeErrorLogsRealtime() {
  if (errorLogsChannel) return;
  errorLogsChannel = supabase.channel("error_logs_realtime")
    .on("postgres_changes", { event: "*", schema: "public", table: "error_logs" }, async () => {
      if (!errorLogsTabPanel.classList.contains("hidden")) {
        fetchErrorLogs(true);
      } else {
        const { count: total } = await supabase.from("error_logs").select("id", { count: "exact", head: true });
        const { count: open } = await supabase.from("error_logs").select("id", { count: "exact", head: true }).neq("status", "fixed");
        const badge = document.getElementById("errorLogsBadge");
        if (badge) {
          badge.textContent = total || 0;
          badge.classList.toggle("visible", total > 0);
          badge.classList.toggle("all-fixed", open === 0);
        }
      }
    })
    .subscribe();
}

errorLogsSearchInput.addEventListener("input", () => { errorLogsPage = 1; renderErrorLogs(); });
errorLogsLevelSelect.addEventListener("change", () => { errorLogsPage = 1; renderErrorLogs(); });
errorLogsStatusSelect.addEventListener("change", () => { errorLogsPage = 1; renderErrorLogs(); });
errorLogsCategorySelect.addEventListener("change", () => { errorLogsPage = 1; renderErrorLogs(); });
document.getElementById("errorLogsRefreshBtn").addEventListener("click", () => fetchErrorLogs());

supabase.auth.onAuthStateChange(async (event, session) => {
  const user = session?.user ?? null;
  if (!user) {
    loginView.style.display="flex"; dashboardView.classList.add("hidden"); return;
  }
  const ok = await ensureAdmin(user); if (!ok) return;
  document.getElementById("adminPasswordInput").value="";
  loginView.style.display="none"; dashboardView.classList.remove("hidden"); dashboardView.style.display="flex";
  await refreshCollections();
  const { count: total } = await supabase.from("error_logs").select("id", { count: "exact", head: true });
  const { count: open } = await supabase.from("error_logs").select("id", { count: "exact", head: true }).neq("status", "fixed");
  const badge = document.getElementById("errorLogsBadge");
  if (badge) {
    badge.textContent = total || 0;
    badge.classList.toggle("visible", total > 0);
    badge.classList.toggle("all-fixed", open === 0);
  }
  const { data: maint } = await supabase.from("maintenance_settings").select("enabled").eq("id", true).maybeSingle();
  updateMaintenanceBadge(maint && maint.enabled);
  const { data: reg } = await supabase.from("registration_settings").select("enabled").eq("id", true).maybeSingle();
  updateRegistrationBadge(reg && reg.enabled);
});

// Relay admin session to leaderboard iframe
const leaderboardFrame = document.getElementById("leaderboardFrame");
async function sendAdminSessionToLeaderboard() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session && leaderboardFrame && leaderboardFrame.contentWindow) {
      leaderboardFrame.contentWindow.postMessage({
        type: "ADMIN_SESSION",
        accessToken: session.access_token,
        refreshToken: session.refresh_token
      }, "*");
    }
  } catch(e) {}
}
if (leaderboardFrame) {
  leaderboardFrame.addEventListener("load", sendAdminSessionToLeaderboard);
}

// Tự refresh dashboard + quét user online hết hạn (crash) mỗi 30s → chống báo online ảo.
setInterval(async () => {
  if (loginView.style.display === "flex") return;
  await adminCleanupStaleOnline();
  await refreshCollections();
}, 30000);

