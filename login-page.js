﻿
import { supabase } from "./supabase-config.js";
import { getMaintenance, subscribeMaintenance, emailAllowed, isRegistrationOpen, getUserRow, onAuthChange, finalizeSession } from "./supabase-helpers.js";
import { redirectToResetPage, isPasswordRecovery } from "./reset-password.js";
import { logAppError } from "./log-errors.js";

window.supabase = supabase;

// Đăng ký ngay lập tức (trước mọi await bên dưới) để không lỡ sự kiện
// PASSWORD_RECOVERY khi user bấm link đặt lại mật khẩu từ email.
supabase.auth.onAuthStateChange((event) => {
  isPasswordRecovery(event);
});

let maintenanceState = { enabled: false, message: "", initialized: false };

// Check ngay khi load trang (await — nếu bật thì redirect ngay, không chạy tiếp)
try {
  console.log("[MAINTENANCE] Checking maintenance status on load...");
  const _m = await getMaintenance();
  maintenanceState = { enabled: _m.enabled, message: _m.message, initialized: true };
  console.log("[MAINTENANCE] Initial check result:", maintenanceState);
  if (maintenanceState.enabled) {
    console.log("[MAINTENANCE] Maintenance is enabled, redirecting to maintenance.html");
    window.location.replace('maintenance.html');
  } else {
    console.log("[MAINTENANCE] Maintenance is disabled, staying on login.html");
  }
} catch(e) { console.error("Maintenance check error:", e); }

let registrationOpen = true;
window.registrationOpen = true;
let registrationMessage = "";
isRegistrationOpen().then(ok => {
  registrationOpen = ok;
  window.registrationOpen = ok;
}).catch(e => console.error("Registration check error:", e));

// Lắng nghe realtime: bật → redirect maintenance.html, tắt → redirect login.html
try {
  subscribeMaintenance((data) => {
    const wasEnabled = maintenanceState.enabled;
    maintenanceState = { enabled: data.enabled, message: data.message, initialized: true };
    console.log("[MAINTENANCE] Realtime update - wasEnabled:", wasEnabled, "enabled:", maintenanceState.enabled, "pathname:", location.pathname);
    if (maintenanceState.enabled && !wasEnabled) {
      console.log("[MAINTENANCE] Maintenance just turned ON, redirecting to maintenance.html");
      window.location.replace('maintenance.html');
    } else if (!maintenanceState.enabled && wasEnabled) {
      console.log("[MAINTENANCE] Maintenance just turned OFF");
      // Chỉ redirect về login nếu không phải đang ở login.html
      if (!location.pathname.endsWith('/login.html') && !location.pathname.endsWith('login.html')) {
        console.log("[MAINTENANCE] Redirecting to login.html");
        window.location.replace('login.html');
      } else {
        console.log("[MAINTENANCE] Already on login.html, no redirect needed");
      }
    }
  });
} catch(e) { console.error("Maintenance listener error:", e); }

let countdownInterval = null;
let processingLogin = false;

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

window.togglePassword = function(id, btn) {
  const input = document.getElementById(id);
  if (!input) return;
  const show = input.type === "password";
  input.type = show ? "text" : "password";
  btn.innerHTML = show ? '<i class="fa-solid fa-eye-slash"></i>' : '<i class="fa-solid fa-eye"></i>';
};

function setFieldError(inputId, message) {
  const err = document.getElementById(inputId + "Error");
  const input = document.getElementById(inputId);
  if (err) { err.textContent = message || ""; err.style.display = message ? "block" : "none"; }
  if (input) input.style.borderColor = message ? "#ef4444" : "";
}

function clearFieldErrors() {
  ["loginEmail","loginPassword","registerName","registerEmail","registerPassword","registerConfirmPassword","registerPhoto","otpCode"].forEach(id => setFieldError(id, ""));
}

function shakeAuthBox(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove("auth-shake");
  void el.offsetWidth;
  el.classList.add("auth-shake");
  setTimeout(() => el.classList.remove("auth-shake"), 500);
}

function setBtnLoading(btn, loading) {
  if (!btn) return;
  if (loading) {
    btn.dataset.orig = btn.dataset.orig || btn.textContent;
    btn.disabled = true;
    btn.innerHTML = '<span class="auth-btn-spinner"></span>Đang xử lý...';
  } else {
    btn.disabled = false;
    btn.innerHTML = btn.dataset.orig || "Tiếp tục";
  }
}

  ["loginEmail","loginPassword","registerName","registerEmail","registerPassword","registerConfirmPassword","registerPhoto","otpCode"].forEach(id => {
  const el = document.getElementById(id);
  if (el) el.addEventListener("input", () => setFieldError(id, ""));
});

document.getElementById("otpCode").addEventListener("input", function() {
  const v = this.value.replace(/\D/g, "");
  if (this.value !== v) this.value = v;
  setFieldError("otpCode", "");
  if (v.length === 6 && !processingLogin) {
    const name = document.getElementById("registerName").value.trim();
    const email = document.getElementById("registerEmail").value.trim();
    const pw = document.getElementById("registerPassword").value;
    const cf = document.getElementById("registerConfirmPassword").value;
    if (!name || !email || !pw || !cf) {
      const missing = !name ? "registerName" : !email ? "registerEmail" : !pw ? "registerPassword" : "registerConfirmPassword";
      document.getElementById(missing).focus();
      return;
    }
    emailRegister();
  }
});

