
import { supabase, SUPABASE_URL, getMaintenance, subscribeMaintenance, emailAllowed, getUserRow, onAuthChange, escapeHtml, escapeUrl, beginOnlineSession, finalizeOnlineSession, logAppError } from "./supabase-config.js";
import { createUserStats, updateUserStats } from "./learnhub-stats.js";
import { isPasswordRecovery } from "./reset-password.js";
window.logAppError = logAppError;
window.supabaseClient = supabase;
window.escapeHtml = escapeHtml;

const TRUSTED_ORIGIN = location.origin;

let currentSupabaseUser = null;
let activeInterval = null;
let onlineTimerInterval = null;
const previewMode = new URLSearchParams(window.location.search).get("preview") === "1";

// ================= MAINTENANCE MODE (realtime, đọc từ Supabase maintenance_settings) =================
let maintenanceState = { enabled: false, message: "", initialized: false };
let previousMaintenanceEnabled = false;

function handleMaintenanceTransition(newEnabled){
  // Only sign out when maintenance is newly enabled (transition false -> true)
  try {
    if(newEnabled && !previousMaintenanceEnabled && currentSupabaseUser){
      console.trace("SIGN OUT (maintenance mode - transition)");
      finalizeOnlineSession(currentSupabaseUser.id);
      supabase.auth.signOut().catch(()=>{});
      // ensure UI stays on maintenance after sign out
      setTimeout(() => applyMaintenanceUI(), 100);
    }
  } catch(e) {}
  previousMaintenanceEnabled = Boolean(newEnabled);
}

function applyMaintenanceUI(){
  const overlay = document.getElementById("maintenanceOverlay");
  if(!overlay) return;

  const isMaintenanceActive = !maintenanceState.initialized || maintenanceState.enabled;

  if(isMaintenanceActive){
    const statusEl = document.getElementById("maintenanceStatusText");
    
    if(statusEl){
      statusEl.textContent = maintenanceState.message 
        ? "🔧 " + maintenanceState.message 
        : "🔧 Đang cập nhật...";
    }
    
    overlay.style.display = "flex";
    document.body.classList.add("maintenance-active");
  } else {
    overlay.style.display = "none";
    document.body.classList.remove("maintenance-active");
  }
}

applyMaintenanceUI();

// Lắng nghe realtime để: (1) chặn ngay lập tức mọi truy cập mới, (2) đá văng
// (signOut) tất cả user đang đăng nhập ngay khi admin bật bảo trì lên.
try {
  getMaintenance().then((_m) => {
    maintenanceState = { enabled: _m.enabled, message: _m.message, initialized: true };
    handleMaintenanceTransition(maintenanceState.enabled);
    applyMaintenanceUI();
  }).catch(() => {});
} catch (e) {
  maintenanceState = { enabled: true, message: "", initialized: true };
  applyMaintenanceUI();
  console.warn("Không thể lắng nghe trạng thái bảo trì:", e);
}

try {
  subscribeMaintenance((data) => {
    const newEnabled = data.enabled;
    maintenanceState = { enabled: newEnabled, message: data.message, initialized: true };
    // handle transition-based sign out (only when it turns on)
    handleMaintenanceTransition(newEnabled);
    applyMaintenanceUI();
    // If maintenance just turned on, redirect to standalone maintenance page
    try{
      if(newEnabled){
        // avoid redirecting if already on maintenance page
        if(!location.pathname.endsWith('/maintenance.html') && !location.pathname.endsWith('maintenance.html')){
          try { window.location.replace('maintenance.html'); } catch(e){ window.location.href = 'maintenance.html'; }
        }
      }
    } catch(e){}
  });
} catch (e) {
  maintenanceState = { enabled: true, message: "", initialized: true };
  applyMaintenanceUI();
  console.warn("Không thể lắng nghe trạng thái bảo trì:", e);
}

// ================= DÒNG CHỮ CHẠY (ticker, đọc realtime từ ticker_settings) =================
let tickerApplied = false;
let tickerLastSpeed = null;
let tickerResizeTimer = null;

// Mobile màn hẹp => quãng đường 1 vòng ngắn hơn desktop nên cùng số giây sẽ
// thấy chữ chạy chậm hẳn. Co thời lượng theo quãng đường thực tế để tốc độ
// cảm giác (px/s) ≈ desktop.
const TICKER_REF_DIST = 1700; // quãng đường tham chiếu 1 vòng trên desktop (px)

