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
    var openQuizDe = params.get("de");
    history.replaceState(null, "", window.location.pathname);
    var tries = 0;
    var iv = setInterval(function(){
      tries++;
      if(!window.currentLearnHubUser && tries < 32) return;
      clearInterval(iv);
      // Hiện màn che ngay khi user đã đăng nhập (trước khi chuyển tab phòng học) để chặn bấm lung tung
      if(open === "phong-hoc" && openQuizDe){
        if(typeof showDeepLinkOverlay === "function") showDeepLinkOverlay(true);
      }
      setTimeout(function(){
        if(open === "leaderboard"){
          if(typeof openLeaderboardModal === "function") openLeaderboardModal();
          return;
        }
        if(typeof show === "function") show(open);
        if(open === "phong-hoc" && openQuizDe){
          requestOpenQuiz(openQuizDe);
        }
      }, 300);
    }, 250);
  } catch(e){}
});

/* === Màn che loading khi mở bài test qua deep link (?open=phong-hoc&de=...) === */
var _dlOverlay = null;
var _dlOverlayTimer = null;
function showDeepLinkOverlay(on){
  if(!_dlOverlay){
    var dv = document.createElement("div");
    dv.id = "deepLinkOverlay";
    dv.innerHTML =
      '<div class="deep-link-box">' +
        '<div class="loading-dots">' +
          '<span class="loading-dot"></span>' +
          '<span class="loading-dot"></span>' +
          '<span class="loading-dot"></span>' +
          '<span class="loading-dot"></span>' +
        '</div>' +
        '<p id="deepLinkText">Đang mở bài test...</p>' +
      '</div>';
    document.body.appendChild(dv);
    _dlOverlay = dv;
  }
  if(on){
    _dlOverlay.style.display = "flex";
    if(_dlOverlayTimer) { clearTimeout(_dlOverlayTimer); _dlOverlayTimer = null; }
    // An toàn: nếu mở lỗi vẫn tự ẩn sau 6s để không kẹt màn che
    _dlOverlayTimer = setTimeout(function(){ showDeepLinkOverlay(false); }, 6000);
  } else {
    _dlOverlay.style.display = "none";
    if(_dlOverlayTimer) { clearTimeout(_dlOverlayTimer); _dlOverlayTimer = null; }
  }
}

/* === Mở thẳng một bài test trong phòng học qua deep link (?open=phong-hoc&de=...) === */
function requestOpenQuiz(de){
  var frame = document.getElementById("phongHocFrame");
  if(!frame || !frame.contentWindow){ showDeepLinkOverlay(false); return; }
  var acked = false;
  window.addEventListener("message", function handler(ev){
    if(!ev.data || ev.data.type !== "OPEN_QUIZ_ACK") return;
    acked = true;
    clearInterval(rv);
    window.removeEventListener("message", handler);
    showDeepLinkOverlay(false);
  });
  var rv = setInterval(function(){
    if(acked) { clearInterval(rv); return; }
    try { if(frame.contentWindow) frame.contentWindow.postMessage({ type: "OPEN_QUIZ", de: de }, "*"); } catch(e){}
  }, 250);
  setTimeout(function(){ if(!acked) { clearInterval(rv); showDeepLinkOverlay(false); } }, 12000);
  try { if(frame.contentWindow) frame.contentWindow.postMessage({ type: "OPEN_QUIZ", de: de }, "*"); } catch(e){}
}

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
      icon: icon || undefined
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
if(willOpen && !document.body.classList.contains("cc-reduced")){
  pop.classList.remove("cc-pop");
  void pop.offsetWidth;
  pop.classList.add("cc-pop");
  const stopPopAnim = () => {
    pop.classList.remove("cc-pop");
    pop.removeEventListener("animationend", stopPopAnim);
  };
  pop.addEventListener("animationend", stopPopAnim);
  setTimeout(stopPopAnim, 400);
}
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

// Đồng bộ trạng thái "giảm chuyển động" sang iframe
const reducedMotionFrames = [
    document.getElementById("forumFrame"),
    document.getElementById("taiLieuFrame"),
    document.getElementById("chatbotFrame")
].filter(Boolean);

function sendReducedMotionToIframe(isReduced) {
    reducedMotionFrames.forEach((frame) => {
        if (frame && frame.contentWindow) {
            frame.contentWindow.postMessage({ type: 'REDUCED_MOTION', value: isReduced }, '*');
        }
    });
}

window.syncReducedMotionToIframes = function () {
    const isReduced = document.body.classList.contains("cc-reduced");
    sendReducedMotionToIframe(isReduced);
};