function showLoginSuccess(message, redirectMs = 3000) {
  if (countdownInterval) { clearInterval(countdownInterval); countdownInterval = null; }
  let remaining = Math.ceil(redirectMs / 1000);
  let toast = null;
  if (window.lhToast) {
    toast = lhToast(`${message} Chuyển hướng sau ${remaining}s...`, {
      type: "success",
      title: "Thành công",
      durationMs: redirectMs,
      sound: "thongbao"
    });
  }
  countdownInterval = setInterval(() => {
    remaining--;
    if (remaining <= 0) {
      clearInterval(countdownInterval);
      countdownInterval = null;
      window.location.replace('/index.html');
    } else if (toast) {
      toast.update(`${message} Chuyển hướng sau ${remaining}s...`);
    }
  }, 1000);
}

// Fallback: nếu mp3 bị chặn/lỗi tải thì kêu beep bằng WebAudio API (luôn available sau gesture)
let _noticeAudioCtx = null;
function playFallbackBeep() {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    _noticeAudioCtx = _noticeAudioCtx || new AC();
    const ctx = _noticeAudioCtx;
    if (ctx.state === "suspended") { ctx.resume().catch(() => {}); }
    const t0 = ctx.currentTime;
    [[880, 0], [1244.51, 0.13]].forEach(([freq, offset]) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const st = t0 + offset;
      gain.gain.setValueAtTime(0.0001, st);
      gain.gain.exponentialRampToValueAtTime(0.16, st + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, st + 0.24);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(st); osc.stop(st + 0.26);
    });
  } catch (e) {}
}

function playNotificationSound(soundId = "thongbaoSound") {
  const base = document.getElementById(soundId);
  if (!base) { playFallbackBeep(); return; }
  let audio = base;
  // Thông báo trước chưa phát xong -> dùng bản clone để chồng tiếng, không cắt nhau
  if (!base.paused && !base.ended && base.currentTime > 0) {
    try { audio = base.cloneNode(); } catch (e) { audio = base; }
  }
  try { audio.currentTime = 0; } catch (e) {}
audio.muted = false;
audio.volume = 1;
  const fail = () => playFallbackBeep();
  audio.addEventListener("error", fail, { once: true });
  const p = audio.play();
  if (p && p.then) p.then(() => audio.removeEventListener("error", fail)).catch(fail);
}

// Mở khoá autoplay sau lần tương tác đầu tiên của người dùng.
// Không có bước này, thông báo từ onAuthChange (restore session) bị trình duyệt chặn tiếng.
// QUAN TRỌNG: listener click ở document chạy SAU onclick của nút (event bubbling),
// nên nếu không guard thì nó sẽ mute/tải lại audio mà thông báo vừa bắt đầu phát
// -> tiếng popup bị nuốt mất. Luôn bỏ qua nếu audio đang phát tiếng thật.
(function unlockAudio() {
  const ids = ["thongbaoSound"];
  function tryUnlock() {
    let loaded = false;
    ids.forEach(function (id) {
      const a = document.getElementById(id);
      if (!a) return;
      // Đang phát thông báo thật -> trình duyệt đã cho phép tiếng, đừng đụng vào
      if (!a.paused && !a.muted && a.volume > 0) { loaded = true; return; }
      a.muted = true;
      a.volume = 0;
      try {
        const p = a.play();
        if (p && p.then) {
          p.then(function () {
            // Nếu có một play() thật (có tiếng) đang chạy trong cùng lượt click
            // (vd: bấm Đăng nhập bị lỗi → hiện thông báo), KHÔNG pause để
            // tránh nuốt mất tiếng của thông báo.
            if (a.muted === true) {
              a.pause();
              a.currentTime = 0;
            }
a.muted = false;
a.volume = 1;
loaded = true;
          }).catch(function () {});
        }
      } catch (e) {}
    });
    // Warm-up luôn WebAudio context cho fallback beep
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) {
        _noticeAudioCtx = _noticeAudioCtx || new AC();
        if (_noticeAudioCtx.state === "suspended") _noticeAudioCtx.resume().catch(function () {});
      }
    } catch (e) {}
    if (loaded) {
      document.removeEventListener("click", tryUnlock);
      document.removeEventListener("touchstart", tryUnlock);
      document.removeEventListener("pointerdown", tryUnlock);
      document.removeEventListener("keydown", tryUnlock);
    }
  }
  document.addEventListener("click", tryUnlock);
  document.addEventListener("touchstart", tryUnlock);
  document.addEventListener("pointerdown", tryUnlock);
  document.addEventListener("keydown", tryUnlock);
})();

function showAuthNotice(message, type = "info", title = "", durationMs = 2600, soundId = "thongbaoSound", icon) {
  if (window.lhToast) {
    lhToast(message, {
      type: type === "warn" ? "warning" : type,
      title: title || undefined,
      durationMs: Math.max(1200, Number(durationMs) || 2600),
      icon: icon || undefined,
      sound: /realtime/i.test(soundId || "") ? "realtime" : "thongbao"
    });
  }
}

/* --- OTP STATE --- */
let otpGenerated = "";
let otpExpiry = 0;
let otpCountdownInterval = null;
let otpResendCooldown = null;
const OTP_EXPIRE_MS = 15 * 60 * 1000;
let otpServerId = null;

function generateOTP() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function storeOTPOnServer(email, code) {
  try {
    const { data, error } = await supabase.rpc("store_otp", {
      p_email: email,
      p_code: code,
      p_expires_in_seconds: Math.floor(OTP_EXPIRE_MS / 1000)
    });
    if (error) throw error;
    otpServerId = data;
    return true;
  } catch (e) {
    console.warn("Server OTP store unavailable, using client-only:", e.message);
    return false;
  }
}