function setTickerDuration(el, secs) {
  if (!window.matchMedia("(max-width:768px)").matches) {
    el.style.animationDuration = secs + "s";
    el.style.setProperty("--ticker-dur", secs + "s");
    return;
  }
  // offsetWidth đã gồm padding-left:100% (bề ngang khung) + chiều dài chữ
  const dist = Math.max(1, el.offsetWidth);
  const scaled = Math.round(secs * dist / TICKER_REF_DIST * 10) / 10;
  const dur = Math.min(90, Math.max(5, scaled)) + "s";
  el.style.animationDuration = dur;
  el.style.setProperty("--ticker-dur", dur);
}

function applyTicker(text, speedSeconds) {
  const el = document.querySelector(".ticker-text");
  if (!el) return false;
  if (typeof text === "string" && text.trim() !== "") el.textContent = text;
  const secs = Number(speedSeconds) || 18;
  tickerLastSpeed = secs;
  setTickerDuration(el, secs);
  tickerApplied = true;
  return true;
}

// Xoay ngang / kéo cửa sổ: tính lại thời lượng cho khớp tốc độ desktop
window.addEventListener("resize", () => {
  clearTimeout(tickerResizeTimer);
  tickerResizeTimer = setTimeout(() => {
    const el = document.querySelector(".ticker-text");
    if (el && tickerLastSpeed) setTickerDuration(el, tickerLastSpeed);
  }, 200);
});

async function initTicker() {
  let tries = 0;
  const attempt = async () => {
    if (tickerApplied) return;
    if (!document.querySelector(".ticker-text")) {
      if (tries++ < 40) setTimeout(attempt, 300);
      return;
    }
    try {
      const { data } = await supabase.from("ticker_settings").select("*").eq("id", true).maybeSingle();
      if (data) {
        applyTicker(data.text, data.speed_seconds);
      } else {
        applyTicker(null, 18);
      }
    } catch (e) {
      if (tries++ < 40) setTimeout(attempt, 300);
    }
  };
  attempt();
}
initTicker();

try {
  supabase.channel("ticker-realtime")
    .on("postgres_changes", { event: "*", schema: "public", table: "ticker_settings" }, (payload) => {
      const d = payload.new || {};
      applyTicker(d.text, d.speed_seconds);
    })
    .subscribe();
} catch (e) {
  console.warn("Không thể lắng nghe dòng chữ chạy:", e);
}

function applyUserToUI(user){
const hour = new Date().getHours();
let greeting = "";
let quote = "";

if (hour >= 5 && hour < 11) {
greeting = "☀️ Chào buổi sáng,";
quote = "Chúc bạn một ngày học tập năng suất!";
} else if (hour >= 11 && hour < 14) {
greeting = "🌤️ Nghỉ trưa thôi,";
quote = "Nạp năng lượng để chiến đấu tiếp nhé!";
} else if (hour >= 14 && hour < 18) {
greeting = "☕ Chào buổi chiều,";
quote = "Sắp hết ngày rồi, cố gắng lên nào!";
} else {
greeting = "🌙 Chào buổi tối,";
quote = "Đừng thức quá khuya, giữ sức khỏe nhé!";
}

const greetingEl = document.getElementById("greetingText");
if(greetingEl){
greetingEl.innerText = greeting;
}

const nameEl = document.getElementById("popupName");
if(nameEl) nameEl.innerText = user.displayName || "Bạn";

const emailEl = document.getElementById("popupEmail");
if(emailEl) emailEl.innerText = user.email || "preview@local.test";

const quoteEl = document.getElementById("popupQuote");
if(quoteEl) quoteEl.innerText = quote;

document.getElementById("welcomeText").innerText = "Chúc bạn một ngày tốt lành,";
document.getElementById("userName").innerText = user.displayName || "Preview User";

const avatar = user.photoURL || "https://i.imgur.com/6VBx3io.png";

const userAvatar = document.getElementById("userAvatar");
if(userAvatar){
userAvatar.src = avatar;
userAvatar.alt = user.displayName
  ? `Ảnh đại diện của ${user.displayName}`
  : "Ảnh đại diện người dùng";
}

const popupAvatar = document.getElementById("popupAvatar");
if (popupAvatar) {
  popupAvatar.src = avatar;
  popupAvatar.alt = user.displayName
    ? `Ảnh đại diện của ${user.displayName}`
    : "Ảnh đại diện người dùng";
}
}

