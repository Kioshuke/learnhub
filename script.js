// --- Performance optimized script.js ---
// (mọi logic realtime dùng window.supabaseClient)

// Cache DOM elements
let currentTab = "home";

function loadQuiz(btn, link){

  // ❌ xoá active cũ
  document.querySelectorAll(".card").forEach(c=>{
    c.classList.remove("active-card");
  });

  // ✅ set card đang bấm
  const card = btn.closest(".card");
  if(card){
    card.classList.add("active-card");
  }

  document.getElementById("quiz").innerHTML =
  `
  <div class="quiz-box">

    <div class="quiz-header">
      <button class="quiz-btn close-btn" onclick="closeQuiz();" style="pointer-events: all !important;">Đóng bài</button>
    </div>

    <div class="loader" id="loader">
      <div class="skel-quiz-topbar">
        <div class="skel-bar" style="width:90px;height:24px;border-radius:8px;"></div>
        <div class="skel-bar" style="width:60px;height:24px;border-radius:8px;"></div>
      </div>
      <div class="skel-bar" style="width:100%;height:16px;margin-bottom:8px;"></div>
      <div class="skel-bar" style="width:70%;height:16px;margin-bottom:16px;"></div>
      <div class="skel-bar skel-quiz-card"></div>
      <div class="skel-quiz-row">
        <div class="skel-bar" style="width:90px;height:42px;border-radius:12px;"></div>
        <div class="skel-bar" style="width:90px;height:42px;border-radius:12px;"></div>
        <div class="skel-bar" style="width:90px;height:42px;border-radius:12px;"></div>
      </div>
    </div>

    <iframe id="quizFrame" src="${link}" style="display:none;width:100%;height:100vh;border:none;"></iframe>

  </div>
  `;
setTimeout(() => {
  const quizEl = document.getElementById("quiz");
  if(quizEl){
    quizEl.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }
}, 50);
  let iframe = document.getElementById("quizFrame");
  let loader = document.getElementById("loader");

  iframe.onload = function(){
  loader.style.display="none";
  iframe.style.display="block";

  // 🆕 [LearnHub Test - Giai đoạn 1] Gửi user sang iframe vừa load (nếu đã đăng nhập)
  // Hàm này được định nghĩa trong index.html, tự kiểm tra null nếu chưa có user.
  if(typeof window.sendUserToQuizFrame === "function"){
    window.sendUserToQuizFrame();
  }

  // 🔥 SCROLL SAU KHI LOAD XONG
  document.getElementById("quiz").scrollIntoView({
    behavior: "smooth",
    block: "start"
  });

  // hiệu ứng glow
  iframe.style.boxShadow = "0 0 25px rgba(26,115,232,0.6)";
  setTimeout(()=>{
    iframe.style.boxShadow = "none";
  },1000);

  clearTimeout(window.__quizLoadTimer);
}
  // 🕐 Watchdog: nếu iframe bài test không tải được trong 20s thì thông báo user
  window.__quizLoadTimer = setTimeout(() => {
    const fr = document.getElementById("quizFrame");
    if (fr && fr.style.display !== "block") {
      if (window.logAppError) {
        window.logAppError({
          source: "quiz",
          category: "feature",
          level: "error",
          code: "QUIZ_FRAME_LOAD_TIMEOUT",
          message: "Iframe bài test không tải được trong 20s (trang test không hiển thị).",
          detail: { link: String(link || "").slice(0, 200) }
        });
      }
      const loader = document.getElementById("loader");
      if(loader){
        loader.innerHTML = '<div style="text-align:center;padding:30px 16px"><div style="font-size:36px;margin-bottom:12px">&#9888;&#65039;</div><div style="font-size:15px;font-weight:700;color:#1e293b;margin-bottom:6px">Không thể tải bài test</div><div style="font-size:13px;color:#64748b;margin-bottom:16px;line-height:1.5">Trang bài test không phản hồi. Vui lòng thử lại.</div><button onclick="closeQuiz()" style="padding:10px 24px;border:none;border-radius:10px;background:#4f46e5;color:#fff;font-size:13px;font-weight:600;cursor:pointer">Đóng</button></div>';
        loader.style.display = "flex";
      }
    }
  }, 20000);
}