async function verifyOTPOnServer(email, code) {
  try {
    const { data, error } = await supabase.rpc("verify_otp", {
      p_email: email,
      p_code: code
    });
    if (error) throw error;
    return data === true;
  } catch (e) {
    console.warn("Server OTP verify unavailable, using client-only:", e.message);
    return null;
  }
}

function startOTPCountdown() {
  clearInterval(otpCountdownInterval);
  const countdownEl = document.getElementById("otpCountdown");
  otpCountdownInterval = setInterval(() => {
    const remaining = Math.max(0, otpExpiry - Date.now());
    if (remaining <= 0) {
      clearInterval(otpCountdownInterval);
      if (countdownEl) countdownEl.textContent = "0:00";
      return;
    }
    const m = Math.floor(remaining / 60000);
    const s = Math.floor((remaining % 60000) / 1000);
    if (countdownEl) countdownEl.textContent = m + ":" + String(s).padStart(2, "0");
  }, 1000);
}

function startResendCooldown() {
  const btn = document.getElementById("otpResendBtn");
  let sec = 60;
  btn.disabled = true;
  btn.textContent = "Gửi lại mã (" + sec + "s)";
  otpResendCooldown = setInterval(() => {
    sec--;
    if (sec <= 0) {
      clearInterval(otpResendCooldown);
      btn.disabled = false;
      btn.textContent = "Gửi lại mã";
      return;
    }
    btn.textContent = "Gửi lại mã (" + sec + "s)";
  }, 1000);
}

window.sendOTP = async function() {
  const email = document.getElementById("registerEmail").value.trim();
  if (!email) {
    showAuthNotice("Vui lòng nhập email trước", "error", "Thiếu email");
    return;
  }
  setFieldError("otpCode", "");
  const btn = document.getElementById("sendOtpBtn");
  btn.disabled = true;
  btn.textContent = "Đang gửi...";

  otpGenerated = generateOTP();
  otpExpiry = Date.now() + OTP_EXPIRE_MS;
  otpServerId = null;

  await storeOTPOnServer(email, otpGenerated);

  try {
    const expireTime = new Date(otpExpiry).toLocaleTimeString("vi-VN", {hour:"2-digit",minute:"2-digit"});
    await emailjs.send("service_7ku42kd", "template_m4uscl8", {
      passcode: otpGenerated,
      time: expireTime,
      email: email
    });
    document.getElementById("otpSection").style.display = "block";
    btn.textContent = "Đã gửi mã ✓";
    startOTPCountdown();
    startResendCooldown();
    const otpFocus = document.getElementById("otpCode");
    if (otpFocus) otpFocus.focus();
  } catch(err) {
    console.error("OTP send error:", err);
    showAuthNotice("Gửi mã thất bại. Vui lòng thử lại.", "error", "Lỗi gửi mã");
    btn.disabled = false;
    btn.textContent = "Nhận mã";
  }
};

window.resendOTP = async function() {
  const email = document.getElementById("registerEmail").value.trim();
  if (!email) return;
  setFieldError("otpCode", "");
  const btn = document.getElementById("otpResendBtn");
  btn.disabled = true;

  otpGenerated = generateOTP();
  otpExpiry = Date.now() + OTP_EXPIRE_MS;
  otpServerId = null;

  await storeOTPOnServer(email, otpGenerated);

  try {
    const expireTime = new Date(otpExpiry).toLocaleTimeString("vi-VN", {hour:"2-digit",minute:"2-digit"});
    await emailjs.send("service_7ku42kd", "template_m4uscl8", {
      passcode: otpGenerated,
      time: expireTime,
      email: email
    });
    startOTPCountdown();
    startResendCooldown();
    showAuthNotice("Mã mới đã gửi đến email của bạn", "success", "Gửi lại thành công");
  } catch(err) {
    console.error("OTP resend error:", err);
    showAuthNotice("Gửi lại mã thất bại", "error", "Lỗi");
    btn.disabled = false;
    btn.textContent = "Gửi lại mã";
  }
};

function resetOTPState() {
  clearFieldErrors();
  otpGenerated = "";
  otpExpiry = 0;
  otpServerId = null;
  clearInterval(otpCountdownInterval);
  clearInterval(otpResendCooldown);
  const otpSection = document.getElementById("otpSection");
  const sendBtn = document.getElementById("sendOtpBtn");
  const resendBtn = document.getElementById("otpResendBtn");
  const countdownEl = document.getElementById("otpCountdown");
  if (otpSection) otpSection.style.display = "none";
  if (sendBtn) { sendBtn.disabled = false; sendBtn.textContent = "Nhận mã"; }
  if (resendBtn) { resendBtn.disabled = false; resendBtn.textContent = "Gửi lại mã"; }
  if (countdownEl) countdownEl.textContent = "15:00";
  const otpInput = document.getElementById("otpCode");
  if (otpInput) otpInput.value = "";
}
function retriggerAnim(container) {
  const items = container.querySelectorAll('.auth-anim-item');
  items.forEach(el => {
    el.style.animation = 'none';
    void el.offsetWidth;
    el.style.animation = '';
  });
}