function showContent(){
  document.getElementById("mainContent").classList.add("show");
  appLoadingComplete = true;
}

function enterPreviewMode(){
  const previewUser = {
    uid: "preview-user",
    displayName: "Preview User",
    email: "preview@local.test",
    photoURL: "https://i.imgur.com/6VBx3io.png"
  };

  applyUserToUI(previewUser);

  const forumIframe = document.getElementById("forumFrame");
  if (forumIframe && forumIframe.contentWindow) {
    forumIframe.contentWindow.postMessage({
      type: "USER_INFO",
      user: {
        uid: previewUser.uid,
        name: previewUser.displayName,
        role: previewUser.role || "member"
      }
    }, TRUSTED_ORIGIN);
  }

  showContent();
}

let accessGuardInterval = null;
let userGuardChannel = null;
let broadcastGuardChannel = null;
let welcomeGuardChannel = null;
let authGuardTriggered = false;
let welcomePopupCache = null;
let appLoadingComplete = false;
let welcomeShown = false;

const WELCOME_POPUP_DEFAULT = {
  title: "📢 Thông báo",
  message: "<b>CẢM ƠN CÁC BẠN ĐÃ TIN TƯỞNG VÀ SỬ DỤNG HỆ SINH THÁI LEARNHUB PLATFORM</b>",
  active: true
};

function maybeShowWelcomePopup(data){
  const payload = data || welcomePopupCache;
  if(!payload || payload.active === false) return;
  if(!appLoadingComplete) return;

  const showMode = payload.showMode === "daily" ? "daily" : "every_time";
  const now = new Date();
  const todayStr = now.getFullYear() + "-" + String(now.getMonth()+1).padStart(2,"0") + "-" + String(now.getDate()).padStart(2,"0");

  if(showMode === "daily"){
    const seenDate = localStorage.getItem("learnhub_welcome_popup_daily");
    if(seenDate === todayStr) return;
  } else {
    const version = String(payload.updatedAt || "default");
    const seenKey = "learnhub_welcome_popup_seen";
    if(localStorage.getItem(seenKey) === version) return;
    window.lastWelcomePopupVersion = version;
  }

  window.lastWelcomePopupShowMode = showMode;
  if(typeof window.showMainPopup === "function"){
    window.showMainPopup(
      payload.title || WELCOME_POPUP_DEFAULT.title,
      payload.message || WELCOME_POPUP_DEFAULT.message
    );
  }
}

window.markAppLoadingComplete = function(){
  appLoadingComplete = true;
  maybeShowWelcomePopup(welcomePopupCache);
};

window.resetAppLoadingComplete = function(){
  appLoadingComplete = false;
};

function stopAccessGuards(){
  if(accessGuardInterval){
    clearInterval(accessGuardInterval);
    accessGuardInterval = null;
  }
  if(userGuardChannel){
    supabase.removeChannel(userGuardChannel);
    userGuardChannel = null;
  }
  if(broadcastGuardChannel){
    supabase.removeChannel(broadcastGuardChannel);
    broadcastGuardChannel = null;
  }
  if(welcomeGuardChannel){
    supabase.removeChannel(welcomeGuardChannel);
    welcomeGuardChannel = null;
  }
  authGuardTriggered = false;
}

function forceLogoutWithCountdown(message, title, redirectMs = 5000){
  if(authGuardTriggered) return;
  authGuardTriggered = true;

  let remaining = Math.ceil(redirectMs / 1000);
  let toast = null;
  if(window.lhToast){
    toast = lhToast(`${message} Đang đăng xuất sau ${remaining}s...`, {
      type: "error",
      title: title || "Phiên đăng nhập đã hết hiệu lực",
      durationMs: redirectMs,
      sound: "thongbao"
    });
  }

  const countdownTimer = setInterval(() => {
    remaining--;
    if(remaining <= 0){
      clearInterval(countdownTimer);
      if(toast) toast.close();
      const st = updateStatus(false);
      if(st && typeof st.catch === "function") st.catch(()=>{});
      supabase.auth.signOut().catch(()=>{}).finally(() => {
        window.location.href = "login.html?loggedout=1";
      });
    } else if(toast){
      toast.update(`${message} Đang đăng xuất sau ${remaining}s...`);
    }
  }, 1000);
}

