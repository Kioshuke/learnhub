
import { supabase } from "./supabase-config.js";
import { getMaintenance, subscribeMaintenance, emailAllowed, isRegistrationOpen, getUserRow, onAuthChange, finalizeSession } from "./supabase-helpers.js";
import { redirectToResetPage, isPasswordRecovery } from "./reset-password.js";
import { logAppError } from "./log-errors.js";

window.supabase = supabase;

// ÄÄƒng kÃ½ ngay láº­p tá»©c (trÆ°á»›c má»i await bÃªn dÆ°á»›i) Ä‘á»ƒ khÃ´ng lá»¡ sá»± kiá»‡n
// PASSWORD_RECOVERY khi user báº¥m link Ä‘áº·t láº¡i máº­t kháº©u tá»« email.
supabase.auth.onAuthStateChange((event) => {
  isPasswordRecovery(event);
});

let maintenanceState = { enabled: false, message: "", initialized: false };

// Check ngay khi load trang (await â€” náº¿u báº­t thÃ¬ redirect ngay, khÃ´ng cháº¡y tiáº¿p)
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

// Láº¯ng nghe realtime: báº­t â†’ redirect maintenance.html, táº¯t â†’ redirect login.html
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
      // Chá»‰ redirect vá» login náº¿u khÃ´ng pháº£i Ä‘ang á»Ÿ login.html
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
    btn.innerHTML = '<span class="auth-btn-spinner"></span>Äang xá»­ lÃ½...';
  } else {
    btn.disabled = false;
    btn.innerHTML = btn.dataset.orig || "Tiáº¿p tá»¥c";
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
    toast = lhToast(`${message} Chuyá»ƒn hÆ°á»›ng sau ${remaining}s...`, {
      type: "success",
      title: "ThÃ nh cÃ´ng",
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
      toast.update(`${message} Chuyá»ƒn hÆ°á»›ng sau ${remaining}s...`);
    }
  }, 1000);
}

// Fallback: náº¿u mp3 bá»‹ cháº·n/lá»—i táº£i thÃ¬ kÃªu beep báº±ng WebAudio API (luÃ´n available sau gesture)
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
  // ThÃ´ng bÃ¡o trÆ°á»›c chÆ°a phÃ¡t xong -> dÃ¹ng báº£n clone Ä‘á»ƒ chá»“ng tiáº¿ng, khÃ´ng cáº¯t nhau
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