function switchAuthTab(type) {
  if (type === "register" && !registrationOpen) {
    showAuthNotice("Đăng ký hiện đang đóng. Vui lòng liên hệ admin nếu bạn cần cấp tài khoản.", "warning", "Đăng ký bị đóng");
    return;
  }
  const authShell = document.getElementById("authShell");
  const loginFormContainer = document.getElementById("loginFormContainer");
  const registerFormContainer = document.getElementById("registerFormContainer");
  
  if (type === "login") {
    authShell.classList.remove("active-register");
    loginFormContainer.classList.remove("form-disabled");
    registerFormContainer.classList.add("form-disabled");
    retriggerAnim(loginFormContainer);
    resetOTPState();
  } else {
    authShell.classList.add("active-register");
    loginFormContainer.classList.add("form-disabled");
    registerFormContainer.classList.remove("form-disabled");
    retriggerAnim(registerFormContainer);
    resetOTPState();
  }
}

function authComingSoon() {
  showAuthNotice("Tính năng này đang phát triển. Hiện tại bạn vẫn đăng nhập bằng Google như cũ.", "info", "Tính năng sắp ra mắt");
}

const authSlideData = [
  { title: "LearnHub – Nâng cấp cách bạn học", desc: "Ôn thi nhanh • Giao diện hiện đại • Tối ưu trải nghiệm" },
  { title: "Giao diện chính - Hubie AI", desc: "Trợ lý AI hỗ trợ học tập và tra từ điển Anh - Việt cùng giao diện trực quan đầy đủ tính năng" },
  { title: "LearnHub Forum", desc: "Trao đổi • Hỏi đáp • Kết nối học sinh như một trang MXH" },
  { title: "Tính năng Smart FlashCard", desc: "Học từ vựng thông minh với nhiều thể loại học tập, từ vựng đa dạng" }
];
let authSlideIndex = 0;
let authSlideTimer = null;

function updateAuthSlideText(index) {
  const titleEl = document.getElementById("authSlideTitle");
  const descEl = document.getElementById("authSlideDesc");
  if (!titleEl || !descEl) return;
  const title = authSlideData[index].title;
  const desc = authSlideData[index].desc;
  titleEl.innerHTML = '';
  descEl.innerHTML = '';
  title.split('').forEach((char, i) => {
    const span = document.createElement('span');
    span.className = 'char';
    span.textContent = char === ' ' ? '\u00A0' : char;
    span.style.animationDelay = `${i * 0.03}s`;
    titleEl.appendChild(span);
  });
  const descSpan = document.createElement('span');
  descSpan.className = 'desc-reveal';
  descSpan.textContent = desc;
  descEl.appendChild(descSpan);
}

function initAuthSlides() {
  const desktopSlides = document.querySelectorAll("#loginBox .auth-right .auth-slide");
  if (!desktopSlides.length) return;
  desktopSlides[0].classList.add("active");
  updateAuthSlideText(0);
  if (authSlideTimer) clearInterval(authSlideTimer);
  authSlideTimer = setInterval(() => {
    const totalSlides = desktopSlides.length;
    if (!totalSlides) return;
    const prevIndex = authSlideIndex;
    authSlideIndex = (authSlideIndex + 1) % totalSlides;
    desktopSlides[prevIndex].classList.remove("active");
    desktopSlides[authSlideIndex].classList.add("active");
    updateAuthSlideText(authSlideIndex);
  }, 4000);
}

initAuthSlides();

function initMobileSlides() {
  const mobileShowcases = document.querySelectorAll(".auth-mobile-showcase");
  if (!mobileShowcases.length) return;
  mobileShowcases.forEach(showcase => {
    const slides = showcase.querySelectorAll(".auth-mobile-slide");
    if (slides.length <= 1) return;
    let idx = 0;
    setInterval(() => {
      slides[idx].classList.remove("active");
      idx = (idx + 1) % slides.length;
      slides[idx].classList.add("active");
    }, 4000);
  });
}
initMobileSlides();

window.switchAuthTab = switchAuthTab;
window.authComingSoon = authComingSoon;
window.showAuthNotice = showAuthNotice;

/* ---------- QUÊN MẬT KHẨU / ĐẶT LẠI MẬT KHẨU ---------- */

window.closeModal = function(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove("show");
};

window.showForgotPassword = function() {
  document.getElementById("forgotModal").classList.add("show");
  setTimeout(() => {
    const input = document.getElementById("forgotEmail");
    if (input) input.focus();
  }, 100);
};

window.sendPasswordReset = async function() {
  const email = document.getElementById("forgotEmail").value.trim();
  const btn = document.getElementById("forgotSendBtn");
  if (!email) {
    showAuthNotice("Vui lòng nhập email", "error", "Thiếu email");
    return;
  }
  btn.disabled = true;
  btn.textContent = "Đang gửi...";
  try {
    const base = window.location.origin + window.location.pathname;
    const redirectTo = base.substring(0, base.lastIndexOf("/") + 1) + "reset-password.html";
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) throw error;
    closeModal("forgotModal");
    showAuthNotice("Liên kết đặt lại mật khẩu đã được gửi. Vui lòng kiểm tra email!", "success", "Đã gửi", 2600, "thongbaoSound", "fa-envelope");
    document.getElementById("forgotEmail").value = "";

    // Đếm ngược 10s trước khi cho bấm lại
    let countdown = 10;
    btn.textContent = `Gửi lại (${countdown}s)`;
    const interval = setInterval(() => {
      countdown--;
      if (countdown > 0) {
        btn.textContent = `Gửi lại (${countdown}s)`;
      } else {
        clearInterval(interval);
        btn.disabled = false;
        btn.textContent = "Gửi liên kết đặt lại";
      }
    }, 1000);
  } catch (error) {
    console.error("Lỗi gửi liên kết đặt lại mật khẩu:", error);
    showAuthNotice("Gửi liên kết thất bại: " + error.message, "error", "Lỗi");
    btn.disabled = false;
    btn.textContent = "Gửi liên kết đặt lại";
  }
};