async function forceLogoutNow(message, title = "Phiên đăng nhập đã hết hiệu lực"){
  forceLogoutWithCountdown(message, title, 5000);
}

function startAccessGuards(user){
  stopAccessGuards();
  if(!user || !user.uid || !user.email) return;

  // Whitelist guard: không có realtime trên access_list (RLS chỉ admin đọc),
  // nên poll RPC is_email_allowed định kỳ để phát hiện bị gỡ quyền.
  try {
    accessGuardInterval = setInterval(async () => {
      if(authGuardTriggered) return;
      const ok = await emailAllowed(user.email);
      if(!ok){
        logAppError({ source: "index-guard", category: "whitelist", level: "warning", code: "WHITELIST_REVOKED", message: "User đang dùng web bị gỡ whitelist (phát hiện qua poll 30s).", email: user.email, detail: { uid: user.uid } });
        forceLogoutNow(
          "Quyền truy cập của bạn vừa bị thu hồi. Vui lòng liên hệ admin nếu cần hỗ trợ.",
          "Đã bị gỡ whitelist"
        );
      }
    }, 30000);
  } catch (e) {}

  // User guard: realtime theo dõi hồ sơ của chính user (disabled / bị xóa).
  try {
    userGuardChannel = supabase.channel("guard-user-" + user.uid)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "users", filter: "id=eq." + user.uid }, (payload) => {
        if(authGuardTriggered) return;
        const data = payload.new || {};
        if(data.disabled){
          logAppError({ source: "index-guard", category: "disabled", level: "warning", code: "DISABLED", message: "User đang dùng web bị khóa tài khoản (realtime).", email: user.email, detail: { uid: user.uid } });
          forceLogoutNow(
            "Tài khoản của bạn vừa bị vô hiệu hóa. Vui lòng liên hệ admin.",
            "Tài khoản bị khóa"
          );
        }
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "users", filter: "id=eq." + user.uid }, () => {
        if(authGuardTriggered) return;
        forceLogoutNow(
          "Hồ sơ người dùng của bạn vừa bị xóa khỏi hệ thống.",
          "Hồ sơ đã bị xóa"
        );
      })
      .subscribe();
  } catch (e) {}

  // Broadcast guard: thông báo hiện tại.
  try {
    broadcastGuardChannel = supabase.channel("guard-broadcast")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "broadcast_current" }, (payload) => {
        if(authGuardTriggered) return;
        const data = payload.new || {};
        if(data.active === false) return;

        const broadcastId = String(data.broadcast_id || data.updated_at || "");
        if(!broadcastId) return;

        const seenKey = "learnhub_last_broadcast_seen";
        const lastSeen = localStorage.getItem(seenKey);
        if(lastSeen === broadcastId) return;

        const title = data.title ? `${data.title}` : "Thông báo";
        const safeMessage = String(data.message || "").trim();
        if(!safeMessage) return;

        const targetMode = String(data.target_mode || "all");
        const targetEmail = String(data.target_email || "").trim().toLowerCase();
        if(targetMode === "single" && targetEmail && targetEmail !== String(user.email || "").trim().toLowerCase()){
          return;
        }

        localStorage.setItem(seenKey, broadcastId);
        const noticeType = ["info", "warning", "error", "success"].includes(String(data.type || "info"))
          ? String(data.type || "info")
          : "info";
        const durationMs = Number(data.duration_ms || 3000);
        showAuthNotice(safeMessage, noticeType, title, durationMs, "realtimeSound");
      })
      .subscribe();
  } catch (e) {}

  // (mailbox bell moved into header fetch callback above)

  // Welcome popup guard.
  try {
    welcomeGuardChannel = supabase.channel("guard-welcome")
      .on("postgres_changes", { event: "*", schema: "public", table: "broadcast_welcome" }, (payload) => {
        const data = payload.new || {};
        welcomePopupCache = {
          ...WELCOME_POPUP_DEFAULT,
          title: data.title ?? welcomePopupCache?.title,
          message: data.message ?? welcomePopupCache?.message,
          active: data.active ?? welcomePopupCache?.active,
          showMode: data.show_mode ?? welcomePopupCache?.showMode,
          updatedAt: data.updated_at ?? welcomePopupCache?.updatedAt
        };
        maybeShowWelcomePopup(welcomePopupCache);
      })
      .subscribe();
  } catch (e) {}
}