// 1. Load lại trạng thái cũ khi vừa mở web — luôn sync dark mode + reduced motion khi iframe reload
if(toggle){
    const syncOnLoad = (frame) => {
        if(!frame) return;
        frame.addEventListener("load", () => {
            const isDark = document.body.classList.contains("dark-mode");
            if(isDark) sendDarkModeToIframe(true);
            const isReduced = document.body.classList.contains("cc-reduced");
            if(isReduced) sendReducedMotionToIframe(true);
            if(typeof sendUserToAllFrames === "function") sendUserToAllFrames();
        }, { once: false });
    };

    if(localStorage.getItem("darkMode") === "on"){
        document.body.classList.add("dark-mode");
        toggle.checked = true;
        darkModeFrames.forEach(syncOnLoad);
    } else {
        darkModeFrames.forEach(syncOnLoad);
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
        try {
          lhToast(isDark ? "Đã bật chế độ tối." : "Đã tắt chế độ tối — quay lại giao diện sáng.", {
            type: "info",
            title: isDark ? "Chế độ tối" : "Chế độ sáng",
            durationMs: 2500
          });
        } catch (e) {}
    });
}
// Gán sự kiện click cho tất cả các nút trong Menu
/* ================= TỐI ƯU CHO PAGESPEED ================= */
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

/*
 * ============================================================================
 * GỘP TỪ account-popup.js (11/2024: gộp 2 file JS của index.html thành 1)
 * Trước đây index.html load hai file: script.js rồi account-popup.js
 * (cùng thứ tự defer). Thứ tự code giữ nguyên -> hành vi không đổi.
 * ============================================================================
 */