onAuthChange(async (event, session) => {
  const user = session?.user ?? null;
  if (event === "PASSWORD_RECOVERY") {
    redirectToResetPage();
    return;
  }
  if (user && !processingLogin) {
    processingLogin = true;
    try {
      // Kiểm tra whitelist
      const allowed = await emailAllowed(user.email);
      if (!allowed) {
        logAppError({ source: "login", category: "whitelist", level: "warning", code: "NOT_ALLOWED", message: "User không nằm trong whitelist cố đăng nhập (OAuth/quay lại khi có session).", email: user.email });
        showAuthNotice("Tài khoản này không được cấp quyền truy cập. Vui lòng liên hệ admin.", "error", "Không có quyền truy cập", 4500);
        await supabase.auth.signOut();
        processingLogin = false;
        return;
      }
      // Kiểm tra tài khoản bị khóa
      const row = await getUserRow(user.id);
      if (row && row.disabled) {
        logAppError({ source: "login", category: "disabled", level: "warning", code: "DISABLED", message: "Tài khoản bị khóa cố đăng nhập (OAuth/quay lại khi có session).", email: user.email, detail: { name: row.name || "" } });
        showAuthNotice("Tài khoản của bạn đang bị vô hiệu hóa. Vui lòng liên hệ admin.", "error", "Tài khoản bị khóa", 4500);
        await supabase.auth.signOut();
        processingLogin = false;
        return;
      }
      // Cập nhật hồ sơ (user mới nằm thẳng trên Supabase) rồi vào trang chủ
      await finalizeSession(user);
      window.location.replace("/index.html");
    } catch(e) {
      console.error("Finalize login lỗi:", e);
      processingLogin = false;
      showAuthNotice("Đã có lỗi xảy ra khi đăng nhập. Vui lòng thử lại.", "error", "Lỗi");
    }
    return;
  }
  if (!user) {
    document.getElementById("loginBox").style.display = "flex";
    const params = new URLSearchParams(window.location.search);
    if (params.get("loggedout") === "1") {
      showAuthNotice("Đăng xuất thành công!", "success", "Thành công");
      window.history.replaceState({}, '', 'login.html');
    }
  }
});

window.googleLogin = async function() {
  if (maintenanceState.enabled) { window.location.replace('maintenance.html'); return; }
  processingLogin = true;
  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + window.location.pathname }
    });
    if (error) throw error;
  } catch(error) {
    console.error("Lỗi Google Login:", error);
    processingLogin = false;
    showAuthNotice("Đăng nhập chưa thành công: " + error.message, "error", "Đã xảy ra lỗi");
  }
};

window.facebookLogin = async function() {
  if (maintenanceState.enabled) { window.location.replace('maintenance.html'); return; }
  processingLogin = true;
  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'facebook',
      options: { redirectTo: window.location.origin + window.location.pathname }
    });
    if (error) throw error;
  } catch(error) {
    console.error("Lỗi Facebook Login:", error);
    processingLogin = false;
    showAuthNotice("Đăng nhập chưa thành công: " + error.message, "error", "Đã xảy ra lỗi");
  }
};

window.microsoftLogin = async function() {
  if (maintenanceState.enabled) { window.location.replace('maintenance.html'); return; }
  processingLogin = true;
  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'azure',
      options: { redirectTo: window.location.origin + window.location.pathname }
    });
    if (error) throw error;
  } catch(error) {
    console.error("Lỗi Microsoft Login:", error);
    processingLogin = false;
    showAuthNotice("Đăng nhập chưa thành công: " + error.message, "error", "Đã xảy ra lỗi");
  }
};