onAuthChange(async (event, session) => {
const user = session?.user ?? null;
currentSupabaseUser = user ? { id: user.id, email: user.email } : null;

if(isPasswordRecovery(event)) return;

if(previewMode){
  enterPreviewMode();
  return;
}

if(user){
  if (maintenanceState.initialized && maintenanceState.enabled) {
    applyMaintenanceUI();
    try { await finalizeOnlineSession(user.id); } catch (e) {}
    try { console.trace("SIGN OUT (maintenance mode)"); await supabase.auth.signOut(); } catch (e) {}
    return;
  }

  if (!await emailAllowed(user.email)) {
    logAppError({ source: "index-guard", category: "whitelist", level: "warning", code: "NOT_ALLOWED", message: "User mở web nhưng không nằm trong whitelist hiện tại.", email: user.email, detail: { uid: user.id } });
    forceLogoutWithCountdown(
      "Tài khoản này không nằm trong whitelist hiện tại.",
      "Không có quyền truy cập",
      5000
    );
    return;
  }

  showContent();
  if (typeof window.loadMailbox === 'function') window.loadMailbox();

  // ✅ LẤY DỮ LIỆU USER TỪ SUPABASE (để có tên cho email/password user)
  let userData = {
    uid: user.id,
    email: user.email,
    displayName: user.user_metadata?.name || user.user_metadata?.full_name || String(user.email || "").split("@")[0] || "User",
    photoURL: user.user_metadata?.avatar_url || user.user_metadata?.picture || "https://i.imgur.com/6VBx3io.png"
  };
  try {
    const supabaseRow = await getUserRow(user.id);
    if (supabaseRow) {
      if (supabaseRow.disabled) {
        logAppError({ source: "index-guard", category: "disabled", level: "warning", code: "DISABLED", message: "User bị khóa tài khoản cố mở web.", email: user.email, detail: { uid: user.id, name: supabaseRow.name || "" } });
        forceLogoutWithCountdown(
          "Tài khoản của bạn đang bị vô hiệu hóa. Vui lòng liên hệ admin.",
          "Tài khoản bị khóa",
          5000
        );
        return;
      }
      // Merge Supabase data (ưu tiên name/photo/role từ bảng users)
      if (supabaseRow.name) {
        userData.displayName = supabaseRow.name;
      }
      if (supabaseRow.photo) {
        userData.photoURL = supabaseRow.photo;
      }
      if (supabaseRow.role) {
        userData.role = supabaseRow.role;
      }
      userData.onlineStartTime = supabaseRow.online_start_time || 0;
      userData.onlineTimer = Number(supabaseRow.online_timer || 0);
    }
  } catch (e) {
    console.log("Không thể lấy dữ liệu Supabase:", e);
  }

  // ✅ GỬI USER SANG IFRAME TABS
  function sendUserToAllFrames(){
    window.currentLearnHubUser = {
      uid: userData.uid,
      email: userData.email,
      photo: userData.photoURL,
      displayName: userData.displayName
    };
    ["forumFrame","flashHubFrame","taiLieuFrame","phongHocFrame"].forEach(function(id){
      var f = document.getElementById(id);
      if(f && f.contentWindow){
        try { f.contentWindow.postMessage({ type:"LEARNHUB_USER", user:window.currentLearnHubUser }, TRUSTED_ORIGIN); } catch(e){}
      }
    });
    if(typeof window.sendUserToQuizFrame === "function") window.sendUserToQuizFrame();
  }
  window.sendUserToAllFrames = sendUserToAllFrames;
  sendUserToAllFrames();

  // Iframe onload handlers are managed by script.js (dark mode + user sync)

  window.currentLearnHubUser = {
    uid: userData.uid,
    email: userData.email,
    photo: userData.photoURL,
    displayName: userData.displayName
  };

  try {
    await createUserStats(window.currentLearnHubUser);
  } catch (e) {
    console.log("Không thể đồng bộ hồ sơ gamification khi đăng nhập:", e);
  }

  // 🆕 [LearnHub Test] Nếu quizFrame đang mở sẵn (trường hợp hiếm), gửi luôn
  if(typeof window.sendUserToQuizFrame === "function"){
    window.sendUserToQuizFrame();
  }

  // ✅ UPDATE ONLINE STATUS — heartbeat qua RPC (server time, chống gian lận giờ)
  if(!activeInterval){
    activeInterval = setInterval(()=>{
      const u = currentSupabaseUser;
      if(u){
        supabase.rpc("users_heartbeat", { p_uid: u.id }).then(()=>{}).catch(()=>{});
      }
      }, 5000);
  }

  // ✅ ONLINE TIMER - begin phiên (atomic trên DB, chống cộng khoảng offline / double-count)
  try {
    if(user.id){
      await beginOnlineSession(user.id);
    }
  } catch(e){}

  // ✅ START LISTENER
  startListening();
  startAccessGuards({ uid: user.id, email: user.email });

  // vì bên trong đã có:

  applyUserToUI(userData);

  // ✅ WELCOME BACK POPUP — hiện 1 lần mỗi lần mở trang
  if (!welcomeShown) {
    welcomeShown = true;
    const welcomeName = userData.displayName || "bạn";
    const rtSound = document.getElementById("realtimeSound");
    const canPlay = rtSound && !rtSound.muted && rtSound.volume > 0;
    showAuthNotice(`Xin chào ${welcomeName}`, "info", "Chào mừng trở lại!", 4000, canPlay ? "realtimeSound" : "", "fa-solid fa-hand lh-wave");
  }

} else {
  if (maintenanceState.initialized && maintenanceState.enabled) {
    window.location.replace('maintenance.html');
  } else {
    window.location.href = 'login.html';
  }
}
});
// chỉ giữ login trong tab hiện tại