// Má»Ÿ khoÃ¡ autoplay sau láº§n tÆ°Æ¡ng tÃ¡c Ä‘áº§u tiÃªn cá»§a ngÆ°á»i dÃ¹ng.
// KhÃ´ng cÃ³ bÆ°á»›c nÃ y, thÃ´ng bÃ¡o tá»« onAuthChange (restore session) bá»‹ trÃ¬nh duyá»‡t cháº·n tiáº¿ng.
// QUAN TRá»ŒNG: listener click á»Ÿ document cháº¡y SAU onclick cá»§a nÃºt (event bubbling),
// nÃªn náº¿u khÃ´ng guard thÃ¬ nÃ³ sáº½ mute/táº£i láº¡i audio mÃ  thÃ´ng bÃ¡o vá»«a báº¯t Ä‘áº§u phÃ¡t
// -> tiáº¿ng popup bá»‹ nuá»‘t máº¥t. LuÃ´n bá» qua náº¿u audio Ä‘ang phÃ¡t tiáº¿ng tháº­t.
(function unlockAudio() {
  const ids = ["thongbaoSound"];
  function tryUnlock() {
    let loaded = false;
    ids.forEach(function (id) {
      const a = document.getElementById(id);
      if (!a) return;
      // Äang phÃ¡t thÃ´ng bÃ¡o tháº­t -> trÃ¬nh duyá»‡t Ä‘Ã£ cho phÃ©p tiáº¿ng, Ä‘á»«ng Ä‘á»¥ng vÃ o
      if (!a.paused && !a.muted && a.volume > 0) { loaded = true; return; }
      a.muted = true;
      a.volume = 0;
      try {
        const p = a.play();
        if (p && p.then) {
          p.then(function () {
            // Náº¿u cÃ³ má»™t play() tháº­t (cÃ³ tiáº¿ng) Ä‘ang cháº¡y trong cÃ¹ng lÆ°á»£t click
            // (vd: báº¥m ÄÄƒng nháº­p bá»‹ lá»—i â†’ hiá»‡n thÃ´ng bÃ¡o), KHÃ”NG pause Ä‘á»ƒ
            // trÃ¡nh nuá»‘t máº¥t tiáº¿ng cá»§a thÃ´ng bÃ¡o.
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
    // Warm-up luÃ´n WebAudio context cho fallback beep
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
  btn.textContent = "Gá»­i láº¡i mÃ£ (" + sec + "s)";
  otpResendCooldown = setInterval(() => {
    sec--;
    if (sec <= 0) {
      clearInterval(otpResendCooldown);
      btn.disabled = false;
      btn.textContent = "Gá»­i láº¡i mÃ£";
      return;
    }
    btn.textContent = "Gá»­i láº¡i mÃ£ (" + sec + "s)";
  }, 1000);
}

window.sendOTP = async function() {
  const email = document.getElementById("registerEmail").value.trim();
  if (!email) {
    showAuthNotice("Vui lÃ²ng nháº­p email trÆ°á»›c", "error", "Thiáº¿u email");
    return;
  }
  setFieldError("otpCode", "");
  const btn = document.getElementById("sendOtpBtn");
  btn.disabled = true;
  btn.textContent = "Äang gá»­i...";

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
    btn.textContent = "ÄÃ£ gá»­i mÃ£ âœ“";
    startOTPCountdown();
    startResendCooldown();
    const otpFocus = document.getElementById("otpCode");
    if (otpFocus) otpFocus.focus();
  } catch(err) {
    console.error("OTP send error:", err);
    showAuthNotice("Gá»­i mÃ£ tháº¥t báº¡i. Vui lÃ²ng thá»­ láº¡i.", "error", "Lá»—i gá»­i mÃ£");
    btn.disabled = false;
    btn.textContent = "Nháº­n mÃ£";
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
    showAuthNotice("MÃ£ má»›i Ä‘Ã£ gá»­i Ä‘áº¿n email cá»§a báº¡n", "success", "Gá»­i láº¡i thÃ nh cÃ´ng");
  } catch(err) {
    console.error("OTP resend error:", err);
    showAuthNotice("Gá»­i láº¡i mÃ£ tháº¥t báº¡i", "error", "Lá»—i");
    btn.disabled = false;
    btn.textContent = "Gá»­i láº¡i mÃ£";
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
  if (sendBtn) { sendBtn.disabled = false; sendBtn.textContent = "Nháº­n mÃ£"; }
  if (resendBtn) { resendBtn.disabled = false; resendBtn.textContent = "Gá»­i láº¡i mÃ£"; }
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
    showAuthNotice("ÄÄƒng kÃ½ hiá»‡n Ä‘ang Ä‘Ã³ng. Vui lÃ²ng liÃªn há»‡ admin náº¿u báº¡n cáº§n cáº¥p tÃ i khoáº£n.", "warning", "ÄÄƒng kÃ½ bá»‹ Ä‘Ã³ng");
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
  showAuthNotice("TÃ­nh nÄƒng nÃ y Ä‘ang phÃ¡t triá»ƒn. Hiá»‡n táº¡i báº¡n váº«n Ä‘Äƒng nháº­p báº±ng Google nhÆ° cÅ©.", "info", "TÃ­nh nÄƒng sáº¯p ra máº¯t");
}

const authSlideData = [
  { title: "LearnHub â€“ NÃ¢ng cáº¥p cÃ¡ch báº¡n há»c", desc: "Ã”n thi nhanh â€¢ Giao diá»‡n hiá»‡n Ä‘áº¡i â€¢ Tá»‘i Æ°u tráº£i nghiá»‡m" },
  { title: "Giao diá»‡n chÃ­nh - Hubie AI", desc: "Trá»£ lÃ½ AI há»— trá»£ há»c táº­p vÃ  tra tá»« Ä‘iá»ƒn Anh - Viá»‡t cÃ¹ng giao diá»‡n trá»±c quan Ä‘áº§y Ä‘á»§ tÃ­nh nÄƒng" },
  { title: "LearnHub Forum", desc: "Trao Ä‘á»•i â€¢ Há»i Ä‘Ã¡p â€¢ Káº¿t ná»‘i há»c sinh nhÆ° má»™t trang MXH" },
  { title: "TÃ­nh nÄƒng Smart FlashCard", desc: "Há»c tá»« vá»±ng thÃ´ng minh vá»›i nhiá»u thá»ƒ loáº¡i há»c táº­p, tá»« vá»±ng Ä‘a dáº¡ng" }
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

/* ---------- QUÃŠN Máº¬T KHáº¨U / Äáº¶T Láº I Máº¬T KHáº¨U ---------- */

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
    showAuthNotice("Vui lÃ²ng nháº­p email", "error", "Thiáº¿u email");
    return;
  }
  btn.disabled = true;
  btn.textContent = "Äang gá»­i...";
  try {
    const base = window.location.origin + window.location.pathname;
    const redirectTo = base.substring(0, base.lastIndexOf("/") + 1) + "reset-password.html";
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) throw error;
    closeModal("forgotModal");
    showAuthNotice("LiÃªn káº¿t Ä‘áº·t láº¡i máº­t kháº©u Ä‘Ã£ Ä‘Æ°á»£c gá»­i. Vui lÃ²ng kiá»ƒm tra email!", "success", "ÄÃ£ gá»­i", 2600, "thongbaoSound", "fa-envelope");
    document.getElementById("forgotEmail").value = "";

    // Äáº¿m ngÆ°á»£c 10s trÆ°á»›c khi cho báº¥m láº¡i
    let countdown = 10;
    btn.textContent = `Gá»­i láº¡i (${countdown}s)`;
    const interval = setInterval(() => {
      countdown--;
      if (countdown > 0) {
        btn.textContent = `Gá»­i láº¡i (${countdown}s)`;
      } else {
        clearInterval(interval);
        btn.disabled = false;
        btn.textContent = "Gá»­i liÃªn káº¿t Ä‘áº·t láº¡i";
      }
    }, 1000);
  } catch (error) {
    console.error("Lá»—i gá»­i liÃªn káº¿t Ä‘áº·t láº¡i máº­t kháº©u:", error);
    showAuthNotice("Gá»­i liÃªn káº¿t tháº¥t báº¡i: " + error.message, "error", "Lá»—i");
    btn.disabled = false;
    btn.textContent = "Gá»­i liÃªn káº¿t Ä‘áº·t láº¡i";
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
      // Kiá»ƒm tra whitelist
      const allowed = await emailAllowed(user.email);
      if (!allowed) {
        logAppError({ source: "login", category: "whitelist", level: "warning", code: "NOT_ALLOWED", message: "User khÃ´ng náº±m trong whitelist cá»‘ Ä‘Äƒng nháº­p (OAuth/quay láº¡i khi cÃ³ session).", email: user.email });
        showAuthNotice("TÃ i khoáº£n nÃ y khÃ´ng Ä‘Æ°á»£c cáº¥p quyá»n truy cáº­p. Vui lÃ²ng liÃªn há»‡ admin.", "error", "KhÃ´ng cÃ³ quyá»n truy cáº­p", 4500);
        await supabase.auth.signOut();
        processingLogin = false;
        return;
      }
      // Kiá»ƒm tra tÃ i khoáº£n bá»‹ khÃ³a
      const row = await getUserRow(user.id);
      if (row && row.disabled) {
        logAppError({ source: "login", category: "disabled", level: "warning", code: "DISABLED", message: "TÃ i khoáº£n bá»‹ khÃ³a cá»‘ Ä‘Äƒng nháº­p (OAuth/quay láº¡i khi cÃ³ session).", email: user.email, detail: { name: row.name || "" } });
        showAuthNotice("TÃ i khoáº£n cá»§a báº¡n Ä‘ang bá»‹ vÃ´ hiá»‡u hÃ³a. Vui lÃ²ng liÃªn há»‡ admin.", "error", "TÃ i khoáº£n bá»‹ khÃ³a", 4500);
        await supabase.auth.signOut();
        processingLogin = false;
        return;
      }
      // Cáº­p nháº­t há»“ sÆ¡ (user má»›i náº±m tháº³ng trÃªn Supabase) rá»“i vÃ o trang chá»§
      await finalizeSession(user);
      window.location.replace("/index.html");
    } catch(e) {
      console.error("Finalize login lá»—i:", e);
      processingLogin = false;
      showAuthNotice("ÄÃ£ cÃ³ lá»—i xáº£y ra khi Ä‘Äƒng nháº­p. Vui lÃ²ng thá»­ láº¡i.", "error", "Lá»—i");
    }
    return;
  }
  if (!user) {
    document.getElementById("loginBox").style.display = "flex";
    const params = new URLSearchParams(window.location.search);
    if (params.get("loggedout") === "1") {
      showAuthNotice("ÄÄƒng xuáº¥t thÃ nh cÃ´ng!", "success", "ThÃ nh cÃ´ng");
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
    console.error("Lá»—i Google Login:", error);
    processingLogin = false;
    showAuthNotice("ÄÄƒng nháº­p chÆ°a thÃ nh cÃ´ng: " + error.message, "error", "ÄÃ£ xáº£y ra lá»—i");
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
    console.error("Lá»—i Facebook Login:", error);
    processingLogin = false;
    showAuthNotice("ÄÄƒng nháº­p chÆ°a thÃ nh cÃ´ng: " + error.message, "error", "ÄÃ£ xáº£y ra lá»—i");
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
    console.error("Lá»—i Microsoft Login:", error);
    processingLogin = false;
    showAuthNotice("ÄÄƒng nháº­p chÆ°a thÃ nh cÃ´ng: " + error.message, "error", "ÄÃ£ xáº£y ra lá»—i");
  }
};

window.emailLogin = async function() {
  if (maintenanceState.enabled) { window.location.replace('maintenance.html'); return; }
  clearFieldErrors();
  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;
  let invalid = false, focusId = null;
  if (!email) { setFieldError("loginEmail", "Vui lÃ²ng nháº­p email"); focusId = "loginEmail"; invalid = true; }
  else if (!emailRe.test(email)) { setFieldError("loginEmail", "Email khÃ´ng há»£p lá»‡"); focusId = "loginEmail"; invalid = true; }
  if (!password) { setFieldError("loginPassword", "Vui lÃ²ng nháº­p máº­t kháº©u"); focusId = focusId || "loginPassword"; invalid = true; }
  if (invalid) {
    if (focusId) { shakeAuthBox(focusId); document.getElementById(focusId).focus(); }
    showAuthNotice("Vui lÃ²ng kiá»ƒm tra láº¡i thÃ´ng tin", "error", "Thiáº¿u thÃ´ng tin");
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
      logAppError({ source: "login", category: "whitelist", level: "warning", code: "NOT_ALLOWED", message: "ÄÄƒng nháº­p email/máº­t kháº©u báº±ng email khÃ´ng náº±m trong whitelist.", email: user.email });
      showAuthNotice("TÃ i khoáº£n nÃ y khÃ´ng Ä‘Æ°á»£c cáº¥p quyá»n truy cáº­p. Vui lÃ²ng liÃªn há»‡ admin.", "error", "KhÃ´ng cÃ³ quyá»n truy cáº­p", 4500);
      setFieldError("loginEmail", "Email chÆ°a Ä‘Æ°á»£c cáº¥p quyá»n truy cáº­p");
      await supabase.auth.signOut();
      processingLogin = false;
      setBtnLoading(btn, false);
      return;
    }
    const row = await getUserRow(user.id);
    if (row && row.disabled) {
      logAppError({ source: "login", category: "disabled", level: "warning", code: "DISABLED", message: "ÄÄƒng nháº­p email/máº­t kháº©u báº±ng tÃ i khoáº£n bá»‹ khÃ³a.", email: user.email, detail: { name: row.name || "" } });
      showAuthNotice("TÃ i khoáº£n cá»§a báº¡n Ä‘ang bá»‹ vÃ´ hiá»‡u hÃ³a. Vui lÃ²ng liÃªn há»‡ admin.", "error", "TÃ i khoáº£n bá»‹ khÃ³a", 4500);
      setFieldError("loginEmail", "TÃ i khoáº£n Ä‘ang bá»‹ khÃ³a");
      await supabase.auth.signOut();
      processingLogin = false;
      setBtnLoading(btn, false);
      return;
    }
    await finalizeSession(user);
    showLoginSuccess("ÄÄƒng nháº­p thÃ nh cÃ´ng!");
  } catch(error) {
    console.error("Lá»—i Ä‘Äƒng nháº­p:", error);
    processingLogin = false;
    setBtnLoading(btn, false);
    let message = "ÄÄƒng nháº­p tháº¥t báº¡i";
    const msg = String(error.message || "");
    if (error.code === 'invalid_credentials' || /invalid login credentials/i.test(msg)) {
      message = "Email hoáº·c máº­t kháº©u khÃ´ng Ä‘Ãºng";
      setFieldError("loginPassword", "Email hoáº·c máº­t kháº©u khÃ´ng Ä‘Ãºng");
      shakeAuthBox("loginPassword");
      const pwInput = document.getElementById("loginPassword");
      pwInput.focus(); pwInput.select();
    } else if (error.code === 'invalid_email' || /invalid email/i.test(msg)) {
      message = "Email khÃ´ng há»£p lá»‡";
      setFieldError("loginEmail", "Email khÃ´ng há»£p lá»‡");
    } else if (error.code === 'email_not_confirmed') {
      message = "Email chÆ°a Ä‘Æ°á»£c xÃ¡c nháº­n";
      setFieldError("loginEmail", "Email chÆ°a Ä‘Æ°á»£c xÃ¡c nháº­n");
    } else if (error.code === 'rate_limit_exceeded' || /too many requests|rate limit/i.test(msg)) {
      message = "ÄÄƒng nháº­p quÃ¡ nhiá»u láº§n. Vui lÃ²ng thá»­ láº¡i sau";
    }
    showAuthNotice(message, "error", "ÄÄƒng nháº­p tháº¥t báº¡i");
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
  if (!name) { setFieldError("registerName", "Vui lÃ²ng nháº­p tÃªn hiá»ƒn thá»‹"); focusId = "registerName"; invalid = true; }
  else if (name.length < 2) { setFieldError("registerName", "TÃªn pháº£i cÃ³ Ã­t nháº¥t 2 kÃ½ tá»±"); focusId = "registerName"; invalid = true; }
  if (!email) { setFieldError("registerEmail", "Vui lÃ²ng nháº­p email"); focusId = focusId || "registerEmail"; invalid = true; }
  else if (!emailRe.test(email)) { setFieldError("registerEmail", "Email khÃ´ng há»£p lá»‡"); focusId = focusId || "registerEmail"; invalid = true; }
  if (!password) { setFieldError("registerPassword", "Vui lÃ²ng nháº­p máº­t kháº©u"); focusId = focusId || "registerPassword"; invalid = true; }
  else if (password.length < 6) { setFieldError("registerPassword", "Máº­t kháº©u pháº£i cÃ³ Ã­t nháº¥t 6 kÃ½ tá»±"); focusId = focusId || "registerPassword"; invalid = true; }
  if (!confirmPassword) { setFieldError("registerConfirmPassword", "Vui lÃ²ng nháº­p láº¡i máº­t kháº©u"); focusId = focusId || "registerConfirmPassword"; invalid = true; }
  else if (confirmPassword !== password) { setFieldError("registerConfirmPassword", "Máº­t kháº©u nháº­p láº¡i khÃ´ng khá»›p"); focusId = focusId || "registerConfirmPassword"; invalid = true; }
  if (invalid) {
    if (focusId) { shakeAuthBox(focusId); document.getElementById(focusId).focus(); }
    showAuthNotice("Vui lÃ²ng kiá»ƒm tra láº¡i thÃ´ng tin", "error", "Thiáº¿u thÃ´ng tin");
    return;
  }
  if (!registrationOpen && !await emailAllowed(email)) {
    logAppError({ source: "login", category: "whitelist", level: "warning", code: "REG_CLOSED", message: "ÄÄƒng kÃ½ bá»‹ Ä‘Ã³ng, email khÃ´ng náº±m trong whitelist.", email: email });
    setFieldError("registerEmail", "ÄÄƒng kÃ½ hiá»‡n Ä‘ang Ä‘Ã³ng");
    showAuthNotice("ÄÄƒng kÃ½ hiá»‡n Ä‘ang Ä‘Ã³ng. Vui lÃ²ng liÃªn há»‡ admin náº¿u báº¡n cáº§n tÃ i khoáº£n.", "error", "ÄÄƒng kÃ½ bá»‹ Ä‘Ã³ng");
    return;
  }
  if (!await emailAllowed(email)) {
    logAppError({ source: "login", category: "whitelist", level: "warning", code: "NOT_ALLOWED_SIGNUP", message: "Cá»‘ Ä‘Äƒng kÃ½ báº±ng email khÃ´ng náº±m trong whitelist.", email: email });
    setFieldError("registerEmail", "Email chÆ°a Ä‘Æ°á»£c cáº¥p quyá»n truy cáº­p");
    showAuthNotice("Email nÃ y khÃ´ng náº±m trong danh sÃ¡ch Ä‘Æ°á»£c cáº¥p quyá»n. Vui lÃ²ng liÃªn há»‡ admin.", "error", "KhÃ´ng cÃ³ quyá»n truy cáº­p");
    return;
  }

  const photoValue = document.getElementById("registerPhoto").value.trim();
  if (photoValue && !/^https?:\/\/\S+$/i.test(photoValue)) {
    setFieldError("registerPhoto", "áº¢nh Ä‘áº¡i diá»‡n pháº£i lÃ  Ä‘Æ°á»ng dáº«n http(s) há»£p lá»‡");
    shakeAuthBox("registerPhoto"); document.getElementById("registerPhoto").focus();
    showAuthNotice("áº¢nh Ä‘áº¡i diá»‡n pháº£i lÃ  Ä‘Æ°á»ng dáº«n http(s) há»£p lá»‡", "error", "URL áº£nh khÃ´ng há»£p lá»‡");
    return;
  }

  if (otpSection.style.display === "none" || !otpSection.style.display) {
    showAuthNotice("Vui lÃ²ng nháº¥n 'Nháº­n mÃ£' Ä‘á»ƒ xÃ¡c minh email trÆ°á»›c", "error", "ChÆ°a xÃ¡c minh email");
    return;
  }

  const code = otpInput.value.trim();
  if (!code || code.length !== 6) {
    setFieldError("otpCode", "Vui lÃ²ng nháº­p mÃ£ xÃ¡c nháº­n 6 chá»¯ sá»‘");
    shakeAuthBox("otpCode"); otpInput.focus();
    showAuthNotice("Vui lÃ²ng nháº­p mÃ£ xÃ¡c nháº­n 6 chá»¯ sá»‘", "error", "Thiáº¿u mÃ£ xÃ¡c nháº­n");
    return;
  }
  if (Date.now() > otpExpiry) {
    setFieldError("otpCode", "MÃ£ Ä‘Ã£ háº¿t háº¡n. Nháº¥n 'Gá»­i láº¡i mÃ£'");
    showAuthNotice("MÃ£ xÃ¡c nháº­n Ä‘Ã£ háº¿t háº¡n. Vui lÃ²ng nháº¥n 'Gá»­i láº¡i mÃ£'", "error", "MÃ£ háº¿t háº¡n");
    return;
  }
  if (code !== otpGenerated) {
    const serverResult = await verifyOTPOnServer(email, code);
    if (serverResult === false) {
      setFieldError("otpCode", "MÃ£ xÃ¡c nháº­n khÃ´ng Ä‘Ãºng");
      shakeAuthBox("otpCode"); otpInput.focus(); otpInput.select();
      showAuthNotice("MÃ£ xÃ¡c nháº­n khÃ´ng Ä‘Ãºng. Vui lÃ²ng kiá»ƒm tra láº¡i", "error", "Sai mÃ£");
      return;
    }
    if (serverResult === null) {
      setFieldError("otpCode", "MÃ£ xÃ¡c nháº­n khÃ´ng Ä‘Ãºng");
      shakeAuthBox("otpCode"); otpInput.focus(); otpInput.select();
      showAuthNotice("MÃ£ xÃ¡c nháº­n khÃ´ng Ä‘Ãºng. Vui lÃ²ng kiá»ƒm tra láº¡i", "error", "Sai mÃ£");
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
    showAuthNotice("ÄÄƒng kÃ½ thÃ nh cÃ´ng! Vui lÃ²ng Ä‘Äƒng nháº­p.", "success", "ThÃ nh cÃ´ng");
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
    console.error("Lá»—i Ä‘Äƒng kÃ½:", error);
    processingLogin = false;
    setBtnLoading(btn, false);
    let message = "ÄÄƒng kÃ½ tháº¥t báº¡i";
    const msg = String(error.message || "");
    if (error.code === 'user_already_exists' || /already registered|already been registered/i.test(msg)) {
      message = "Email nÃ y Ä‘Ã£ Ä‘Æ°á»£c Ä‘Äƒng kÃ½";
      setFieldError("registerEmail", "Email nÃ y Ä‘Ã£ Ä‘Æ°á»£c Ä‘Äƒng kÃ½");
    } else if (error.code === 'invalid_email' || /invalid email/i.test(msg)) {
      message = "Email khÃ´ng há»£p lá»‡";
      setFieldError("registerEmail", "Email khÃ´ng há»£p lá»‡");
    } else if (error.code === 'weak_password' || /password should be at least|weak password/i.test(msg)) {
      message = "Máº­t kháº©u quÃ¡ yáº¿u (cáº§n Ã­t nháº¥t 6 kÃ½ tá»±)";
      setFieldError("registerPassword", "Máº­t kháº©u quÃ¡ yáº¿u (cáº§n Ã­t nháº¥t 6 kÃ½ tá»±)");
    }
    showAuthNotice(message, "error", "ÄÄƒng kÃ½ tháº¥t báº¡i");
  }
};

/* ---------- REVEAL SECTION GIá»šI THIá»†U KHI CUá»˜N VÃ€O VIEWPORT ---------- */
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

/* ---------- NÃšT CUá»˜N XUá»NG KHU TÃNH NÄ‚NG (hiá»‡n khi á»Ÿ Ä‘áº§u trang) ---------- */
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

/* ---------- NÃšT CUá»˜N LÃŠN Äáº¦U TRANG (khu giá»›i thiá»‡u bÃªn dÆ°á»›i) ---------- */
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

/* ---------- AUTO HOVER CARDS: tá»± Ä‘á»™ng highlight tá»«ng card ---------- */
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

  // Báº¯t Ä‘áº§u khi grid scroll vÃ o viewport
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