window.emailLogin = async function() {
  if (maintenanceState.enabled) { window.location.replace('maintenance.html'); return; }
  clearFieldErrors();
  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;
  let invalid = false, focusId = null;
  if (!email) { setFieldError("loginEmail", "Vui lòng nhập email"); focusId = "loginEmail"; invalid = true; }
  else if (!emailRe.test(email)) { setFieldError("loginEmail", "Email không hợp lệ"); focusId = "loginEmail"; invalid = true; }
  if (!password) { setFieldError("loginPassword", "Vui lòng nhập mật khẩu"); focusId = focusId || "loginPassword"; invalid = true; }
  if (invalid) {
    if (focusId) { shakeAuthBox(focusId); document.getElementById(focusId).focus(); }
    showAuthNotice("Vui lòng kiểm tra lại thông tin", "error", "Thiếu thông tin");
    return;
  }
  const btn = document.getElementById("loginSubmitBtn");
  setBtnLoading(btn, true);
  processingLogin = true;
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    const user = data.user;
    if (!await emailAllowed(user.email)) {
      logAppError({ source: "login", category: "whitelist", level: "warning", code: "NOT_ALLOWED", message: "Đăng nhập email/mật khẩu bằng email không nằm trong whitelist.", email: user.email });
      showAuthNotice("Tài khoản này không được cấp quyền truy cập. Vui lòng liên hệ admin.", "error", "Không có quyền truy cập", 4500);
      setFieldError("loginEmail", "Email chưa được cấp quyền truy cập");
      await supabase.auth.signOut();
      processingLogin = false;
      setBtnLoading(btn, false);
      return;
    }
    const row = await getUserRow(user.id);
    if (row && row.disabled) {
      logAppError({ source: "login", category: "disabled", level: "warning", code: "DISABLED", message: "Đăng nhập email/mật khẩu bằng tài khoản bị khóa.", email: user.email, detail: { name: row.name || "" } });
      showAuthNotice("Tài khoản của bạn đang bị vô hiệu hóa. Vui lòng liên hệ admin.", "error", "Tài khoản bị khóa", 4500);
      setFieldError("loginEmail", "Tài khoản đang bị khóa");
      await supabase.auth.signOut();
      processingLogin = false;
      setBtnLoading(btn, false);
      return;
    }
    await finalizeSession(user);
    showLoginSuccess("Đăng nhập thành công!");
  } catch(error) {
    console.error("Lỗi đăng nhập:", error);
    processingLogin = false;
    setBtnLoading(btn, false);
    let message = "Đăng nhập thất bại";
    const msg = String(error.message || "");
    if (error.code === 'invalid_credentials' || /invalid login credentials/i.test(msg)) {
      message = "Email hoặc mật khẩu không đúng";
      setFieldError("loginPassword", "Email hoặc mật khẩu không đúng");
      shakeAuthBox("loginPassword");
      const pwInput = document.getElementById("loginPassword");
      pwInput.focus(); pwInput.select();
    } else if (error.code === 'invalid_email' || /invalid email/i.test(msg)) {
      message = "Email không hợp lệ";
      setFieldError("loginEmail", "Email không hợp lệ");
    } else if (error.code === 'email_not_confirmed') {
      message = "Email chưa được xác nhận";
      setFieldError("loginEmail", "Email chưa được xác nhận");
    } else if (error.code === 'rate_limit_exceeded' || /too many requests|rate limit/i.test(msg)) {
      message = "Đăng nhập quá nhiều lần. Vui lòng thử lại sau";
    }
    showAuthNotice(message, "error", "Đăng nhập thất bại");
  }
};