// googleLogin, emailLogin, emailRegister đã được tách sang login.html



// Xử lý khi ẩn tab hoặc đóng trình duyệt
const updateStatus = (isOnline) => {
const user = currentSupabaseUser;
if (user) {
  if(isOnline){
    return beginOnlineSession(user.id);
  } else {
    return finalizeOnlineSession(user.id);
  }
}
};

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") {
    if(activeInterval){ clearInterval(activeInterval); activeInterval = null; }
    updateStatus(false);
  } else {
    updateStatus(true);
    if(!activeInterval){
      activeInterval = setInterval(()=>{
        const u = currentSupabaseUser;
        if(u){
          supabase.rpc("users_heartbeat", { p_uid: u.id }).then(()=>{}).catch(()=>{});
        }
    }, 5000);
    }
  }
});

// pagehide: bắn khi đóng tab / rời trang — finalize kể cả khi visibilitychange bị bỏ lỡ.
// RPC finalize idempotent nên gọi trùng với visibilitychange/beforeunload vẫn an toàn.
window.addEventListener("pagehide", () => {
  if(activeInterval){ clearInterval(activeInterval); activeInterval = null; }
  if(typeof homeSlideshowInterval !== "undefined" && homeSlideshowInterval){ clearInterval(homeSlideshowInterval); homeSlideshowInterval = null; }
  if(typeof authSlideTimer !== "undefined" && authSlideTimer){ clearInterval(authSlideTimer); authSlideTimer = null; }
  stopAccessGuards();
  updateStatus(false);
});

// Trick để ép trình duyệt gửi dữ liệu cuối cùng trước khi đóng

let usersChannel = null;
let onlineUsersMap = new Map(); // userId -> DOM element
let refreshOnlineListTimer = null;

function buildOnlineUserRow(u) {
  const safePhoto = escapeUrl(u.photo) || "https://i.imgur.com/6VBx3io.png";
  const safeName = escapeHtml(u.name) || "User";
  const div = document.createElement("div");
  div.dataset.uid = u.id;
  div.innerHTML = `
<div style="display:flex; align-items:center; gap:10px; padding:6px 8px;">
<img src="${safePhoto}"
style="width:26px;height:26px;border-radius:50%;">
<span style="color: var(--text-main); flex:1; min-width:0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${safeName}</span>
<div class="online-pulse"
style="width:8px;height:8px;background:#22c55e;border-radius:50%;">
</div>
</div>
`;
  return div;
}