(function () {
  const STORE_KEYS = {
    glass: "cc_glass",
    reduce: "cc_reduce",
    volume: "cc_volume",
    focus: "cc_focus_min"
  };

  const prefersReduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function loadReducePref() {
    const v = localStorage.getItem(STORE_KEYS.reduce);
    if (v === "on") return true;
    if (v === "off") return false;
    return prefersReduced || (window.matchMedia && window.matchMedia("(max-width: 768px)").matches);
  }

  const prefs = {
    glass: localStorage.getItem(STORE_KEYS.glass) !== "off",
    reduce: loadReducePref()
  };

  const TRACKS = [
    { id: "7NOSDKb0HlU", name: "Lofi Beats", sub: "Radio 24/7 · Chillhop", icon: "🎧" },
    { id: "F9YF5gYj7so", name: "Piano", sub: "Piano du dương, dễ tập trung", icon: "🎹" },
    { id: "4bskZYoO0N0", name: "Thiên nhiên", sub: "Mưa & suối rừng, thư giãn", icon: "🌿" },
    { id: "LTFEmIIOvNQ", name: "Cafe", sub: "Không gian quán cà phê", icon: "☕" },
    { id: "PRAGLqfNK1o", name: "Jazz", sub: "Bossa nova ngọt ngào, ấm áp", icon: "🎷" }
  ];

  const ADMIN_PANEL_URL = "/admin-dashboard.html";

  let popup = document.getElementById("userPopup");
  let rail = document.getElementById("ccRail");
  let pill = document.getElementById("ccPill");
  let bodyEl = document.getElementById("ccBody");

  const TAB_COLORS = {
    home: "#2563eb",
    profile: "#16a34a",
    appearance: "#7c3aed",
    focus: "#d97706",
    music: "#db2777",
    install: "#0ea5e9",
    admin: "#dc2626",
    logout: "#ef4444"
  };

  const navButtons = Array.prototype.slice.call(document.querySelectorAll(".cc-nav"));
  const paneEls = {};
  Array.prototype.slice.call(document.querySelectorAll(".cc-pane")).forEach(function (p) {
    paneEls[p.getAttribute("data-pane")] = p;
  });

  function applyPrefs() {
    document.body.classList.toggle("cc-glass-off", !prefs.glass);
    document.body.classList.toggle("cc-reduced", prefs.reduce);
    const glass = document.getElementById("ccGlassToggle");
    const reduce = document.getElementById("ccReduceToggle");
    if (glass) glass.checked = prefs.glass;
    if (reduce) reduce.checked = prefs.reduce;
  }

  function placePill() {
    if (!pill || !rail) return;
    const active = rail.querySelector(".cc-nav.cc-active");
    if (!active) { pill.style.display = "none"; return; }
    pill.style.display = "";
    pill.style.transform = "translateY(" + (active.offsetTop - pill.offsetTop) + "px)";
  }

  function setNavActive(name) {
    navButtons.forEach(function (b) {
      b.classList.toggle("cc-active", b.getAttribute("data-tab") === name);
    });
    applyPillColor(name);
    placePill();
  }

  function applyPillColor(name) {
    if (!rail) return;
    const c = TAB_COLORS[name];
    if (c) {
      rail.style.setProperty("--cc-pill-color", c);
    } else {
      rail.style.removeProperty("--cc-pill-color");
    }
  }

  function switchPane(name) {
    if (name === "profile") {
      window.location.href = "profile.html";
      return;
    }
    if (name === "admin") {
      window.open(ADMIN_PANEL_URL, "_blank");
      if (popup) popup.style.display = "none";
      return;
    }
    if (name === "logout") {
      openLogoutConfirm();
      return;
    }
    if (name === "install") {
      doInstallApp();
      return;
    }
    const target = paneEls[name];
    if (!target) return;
    const current = bodyEl ? bodyEl.querySelector(".cc-pane-active") : null;
    if (current === target) return;

    if (current) {
      if (document.body.classList.contains("cc-reduced")) {
        current.classList.remove("cc-pane-active");
      } else {
        current.classList.add("cc-leave");
        setTimeout(function () {
          current.classList.remove("cc-pane-active", "cc-leave");
        }, 300);
      }
    }
    target.classList.add("cc-pane-active");
    setNavActive(name);
  }

  if (navButtons.length) {
    navButtons.forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        switchPane(btn.getAttribute("data-tab"));
      });
    });
  }

  function notifyPrefChange(message) {
    try { lhToast(message, { type: "info", title: "Giao diện", durationMs: 2500 }); } catch (e) {}
  }

  function bindPrefs() {
    const glass = document.getElementById("ccGlassToggle");
    if (glass) {
      glass.addEventListener("change", function () {
        prefs.glass = glass.checked;
        localStorage.setItem(STORE_KEYS.glass, prefs.glass ? "on" : "off");
        document.body.classList.toggle("cc-glass-off", !prefs.glass);
        notifyPrefChange(prefs.glass ? "Đã bật hiệu ứng kính mờ." : "Đã tắt hiệu ứng kính mờ.");
      });
    }
    const reduce = document.getElementById("ccReduceToggle");
    if (reduce) {
      reduce.addEventListener("change", function () {
        prefs.reduce = reduce.checked;
        localStorage.setItem(STORE_KEYS.reduce, prefs.reduce ? "on" : "off");
        document.body.classList.toggle("cc-reduced", prefs.reduce);
        notifyPrefChange(prefs.reduce
          ? "Đã bật giảm chuyển động — giao diện nhẹ hơn."
          : "Đã tắt giảm chuyển động — đầy đủ hiệu ứng.");
        try { if (typeof window.syncReducedMotionToIframes === "function") window.syncReducedMotionToIframes(); } catch (e) {}
      });
    }
  }

  if (popup && "MutationObserver" in window) {
    new MutationObserver(function () {
      const open = popup.style.display !== "none";
      if (open) placePill();
      const ov = document.getElementById("ccOverlay");
      if (ov) ov.classList.toggle("cc-overlay-open", open);
    }).observe(popup, { attributes: true, attributeFilter: ["style"] });
  }

  const ccOverlayEl = document.getElementById("ccOverlay");
  if (ccOverlayEl) {
    ccOverlayEl.addEventListener("click", function () {
      if (popup) popup.style.display = "none";
      ccOverlayEl.classList.remove("cc-overlay-open");
    });
  }

  window.addEventListener("resize", function () {
    placePill();
    clampFocusPos();
  });

  const focus = {
    total: 25 * 60,
    remaining: 0,
    endTs: 0,
    paused: false,
    running: false,
    timer: null,
    selected: 25
  };

  function fmtTime(sec) {
    sec = Math.max(0, Math.floor(sec));
    const m = String(Math.floor(sec / 60)).padStart(2, "0");
    const s = String(sec % 60).padStart(2, "0");
    return m + ":" + s;
  }

  function renderFocus() {
    const time = document.getElementById("ccFocusTime");
    const bar = document.getElementById("ccFocusBar");
    const mode = document.getElementById("ccFocusMode");
    const pct = focus.total > 0 ? Math.round((focus.remaining / focus.total) * 100) : 0;
    if (time) time.textContent = fmtTime(focus.remaining);
    if (bar) bar.style.width = pct + "%";
    if (mode) {
      if (focus.remaining <= 0 && focus.running === false && focus.total > 0) {
        mode.textContent = "Hoàn tất 🎉";
      } else {
        mode.textContent = focus.paused ? "Tạm dừng" : "Đang bật";
      }
    }
  }

  function startFocusTimer() {
    focus.endTs = Date.now() + focus.remaining * 1000;
    focus.timer = setInterval(function () {
      focus.remaining = Math.max(0, Math.round((focus.endTs - Date.now()) / 1000));
      renderFocus();
      if (focus.remaining <= 0) finishFocus();
    }, 250);
  }

  function playTone() {
    if (typeof window.playSound === "function") {
      try { window.playSound("thongbaoSound"); return; } catch (e) {}
    }
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      const ctx = new Ctx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1);
      osc.start();
      osc.stop(ctx.currentTime + 1);
    } catch (e) {}
  }

  function notifyDone() {
    if (!("Notification" in window)) return;
    if (Notification.permission === "granted") {
      try { new Notification("LearnHub Focus", { body: "Đã hoàn thành phiên Focus! 🎉" }); } catch (e) {}
    }
  }

  function enterFullscreen() {
    const el = document.documentElement;
    if (document.fullscreenElement) return;
    const req = el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen || el.msRequestFullscreen;
    if (req) {
      try {
        const p = req.call(el);
        if (p && typeof p.catch === "function") p.catch(function () {});
      } catch (e) {}
    }
  }

  function exitFullscreen() {
    if (!document.fullscreenElement) return;
    const ex = document.exitFullscreen || document.webkitExitFullscreen || document.mozCancelFullScreen || document.msExitFullscreen;
    if (ex) {
      try { ex.call(document); } catch (e) {}
    }
  }

  function startFocus() {
    if (focus.running) return;
    if (!Number.isFinite(focus.selected) || focus.selected <= 0) focus.selected = 25;
    focus.total = focus.selected * 60;
    focus.remaining = focus.total;
    focus.running = true;
    focus.paused = false;
    enterFullscreen();
    showFocusWidget();
    if (popup) popup.style.display = "none";
    renderFocus();
    startFocusTimer();
    try {
      lhToast("Focus Mode đã bật! Tập trung hết mình trong " + focus.selected + " phút nhé 💪", { type: "success", title: "Focus Mode", durationMs: 4500 });
    } catch (e) {}
    if ("Notification" in window && Notification.permission === "default") {
      try { Notification.requestPermission(); } catch (e) {}
    }
  }

  function pauseFocus() {
    if (!focus.running || focus.paused) return;
    clearInterval(focus.timer);
    focus.timer = null;
    focus.remaining = Math.max(0, Math.round((focus.endTs - Date.now()) / 1000));
    focus.paused = true;
    renderFocus();
  }

  function resumeFocus() {
    if (!focus.running || !focus.paused) return;
    focus.paused = false;
    startFocusTimer();
    renderFocus();
  }

  function finishFocus() {
    if (focus.timer) { clearInterval(focus.timer); focus.timer = null; }
    focus.running = false;
    focus.remaining = 0;
    renderFocus();
    playTone();
    notifyDone();
    hideFocusWidget();
    const pill = document.getElementById("ccFocusPill");
    if (pill) pill.style.display = "none";
    exitFullscreen();
    const done = document.getElementById("ccDoneOverlay");
    if (done) done.classList.add("cc-open");
  }

  function stopFocus() {
    if (focus.timer) { clearInterval(focus.timer); focus.timer = null; }
    focus.running = false;
    focus.paused = false;
    hideFocusWidget();
    const pill = document.getElementById("ccFocusPill");
    if (pill) pill.style.display = "none";
    exitFullscreen();
  }

  function hideFocusWidget(showPill) {
    const w = document.getElementById("ccFocusWidget");
    if (w) w.classList.remove("cc-open");
    if (showPill) {
      const pill = document.getElementById("ccFocusPill");
      if (pill) pill.style.display = "flex";
    }
  }

  function showFocusWidget() {
    const pill = document.getElementById("ccFocusPill");
    if (pill) pill.style.display = "none";
    const w = document.getElementById("ccFocusWidget");
    if (w) {
      applyFocusPos();
      w.classList.add("cc-open");
    }
  }

  const FOCUS_POS_KEY = "ccFocusPos";

  function clampFocusPos() {
    const w = document.getElementById("ccFocusWidget");
    if (!w) return;
    if (!(w.style.left || w.style.top)) return;
    const r = w.getBoundingClientRect();
    const maxL = Math.max(8, window.innerWidth - r.width - 8);
    const maxT = Math.max(8, window.innerHeight - r.height - 8);
    let x = parseInt(w.style.left, 10);
    let y = parseInt(w.style.top, 10);
    if (!isFinite(x)) x = Math.min(20, maxL);
    if (!isFinite(y)) y = 96;
    x = Math.max(8, Math.min(x, maxL));
    y = Math.max(8, Math.min(y, maxT));
    w.style.left = x + "px";
    w.style.top = y + "px";
    w.style.right = "auto";
    w.style.bottom = "auto";
  }

  function saveFocusPos() {
    try {
      const w = document.getElementById("ccFocusWidget");
      if (!w) return;
      localStorage.setItem(FOCUS_POS_KEY, JSON.stringify({ x: w.style.left, y: w.style.top }));
    } catch (e) {}
  }

  function applyFocusPos() {
    const w = document.getElementById("ccFocusWidget");
    if (!w) return;
    try {
      const saved = JSON.parse(localStorage.getItem(FOCUS_POS_KEY) || "null");
      if (saved && isFinite(Number(saved.x)) && isFinite(Number(saved.y))) {
        w.style.left = saved.x + "px";
        w.style.top = saved.y + "px";
        w.style.right = "auto";
        w.style.bottom = "auto";
      } else {
        w.style.left = "";
        w.style.top = "";
        w.style.right = "";
        w.style.bottom = "";
      }
      clampFocusPos();
    } catch (e) {}
  }

  function enableFocusDrag() {
    const w = document.getElementById("ccFocusWidget");
    if (!w) return;
    let dragging = false;
    let sx = 0, sy = 0, ox = 0, oy = 0;
    w.addEventListener("pointerdown", function (e) {
      if (e.button !== 0) return;
      if (!e.target.closest(".cc-fw-head")) return;
      if (e.target.closest("button")) return;
      const r = w.getBoundingClientRect();
      ox = r.left; oy = r.top;
      sx = e.clientX; sy = e.clientY;
      dragging = true;
      w.classList.add("cc-dragging");
      try { w.setPointerCapture(e.pointerId); } catch (err) {}
      e.preventDefault();
    });
    w.addEventListener("pointermove", function (e) {
      if (!dragging) return;
      const x = ox + (e.clientX - sx);
      const y = oy + (e.clientY - sy);
      w.style.left = x + "px";
      w.style.top = y + "px";
      w.style.right = "auto";
      w.style.bottom = "auto";
    });
    function endDrag() {
      if (!dragging) return;
      dragging = false;
      w.classList.remove("cc-dragging");
      clampFocusPos();
      saveFocusPos();
    }
    w.addEventListener("pointerup", endDrag);
    w.addEventListener("pointercancel", endDrag);
  }

  function initFocus() {
    const presets = document.querySelectorAll(".cc-chip[data-min]");
    const customInput = document.getElementById("ccFocusCustom");
    const setBtn = document.getElementById("ccFocusSet");
    const startBtn = document.getElementById("ccFocusStart");
    const saved = Number(localStorage.getItem(STORE_KEYS.focus)) || 25;
    focus.selected = saved;

    function applySelect(min) {
      focus.selected = min;
      localStorage.setItem(STORE_KEYS.focus, String(min));
      presets.forEach(function (c) {
        c.classList.toggle("cc-active", Number(c.getAttribute("data-min")) === min);
      });
    }

    presets.forEach(function (c) {
      c.addEventListener("click", function () { applySelect(Number(c.getAttribute("data-min"))); });
    });

    if (setBtn && customInput) {
      setBtn.addEventListener("click", function () {
        const v = parseInt(customInput.value, 10);
        if (!Number.isFinite(v) || v <= 0 || v > 180) { customInput.value = ""; return; }
        customInput.value = "";
        applySelect(v);
      });
    }

    if (startBtn) {
      startBtn.addEventListener("click", function () {
        if (customInput && customInput.value) {
          const v = parseInt(customInput.value, 10);
          if (Number.isFinite(v) && v > 0 && v <= 180) applySelect(v);
        }
        startFocus();
      });
    }

    applySelect(focus.selected);

    const pauseBtn = document.getElementById("ccFocusPause");
    const exitBtn = document.getElementById("ccFocusExit");
    if (pauseBtn) {
      pauseBtn.addEventListener("click", function () {
        if (focus.paused) {
          pauseBtn.textContent = "⏸ Tạm dừng";
          resumeFocus();
        } else if (focus.running) {
          pauseBtn.textContent = "▶ Tiếp tục";
          pauseFocus();
        }
      });
    }
    if (exitBtn) exitBtn.addEventListener("click", stopFocus);

    const hideBtn = document.getElementById("ccFocusHide");
    const pill = document.getElementById("ccFocusPill");
    if (hideBtn) hideBtn.addEventListener("click", function () { hideFocusWidget(true); });
    if (pill) pill.addEventListener("click", showFocusWidget);

    const doneOk = document.getElementById("ccDoneOk");
    if (doneOk) {
      doneOk.addEventListener("click", function () {
        const done = document.getElementById("ccDoneOverlay");
        if (done) done.classList.remove("cc-open");
      });
    }
  }

  const music = {
    index: 0,
    playing: false,
    player: null,
    apiError: false,
    sourceType: "yt",
    isCustom: false,
    customName: "",
    audio: document.getElementById("ccCustomAudio"),
    volume: Number(localStorage.getItem(STORE_KEYS.volume)) || 70
  };

  function loadYoutubeApi() {
    return new Promise(function (resolve, reject) {
      if (window.YT && window.YT.Player) { resolve(); return; }
      let done = false;
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = function () {
        if (done) return;
        done = true;
        if (prev) prev();
        resolve();
      };
      const old = document.getElementById("cc-yt-api");
      if (old && old.parentNode) old.parentNode.removeChild(old);
      const s = document.createElement("script");
      s.id = "cc-yt-api";
      s.src = "https://www.youtube.com/iframe_api";
      let timer = null;
      function finish(err) {
        if (done) return;
        done = true;
        if (timer) clearTimeout(timer);
        const node = document.getElementById("cc-yt-api");
        if (node && node.parentNode) node.parentNode.removeChild(node);
        reject(err);
      }
      s.onerror = function () { finish(new Error("load")); };
      timer = setTimeout(function () { finish(new Error("timeout")); }, 15000);
      document.head.appendChild(s);
    });
  }

  function ensurePlayer() {
    return loadYoutubeApi().then(function () {
      if (music.player) return true;
      const holder = document.getElementById("ccYtPlayer");
      if (!holder) return false;
      const track = TRACKS[music.index];
      music.player = new YT.Player("ccYtPlayer", {
        height: "200",
        width: "200",
        videoId: track.id,
        playerVars: { autoplay: 0, rel: 0, playsinline: 1 },
        events: {
          onReady: function (e) {
            e.target.setVolume(music.volume);
            if (music.playing) e.target.playVideo();
          },
          onStateChange: function (e) {
            music.playing = e.data === YT.PlayerState.PLAYING;
            if (music.isCustom && e.data === YT.PlayerState.PLAYING) {
              try {
                const d = e.target.getVideoData();
                if (d && d.title && !music.customName) music.customName = d.title;
              } catch (err) {}
            }
            updateMusicUI();
            if (e.data === YT.PlayerState.ENDED) nextTrack();
          },
          onError: function () {
            music.playing = false;
            updateMusicUI();
            const err = document.getElementById("ccYtError");
            if (err) err.textContent = "Video không khả dụng. Bạn có thể thử nguồn khác.";
            if (music.isCustom) notifyMusic("Video không khả dụng. Hãy thử link khác nhé!", "error");
          }
        }
      });
      return true;
    }).catch(function () {
      music.apiError = true;
      return false;
    });
  }

  function togglePlay() {
    const err = document.getElementById("ccYtError");
    if (err) err.textContent = "";
    if (music.sourceType === "audio" && music.audio && music.audio.src) {
      if (music.playing) {
        music.audio.pause();
      } else {
        music.audio.play().catch(function () {});
      }
      return;
    }
    if (music.player) {
      if (music.playing) {
        music.player.pauseVideo();
      } else {
        music.player.playVideo();
      }
      return;
    }
    ensurePlayer().then(function (ok) {
      if (!ok) {
        music.playing = false;
        updateMusicUI();
        if (err) {
          err.textContent = location.protocol === "file:"
            ? "YouTube chỉ chạy trên bản đã deploy (https). Mở learnhubpf.pages.dev để nghe nhạc."
            : "Không thể kết nối YouTube. Hãy mở trực tiếp trên YouTube.";
        }
        window.open("https://www.youtube.com/watch?v=" + TRACKS[music.index].id, "_blank");
      } else {
        music.playing = true;
        if (music.player) music.player.playVideo();
        updateMusicUI();
      }
    });
  }

  function selectTrack(i, autoPlay) {
    if (i < 0) i = TRACKS.length - 1;
    if (i >= TRACKS.length) i = 0;
    music.index = i;
    music.isCustom = false;
    music.customName = "";
    music.sourceType = "yt";
    music.playing = false;
    stopCustomAudio();
    const err = document.getElementById("ccYtError");
    if (err) err.textContent = "";
    updateMusicUI();
    if (music.player) {
      if (autoPlay) music.player.loadVideoById(TRACKS[i].id);
      else music.player.cueVideoById(TRACKS[i].id);
    } else if (autoPlay) {
      ensurePlayer().then(function (ok) {
        if (ok && music.player && !music.isCustom && music.index === i) {
          music.player.loadVideoById(TRACKS[music.index].id);
          music.playing = true;
          music.player.playVideo();
          updateMusicUI();
        }
      });
    }
  }

  function nextTrack() { selectTrack(music.index + 1, true); }
  function prevTrack() { selectTrack(music.index - 1, true); }

  function stopCustomAudio() {
    if (!music.audio) return;
    music.audio.pause();
    music.audio.removeAttribute("src");
    try { music.audio.load(); } catch (e) {}
  }

  function extractYoutubeId(url) {
    const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/))([\w-]{11})/);
    return m ? m[1] : null;
  }

  function titleFromUrl(url) {
    try {
      const u = new URL(url);
      let name = decodeURIComponent((u.pathname.split("/").pop() || "").trim());
      if (!name && u.hostname) name = u.hostname;
      name = name.replace(/\.[a-z0-9]{2,5}$/i, "").replace(/[-_]+/g, " ").trim();
      if (name) return name;
    } catch (e) {}
    return "Nhạc tùy chỉnh";
  }

  function notifyMusic(message, type) {
    try { lhToast(message, { type: type || "info", title: "Âm nhạc" }); } catch (e) {}
  }

  function playCustom() {
    const input = document.getElementById("ccCustomUrl");
    const err = document.getElementById("ccYtError");
    const url = input ? input.value.trim() : "";
    if (err) err.textContent = "";
    if (!url) {
      if (input) input.focus();
      notifyMusic("Bạn chưa dán link nào cả! Hãy dán link YouTube hoặc link nhạc vào ô trên.", "warning");
      return;
    }
    const id = extractYoutubeId(url);
    if (id) {
      stopCustomAudio();
      music.sourceType = "yt";
      music.isCustom = true;
      music.customName = "";
      const run = function () {
        if (music.player) {
          music.player.loadVideoById(id, 0);
          music.player.playVideo();
          music.playing = true;
          try {
            const d = music.player.getVideoData();
            if (d && d.title) music.customName = d.title;
          } catch (e) {}
          updateMusicUI();
          notifyMusic('Đang phát từ link của bạn: "' + (music.customName || "Nhạc tùy chỉnh") + '"', "success");
          setTimeout(function () {
            if (music.isCustom && !music.customName) {
              try {
                const d = music.player.getVideoData();
                if (d && d.title) music.customName = d.title;
                updateMusicUI();
              } catch (e) {}
            }
          }, 1200);
        }
      };
      if (music.player) {
        run();
      } else {
        ensurePlayer().then(function (ok) {
          if (!ok) {
            music.playing = false;
            updateMusicUI();
            notifyMusic("Không thể kết nối YouTube. Kiểm tra mạng rồi thử lại nhé!", "error");
          } else {
            run();
          }
        });
      }
      return;
    }
    if (music.audio) {
      if (music.player) music.player.pauseVideo();
      music.sourceType = "audio";
      music.isCustom = true;
      music.customName = titleFromUrl(url);
      music.audio.src = url;
      music.audio.volume = music.volume / 100;
      music.audio.play().then(function () {
        music.playing = true;
        updateMusicUI();
        notifyMusic('Đang phát từ link của bạn: "' + music.customName + '"', "success");
      }).catch(function () {
        music.playing = false;
        updateMusicUI();
        notifyMusic("Không phát được link này. Hãy thử link YouTube nhé!", "error");
      });
      return;
    }
    notifyMusic("Không nhận diện được link. Hãy kiểm tra lại đường dẫn nhé!", "error");
  }

  function updateMusicUI() {
    const nowTitle = document.getElementById("ccNowTitle");
    const nowSub = document.getElementById("ccNowSub");
    const nowIcon = document.getElementById("ccNowIcon");
    const playBtn = document.getElementById("ccPlayBtn");
    const tracks = document.querySelectorAll(".cc-track");

    if (music.isCustom) {
      if (nowTitle) nowTitle.textContent = music.customName || "Nhạc tùy chỉnh";
      var sourceIcons = { yt: '<i class="fa-brands fa-youtube" style="color:#ff0000"></i>', audio: "🎵" };
      var sourceLabels = { yt: "Đang phát từ YouTube", audio: "Đang phát link trực tiếp" };
      if (nowSub) nowSub.textContent = sourceLabels[music.sourceType] || "Nhạc tùy chỉnh";
      if (nowIcon) nowIcon.innerHTML = sourceIcons[music.sourceType] || "🎵";
    } else {
      const track = TRACKS[music.index];
      if (nowTitle) nowTitle.textContent = track.name;
      if (nowSub) nowSub.textContent = track.sub;
      if (nowIcon) nowIcon.textContent = track.icon;
    }
    if (playBtn) playBtn.innerHTML = music.playing ? '<i class="fa-solid fa-pause"></i>' : '<i class="fa-solid fa-play"></i>';

    tracks.forEach(function (t, i) {
      t.classList.toggle("cc-active", !music.isCustom && i === music.index);
    });
  }

  function initMusic() {
    const listWrap = document.getElementById("ccTrackList");
    if (!listWrap) return;
    listWrap.innerHTML = "";
    TRACKS.forEach(function (track, i) {
      const row = document.createElement("button");
      row.type = "button";
      row.className = "cc-track";
      row.innerHTML =
        '<span class="cc-track-icon">' + track.icon + '</span>' +
        '<span><span class="cc-track-name">' + track.name + '</span><br><span class="cc-track-sub">' + track.sub + '</span></span>' +
        '<span class="cc-track-eq"><span></span><span></span><span></span></span>';
      row.addEventListener("click", function () { selectTrack(i, music.player ? true : true); });
      listWrap.appendChild(row);
    });

    const playBtn = document.getElementById("ccPlayBtn");
    const nextBtn = document.getElementById("ccNextBtn");
    const prevBtn = document.getElementById("ccPrevBtn");
    const vol = document.getElementById("ccVolume");
    const progress = document.getElementById("ccProgress");

    if (playBtn) playBtn.addEventListener("click", togglePlay);
    if (nextBtn) nextBtn.addEventListener("click", nextTrack);
    if (prevBtn) prevBtn.addEventListener("click", prevTrack);

    if (vol) {
      vol.value = music.volume;

      var volIcon = document.getElementById("ccVolumeIcon");
      function updateVolumeIcon(v) {
        if (!volIcon) return;
        var cls = v <= 0 ? "fa-volume-xmark"
          : v <= 33 ? "fa-volume-off"
          : v <= 66 ? "fa-volume-low"
          : "fa-volume-high";
        volIcon.className = "fa-solid " + cls;
        volIcon.style.color = v <= 0 ? "#ef4444" : "";
      }
      updateVolumeIcon(music.volume);

      vol.addEventListener("input", function () {
        music.volume = Number(vol.value);
        localStorage.setItem(STORE_KEYS.volume, String(music.volume));
        if (music.player) music.player.setVolume(music.volume);
        if (music.audio && music.audio.src) music.audio.volume = music.volume / 100;
        updateVolumeIcon(music.volume);
      });
    }

    if (progress) {
      progress.addEventListener("click", function (e) {
        const rect = progress.getBoundingClientRect();
        const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        if (music.sourceType === "audio" && music.audio && music.audio.src) {
          const dur = music.audio.duration;
          if (isFinite(dur) && dur > 0) music.audio.currentTime = ratio * dur;
          return;
        }
        if (!music.player) return;
        const duration = music.player.getDuration();
        if (Number.isFinite(duration) && duration > 0) {
          music.player.seekTo(ratio * duration, true);
        }
      });
    }

    setInterval(function () {
      let cur, dur;
      if (music.sourceType === "audio" && music.audio && music.audio.src) {
        if (music.audio.paused) return;
        cur = music.audio.currentTime;
        dur = isFinite(music.audio.duration) ? music.audio.duration : 0;
      } else if (music.player && music.playing) {
        cur = music.player.getCurrentTime();
        dur = music.player.getDuration();
      } else {
        return;
      }
      if (!Number.isFinite(cur)) return;
      const fill = document.getElementById("ccProgressFill");
      const curEl = document.getElementById("ccCurTime");
      const durEl = document.getElementById("ccDurTime");
      if (fill) fill.style.width = (dur > 0 ? (cur / dur) * 100 : 0) + "%";
      if (curEl) curEl.textContent = fmtTime(cur);
      if (durEl) durEl.textContent = Number.isFinite(dur) && dur > 0 ? fmtTime(dur) : "--:--";
    }, 500);

    const customPlay = document.getElementById("ccCustomPlay");
    const customUrl = document.getElementById("ccCustomUrl");
    const customClear = document.getElementById("ccCustomClear");
    if (customPlay) customPlay.addEventListener("click", playCustom);
    if (customUrl) {
      customUrl.addEventListener("keydown", function (e) {
        if (e.key === "Enter") {
          e.preventDefault();
          playCustom();
        }
      });
    }
    if (customClear && customUrl) {
      customClear.addEventListener("click", function () {
        customUrl.value = "";
        customClear.style.display = "none";
        customUrl.focus();
      });
      customUrl.addEventListener("input", function () {
        customClear.style.display = customUrl.value ? "flex" : "none";
      });
    }
    if (music.audio) {
      music.audio.addEventListener("play", function () { music.playing = true; updateMusicUI(); });
      music.audio.addEventListener("pause", function () { music.playing = false; updateMusicUI(); });
      music.audio.addEventListener("ended", function () { nextTrack(); });
    }

    updateMusicUI();
  }

  function openLogoutConfirm() {
    const overlay = document.getElementById("ccLogoutOverlay");
    if (overlay) overlay.classList.add("cc-open");
  }

  function closeLogoutConfirm() {
    const overlay = document.getElementById("ccLogoutOverlay");
    if (overlay) overlay.classList.remove("cc-open");
  }

  function initLogout() {
    const cancelBtn = document.getElementById("ccLogoutCancel");
    const okBtn = document.getElementById("ccLogoutOk");
    if (cancelBtn) cancelBtn.addEventListener("click", closeLogoutConfirm);
    if (okBtn) {
      okBtn.addEventListener("click", function () {
        closeLogoutConfirm();
        if (typeof window.logout === "function") {
          window.logout();
        } else {
          window.location.href = "login.html";
        }
      });
    }
  }

  function checkAdmin() {
    const u = window.currentLearnHubUser;
    if (!u || !u.uid) return;
    if (!window.supabaseClient) return;
    window.supabaseClient.from("users")
      .select("role")
      .eq("id", u.uid)
      .maybeSingle()
      .then(function (res) {
        const role = res && res.data ? res.data.role : null;
        const adminBtn = document.getElementById("ccNavAdmin");
        if (adminBtn) {
          adminBtn.style.display = "";
        }
        if (window.currentLearnHubUser) {
          window.currentLearnHubUser.role = role;
        }
        placePill();
      })
      .catch(function () {});
  }

  function waitForUser() {
    if (window.currentLearnHubUser) { checkAdmin(); return; }
    let tries = 0;
    const iv = setInterval(function () {
      tries++;
      if (window.currentLearnHubUser) {
        clearInterval(iv);
        checkAdmin();
      } else if (tries >= 40) {
        clearInterval(iv);
      }
    }, 250);
  }

  function initVersion() {
    const el = document.getElementById("ccVersionText");
    if (el) el.textContent = "© 2026 LearnHub Platform · Control Center v2.0";
  }

  /* ===== Icon cài ứng dụng (PWA) trên rail menu ===== */
  function isStandaloneDisplay() {
    return (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches)
      || window.navigator.standalone === true;
  }

  function isIosSafari() {
    return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
  }

  function updateInstallVisibility() {
    const btn = document.getElementById("ccNavInstall");
    if (!btn) return;
    if (isStandaloneDisplay()) { btn.style.display = "none"; return; }
    const canPrompt = !!window.__lhInstallPrompt;
    btn.style.display = (canPrompt || isIosSafari()) ? "" : "none";
  }

  function doInstallApp() {
    const promptEvent = window.__lhInstallPrompt;
    if (promptEvent) {
      promptEvent.prompt();
      promptEvent.userChoice.then(function (choice) {
        window.__lhInstallPrompt = null;
        if (choice && choice.outcome === "accepted") {
          try { lhToast("Đã cài LearnHub lên thiết bị 🎉", { type: "success", title: "Cài đặt thành công" }); } catch (e) {}
        }
        updateInstallVisibility();
      }).catch(function () { updateInstallVisibility(); });
      return;
    }
    if (isIosSafari()) {
      try {
        lhToast('Trên iPhone: nhấn nút Chia sẻ ⬆️ rồi chọn "Thêm vào Màn hình chính".', { type: "info", title: "Cài ứng dụng", durationMs: 6000 });
      } catch (e) {}
      return;
    }
    updateInstallVisibility();
  }

  function initInstallApp() {
    window.addEventListener("beforeinstallprompt", function (e) {
      e.preventDefault();
      window.__lhInstallPrompt = e;
      updateInstallVisibility();
    });

    window.addEventListener("appinstalled", function () {
      window.__lhInstallPrompt = null;
      const b = document.getElementById("ccNavInstall");
      if (b) b.style.display = "none";
      try { lhToast("LearnHub đã được cài lên thiết bị 🎉", { type: "success" }); } catch (e) {}
    });

    updateInstallVisibility();
  }

  applyPrefs();
  bindPrefs();
  initFocus();
  enableFocusDrag();
  initMusic();
  initLogout();
  initVersion();
  initInstallApp();
  waitForUser();
  applyPillColor("home");
  placePill();
})();