window.emailRegister = async function() {
  clearFieldErrors();
  const name = document.getElementById("registerName").value.trim();
  const email = document.getElementById("registerEmail").value.trim();
  const password = document.getElementById("registerPassword").value;
  const confirmPassword = document.getElementById("registerConfirmPassword").value;
  const otpInput = document.getElementById("otpCode");
  const otpSection = document.getElementById("otpSection");

  let invalid = false, focusId = null;
  if (!name) { setFieldError("registerName", "Vui lòng nhập tên hiển thị"); focusId = "registerName"; invalid = true; }
  else if (name.length < 2) { setFieldError("registerName", "Tên phải có ít nhất 2 ký tự"); focusId = "registerName"; invalid = true; }
  if (!email) { setFieldError("registerEmail", "Vui lòng nhập email"); focusId = focusId || "registerEmail"; invalid = true; }
  else if (!emailRe.test(email)) { setFieldError("registerEmail", "Email không hợp lệ"); focusId = focusId || "registerEmail"; invalid = true; }
  if (!password) { setFieldError("registerPassword", "Vui lòng nhập mật khẩu"); focusId = focusId || "registerPassword"; invalid = true; }
  else if (password.length < 6) { setFieldError("registerPassword", "Mật khẩu phải có ít nhất 6 ký tự"); focusId = focusId || "registerPassword"; invalid = true; }
  if (!confirmPassword) { setFieldError("registerConfirmPassword", "Vui lòng nhập lại mật khẩu"); focusId = focusId || "registerConfirmPassword"; invalid = true; }
  else if (confirmPassword !== password) { setFieldError("registerConfirmPassword", "Mật khẩu nhập lại không khớp"); focusId = focusId || "registerConfirmPassword"; invalid = true; }
  if (invalid) {
    if (focusId) { shakeAuthBox(focusId); document.getElementById(focusId).focus(); }
    showAuthNotice("Vui lòng kiểm tra lại thông tin", "error", "Thiếu thông tin");
    return;
  }
  if (!registrationOpen && !await emailAllowed(email)) {
    logAppError({ source: "login", category: "whitelist", level: "warning", code: "REG_CLOSED", message: "Đăng ký bị đóng, email không nằm trong whitelist.", email: email });
    setFieldError("registerEmail", "Đăng ký hiện đang đóng");
    showAuthNotice("Đăng ký hiện đang đóng. Vui lòng liên hệ admin nếu bạn cần tài khoản.", "error", "Đăng ký bị đóng");
    return;
  }
  if (!await emailAllowed(email)) {
    logAppError({ source: "login", category: "whitelist", level: "warning", code: "NOT_ALLOWED_SIGNUP", message: "Cố đăng ký bằng email không nằm trong whitelist.", email: email });
    setFieldError("registerEmail", "Email chưa được cấp quyền truy cập");
    showAuthNotice("Email này không nằm trong danh sách được cấp quyền. Vui lòng liên hệ admin.", "error", "Không có quyền truy cập");
    return;
  }

  const photoValue = document.getElementById("registerPhoto").value.trim();
  if (photoValue && !/^https?:\/\/\S+$/i.test(photoValue)) {
    setFieldError("registerPhoto", "Ảnh đại diện phải là đường dẫn http(s) hợp lệ");
    shakeAuthBox("registerPhoto"); document.getElementById("registerPhoto").focus();
    showAuthNotice("Ảnh đại diện phải là đường dẫn http(s) hợp lệ", "error", "URL ảnh không hợp lệ");
    return;
  }

  if (otpSection.style.display === "none" || !otpSection.style.display) {
    showAuthNotice("Vui lòng nhấn 'Nhận mã' để xác minh email trước", "error", "Chưa xác minh email");
    return;
  }

  const code = otpInput.value.trim();
  if (!code || code.length !== 6) {
    setFieldError("otpCode", "Vui lòng nhập mã xác nhận 6 chữ số");
    shakeAuthBox("otpCode"); otpInput.focus();
    showAuthNotice("Vui lòng nhập mã xác nhận 6 chữ số", "error", "Thiếu mã xác nhận");
    return;
  }
  if (Date.now() > otpExpiry) {
    setFieldError("otpCode", "Mã đã hết hạn. Nhấn 'Gửi lại mã'");
    showAuthNotice("Mã xác nhận đã hết hạn. Vui lòng nhấn 'Gửi lại mã'", "error", "Mã hết hạn");
    return;
  }
  if (code !== otpGenerated) {
    const serverResult = await verifyOTPOnServer(email, code);
    if (serverResult === false) {
      setFieldError("otpCode", "Mã xác nhận không đúng");
      shakeAuthBox("otpCode"); otpInput.focus(); otpInput.select();
      showAuthNotice("Mã xác nhận không đúng. Vui lòng kiểm tra lại", "error", "Sai mã");
      return;
    }
    if (serverResult === null) {
      setFieldError("otpCode", "Mã xác nhận không đúng");
      shakeAuthBox("otpCode"); otpInput.focus(); otpInput.select();
      showAuthNotice("Mã xác nhận không đúng. Vui lòng kiểm tra lại", "error", "Sai mã");
      return;
    }
  }

  const btn = document.getElementById("registerSubmitBtn");
  setBtnLoading(btn, true);
  processingLogin = true;
  try {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    const user = data.user;
    const nowIso = new Date().toISOString();
    const photoUrl = document.getElementById("registerPhoto").value.trim() || "https://i.imgur.com/6VBx3io.png";
    await supabase.from("users").upsert({
      id: user.id, email: user.email, name: name, photo: photoUrl,
      last_login: nowIso, online: false, created_at: nowIso
    }, { onConflict: "id" });
    showAuthNotice("Đăng ký thành công! Vui lòng đăng nhập.", "success", "Thành công");
    document.getElementById("registerName").value = "";
    document.getElementById("registerEmail").value = "";
    document.getElementById("registerPassword").value = "";
    document.getElementById("registerConfirmPassword").value = "";
    document.getElementById("registerPhoto").value = "";
    resetOTPState();
    await supabase.auth.signOut();
    processingLogin = false;
    setBtnLoading(btn, false);
    switchAuthTab('login');
    document.getElementById("loginEmail").value = email;
  } catch(error) {
    console.error("Lỗi đăng ký:", error);
    processingLogin = false;
    setBtnLoading(btn, false);
    let message = "Đăng ký thất bại";
    const msg = String(error.message || "");
    if (error.code === 'user_already_exists' || /already registered|already been registered/i.test(msg)) {
      message = "Email này đã được đăng ký";
      setFieldError("registerEmail", "Email này đã được đăng ký");
    } else if (error.code === 'invalid_email' || /invalid email/i.test(msg)) {
      message = "Email không hợp lệ";
      setFieldError("registerEmail", "Email không hợp lệ");
    } else if (error.code === 'weak_password' || /password should be at least|weak password/i.test(msg)) {
      message = "Mật khẩu quá yếu (cần ít nhất 6 ký tự)";
      setFieldError("registerPassword", "Mật khẩu quá yếu (cần ít nhất 6 ký tự)");
    }
    showAuthNotice(message, "error", "Đăng ký thất bại");
  }
};

/* ---------- REVEAL SECTION GIỚI THIỆU KHI CUỘN VÀO VIEWPORT ---------- */
(function initAuthBelowReveal() {
  const below = document.querySelector(".auth-below");
  if (!below) return;
  if (!("IntersectionObserver" in window)) { below.classList.add("auth-below--show"); return; }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (en.isIntersecting) {
        en.target.classList.add("auth-below--show");
        io.disconnect();
      }
    });
  }, { threshold: 0.1, rootMargin: "0px 0px -40px 0px" });
  io.observe(below);
})();

/* ---------- NÚT CUỘN XUỐNG KHU TÍNH NĂNG (hiện khi ở đầu trang) ---------- */
(function initAuthScrollDown() {
  const btn = document.getElementById("authScrollDown");
  const below = document.querySelector(".auth-below");
  if (!btn || !below) return;
  const onScroll = () => btn.classList.toggle("hidden", window.scrollY > 60);
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  onScroll();
  btn.addEventListener("click", () => below.scrollIntoView({ behavior: "smooth" }));
})();

/* ---------- NÚT CUỘN LÊN ĐẦU TRANG (khu giới thiệu bên dưới) ---------- */
(function initAuthBelowUp() {
  const btn = document.getElementById("authBelowUp");
  const below = document.querySelector(".auth-below");
  if (!btn) return;
  const onScroll = () => {
    const passedFeatures = !below || below.getBoundingClientRect().bottom < window.innerHeight - 40;
    btn.classList.toggle("active", passedFeatures);
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  onScroll();
  btn.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
})();

/* ---------- MOUSE GLOW TRACKING ON CARDS ---------- */
(function initCardMouseGlow() {
  if (window.matchMedia("(max-width:768px)").matches) return;
  document.querySelectorAll(".auth-below-card").forEach(card => {
    card.addEventListener("mousemove", e => {
      const r = card.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width) * 100;
      const y = ((e.clientY - r.top) / r.height) * 100;
      card.style.setProperty("--mx", x + "%");
      card.style.setProperty("--my", y + "%");
    });
  });
})();