function closeQuiz(){

  document.getElementById("quiz").innerHTML = "";

  document.querySelectorAll(".card").forEach(c=>{
    c.classList.remove("active-card");
  });

  setTimeout(()=>{
    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  }, 100); // delay nhẹ cho mượt
}
const allTabs = ["home", "flash", "forum", "tai-lieu", "phong-hoc"];
const iframeTabIds = {"flash":"flashHubFrame","forum":"forumFrame","tai-lieu":"taiLieuFrame","phong-hoc":"phongHocFrame"};
const navMap = {'home':'/index.html','flash':'flashcard/hub.html','forum':'element/forum.html','tai-lieu':'tai-lieu/hub.html','phong-hoc':'element/phong-hoc.html'};
const reverseNavMap = {'/index.html':'home','flashcard/hub.html':'flash','element/forum.html':'forum','tai-lieu/hub.html':'tai-lieu','element/phong-hoc.html':'phong-hoc'};

function sendUserToFrame(frame){
  if(!frame || !frame.contentWindow) return;
  const u = window.currentLearnHubUser;
  if(!u) return;
  try {
    frame.contentWindow.postMessage({ type:"LEARNHUB_USER", user:u }, "*");
  } catch(e){}
}

function show(id){
currentTab = id;

const quizEl = document.getElementById("quiz");
if(quizEl) quizEl.innerHTML = "";

document.querySelectorAll('.nav-link').forEach(a => {
  a.classList.toggle('active', a.getAttribute('href') === navMap[id]);
});

allTabs.forEach(t => {
  const el = document.getElementById(t);
  if(!el) return;
  if(t === id){
    el.style.display = "block";
    if(iframeTabIds[t]){
      const frame = document.getElementById(iframeTabIds[t]);
      if(frame) sendUserToFrame(frame);
    }
  } else {
    el.style.display = "none";
  }
});

if(id !== "home"){
  setTimeout(function(){
    var el = document.getElementById(id);
    if(el) el.scrollIntoView({ behavior:"smooth", block:"start" });
  }, 50);
} else {
  window.scrollTo({ top:0, behavior:"smooth" });
}

updateTabScrollTopBtn();
}

/* === NAV LINK INTERCEPTION === */
document.addEventListener('DOMContentLoaded', function(){
  document.querySelectorAll('.nav-link').forEach(function(a){
    a.addEventListener('click', function(e){
      var href = this.getAttribute('href');
      var tab = reverseNavMap[href];
      if(tab){
        e.preventDefault();
        show(tab);
      }
    });
  });
});

/* === FEATURE CARD INTERCEPTION (chuyển tab / mở chat / mở leaderboard, không nhảy trang) === */
document.addEventListener('DOMContentLoaded', function(){
  document.querySelectorAll('.feature-card[data-open]').forEach(function(card){
    card.addEventListener('click', function(e){
      e.preventDefault();
      var open = card.getAttribute('data-open');
      if(open === 'chat'){
        if(typeof toggleHubieChat === 'function') toggleHubieChat();
        return;
      }
      if(open === 'leaderboard'){
        if(typeof openLeaderboardModal === 'function') openLeaderboardModal();
        return;
      }
      if(open === 'phong-hoc' || open === 'flash' || open === 'forum' || open === 'tai-lieu'){
        if(typeof show === 'function') show(open);
      }
    });
  });
});

/* === PWA SHORTCUT DEEP LINK (?open=...) — mở tab nội bộ như bấm card tính năng === */
document.addEventListener('DOMContentLoaded', function(){
  try {
    var params = new URLSearchParams(window.location.search);
    var open = params.get("open");
    if(!open) return;
    var validTabs = ["phong-hoc", "flash", "forum", "tai-lieu", "leaderboard"];
    if(validTabs.indexOf(open) === -1) return;
    history.replaceState(null, "", window.location.pathname);
    var tries = 0;
    var iv = setInterval(function(){
      tries++;
      if(!window.currentLearnHubUser && tries < 32) return;
      clearInterval(iv);
      setTimeout(function(){
        if(open === "leaderboard"){
          if(typeof openLeaderboardModal === "function") openLeaderboardModal();
          return;
        }
        if(typeof show === "function") show(open);
      }, 300);
    }, 250);
  } catch(e){}
});

function updateTabScrollTopBtn(){
  const btn = document.getElementById("tabScrollTopBtn");
  if(!btn) return;
  const isHome = currentTab === "home";
  if(!isHome && currentTab !== "flash" && currentTab !== "forum" && currentTab !== "tai-lieu"){
    btn.style.display = "none";
    return;
  }

  let scrolled = isHome ? window.scrollY > 200 : window.scrollY > 20;

  if(!isHome){
    const frameId = iframeTabIds[currentTab] || "";
    const frame = frameId ? document.getElementById(frameId) : null;
    if(frame && frame.contentWindow){
      try {
        scrolled = frame.contentWindow.scrollY > 20 || window.scrollY > 20;
      } catch (e) {
        scrolled = window.scrollY > 20;
      }
    }
  }

  btn.style.display = scrolled ? "flex" : "none";
}