async function refreshOnlineList(){
  const list = document.getElementById("onlineList");
  if (!list) return;

  const ACTIVE_THRESHOLD = 10000;
  const thresholdTime = Date.now() - ACTIVE_THRESHOLD;

  try {
    const { data } = await supabase
      .from("users")
      .select("id,name,photo")
      .eq("online", true)
      .gt("last_active", thresholdTime)
      .order("last_active", { ascending: false });

    const newIds = new Set();
    for (const u of (data || [])) {
      newIds.add(u.id);
    }

    // Xóa user offline khỏi DOM + map
    for (const [uid, el] of onlineUsersMap) {
      if (!newIds.has(uid)) {
        el.remove();
        onlineUsersMap.delete(uid);
      }
    }

    // Thêm user mới vào DOM
    for (const u of (data || [])) {
      if (!onlineUsersMap.has(u.id)) {
        const el = buildOnlineUserRow(u);
        list.appendChild(el);
        onlineUsersMap.set(u.id, el);
      }
    }

    const label = document.querySelector(".online-count-label");
    if (label) {
      label.textContent = `Đang trực tuyến (${newIds.size})`;
    }
  } catch(e) {}
}

function scheduleRefreshOnlineList() {
  if (refreshOnlineListTimer) return;
  refreshOnlineListTimer = setTimeout(() => {
    refreshOnlineListTimer = null;
    refreshOnlineList();
  }, 500);
}

function startListening(){
  if (usersChannel) { supabase.removeChannel(usersChannel); usersChannel = null; }
  onlineUsersMap.clear();
  const list = document.getElementById("onlineList");
  if (list) list.innerHTML = "";
  refreshOnlineList();
  usersChannel = supabase.channel("users-online")
    .on("postgres_changes", { event: "*", schema: "public", table: "users" }, () => {
      scheduleRefreshOnlineList();
    })
    .subscribe();
}