/* ---------- CLICK RIPPLE ON CARDS ---------- */
(function initCardRipple() {
  document.querySelectorAll(".auth-below-card").forEach(card => {
    card.addEventListener("click", e => {
      const r = card.getBoundingClientRect();
      const d = Math.max(r.width, r.height) * 2.2;
      const s = document.createElement("span");
      s.className = "auth-below-ripple";
      s.style.width = s.style.height = d + "px";
      const cx = (e.clientX || r.left + r.width / 2) - r.left;
      const cy = (e.clientY || r.top + r.height / 2) - r.top;
      s.style.left = (cx - d / 2) + "px";
      s.style.top = (cy - d / 2) + "px";
      card.appendChild(s);
      setTimeout(() => s.remove(), 700);
    });
  });
})();

/* ---------- COUNTER ANIMATION FOR STATS ---------- */
(function initStatCounters() {
  const below = document.querySelector(".auth-below");
  if (!below) return;
  let counted = false;
  function animateCounters() {
    if (counted) return;
    counted = true;
    document.querySelectorAll(".auth-below-stat-num").forEach(el => {
      const text = el.textContent.trim();
      const match = text.match(/^([\d.]+)([K+%]*)$/);
      if (!match) return;
      const target = parseFloat(match[1]);
      const suffix = match[2] || "";
      const isFloat = text.includes(".");
      const duration = 1200;
      const start = performance.now();
      function tick(now) {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = target * eased;
        if (isFloat) el.textContent = current.toFixed(1) + suffix;
        else el.textContent = Math.round(current) + suffix;
        if (progress < 1) requestAnimationFrame(tick);
        else el.textContent = text;
      }
      el.textContent = isFloat ? "0.0" + suffix : "0" + suffix;
      requestAnimationFrame(tick);
    });
  }
  const io = new IntersectionObserver(entries => {
    entries.forEach(en => { if (en.isIntersecting) { animateCounters(); io.disconnect(); } });
  }, { threshold: 0.3 });
  const statsRow = below.querySelector(".auth-below-stats");
  if (statsRow) io.observe(statsRow);
})();

/* ---------- AUTO HOVER CARDS: tự động highlight từng card ---------- */
(function initAutoHoverCards() {
  if (window.matchMedia("(max-width:768px)").matches) return;
  const grid = document.querySelector(".auth-below-grid");
  if (!grid) return;
  const cards = Array.from(grid.querySelectorAll(".auth-below-card"));
  if (cards.length === 0) return;

  let currentIdx = 0;
  let autoTimer = null;
  let paused = false;
  let resumeTimer = null;
  const INTERVAL = 2000;

  function activate(idx) {
    cards.forEach(c => c.classList.remove("auth-below-card--auto-active"));
    cards[idx].classList.add("auth-below-card--auto-active");
  }

  function nextCard() {
    if (paused) return;
    currentIdx = (currentIdx + 1) % cards.length;
    activate(currentIdx);
    autoTimer = setTimeout(nextCard, INTERVAL);
  }

  function startAuto() {
    clearTimeout(autoTimer);
    clearTimeout(resumeTimer);
    paused = false;
    activate(currentIdx);
    autoTimer = setTimeout(nextCard, INTERVAL);
  }

  function pauseAuto() {
    paused = true;
    clearTimeout(autoTimer);
    clearTimeout(resumeTimer);
    cards.forEach(c => c.classList.remove("auth-below-card--auto-active"));
  }

  cards.forEach(card => {
    card.addEventListener("mouseenter", pauseAuto);
    card.addEventListener("mouseleave", () => {
      resumeTimer = setTimeout(startAuto, 2500);
    });
    card.addEventListener("touchstart", pauseAuto, { passive: true });
  });

  // Bắt đầu khi grid scroll vào viewport
  const io = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (en.isIntersecting) { startAuto(); io.disconnect(); }
    });
  }, { threshold: 0.2 });
  io.observe(grid);
})();

/* ---------- TILT EFFECT ON CARDS ---------- */
(function initCardTilt() {
  if (window.matchMedia("(max-width:768px)").matches) return;
  document.querySelectorAll(".auth-below-card").forEach(card => {
    card.addEventListener("mousemove", e => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      card.style.transform = `translateY(-8px) scale(1.02) rotateY(${x * 8}deg) rotateX(${-y * 8}deg)`;
    });
    card.addEventListener("mouseleave", () => {
      card.style.transform = "";
    });
  });
})();

/* ---------- STAT ICON BOUNCE ON VIEW ---------- */
(function initStatIconBounce() {
  const statsRow = document.querySelector(".auth-below-stats");
  if (!statsRow) return;
  let bounced = false;
  const io = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (en.isIntersecting && !bounced) {
        bounced = true;
        statsRow.querySelectorAll(".auth-below-stat-icon").forEach((icon, i) => {
          icon.style.animation = "none";
          void icon.offsetWidth;
          icon.style.animation = `authIconPopIn .5s cubic-bezier(.2,.7,.3,1) ${i * .1 + .2}s backwards`;
        });
        io.disconnect();
      }
    });
  }, { threshold: 0.4 });
  io.observe(statsRow);
})();