window.addEventListener("scroll", updateTabScrollTopBtn, { passive: true });

const tabScrollTopBtn = document.getElementById("tabScrollTopBtn");
if(tabScrollTopBtn){
  tabScrollTopBtn.addEventListener("click", () => {
  const frameId = iframeTabIds[currentTab] || "";
  const frame = frameId ? document.getElementById(frameId) : null;

    if (frame && frame.contentWindow) {
      try {
        frame.contentWindow.scrollTo({ top: 0, behavior: "smooth" });
      } catch (e) {
        // Ignore và cuộn trang ngoài nếu không truy cập được
      }
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

function bindFrameScrollWatcher(frameId){
  const frame = document.getElementById(frameId);
  if(!frame) return;

  const attach = () => {
    try {
      if (frame.contentWindow) {
        frame.contentWindow.addEventListener("scroll", updateTabScrollTopBtn, { passive: true });
      }
    } catch (e) {
      // Cross-origin thì bỏ qua, vẫn còn scroll listener của window
    }
  };

  frame.addEventListener("load", attach);
  attach();
}

bindFrameScrollWatcher("flashHubFrame");
bindFrameScrollWatcher("forumFrame");
bindFrameScrollWatcher("taiLieuFrame");
bindFrameScrollWatcher("phongHocFrame");

function attachFrameWheelHandoff(frameId){
  const frame = document.getElementById(frameId);
  if(!frame) return;

  const attach = () => {
    try {
      const frameWindow = frame.contentWindow;
      const frameDoc = frame.contentDocument || (frameWindow && frameWindow.document);
      if(!frameWindow || !frameDoc) return;
      if(frame.dataset.wheelHandoffBound === "true") return;

      frame.dataset.wheelHandoffBound = "true";

      const handoffWheel = (e) => {
        if(window.innerWidth <= 900) return;
        if(e.ctrlKey) return;

        const root = frameDoc.scrollingElement || frameDoc.documentElement || frameDoc.body;
        if(!root) return;

        const maxScrollTop = Math.max(0, root.scrollHeight - root.clientHeight);
        const atTop = root.scrollTop <= 0;
        const atBottom = root.scrollTop >= maxScrollTop - 1;
        const dy = e.deltaY;

        const shouldHandoff =
          maxScrollTop <= 0 ||
          (dy < 0 && atTop) ||
          (dy > 0 && atBottom);

        if(shouldHandoff){
          window.scrollBy({ top: dy, behavior: "auto" });
          e.preventDefault();
          updateTabScrollTopBtn();
        }
      };

      frameDoc.addEventListener("wheel", handoffWheel, { passive: false });
    } catch (e) {}
  };

  frame.addEventListener("load", () => {
    frame.dataset.wheelHandoffBound = "false";
    attach();
  });

  attach();
}

attachFrameWheelHandoff("forumFrame");
attachFrameWheelHandoff("flashHubFrame");
attachFrameWheelHandoff("taiLieuFrame");
attachFrameWheelHandoff("phongHocFrame");

const popup = document.getElementById("popup");
const box = document.querySelector(".popup-box");
const closeBtn = document.querySelector(".close");
const mainPopupTitleEl = document.getElementById("mainPopupTitle");
const mainPopupMessageEl = document.getElementById("mainPopupMessage");

function closeMainPopup(){
  if(popup){
    popup.style.display = "none";
  }
  const mode = window.lastWelcomePopupShowMode;
  if(mode === "daily"){
    const now = new Date();
    const todayStr = now.getFullYear() + "-" + String(now.getMonth()+1).padStart(2,"0") + "-" + String(now.getDate()).padStart(2,"0");
    localStorage.setItem("learnhub_welcome_popup_daily", todayStr);
  } else {
    if(window.lastWelcomePopupVersion){
      localStorage.setItem("learnhub_welcome_popup_seen", window.lastWelcomePopupVersion);
    }
  }
}

function safeHtml(html) {
  if (window.DOMPurify && typeof window.DOMPurify.sanitize === "function") {
    return window.DOMPurify.sanitize(html);
  }
  return String(html ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

function showMainPopup(title, message){
  if(mainPopupTitleEl){
    mainPopupTitleEl.textContent = title || "📢 Thông báo";
  }
  if(mainPopupMessageEl){
    mainPopupMessageEl.innerHTML = safeHtml(message || "");
  }
  if(popup){
    popup.style.display = "flex";
  }
  playNotificationSound();
}

window.showMainPopup = showMainPopup;
window.closeMainPopup = closeMainPopup;

if(closeBtn && popup){
  closeBtn.addEventListener("click", closeMainPopup);
}

if(popup && box){
  popup.addEventListener("click", (e) => {
    if(e.target === popup){
      closeMainPopup();
    }
  });
}

document.addEventListener("keydown", (e) => {
  if(e.key === "Escape" && popup && getComputedStyle(popup).display !== "none"){
    closeMainPopup();
  }
});

if(box){
  box.addEventListener("click", (e) => {
    e.stopPropagation();
  });
}

const authSlideData = [
  {
    title: "LearnHub – Nâng cấp cách bạn học",
    desc: "Ôn thi nhanh • Giao diện hiện đại • Tối ưu trải nghiệm"
  },
  {
    title: "Giao diện chính - Hubie AI",
    desc: "Trợ lý AI thông minh hỗ trợ học tập & tra từ điển Anh - Việt"
  },
  {
    title: "LearnHub Forum",
    desc: "Trao đổi • Hỏi đáp • Kết nối học sinh như một trang MXH"
  },
  {
    title: "Tính năng Smart FlashCard",
    desc: "Học từ vựng thông minh với nhiều thể loại học tập, từ vựng đa dạng"
  }
];

let authSlideIndex = 0;
let authSlideTimer = null;

function switchAuthTab(type){
  if(type === "register" && window.registrationOpen === false){
    showAuthNotice("Đăng ký hiện đang đóng. Vui lòng liên hệ admin nếu bạn cần tài khoản.", "warning", "Đăng ký bị đóng");
    return;
  }
  const login = document.getElementById("authLoginPanel");
  const register = document.getElementById("authRegisterPanel");
  const tabs = document.querySelectorAll("#loginBox .auth-tab");

  tabs.forEach((tab) => tab.classList.remove("active"));

  if(type === "login"){
    if(login) login.style.display = "block";
    if(register) register.style.display = "none";
  }else{
    if(login) login.style.display = "none";
    if(register) register.style.display = "block";
  }

  const activeTab = document.querySelector(`#loginBox .auth-tab[data-auth-tab="${type}"]`);
  if(activeTab) activeTab.classList.add("active");
}

function updateAuthSlideText(index){
  const titleEl = document.getElementById("authSlideTitle");
  const descEl = document.getElementById("authSlideDesc");
  const mobileTitleEl = document.getElementById("authMobileTitle");
  const mobileDescEl = document.getElementById("authMobileDesc");
  if(!titleEl || !descEl) return;

  // Staggered text reveal - wrap each char in span
  const title = authSlideData[index].title;
  const desc = authSlideData[index].desc;
  
  // Clear content and prepare for animation
  titleEl.innerHTML = '';
  descEl.innerHTML = '';
  
  // Create staggered title animation
  title.split('').forEach((char, i) => {
    const span = document.createElement('span');
    span.className = 'char';
    span.textContent = char === ' ' ? '\u00A0' : char;
    span.style.animationDelay = `${i * 0.03}s`;
    titleEl.appendChild(span);
  });
  
  // Create description with reveal animation
  const descSpan = document.createElement('span');
  descSpan.className = 'desc-reveal';
  descSpan.textContent = desc;
  descEl.appendChild(descSpan);
  
  // Mobile version - simple fade for performance
  if(mobileTitleEl){
    mobileTitleEl.style.opacity = "0";
    setTimeout(() => {
      mobileTitleEl.textContent = title;
      mobileTitleEl.style.opacity = "1";
    }, 150);
  }
  if(mobileDescEl){
    mobileDescEl.style.opacity = "0";
    setTimeout(() => {
      mobileDescEl.textContent = desc;
      mobileDescEl.style.opacity = "1";
    }, 250);
  }
}

function initAuthSlides(){
  const desktopSlides = document.querySelectorAll("#loginBox .auth-right .auth-slide");
  const mobileSlides = document.querySelectorAll("#loginBox .auth-mobile-slide");
  if(!desktopSlides.length && !mobileSlides.length) return;

  if(desktopSlides.length){
    desktopSlides[0].classList.add("active");
  }
  if(mobileSlides.length){
    mobileSlides[0].classList.add("active");
  }
  updateAuthSlideText(0);

  if(authSlideTimer) clearInterval(authSlideTimer);

  authSlideTimer = setInterval(() => {
    const totalSlides = desktopSlides.length || mobileSlides.length;
    if(!totalSlides) return;

    const prevIndex = authSlideIndex;
    authSlideIndex = (authSlideIndex + 1) % totalSlides;

    // Simple fade transition for all slides (no image effects)
    if(desktopSlides.length){
      desktopSlides[prevIndex].classList.remove("active");
      desktopSlides[authSlideIndex].classList.add("active");
    }
    if(mobileSlides.length){
      mobileSlides[prevIndex].classList.remove("active");
      mobileSlides[authSlideIndex].classList.add("active");
    }
    
    updateAuthSlideText(authSlideIndex);
  }, 4000);
}

function playNotificationSound(soundId = "thongbaoSound"){
  const audio = document.getElementById(soundId);
  if(!audio) return;

  // Reset audio to start
  audio.currentTime = 0;
audio.muted = false;
audio.volume = 1;

  // Play with error handling for autoplay restrictions
  audio.play().catch(() => {
    // Nếu trình duyệt chặn tự động phát, bỏ qua (không cần thông báo lỗi).
    // Lần tương tác đầu tiên của user sẽ chạy unlockAudio để mở khoá cho các lần sau.
  });
}

// Mở khoá autoplay sau lần tương tác đầu tiên của người dùng.
// Không có bước này, thông báo realtime đến mà chưa bấm gì sẽ bị trình duyệt chặn tiếng.
// Dùng play() ở volume 0 (không gây tiếng "bùm" khi unlock) để load + mở khoá element,
// sau đó các lần play thật sẽ phát bình thường.
(function unlockAudio(){
  const ids = ["realtimeSound", "thongbaoSound", "openpopup", "offtest"];
  function tryUnlock(){
    let loaded = false;
    ids.forEach(function(id){
      const a = document.getElementById(id);
      if(!a) return;
      a.muted = true;
      a.volume = 0;
      try {
        const p = a.play();
        if(p && p.then){
          p.then(function(){
            // Nếu có một play() thật (có tiếng) đang chạy trong cùng lượt click
            // (vd: bấm avatar mở popup), KHÔNG pause để tránh nuốt mất tiếng.
            if (a.muted === true) {
              a.pause();
              a.currentTime = 0;
            }
a.muted = false;
a.volume = 1;
loaded = true;
          }).catch(function(){});
        }
      } catch(e) {}
    });
    if(loaded){
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

function showAuthNotice(message, type = "info", title = "", durationMs = 2600, soundId = "thongbaoSound", icon){
  if(window.lhToast){
    lhToast(message, {
      type: type === "warn" ? "warning" : type,
      title: title || undefined,
      durationMs: Math.max(1200, Number(durationMs) || 2600),
      icon: icon || undefined,
      sound: /realtime/i.test(soundId || "") ? "realtime" : "thongbao"
    });
  }
}

function authComingSoon(){
  showAuthNotice(
    "Tính năng này đang phát triển. Hiện tại bạn vẫn đăng nhập bằng Google như cũ.",
    "info",
    "Tính năng sắp ra mắt"
  );
}

window.switchAuthTab = switchAuthTab;
window.authComingSoon = authComingSoon;
window.showAuthNotice = showAuthNotice;
initAuthSlides();

// Hiển thị tab mặc định khi trang load
document.addEventListener("DOMContentLoaded", () => {
  show('home');
});
  const feedbackOverlay = document.getElementById('lh-feedback-overlay');

  // Hàm mở popup
  function openFeedbackModal() {
    feedbackOverlay.style.display = 'flex';
    document.body.style.overflow = 'hidden'; // Khóa cuộn trang chính để tập trung điền form
  }

  // Hàm đóng popup
  function closeFeedbackModal() {
    feedbackOverlay.style.display = 'none';
    document.body.style.overflow = ''; // Mở khóa cuộn trang
    
    // Reset lại iframe về trạng thái ban đầu để xóa dữ liệu cũ khi mở lại lần sau
    const iframe = feedbackOverlay.querySelector('iframe');
    if (iframe) iframe.src = iframe.src;
  }

  // Đóng khi click ra vùng vùng trống ngoài rìa popup
  function closeFeedbackModalByOverlay(event) {
    if (event.target === feedbackOverlay) {
      closeFeedbackModal();
    }
  }
function updateTime(){
const now = new Date();
const time = now.toLocaleTimeString("vi-VN");
const el = document.getElementById("currentTime");
if(el) el.innerText = time;
}

setInterval(updateTime,1000);
updateTime();
function toggleUserPopup(){
let pop = document.getElementById("userPopup");
if(!pop) return;

const willOpen = getComputedStyle(pop).display === "none";
pop.style.display = willOpen ? "block" : "none";
const ov = document.getElementById("ccOverlay");
if(ov) ov.classList.toggle("cc-overlay-open", willOpen);
}
function updateProgress(percent){
  const fill = document.getElementById("progressFill");
  const text = document.getElementById("progressText");

  fill.style.width = percent + "%";
  text.textContent = percent + "%";

  if(percent >= 100){
    fill.classList.add("complete");

    setTimeout(() => {
      document.getElementById("mainContent").classList.add("show");
    }, 800);
  }
}
const toggle = document.getElementById("darkModeToggle");

// 🔥 Danh sách các iframe cần đồng bộ dark mode (bị thiếu trước đây -> gây lỗi khi tắt dark mode)
const darkModeFrames = [
    document.getElementById("forumFrame"),
    document.getElementById("flashHubFrame"),
    document.getElementById("taiLieuFrame"),
    document.getElementById("phongHocFrame"),
    document.getElementById("chatbotFrame")
].filter(Boolean);

// Hàm gửi tín hiệu sang các iframe cần đồng bộ dark mode
function sendDarkModeToIframe(isDark) {
    darkModeFrames.forEach((frame) => {
        if (frame && frame.contentWindow) {
            frame.contentWindow.postMessage({ type: 'DARK_MODE', value: isDark }, '*');
        }
    });
}

// 1. Load lại trạng thái cũ khi vừa mở web — luôn sync dark mode khi iframe reload
if(toggle){
    const syncDarkModeOnLoad = (frame) => {
        if(!frame) return;
        frame.addEventListener("load", () => {
            const isDark = document.body.classList.contains("dark-mode");
            if(isDark) sendDarkModeToIframe(true);
            if(typeof sendUserToAllFrames === "function") sendUserToAllFrames();
        }, { once: false });
    };

    if(localStorage.getItem("darkMode") === "on"){
        document.body.classList.add("dark-mode");
        toggle.checked = true;
        darkModeFrames.forEach(syncDarkModeOnLoad);
    } else {
        darkModeFrames.forEach(syncDarkModeOnLoad);
    }

    // 2. Khi bấm nút gạt
    toggle.addEventListener("change", () => {
        const isDark = toggle.checked;
        
        if(isDark){
            document.body.classList.add("dark-mode");
            localStorage.setItem("darkMode", "on");
        } else {
            document.body.classList.remove("dark-mode");
            localStorage.setItem("darkMode", "off");
        }
        
        // Gửi tín hiệu ngay lập tức sang iframe
        sendDarkModeToIframe(isDark);
    });
}
// Gán sự kiện click cho tất cả các nút trong Menu
/* ================= TỐI ƯU CHO PAGESPEED ================= */
let isFirstLoad = true;

// Hàm phát nhạc thông minh hơn
function playSound(id) {
    const audio = document.getElementById(id);
    if (audio) {
        // Bỏ mute/volume 0 nếu unlockAudio từng đặt (tránh phát ra tiếng nhưng bị câm)
audio.muted = false;
audio.volume = 1;
audio.currentTime = 0;
        // Thêm .catch để PSI không báo lỗi khi trình duyệt chặn tự phát
        audio.play().catch(() => {}); 
    }
}

// Gom tất cả click vào một chỗ để trình duyệt xử lý mượt hơn
document.addEventListener('click', function(e) {
    const target = e.target;

    // Nút Đóng bài (Check chữ hoặc class)
    if (target.classList.contains('close-btn') || target.innerText === "Đóng bài") playSound("offtest");
    
    // Nút mở Popup Avatar
    if (target.closest('.avatar-box')) playSound("openpopup");
});

// Nghe sự kiện Supabase realtime (forum_events) — Chặn tiếng kêu lúc mới load
if (typeof window.supabaseClient !== 'undefined') {
  let isFirstLoad = true;
  const supabaseEvents = window.supabaseClient.channel('events-sound');
  let _evtBound = false;
  const _bindEvt = () => {
    if (_evtBound) return;
    _evtBound = true;
    supabaseEvents
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "forum_events" }, (payload) => {
        if (isFirstLoad) {
          isFirstLoad = false;
          return;
        }
        const ev = payload.new;
        if (ev && ev.time && (Date.now() - ev.time < 5000)) { // Chỉ phát nếu sự kiện mới trong 5s
          let sId = ev.type === "post" ? "soundPost" : (ev.type === "like" ? "soundLike" : "soundDislike");
          playSound(sId);
        }
      })
      .subscribe();
  };
  document.addEventListener('DOMContentLoaded', _bindEvt);
  _bindEvt();
}
// ==================== SCROLL LOCK GIỮ VỊ TRÍ CUỘN ====================
// body.no-scroll dùng position:fixed -> nếu không lưu vị trí trước khi khóa,
// trang sẽ bị nhảy về đầu trang khi mở/đóng popup (bug bong bóng chat Hubie).
function lhLockBodyScroll() {
  const y = window.scrollY || document.documentElement.scrollTop || 0;
  document.body.dataset.scrollLockY = String(y);
  document.body.style.top = (-y) + "px";
  document.body.classList.add("no-scroll");
}
function lhUnlockBodyScroll() {
  if (!document.body.classList.contains("no-scroll")) return;
  const y = parseInt(document.body.dataset.scrollLockY || "0", 10);
  document.body.classList.remove("no-scroll");
  document.body.style.top = "";
  delete document.body.dataset.scrollLockY;
  window.scrollTo(0, y);
}

let chatBtn, frame, overlay;

function initAccessibilityButton() {
  chatBtn = document.getElementById("accessibilityButton");
  frame = document.getElementById("chatbotFrame");
  overlay = document.getElementById("chatOverlay");

  if (!chatBtn) return;

  chatBtn.addEventListener("click", () => {
    if (hasMoved) return;
    toggleHubieChat();
  });

  chatBtn.addEventListener("pointerdown", dragStart);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAccessibilityButton);
} else {
  initAccessibilityButton();
}

let isDragging = false;
let startX, startY;
let currentX = 0;
let currentY = 0;
let xOffset = 0;
let yOffset = 0;
let hasMoved = false;

// Tối ưu hóa bằng requestAnimationFrame
let rafId = null;

document.addEventListener("pointermove", drag);
document.addEventListener("pointerup", dragEnd);

function dragStart(e) {
  if (e.button !== 0) return;
  
  e.preventDefault();
  isDragging = true;
  hasMoved = false;
  chatBtn.style.transition = "none";
  chatBtn.style.cursor = "grabbing";

  startX = e.clientX - xOffset;
  startY = e.clientY - yOffset;
  
  chatBtn.setPointerCapture(e.pointerId);
}

// Giới hạn trục dọc: không cho kéo bong bóng ra ngoài màn hình (trên/dưới)
function clampYOffset() {
  const height = chatBtn.offsetHeight || 56;
  const baseBottom = 20; // offset gốc bottom: 20px
  const margin = 4; // chừa lề an toàn
  const baseTop = window.innerHeight - baseBottom - height;
  yOffset = Math.max(margin - baseTop, Math.min(yOffset, baseBottom - margin));
}

function drag(e) {
  if (!isDragging) return;
  e.preventDefault();

  currentX = e.clientX - startX;
  currentY = e.clientY - startY;

  // Kiểm tra nếu thực sự có di chuyển
  if (Math.abs(currentX - xOffset) > 2 || Math.abs(currentY - yOffset) > 2) {
    hasMoved = true;
  }

  xOffset = currentX;
  yOffset = currentY;
  clampYOffset();

  if (!rafId) {
    rafId = requestAnimationFrame(updatePosition);
  }
}

function updatePosition() {
  // Sử dụng translate3d để cực kỳ mượt mà
  chatBtn.style.transform = `translate3d(${xOffset}px, ${yOffset}px, 0)`;
  rafId = null;
  repositionPopupIfOpen();
}

// Đặt popup sát bên bong bóng Hubie, luôn nằm gọn trong màn hình
function positionPopupNearBubble() {
  if (!chatBtn) return;
  const bubble = chatBtn.getBoundingClientRect();
  const frame = document.getElementById("chatbotFrame");
  if (!frame) return;

  const margin = 8;
  const gap = 10;
  const frameW = Math.min(window.innerWidth * 0.9, 380);
  const frameH = Math.min(window.innerHeight * 0.7, 520);

  // Ngang: mở về bên phải nếu đủ chỗ, không thì trồi sang trái, luôn giữ trong màn hình
  let left = bubble.left;
  if (left + frameW > window.innerWidth - margin) {
    left = bubble.right - frameW;
  }
  left = Math.max(margin, Math.min(left, window.innerWidth - frameW - margin));

  // Dọc: ưu tiên mở phía trên bong bóng, thiếu chỗ thì mở phía dưới
  let top = bubble.top - frameH - gap;
  if (top < margin) {
    top = bubble.bottom + gap;
  }
  top = Math.max(margin, Math.min(top, window.innerHeight - frameH - margin));

  frame.style.left = left + "px";
  frame.style.top = top + "px";
  frame.style.bottom = "auto";
  frame.style.width = frameW + "px";
  frame.style.height = frameH + "px";
}

// Chỉ chạy khi popup đang mở (không ảnh hưởng khi đóng)
function repositionPopupIfOpen() {
  const fr = document.getElementById("chatbotFrame");
  if (fr && fr.style.display !== "none") {
    positionPopupNearBubble();
  }
}

function dragEnd() {
  if (!isDragging) return;

  isDragging = false;
  chatBtn.style.cursor = "grab";

  // Hiệu ứng "hít" vào cạnh gần nhất (trái hoặc phải)
  chatBtn.style.transition = "transform 0.4s cubic-bezier(0.18, 0.89, 0.32, 1.28)";

  const rect = chatBtn.getBoundingClientRect();
  const middle = window.innerWidth / 2;

  if (rect.left + rect.width / 2 > middle) {
    // Hít lề phải
    xOffset = window.innerWidth - rect.width - 40;
  } else {
    // Hít lề trái
    xOffset = 0;
  }

  clampYOffset();
  updatePosition();
}

// Khi đổi kích thước cửa sổ, giữ bong bóng nằm gọn trong màn hình
if (chatBtn) {
  window.addEventListener("resize", () => {
    clampYOffset();
    updatePosition();
  });
}

if (overlay) {
  overlay.addEventListener("click", () => {
    frame.style.display = "none";
    overlay.style.display = "none";
    lhUnlockBodyScroll();
  });
}
// ==================== CODE ĐIỀU KHIỂN SLIDESHOW TRANG CHỦ ====================
let currentHomeSlide = 0;
let homeSlideshowInterval = null;

function startHomeSlideshow() {
  const images = document.querySelectorAll('.slide-img');
  const texts = document.querySelectorAll('.slide-text-block');

  // Nếu không ở tab home hoặc không tìm thấy slide thì dừng lại không chạy lỗi code
  if (!images.length || !texts.length) return;

  // Xóa interval cũ nếu có để tránh bị nhảy nhanh dồn dập
  if (homeSlideshowInterval) clearInterval(homeSlideshowInterval);

  homeSlideshowInterval = setInterval(() => {
    // Gỡ class active của slide hiện tại
    images[currentHomeSlide].classList.remove('active');
    texts[currentHomeSlide].classList.remove('active');
    
    // Tăng chỉ số slide (vòng lặp)
    currentHomeSlide = (currentHomeSlide + 1) % images.length;
    
    // Thêm class active cho slide kế tiếp
    images[currentHomeSlide].classList.add('active');
    texts[currentHomeSlide].classList.add('active');
  }, 4000); // 4 giây tự chuyển ảnh một lần
}

// Gọi kích hoạt slideshow khi trang web vừa hoàn thành việc render (Hết loading screen)
// Bạn có thể kích hoạt nó bằng cách gọi hàm `startHomeSlideshow()` ngay sau khi ứng dụng sẵn sàng.
document.addEventListener('DOMContentLoaded', () => {
    // Có thể check thêm điều kiện tùy thuộc logic định tuyến của bạn
    startHomeSlideshow();
});
// ==================== LOGIC ĐIỀU KHIỂN POPUP GÓC HUBIE AI ====================
function toggleHubieChat() {
  const frame = document.getElementById("chatbotFrame");
  const overlay = document.getElementById("chatOverlay");
  if (!frame || !overlay) return;

  if (frame.style.display === "none" || frame.style.display === "") {
    // Ép iframe nạp/gọi lại file AI.html trực tiếp để trị dứt điểm lỗi trắng màn hình
    frame.src = "AI.html";
    positionPopupNearBubble();

    // Hiển thị popup góc và lớp overlay
    frame.style.display = "block";
    overlay.style.display = "block";
    lhLockBodyScroll();
  } else {
    // Ẩn khung chat khi đóng
    frame.style.display = "none";
    overlay.style.display = "none";
    lhUnlockBodyScroll();
  }
}

// Gắn sự kiện kích hoạt mượt mà vào nút chatButton
const chatBtnEl = document.getElementById("chatButton");
if (chatBtnEl) {
  chatBtnEl.addEventListener("pointerup", (e) => {
    if (typeof isDragging !== "undefined" && isDragging) {
      return; // Đang kéo thả nút đi chỗ khác thì không mở chat
    }
    toggleHubieChat(); // Click/Chạm cố định thì bung chatbox
  });
}