window.logout = async function(){
const user = currentSupabaseUser;

// cập nhật offline + lưu timer (atomic trên DB)
if(user){
  await finalizeOnlineSession(user.id);
}

// 🔥 TẮT tất cả intervals & guards
stopAccessGuards();
if(activeInterval){
  clearInterval(activeInterval);
  activeInterval = null;
}
if(typeof homeSlideshowInterval !== "undefined" && homeSlideshowInterval){
  clearInterval(homeSlideshowInterval);
  homeSlideshowInterval = null;
}
if(typeof authSlideTimer !== "undefined" && authSlideTimer){
  clearInterval(authSlideTimer);
  authSlideTimer = null;
}

// 🔥 tắt realtime listener
if(usersChannel){
  supabase.removeChannel(usersChannel);
  usersChannel = null;
}
if(refreshOnlineListTimer){
  clearTimeout(refreshOnlineListTimer);
  refreshOnlineListTimer = null;
}
onlineUsersMap.clear();

// logout
supabase.auth.signOut().then(()=>{
window.location.href = 'login.html?loggedout=1';
});
}
document.addEventListener("click", function(e){
const popup = document.getElementById("userPopup");
const avatarBox = document.querySelector(".avatar-box");

if(
popup &&
!popup.contains(e.target) &&
(!avatarBox || !avatarBox.contains(e.target))
){
popup.style.display = "none";
}
});
window.addEventListener("beforeunload", () => {
  const user = currentSupabaseUser;
  if(user){
    try {
      const rpcUrl = SUPABASE_URL + "/rest/v1/rpc/users_finalize_online";
      const body = JSON.stringify({ p_uid: user.id });
      navigator.sendBeacon(rpcUrl, new Blob([body], { type: "application/json" }));
    } catch(e) {}
    try {
      const rpcUrl = SUPABASE_URL + "/rest/v1/rpc/users_finalize_online";
      fetch(rpcUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": "sb_publishable_cFWEQ0SQuM8SSrOgbkQ8Kg_tJb3Qw9J",
          "Authorization": "Bearer sb_publishable_cFWEQ0SQuM8SSrOgbkQ8Kg_tJb3Qw9J"
        },
        body: JSON.stringify({ p_uid: user.id }),
        keepalive: true
      }).catch(()=>{});
    } catch(e) {}
    updateStatus(false);
  }
});
// --- Dán đoạn này vào CUỐI thẻ <script type="module"> trong index.html ---
  window.supabaseClient = supabase;
  window.getCurrentLearnHubUser = () => window.currentLearnHubUser || null;

  // 🆕 [LearnHub Test - Giai đoạn 1] Gửi thông tin user sang iframe #quizFrame (cauhoi/filetest.html)
  // - Chỉ gửi khi quizFrame đã load xong và đã có user đăng nhập (window.currentLearnHubUser).
  // - Được gọi từ script.js mỗi khi iframe.onload bắn lên (loadQuiz), nên tự gửi lại mỗi khi mở/reload đề.
  window.sendUserToQuizFrame = function(){
    const quizFrame = document.getElementById("quizFrame");
    const u = window.currentLearnHubUser;
    if(!quizFrame || !quizFrame.contentWindow || !u) return;

    quizFrame.contentWindow.postMessage({
      type: "LEARNHUB_USER",
      user: {
        uid: u.uid,
        email: u.email,
        photo: u.photo,
        displayName: u.displayName
      }
    }, TRUSTED_ORIGIN);
  };
  window.addEventListener("message", async (event) => {
  if (!event.data || event.data.type !== "LEARNHUB_TEST_RESULT") return;

  // Accept from direct quizFrame OR from phongHocFrame (relay)
  var phocFrame = document.getElementById("phongHocFrame");
  var quizFrame = document.getElementById("quizFrame");
  var fromPhongHoc = (phocFrame && event.source === phocFrame.contentWindow);
  var fromQuiz = (quizFrame && event.source === quizFrame.contentWindow);
  if (!fromPhongHoc && !fromQuiz) return;

  const u = window.currentLearnHubUser;
  const score = Number(event.data.score);

  if (u && u.uid && Number.isFinite(score)) {
    try {
      await createUserStats(u);
      await updateUserStats(u.uid, score);
    } catch (e) {
      console.log("Không thể lưu kết quả từ iframe:", e);
    }
  }

  if (event.source && event.source.postMessage) {
    event.source.postMessage({ type: "LEARNHUB_TEST_RESULT_ACK", requestId: event.data.requestId }, TRUSTED_ORIGIN);
  }
});
window.addEventListener("message", (event) => {
  if (event.data && event.data.type === "LOCK_PAGE_SCROLL") {
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
  } else if (event.data && event.data.type === "UNLOCK_PAGE_SCROLL") {
    document.body.style.overflow = '';
    document.documentElement.style.overflow = '';
  }
  if (event.data && event.data.type === "CLOSE_QUIZ_SCROLL_TOP") {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
});
window.addEventListener("message", async (event) => {
  const phocFrame = document.getElementById("phongHocFrame");
  if (!phocFrame || event.source !== phocFrame.contentWindow) return;
  const u = window.currentLearnHubUser;
  if (!u || !u.uid) return;

  if (event.data && event.data.type === "LEARNHUB_VIDEO_WATCHED" && event.data.videoId) {
    const videoId = String(event.data.videoId);
    try {
      const { data: existing } = await supabase
        .from("watched_videos")
        .select("video_id")
        .eq("user_id", u.uid)
        .eq("video_id", videoId)
        .maybeSingle();
      if (!existing) {
        const { error } = await supabase.from("watched_videos").insert({ user_id: u.uid, video_id: videoId });
        if (!error) {
          await updateUserStats(u.uid, 5, { countAsTest: false });
        }
      }
    } catch (e) {
      console.log("Không thể lưu video đã xem:", e);
    }
    return;
  }

  if (event.data && event.data.type === "LEARNHUB_REQUEST_WATCHED") {
    try {
      const { data } = await supabase
        .from("watched_videos")
        .select("video_id")
        .eq("user_id", u.uid);
      const videoIds = (data || []).map(r => r.video_id);
      phocFrame.contentWindow.postMessage({ type: "LEARNHUB_WATCHED_LIST", videoIds }, TRUSTED_ORIGIN);
    } catch (e) {
      console.log("Không thể đồng bộ video đã xem:", e);
    }
  }
});

