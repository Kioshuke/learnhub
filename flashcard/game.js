const soundCorrect = new Audio("https://www.myinstants.com/media/sounds/correct-answer-sound-effect-19.mp3");
const soundWrong = new Audio("https://www.myinstants.com/media/sounds/2-incorrect-answer.mp3");
const soundHappy = new Audio("https://www.myinstants.com/media/sounds/correcto_Xgyp04B.mp3");
const soundlazer = new Audio("https://www.myinstants.com/media/sounds/weapon_1.mp3");
const soundwaring = new Audio("https://www.myinstants.com/media/sounds/family-fortunes-wrong-buzzer.mp3");
const soundclick = new Audio("https://www.myinstants.com/media/sounds/clicksoundeffect.mp3");

const soundGame2 = new Audio("bgm_match.mp3");     // Match
const soundGame3 = new Audio("bgm_blast.mp3");     // Blast
const soundGame4 = new Audio("bgm_defender.mp3");  // Defender
const soundGameFill = new Audio("bgm_form.mp3");    // Fill in the blank
let SFX_VOLUME = 0.5;
let BGM_VOLUME = 1.0;
let audioUnlocked = false;

// Settings from localStorage
let settings = {
  bgmEnabled: true,
  bgmVolume: 1,
  sfxEnabled: true,
  sfxVolume: 0.5,
  speechEnabled: true,
  speechVolume: 1
};

// Load settings from localStorage
function loadGameSettings() {
  const saved = localStorage.getItem("learnhubSettings");
  if (saved) {
    settings = JSON.parse(saved);
  }
}

// Load settings on script load
loadGameSettings();

// Reload settings when called (for realtime updates)
function reloadGameSettings() {
  loadGameSettings();
  BGM_VOLUME = settings.bgmVolume ?? 1;
  SFX_VOLUME = settings.sfxVolume ?? 0.5;
}

// Apply BGM setting immediately (toggle on/off based on setting)
function applyBGMSetting() {
  if (settings.bgmEnabled && currentMode) {
    playBGM(currentMode);
  } else {
    stopAllSounds();
  }
}

// Expose to window so flash.html can call it
window.reloadGameSettings = reloadGameSettings;
window.applyBGMSetting = applyBGMSetting;
window.bgmDemo = (function() {
    let demoIndex = 0;
    const demoKeys = ['match', 'blast', 'defender'];
    return function() {
        if (!settings.bgmEnabled) return;
        const key = demoKeys[demoIndex % demoKeys.length];
        demoIndex++;
        const s = bgm[key];
        if (s) {
            s.volume = settings.bgmVolume;
            s.currentTime = 0;
            s.play().catch(()=>{});
            setTimeout(() => { s.pause(); s.currentTime = 0; }, 3000);
        }
    };
})();

const bgm = {
    match: soundGame2,
    blast: soundGame3,
    defender: soundGame4,
    fillblank: soundGameFill
};

const allSounds = [...Object.values(bgm), soundCorrect, soundWrong, soundHappy, soundlazer, soundwaring, soundclick];

Object.values(bgm).forEach(a => {
    a.loop = true;
    a.preload = "auto";
    a.volume = BGM_VOLUME;
});

// ===== BIẾN TOÀN CỤC (ĐÃ FIX) =====
let currentMode = "flashcard";
let total = 0;
let isPaused = false;

// QUAN TRỌNG: Đây là nơi lưu tiến độ từng trò
const gameProgress = {
    flashcard: 0,
    match: 0,
    blast: 0,
    defender: 0,
    fillblank: 0,
    wordsearch: 0
};

// Biến bổ trợ cho Defender
let defenderHP = 3;
let currentMonsterNode = null;
let enemyFallInterval = null;
let shuffledCards = [];

function playBGM(mode) {
    if (!settings.bgmEnabled) return;
    Object.values(bgm).forEach(s => {
        s.pause();
        s.currentTime = 0;
    });

    const current = bgm[mode];
    if (current) {
        current.currentTime = 0;
        current.play().catch(()=>{
            // Retry nhiều lần vì file lớn (14MB) có thể chưa load xong
            let retries = 0;
            const maxRetries = 5;
            const tryPlay = () => {
                retries++;
                if (retries > maxRetries) return;
                if (!settings.bgmEnabled) return;
                if (!current.paused) return;
                current.play().catch(()=>{
                    setTimeout(tryPlay, retries === 1 ? 500 : 1000);
                });
            };
            setTimeout(tryPlay, 500);
        });
    }
}

function unlockAudio() {
    if (audioUnlocked) return;
    let unlocked = false;

    // Thử unlock bằng 1 file BGM trước (quan trọng nhất)
    const tryBgm = Object.values(bgm).map(a => {
        a.volume = 0.01;
        return a.play().then(() => {
            a.pause();
            a.currentTime = 0;
            a.volume = BGM_VOLUME;
            unlocked = true;
        }).catch(() => {});
    });

    // Thử unlock bằng SFX
    const trySfx = [soundCorrect, soundWrong, soundHappy, soundclick].map(a => {
        a.volume = 0.01;
        return a.play().then(() => {
            a.pause();
            a.currentTime = 0;
            a.volume = SFX_VOLUME;
            unlocked = true;
        }).catch(() => {});
    });

    // Đợi tất cả xong, nếu 1 trong số đó thành công thì unlock
    Promise.allSettled([...tryBgm, ...trySfx]).then(() => {
        audioUnlocked = true;
        // Sau khi unlock thành công, play lại BGM cho mode hiện tại
        if (unlocked && settings.bgmEnabled && currentMode) {
            playBGM(currentMode);
        }
    });
}

document.addEventListener("click", unlockAudio);
document.addEventListener("touchstart", unlockAudio);
function stopAllSounds() {
    Object.values(bgm).forEach(s => {
        s.pause();
        s.currentTime = 0;
    });
}
function playSound(sound) {
    if (!settings.sfxEnabled) return;
    sound.volume = SFX_VOLUME;
    sound.currentTime = 0;
    sound.play().catch(()=>{});
}
function setGlobalProgressVisible(show) {
    const progressContainer = document.getElementById("progressContainer");
    if (progressContainer) {
        progressContainer.style.display = show ? "block" : "none";
    }
}
function setTotal() {
    const check = setInterval(() => {
        if (typeof cards !== "undefined" && cards.length > 0) {
            total = cards.length;
            // Reset toàn bộ tiến độ về 0 khi load data mới
            gameProgress.flashcard = 0;
            gameProgress.match = 0;
            gameProgress.blast = 0;
            gameProgress.defender = 0;
            gameProgress.fillblank = 0;
            gameProgress.wordsearch = 0;
            
            updateProgress();
            if (typeof initFlashcard === "function") initFlashcard();

            const loadingScreen = document.getElementById("loading-screen");
            if (loadingScreen) loadingScreen.style.display = "none";
            
            clearInterval(check);
        }
    }, 100);
}
const spaceMonsters = [
    { icon: "👾", color: "#00f2ff" }, // Alien máy tính
    { icon: "👹", color: "#ff4d4d" }, // Quái quỷ đỏ
    { icon: "👽", color: "#32ff7e" }, // Người ngoài hành tinh
    { icon: "🛸", color: "#fff200" }, // Đĩa bay
    { icon: "🐙", color: "#ff9f1a" }, // Bạch tuộc vũ trụ
    { icon: "👁️", color: "#c56cf0" }, // Mắt quỷ
    { icon: "👺", color: "#ff3838" }, // Quái mặt đỏ
    { icon: "👻", color: "#ffffff" }  // Thực thể vô hình
];

function updateProgress() {
    // 1. Lấy tiến độ hiện tại
    var currentProg;
    if (currentMode === 'flashcard') {
        currentProg = fcCategories.known.length;
    } else {
        currentProg = gameProgress[currentMode] || 0;
    }
    const percent = total > 0 ? Math.min((currentProg / total) * 100, 100) : 0;
    
    // 2. Cập nhật UI App dùng chung (Thanh trên cùng)
    const pText = document.getElementById("progressText");
    const pInner = document.getElementById("progressInner");
    if (pText) {
        // Flashcard: hiện số từ ĐANG ĐỨNG (known + 1) thay vì số đã thuộc,
        // tránh nhìn "39/40" mà tưởng còn 1 lá nữa trong khi đã ở lá cuối.
        const shown = (currentMode === 'flashcard' && currentProg < total) ? (currentProg + 1) : currentProg;
        pText.innerText = `${shown} / ${total}`;
    }
    if (pInner) {
        // Thanh phải chạy CÙNG nhịp với nhãn (không lệch 1 miếng ở lá cuối).
        const shown = (currentMode === 'flashcard' && currentProg < total) ? (currentProg + 1) : currentProg;
        pInner.style.width = (total > 0 ? Math.min((shown / total) * 100, 100) : 0) + "%";
    }

    // 3. Cập nhật UI RIÊNG cho Defender (Kiểu Vũ Trụ)
    const defText = document.getElementById("def-progress-text");
    const defBar = document.getElementById("def-progress-inner");
    
    if (defText) {
        // Thêm Trái tim neon và hiệu ứng chữ "SÓNG DỮ" kiểu Sci-fi
        defText.innerHTML = `
            <span style="color: #ff0055; text-shadow: 0 0 8px #ff0055;">❤️</span> 
            <span style="letter-spacing: 2px; text-shadow: 0 0 5px #00f2ff; font-weight: bold;">SÓNG DỮ:</span> 
            <span style="color: #00f2ff; font-family: monospace;">${currentProg}/${total}</span> 
            <span style="color: #00f2ff; text-shadow: 0 0 8px #00f2ff;">👾</span>
        `;
    }
    
    if (defBar) {
        defBar.style.width = percent + "%";
        // Hiệu ứng phát sáng Galaxy
        defBar.style.boxShadow = "0 0 15px #00d2ff";
        defBar.style.background = "linear-gradient(90deg, #00d2ff, #9d50bb, #ff0055)";
    }
}

function checkComplete() {
    const target = currentMode === "wordsearch" ? wsPool.length : total;
    if (gameProgress[currentMode] >= target && target > 0) {
        const popup = document.getElementById("popup");
        if (popup) {
            popup.classList.add("show");
            playSound(soundHappy);
            startConfetti();
        }
    }
}

function switchMode(mode) {
    currentMode = mode;

    stopAllSounds();

    // Đóng hết popup/test thẳng để không đè lên chế độ mới (nguồn gốc "loạn chế độ")
    const swPopup = document.getElementById("popup");
    if (swPopup) swPopup.classList.remove("show");
    const swGoPopup = document.getElementById("game-over-popup");
    if (swGoPopup) swGoPopup.style.display = "none";

    // 🔥 FIX CHUẨN: nếu chưa unlock thì unlock + play luôn
    if (!audioUnlocked) {
        allSounds.forEach(a => {
            a.volume = 0;
            a.play().then(() => {
                a.pause();
                a.currentTime = 0;

                // trả lại volume
                if (Object.values(bgm).includes(a)) {
                    a.volume = BGM_VOLUME;
                } else {
                    a.volume = SFX_VOLUME;
                }
            }).catch(()=>{});
        });

        audioUnlocked = true;
    }

    // UI
    document.querySelectorAll("#menu button").forEach(btn => {
        btn.classList.remove("active-nav");
        const txt = btn.innerText.toLowerCase();
        if ((mode === 'flashcard' && txt.includes('flashcard')) ||
            (mode === 'match' && txt.includes('ghép')) ||
            (mode === 'blast' && txt.includes('quiz')) ||
            (mode === 'fillblank' && txt.includes('điền')) ||
            (mode === 'defender' && txt.includes('phòng')) ||
            (mode === 'wordsearch' && txt.includes('chữ'))) {
            btn.classList.add("active-nav");
        }
    });

    document.querySelectorAll(".mode").forEach(el => el.classList.remove("active"));
    const targetMode = document.getElementById(mode);
    if (targetMode) targetMode.classList.add("active");

    // Mặc định: chỉ hiện progress ngay cho Flashcard.
    // Match/Blast sẽ hiện khi bấm "Bắt đầu", Defender ẩn hẳn vì có progress riêng.
    if (mode === "flashcard") setGlobalProgressVisible(true);
    else setGlobalProgressVisible(false);

    // Chỉ hiện khung ghi chú khi ở tab Flashcard
    const fcNote = document.getElementById("fcNote");
    if (fcNote) fcNote.style.display = (mode === "flashcard") ? "" : "none";

    // 👉 QUAN TRỌNG: delay 1 tick cho chắc chắn audio ready
    setTimeout(() => {
        if (mode === 'flashcard') initFlashcard();
        else if (mode === 'match') initMatch();
        else if (mode === 'blast') initBlast();
        else if (mode === 'fillblank') initFillBlank();
        else if (mode === 'defender') initDefender();
        else if (mode === 'wordsearch') initWordSearch();
    }, 50);
}

function shuffle(arr) { return arr.sort(() => Math.random() - 0.5); }
function random(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function restartGame() {
    // 1. Đóng hết popup
    const popup = document.getElementById("popup");
    const goPopup = document.getElementById("game-over-popup");
    if (popup) popup.classList.remove("show");
    if (goPopup) goPopup.style.display = "none";

    // 2. Reset tiến độ của mode hiện tại
    gameProgress[currentMode] = 0;
    
    // 3. Chạy lại trò chơi
    if (currentMode === 'defender') {
        initDefender();
    } else if (currentMode === 'flashcard') {
        initFlashcardCategories();
        var finner = document.querySelector(".flash-inner");
        if (finner) finner.classList.remove("flipped");
        if (getActiveQueue().length > 0) showCard();
    } else {
        switchMode(currentMode);
    }
}

////////////////////////////////////////////////////////////////////////////////
// 🟢 FLASHCARD
////////////////////////////////////////////////////////////////////////////////
let current = 0;
let viewedFlashcards = new Set();

// ===== FLASHCARD CATEGORIES =====
let fcCategories = { learning: [], unknown: [], known: [] };
let fcReviewMode = false;
let fcQueuePos = 0;

function getFlashcardSetId() {
    const params = new URLSearchParams(window.location.search);
    return params.get("set") || params.get("data") || "default";
}

function getFlashcardStorageKey() {
    return "fc_progress_" + getFlashcardSetId();
}

function saveFlashcardProgress() {
    try {
        localStorage.setItem(getFlashcardStorageKey(), JSON.stringify({
            categories: fcCategories,
            reviewMode: fcReviewMode,
            queuePos: fcQueuePos
        }));
    } catch(e) {}
}

function loadFlashcardProgress() {
    try {
        const saved = localStorage.getItem(getFlashcardStorageKey());
        if (saved) {
            const data = JSON.parse(saved);
            const cats = data.categories || data;
            const valid = (arr) => Array.isArray(arr) && arr.every(i => i >= 0 && i < cards.length);
            if (valid(cats.learning) && valid(cats.unknown) && valid(cats.known)) {
                fcCategories = cats;
                if (typeof data.reviewMode === "boolean") fcReviewMode = data.reviewMode;
                if (typeof data.queuePos === "number") fcQueuePos = data.queuePos;
                return true;
            }
        }
    } catch(e) {}
    return false;
}

function clearFlashcardProgress() {
    localStorage.removeItem(getFlashcardStorageKey());
}

function getActiveQueue() {
    return fcReviewMode ? fcCategories.unknown : fcCategories.learning;
}

function initFlashcardCategories() {
    fcReviewMode = false;
    fcQueuePos = 0;
    clearFlashcardProgress();
    fcCategories = {
        learning: cards.map((_, i) => i),
        unknown: [],
        known: []
    };
    updateCategoryUI();
}

function updateCategoryUI() {
    const knownEl = document.getElementById("fcKnownCount");
    if (knownEl) knownEl.textContent = fcCategories.known.length;

    const unknownEl = document.getElementById("fcUnknownCount");
    if (unknownEl) unknownEl.textContent = fcCategories.unknown.length;

    const reviewEl = document.getElementById("fcReviewIndicator");
    if (reviewEl) {
        reviewEl.style.display = fcReviewMode ? "block" : "none";
    }
}

// Lá bài hiện tại có phải là lá cuối cùng (đã thuộc là xong bộ)?
function isLastFlashcard() {
    const queue = getActiveQueue();
    if (queue.length !== 1 || fcQueuePos !== 0) return false;
    return fcReviewMode || fcCategories.unknown.length === 0;
}

// Đổi nút phải: lá cuối → "Hoàn thành 🎉", còn lại → "Đã thuộc →"
function updateFlashcardNav() {
    const btn = document.getElementById("fcRightBtn");
    if (!btn) return;
    const count = fcCategories.known.length;
    if (isLastFlashcard()) {
        btn.classList.add("is-done");
        btn.innerHTML = 'Hoàn thành 🎉<span class="nav-badge" id="fcKnownCount">' + count + '</span>';
    } else {
        btn.classList.remove("is-done");
        btn.innerHTML = 'Đã thuộc →<span class="nav-badge" id="fcKnownCount">' + count + '</span>';
    }
}

// Nút phải luôn đi qua đây để quyết định đúng theo trạng thái hiện tại.
function fcRightAction() {
    if (isLastFlashcard()) {
        completeFlashcard();
    } else {
        markCardAsKnown();
    }
}

// Làm trống lá bài khi hoàn thành để không để từ cuối lơ lửng sau popup bán trong suốt.
function clearFinishedCard() {
    const frontEl = document.getElementById("front");
    if (frontEl) frontEl.innerText = "";
    const backEl = document.getElementById("back");
    if (backEl) backEl.innerHTML = "";
    const inner = document.querySelector(".flash-inner");
    if (inner) inner.classList.remove("flipped");
    const cardEl = document.querySelector(".flashcard");
    if (cardEl) cardEl.classList.remove("slide-out-left", "slide-in-right", "slide-active");
}

function completeFlashcard() {
    var queue = getActiveQueue();
    if (queue.length === 0 || fcQueuePos >= queue.length) return;
    var cardIndex = queue[fcQueuePos];
    queue.splice(fcQueuePos, 1);
    fcCategories.known.push(cardIndex);
    gameProgress.flashcard = fcCategories.known.length;
    saveFlashcardProgress();
    updateCategoryUI();
    updateProgress();
    clearFinishedCard();
    checkComplete();
}

function markCardAsKnown() {
    var queue = getActiveQueue();
    if (queue.length === 0 || fcQueuePos >= queue.length) return;

    var cardIndex = queue[fcQueuePos];
    queue.splice(fcQueuePos, 1);
    fcCategories.known.push(cardIndex);

    saveFlashcardProgress();
    updateCategoryUI();
    updateProgress();

    var cardEl = document.querySelector(".flashcard");
    if (cardEl) {
        cardEl.classList.add("slide-out-left");
        setTimeout(() => {
            cardEl.classList.remove("slide-out-left");
            cardEl.classList.add("slide-in-right");
            setTimeout(() => cardEl.classList.add("slide-active"), 50);
            setTimeout(() => cardEl.classList.remove("slide-in-right", "slide-active"), 550);
            advanceFlashcard();
        }, 300);
    } else {
        advanceFlashcard();
    }
}

function markCardAsUnknown() {
    var queue = getActiveQueue();
    if (queue.length === 0 || fcQueuePos >= queue.length) return;

    var cardIndex = queue[fcQueuePos];
    queue.splice(fcQueuePos, 1);
    fcCategories.unknown.push(cardIndex);

    saveFlashcardProgress();
    updateCategoryUI();
    updateProgress();

    var cardEl = document.querySelector(".flashcard");
    if (cardEl) {
        cardEl.classList.add("slide-out-right");
        setTimeout(() => {
            cardEl.classList.remove("slide-out-right");
            cardEl.classList.add("slide-in-left");
            setTimeout(() => cardEl.classList.add("slide-active"), 50);
            setTimeout(() => cardEl.classList.remove("slide-in-left", "slide-active"), 550);
            advanceFlashcard();
        }, 300);
    } else {
        advanceFlashcard();
    }
}

function advanceFlashcard() {
    var queue = getActiveQueue();

    if (fcQueuePos < queue.length) {
        showCard();
        return;
    }

    if (!fcReviewMode && fcCategories.unknown.length > 0) {
        fcReviewMode = true;
        fcQueuePos = 0;
        fcCategories.unknown = shuffle([...fcCategories.unknown]);
        updateCategoryUI();
        showCard();
        return;
    }

    if (fcCategories.unknown.length === 0 && fcCategories.learning.length === 0) {
        gameProgress.flashcard = fcCategories.known.length;
        updateProgress();
        updateCategoryUI();
        clearFinishedCard();
        checkComplete();
    }
}

function goBackToHub() {
    window.location.href = 'hub.html';
}

function initFlashcard() {
    stopAllSounds();
    initFlashcardCategories();
    var inner = document.querySelector(".flash-inner");
    if (inner) inner.classList.remove("flipped");
    var queue = getActiveQueue();
    if (queue.length > 0) {
        fcQueuePos = 0;
        updateCategoryUI();
        showCard();
    }
}

function markFlashcardViewed(index) {
    if (!cards[index]) return;
    viewedFlashcards.add(index);
    gameProgress.flashcard = Math.min(viewedFlashcards.size, total);
    updateProgress();
}

function fcEsc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
}

function showCard() {
    var queue = getActiveQueue();
    if (fcQueuePos >= queue.length) return;
    var card = cards[queue[fcQueuePos]];
    if (!card) return;
    document.getElementById("front").innerText = card.front;
    const backEl = document.getElementById("back");
    const lvStyle = {
      "Dễ": ["#dcfce7", "#15803d"],
      "Trung bình": ["#fef9c3", "#a16207"],
      "Khó": ["#fee2e2", "#b91c1c"],
      "Nâng cao": ["#ede9fe", "#6d28d9"]
    }[card.level];
    let html = '<div style="display:block;width:100%">';
    if (lvStyle) html += `<div style="text-align:center;margin-bottom:10px;"><span style="display:inline-block;font-size:11px;font-weight:800;padding:3px 12px;border-radius:999px;background:${lvStyle[0]};color:${lvStyle[1]};">${fcEsc(card.level)}</span></div>`;
    html += `<div style="font-size:38px;font-weight:800;color:#4338ca;line-height:1.2;">${fcEsc(card.back)}</div>`;
    if (card.description) html += `<div style="margin-top:12px;font-size:15px;font-weight:600;color:#6d28d9;line-height:1.5;">${fcEsc(card.description)}</div>`;
    if (card.example) html += `<div style="margin-top:10px;font-size:14px;font-weight:500;color:#7c3aed;font-style:italic;line-height:1.45;">✏️ Ví dụ: ${fcEsc(card.example)}</div>`;
    html += "</div>";
    backEl.innerHTML = html;
    updateFlashcardNav();
}

function flipCard() {
    const inner = document.querySelector(".flash-inner");
    if (inner) inner.classList.toggle("flipped");
}

function nextCard() {
    if (current >= cards.length - 1) {
        if (viewedFlashcards.size >= total) checkComplete();
        return;
    }

    const cardEl = document.querySelector(".flashcard");
    cardEl.classList.add("slide-out-left");

    setTimeout(() => {
        current = current + 1;
        markFlashcardViewed(current);
        showCard();
        document.querySelector(".flash-inner").classList.remove("flipped");
        cardEl.classList.remove("slide-out-left");
        cardEl.classList.add("slide-in-right");

        setTimeout(() => { cardEl.classList.add("slide-active"); }, 50);
        setTimeout(() => { cardEl.classList.remove("slide-in-right", "slide-active"); }, 550);
    }, 300);
}

function prevCard() {
    const cardEl = document.querySelector(".flashcard");
    cardEl.classList.add("slide-out-right");

    setTimeout(() => {
        current = (current - 1 + cards.length) % cards.length;
        markFlashcardViewed(current);
        showCard();
        document.querySelector(".flash-inner").classList.remove("flipped");
        cardEl.classList.remove("slide-out-right");
        cardEl.classList.add("slide-in-left");

        setTimeout(() => { cardEl.classList.add("slide-active"); }, 20);
        setTimeout(() => { cardEl.classList.remove("slide-in-left", "slide-active"); }, 350);
    }, 200);
}

////////////////////////////////////////////////////////////////////////////////
// 🟣 MATCH
////////////////////////////////////////////////////////////////////////////////
let matchPool = [], matchIndex = 0, selected = [], isChecking = false;

function initMatch() {
    stopAllSounds(); // 👈 đảm bảo không còn nhạc từ mode khác
    setGlobalProgressVisible(false);

    const startScreen = document.getElementById("match-start-screen");
    const content = document.getElementById("match-content");

    if (startScreen && content) {
        startScreen.style.display = "block";  // hiện màn hình start
        content.style.display = "none";       // ẩn game
    }
}
function startMatchGame() {
    playBGM("match");
    setGlobalProgressVisible(true);


    document.getElementById("match-start-screen").style.display = "none";
    document.getElementById("match-content").style.display = "block";
    
    matchPool = shuffle([...cards]);
    matchIndex = 0; 
    gameProgress.match = 0; 
    updateProgress();
    loadNextBatch();
}

function loadNextBatch() {
    const grid = document.getElementById("matchGrid");
    grid.innerHTML = ""; 
    selected = []; 
    isChecking = false;

    // Random background cho mỗi mẻ
    const bg = document.getElementById("match-bg");
    if (bg) {
        const rand = Math.floor(Math.random() * 1000);
        bg.style.backgroundImage = `url(https://picsum.photos/1920/1080?random=${rand})`;
    }

    const batchCards = matchPool.slice(matchIndex, matchIndex + 10);
    matchIndex += 10;

    if (batchCards.length === 0) {
        grid.innerHTML = "";
        return;
    }

    let currentBatch = [];
    batchCards.forEach(card => {
        currentBatch.push({ id: card.id, text: card.front });
        currentBatch.push({ id: card.id, text: card.back });
    });
    shuffle(currentBatch);

    currentBatch.forEach(card => {
        const div = document.createElement("div");
        div.className = "match-card";
        div.innerText = card.text;
        div.onclick = () => selectMatch(card, div);
        grid.appendChild(div);
    });
}

function selectMatch(card, el) {
    if (isChecking || el.classList.contains("hidden")) return;

    // PHÁT SOUND CLICK: Bấm vào đâu cũng kêu cho sướng tai
    if (typeof soundclick !== "undefined") {
        playSound(soundclick);
    }

    // LOGIC CLICK LẦN 2 ĐỂ BỎ CHỌN (TOGGLE)
    if (el.classList.contains("selected")) {
        el.classList.remove("selected");
        // Lọc bỏ thẻ này ra khỏi mảng đang chọn
        selected = selected.filter(item => item.el !== el);
        return; 
    }

    // Nếu chưa chọn thì mới thêm vào
    el.classList.add("selected");
    selected.push({ card, el });

    if (selected.length === 2) {
        isChecking = true;
        const [a, b] = selected;

        if (a.card.id === b.card.id) {
            // ĐÚNG: Cộng điểm vào gameProgress.match để thanh progress chạy
            gameProgress.match = Math.min((gameProgress.match || 0) + 1, total);
            updateProgress(); 
            checkComplete();
            playSound(soundCorrect);
            
            a.el.classList.add("correct"); 
            b.el.classList.add("correct");

            setTimeout(() => {
                a.el.classList.add("hidden"); 
                b.el.classList.add("hidden");
                // Nếu hết thẻ thì load mẻ mới
                if (document.querySelectorAll(".match-card:not(.hidden)").length === 0) {
                    loadNextBatch();
                }
                isChecking = false;
                selected = []; // Reset mảng sau khi xử lý xong
            }, 300);
        } else {
            // SAI: Rung đỏ rồi trả về trạng thái cũ
            playSound(soundWrong);
            a.el.classList.add("wrong"); 
            b.el.classList.add("wrong");
            
            setTimeout(() => {
                a.el.classList.remove("wrong", "selected");
                b.el.classList.remove("wrong", "selected");
                isChecking = false;
                selected = []; // Reset mảng để chọn cặp mới
            }, 400);
        }
    }
}
////////////////////////////////////////////////////////////////////////////////
// 🔴 BLAST - PHIÊN BẢN SMOOTH & ANTI-LAG (DÀNH CHO ĐIỆN THOẠI)
////////////////////////////////////////////////////////////////////////////////
let blastPool = [], blastIndex = 0, streak = 0, currentQuestion = null, hardcoreMode = false;

function initBlast() {
    stopAllSounds();
    setGlobalProgressVisible(false);
    const startScreen = document.getElementById("blast-start-screen");
    const content = document.getElementById("blast-content");
    if (startScreen && content) {
        startScreen.style.display = "flex";
        content.style.display = "none";
    }
}

function startBlastGame() {
    playBGM("blast");
    setGlobalProgressVisible(true);
    const startScreen = document.getElementById("blast-start-screen");
    const content = document.getElementById("blast-content");
    if (startScreen) startScreen.style.display = "none";
    if (content) content.style.display = "block";

    const hcToggle = document.getElementById("hardcore-toggle");
    hardcoreMode = hcToggle ? hcToggle.checked : false;

    gameProgress.blast = 0;
    updateProgress();
    streak = 0;
    const scoreEl = document.getElementById("score");
    if(scoreEl) scoreEl.innerHTML = `Streak: <span class="streak-badge">0</span>`;
    
    // Ưu tiên lấy từ activeCards, không có thì lấy từ cards
    const dataSource = (typeof activeCards !== 'undefined' && activeCards.length > 0) ? activeCards : cards;
    blastPool = shuffle([...dataSource]); 
    blastIndex = 0;
    
    // Reset style ban đầu để tránh khựng
    const qEl = document.getElementById("question");
    const optDiv = document.getElementById("options");
    if(qEl) qEl.style.opacity = "1";
    if(optDiv) optDiv.style.opacity = "1";

    nextQuestion();
}

function nextQuestion() {
    if (blastIndex >= blastPool.length) {
        checkComplete();
        return;
    }

    const dataSource = (typeof activeCards !== 'undefined' && activeCards.length > 0) ? activeCards : cards;
    const correct = blastPool[blastIndex];
    blastIndex++;

    let options = [correct.back];
    while (options.length < 4) {
        const rand = random(dataSource).back;
        if (!options.includes(rand)) options.push(rand);
    }
    options = shuffle(options);

    currentQuestion = { question: correct.front, answer: correct.back };
    
    const qEl = document.getElementById("question");
    const optDiv = document.getElementById("options");

    if(!qEl || !optDiv) return;

    // Thay đổi nội dung
    qEl.innerText = currentQuestion.question;
    optDiv.innerHTML = "";
    
    options.forEach(opt => {
        const btn = document.createElement("button");
        btn.innerText = opt;
        btn.onclick = () => answerBlast(opt, btn);
        optDiv.appendChild(btn);
    });

    // Kích hoạt animation "Bay vào" cực mượt
    requestAnimationFrame(() => {
        qEl.style.animation = "none";
        optDiv.style.animation = "none";
        void qEl.offsetWidth; // Force reflow
        
        qEl.style.animation = "slideInSmooth 0.24s ease-out forwards";
        optDiv.style.animation = "slideInSmooth 0.26s ease-out 0.02s forwards";
    });

    speak(correct.front);
}

function answerBlast(choice, btn) {
    if (gameProgress.blast >= total) return;
    const buttons = document.querySelectorAll("#options button");
    const scoreEl = document.getElementById("score");

    if (choice !== currentQuestion.answer) {
        soundWrong.currentTime = 0;
        playSound(soundWrong);
        btn.classList.add("wrong");
        
        // Rung nhẹ kiểu feedback điện thoại
        btn.style.animation = "shakeLow 0.3s ease";
        streak = 0;
        if(scoreEl) {
            scoreEl.innerHTML = `Streak: <span class="streak-badge dead">0</span> 💀`;
            scoreEl.classList.remove("streak-pop");
            scoreEl.classList.add("streak-reset");
            setTimeout(() => scoreEl.classList.remove("streak-reset"), 320);
        }
        
        if (hardcoreMode) {
            buttons.forEach(b => b.disabled = true);
            setTimeout(() => {
                btn.classList.remove("wrong");
                btn.style.animation = "";
                const dataSource = (typeof activeCards !== 'undefined' && activeCards.length > 0) ? activeCards : cards;
                blastPool = shuffle([...dataSource]);
                blastIndex = 0;
                gameProgress.blast = 0;
                updateProgress();
                nextQuestion();
            }, 600);
        } else {
            setTimeout(() => {
                btn.classList.remove("wrong");
                btn.style.animation = "";
            }, 300);
        }
        return;
    }

    // Trả lời đúng
    soundCorrect.currentTime = 0;
    playSound(soundCorrect)
    gameProgress.blast = Math.min(gameProgress.blast + 1, total);
    updateProgress();
    checkComplete();

    streak++;
    btn.classList.add("correct");
    buttons.forEach(b => b.disabled = true);

    if(scoreEl) {
        let icon = "🔥";
        let levelClass = "active";
        if (streak >= 70) { icon = "🌌✨"; levelClass = "cosmic-streak"; }
        else if (streak >= 41) { icon = "⚡🔮"; levelClass = "electric-streak"; }
        else if (streak >= 21) { icon = "💜🌟"; levelClass = "neon-streak"; }
        else if (streak >= 10) { icon = "✨🌟"; levelClass = "gold-streak"; }
        else if (streak >= 1) { icon = "🔥"; levelClass = "fire-streak"; }
        scoreEl.innerHTML = `Streak: <span class="streak-badge ${levelClass}">${streak}</span> ${icon}`;
        scoreEl.classList.remove("streak-pop");
        void scoreEl.offsetWidth;
        scoreEl.classList.add("streak-pop");
    }

    // Hiệu ứng "Bay đi" - Nhanh và gọn hơn
    setTimeout(() => {
        const qEl = document.getElementById("question");
        const optDiv = document.getElementById("options");

        qEl.style.animation = "slideOutSmooth 0.22s ease-in forwards";
        optDiv.style.animation = "slideOutSmooth 0.22s ease-in forwards";

        setTimeout(() => {
            nextQuestion();
        }, 220);
    }, 360);
}
function speak(text) {
    if (!settings.speechEnabled) return;
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-GB';
        utterance.rate = 0.9;
        utterance.volume = settings.speechVolume || 1;
        window.speechSynthesis.speak(utterance);
    }
}

// Bàn phím & Cử chỉ
document.addEventListener('keydown', (e) => {
    if (currentMode === 'flashcard') {
        if (e.key === " " || e.key === "ArrowUp") flipCard();
        if (e.key === "Enter") speak(document.getElementById('front').innerText);
        if (e.key === "ArrowRight" || e.key === "1") markCardAsKnown();
        if (e.key === "ArrowLeft" || e.key === "2") markCardAsUnknown();
    }
});

let touchstartX = 0, touchendX = 0;
const gestureZone = document.getElementById('flashcard');
if (gestureZone) {
    gestureZone.addEventListener('touchstart', e => { touchstartX = e.changedTouches[0].screenX; });
    gestureZone.addEventListener('touchend', e => {
        touchendX = e.changedTouches[0].screenX;
        if (touchendX < touchstartX - 50) markCardAsUnknown();
        if (touchendX > touchstartX + 50) markCardAsKnown();
    });
}
// ===== LOGIC BẮN PHÁO GIẤY CONFETTI 3D =====
function startConfetti() {
    const container = document.getElementById('confettiContainer');
    if (!container) return;
    
    container.innerHTML = ""; // Dọn sạch
    const colors = ['#6366f1', '#a855f7', '#f6d365', '#2af598', '#ef4444', '#fff']; // Màu tím, vàng, xanh, đỏ, trắng
    
    // Bắn 150 miếng pháo giấy
    for (let i = 0; i < 150; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        
        // Kích thước và màu ngẫu nhiên
        const size = Math.random() * 8 + 6 + 'px'; // 6px - 14px
        confetti.style.width = size;
        confetti.style.height = size;
        confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
        
        // Vị trí ngang ngẫu nhiên
        confetti.style.left = Math.random() * 100 + 'vw';
        
        // Thời gian bay và delay ngẫu nhiên
        const duration = Math.random() * 2 + 1.5 + 's'; // 1.5s - 3.5s
        confetti.style.animationDuration = duration;
        confetti.style.animationDelay = Math.random() * 0.3 + 's'; // Delay nhẹ để không ra cùng lúc
        
        // Hiệu ứng xoay ngẫu nhiên
        confetti.style.transform = `rotate(${Math.random() * 360}deg)`;

        container.appendChild(confetti);
    }
}
/* ============================================================ */
/* 🔫 DEFENDER MODE - CODE FULL FIX LỖI */
/* ============================================================ */

function initDefender() {
    stopAllSounds();
    setGlobalProgressVisible(false);
    if (bgm.defender) { bgm.defender.preload = "auto"; bgm.defender.load(); }
    const startScreen = document.getElementById("defender-start-screen");
    const battle = document.getElementById("battle-container");
    if (startScreen) startScreen.style.display = "flex";
    if (battle) battle.style.display = "none";
}

function startDefenderGame() {
    if (enemyFallInterval) clearInterval(enemyFallInterval);
    setGlobalProgressVisible(false);
    const startScreen = document.getElementById("defender-start-screen");
    const battle = document.getElementById("battle-container");
    if (startScreen) startScreen.style.display = "none";
    if (battle) battle.style.display = "block";

    // Bật nhạc Defender (playBGM tự pause nhạc cũ)
    if (settings.bgmEnabled) playBGM("defender");

    // RESET TIẾN ĐỘ RIÊNG CHO TRÒ 4
    gameProgress.defender = 0;
    let source = (typeof activeCards !== 'undefined' && activeCards.length > 0) ? [...activeCards] : [...cards];
    shuffledCards = source.sort(() => Math.random() - 0.5);
    total = shuffledCards.length;
    
    defenderHP = 3;
    isPaused = false; 
    
    updateProgress();
    updateHPUI();
    
    document.getElementById("enemy-area").innerHTML = "";
    document.getElementById("game-over-popup").style.display = "none";
    document.getElementById("pause-overlay").style.display = "none";

    spawnMonster();
}
document.addEventListener("visibilitychange", () => {
    if (document.hidden && currentMode === "defender") {
        pauseDefenderGame();
    }
});
function updateHPUI() {
    const hpTextTop = document.getElementById("hp-text-top");
    if (hpTextTop) {
        // Vẽ lại số tim tương ứng với máu còn lại
        hpTextTop.innerText = "❤️".repeat(Math.max(0, defenderHP));
        
        // Hiệu ứng nhấp nháy khi mất máu
        hpTextTop.style.animation = "none";
        void hpTextTop.offsetWidth; 
        hpTextTop.style.animation = "shakeLow 0.3s ease";
    }
}

function spawnMonster() {
    if (currentMode !== "defender" || gameProgress.defender >= total || defenderHP <= 0) {
        if (gameProgress.defender >= total) checkComplete();
        return;
    }

    const area = document.getElementById("enemy-area");
    area.innerHTML = ""; 

    const currentData = shuffledCards[gameProgress.defender];
    
    // Chọn ngẫu nhiên quái và hành tinh
    const randomMonster = spaceMonsters[Math.floor(Math.random() * spaceMonsters.length)];
    const wrapper = document.createElement("div");
    wrapper.className = "monster-wrapper";
    let topPos = -100;
    wrapper.style.top = topPos + "px";
    
    wrapper.innerHTML = `
        <div class="monster-visual" style="position: relative; display: flex; justify-content: center;">
            <div class="monster-icon" style="font-size: 35px; filter: drop-shadow(0 0 10px ${randomMonster.color}); z-index: 2;">
                ${randomMonster.icon}
            </div>
        </div>
        <div class="monster-text-box" style="border: 1px solid ${randomMonster.color} !important; color: ${randomMonster.color} !important; box-shadow: 0 0 10px ${randomMonster.color}44 !important;">
            ${currentData.back}
        </div>
    `;
    
    area.appendChild(wrapper);
    currentMonsterNode = wrapper;

    let speed = 1.3 + (gameProgress.defender / total) * 1.5; 
    
    if (enemyFallInterval) clearInterval(enemyFallInterval);
    enemyFallInterval = setInterval(() => {
        if (currentMode !== "defender") { clearInterval(enemyFallInterval); return; }
        if (!isPaused) { 
            topPos += speed;
            wrapper.style.top = topPos + "px";
            if (topPos > 320) { // Đã chỉnh điểm rơi cho khớp giao diện mới
                clearInterval(enemyFallInterval);
                takeDamage();
            }
        }
    }, 30);

    loadAmmo(currentData.front, shuffledCards);
}

function loadAmmo(correctAnswer, dataSource) {
    const shelf = document.getElementById("ammo-shelf");
    if (!shelf) return;
    shelf.innerHTML = "";

    let options = [correctAnswer];
    while (options.length < 3 && dataSource.length >= 3) {
        let rand = dataSource[Math.floor(Math.random() * dataSource.length)].front;
        if (!options.includes(rand)) options.push(rand);
    }
    options = options.sort(() => Math.random() - 0.5);

    options.forEach(opt => {
        const btn = document.createElement("button");
        btn.innerText = opt;
        btn.onclick = () => shoot(opt, correctAnswer, btn);
        shelf.appendChild(btn);
    });
}

function shoot(choice, answer, btn) {
    if (isPaused || defenderHP <= 0 || currentMode !== "defender") return; 

    // Hiệu ứng đạn
    const bullet = document.createElement("div");
    bullet.className = "bullet-trace";
    bullet.style.left = "50%";
    document.getElementById("battle-container").appendChild(bullet);
    setTimeout(() => bullet.remove(), 400);

    if (choice === answer) {
        soundlazer.currentTime = 0;
        soundlazer.play().catch(() => {});
        clearInterval(enemyFallInterval); 
        
        if (currentMonsterNode) {
            currentMonsterNode.style.filter = "brightness(5)";
            currentMonsterNode.style.opacity = "0";
            currentMonsterNode.style.transition = "0.2s";
        }
        
        gameProgress.defender++; // TĂNG TIẾN ĐỘ RIÊNG
        updateProgress();
        setTimeout(() => { if(currentMode === "defender") spawnMonster(); }, 300);
    } else {
        soundwaring.currentTime = 0;
        soundwaring.play().catch(() => {});
        document.body.classList.add("shake");
        setTimeout(() => document.body.classList.remove("shake"), 200);
        btn.style.background = "#ff0055";
        setTimeout(() => { btn.style.background = ""; }, 300);
    }
}
function takeDamage() {
    defenderHP--;
    updateHPUI();
    soundWrong.currentTime = 0;
    soundWrong.play().catch(() => {});
    
    if (defenderHP <= 0) {
        clearInterval(enemyFallInterval);
        document.getElementById("game-over-popup").style.display = "flex";
    } else {
        if (currentMonsterNode) currentMonsterNode.style.opacity = "0";
        setTimeout(() => {
            if (currentMode === "defender") {
                gameProgress.defender = Math.min(gameProgress.defender + 1, total);
                updateProgress();
                spawnMonster();
            }
        }, 500);
    }
}

function pauseDefenderGame() {
    if (currentMode !== "defender" || defenderHP <= 0 || gameProgress.defender >= total) return;
    isPaused = true;
    const pauseOverlay = document.getElementById("pause-overlay");
    if (pauseOverlay) pauseOverlay.style.display = "flex";
    if (bgm.defender) bgm.defender.pause();
}

function resumeGame() {
    isPaused = false;
    const pauseOverlay = document.getElementById("pause-overlay");
    if (pauseOverlay) pauseOverlay.style.display = "none";
    if (settings.bgmEnabled) playBGM("defender");
    if (currentMode === "defender" && defenderHP > 0 && gameProgress.defender < total && !currentMonsterNode) {
        spawnMonster();
    }
}

window.resumeGame = resumeGame;

function restartDefenderGame() {
    startDefenderGame();
}

////////////////////////////////////////////////////////////////////////////////
// 🟡 FILL IN THE BLANK
////////////////////////////////////////////////////////////////////////////////
let fillPool = [], fillIndex = 0, currentFillCard = null;
let fillHintEnabled = false;

function initFillBlank() {
    stopAllSounds();
    setGlobalProgressVisible(false);
    const startScreen = document.getElementById("fillblank-start-screen");
    const content = document.getElementById("fillblank-content");
    if (startScreen && content) {
        startScreen.style.display = "flex";
        content.style.display = "none";
    }
}

function startFillBlankGame() {
    playBGM("fillblank");
    setGlobalProgressVisible(true);
    const startScreen = document.getElementById("fillblank-start-screen");
    const content = document.getElementById("fillblank-content");
    if (startScreen) startScreen.style.display = "none";
    if (content) content.style.display = "block";

    gameProgress.fillblank = 0;
    updateProgress();

    const dataSource = (typeof activeCards !== 'undefined' && activeCards.length > 0) ? activeCards : cards;
    fillPool = shuffle([...dataSource]);
    fillIndex = 0;

    // Reset UI
    document.getElementById("fillSlotsContainer").innerHTML = "";
    document.getElementById("fillFeedback").innerText = "";
    document.getElementById("hintDisplay").innerText = "";
    fillHintEnabled = false;
    document.getElementById("hintToggle").innerText = "Bật";

    loadNextFillQuestion();
}

function toggleHint() {
    fillHintEnabled = !fillHintEnabled;
    document.getElementById("hintToggle").innerText = fillHintEnabled ? "Tắt" : "Bật";
    if (fillHintEnabled && currentFillCard) {
        showHint();
    } else {
        document.getElementById("hintDisplay").innerText = "";
    }
}

function showHint() {
    if (!currentFillCard || !fillHintEnabled) {
        document.getElementById("hintDisplay").innerText = "";
        return;
    }

    const firstLetter = currentFillCard.front.charAt(0).toUpperCase();
    document.getElementById("hintDisplay").innerText = `Gợi ý: Bắt đầu bằng "${firstLetter}"`;
}

function loadNextFillQuestion() {
    if (fillIndex >= fillPool.length) {
        checkComplete();
        return;
    }

    currentFillCard = fillPool[fillIndex];
    fillIndex++;
    showFillQuestion(currentFillCard);
}

function renderFillSlots(card) {
    const container = document.getElementById("fillSlotsContainer");
    container.innerHTML = '';

    const words = card.front.split(' ');

    words.forEach((word, wi) => {
        if (wi > 0) {
            const space = document.createElement("span");
            space.className = "slot-space";
            container.appendChild(space);
        }

        for (let i = 0; i < word.length; i++) {
            const input = document.createElement("input");
            input.type = "text";
            input.maxLength = 1;
            input.className = "char-slot";
            input.dataset.word = wi;
            input.autocomplete = "off";
            input.spellcheck = false;

            input.addEventListener("input", function () {
                if (this.value) {
                    let el = this.nextElementSibling;
                    while (el && el.tagName !== "INPUT") el = el.nextElementSibling;
                    if (el) el.focus();
                }

                const slots = container.querySelectorAll(".char-slot");
                const allFilled = Array.from(slots).every(s => s.value);
                if (allFilled) {
                    setTimeout(checkFillAnswer, 250);
                }
            });

            input.addEventListener("keydown", function (e) {
                if (e.key === "Backspace" && !this.value) {
                    e.preventDefault();
                    let el = this.previousElementSibling;
                    while (el && el.tagName !== "INPUT") el = el.previousElementSibling;
                    if (el) el.focus();
                }
                if (e.key === "Enter") {
                    checkFillAnswer();
                }
            });

            container.appendChild(input);
        }
    });

    const first = container.querySelector("input");
    if (first) first.focus();
}

function collectSlotsValue() {
    const slots = document.querySelectorAll("#fillSlotsContainer .char-slot");
    if (!slots.length) return '';

    let result = slots[0].value || '';
    for (let i = 1; i < slots.length; i++) {
        if (slots[i].dataset.word !== slots[i - 1].dataset.word) {
            result += ' ';
        }
        result += slots[i].value || '';
    }
    return result.toLowerCase();
}

function showFillQuestion(card) {
    const questionEl = document.getElementById("fillQuestion");
    const feedbackEl = document.getElementById("fillFeedback");

    questionEl.innerText = card.back;
    feedbackEl.innerText = "";

    renderFillSlots(card);

    if (fillHintEnabled) {
        showHint();
    } else {
        document.getElementById("hintDisplay").innerText = "";
    }
}

function checkFillAnswer() {
    if (!currentFillCard) return;

    const feedbackEl = document.getElementById("fillFeedback");
    const userAnswer = collectSlotsValue();

    const correctAnswer = currentFillCard.front.toLowerCase();

    let isCorrect = userAnswer === correctAnswer;

    if (isCorrect) {
        playSound(soundCorrect);
        gameProgress.fillblank = Math.min(gameProgress.fillblank + 1, total);
        updateProgress();
        checkComplete();
        feedbackEl.innerText = "Chính xác! ✅";
        feedbackEl.style.color = "#22c55e";

        setTimeout(() => {
            loadNextFillQuestion();
        }, 800);
    } else {
        playSound(soundWrong);
        feedbackEl.innerText = `Sai! Đáp án đúng: ${currentFillCard.front}`;
        feedbackEl.style.color = "#ef4444";

        const slots = document.querySelectorAll("#fillSlotsContainer .char-slot");
        slots.forEach(s => {
            s.style.borderBottomColor = "#ef4444";
        });
        setTimeout(() => {
            slots.forEach(s => {
                s.style.borderBottomColor = "";
            });
        }, 300);
    }
}

////////////////////////////////////////////////////////////////////////////////
// 🧩 WORD SEARCH - GIẢI Ô CHỮ (mức cố định: Nhỏ 10×10·3 từ, Vừa 15×15·6 từ, Nhiều 20×20·9 từ)
////////////////////////////////////////////////////////////////////////////////
const WS_GRID_MAX = 20; // cạnh ma trận lớn nhất (mức Nhiều)
const WS_LEVELS = {
    3: { grid: 10, words: 3, maxLen: 8  },  // Nhỏ: 10×10, 3 từ, mỗi từ ≤ 8 ký tự
    6: { grid: 15, words: 6, maxLen: 13 },  // Vừa: 15×15, 6 từ
    9: { grid: 20, words: 9, maxLen: 18 }   // Nhiều: 20×20, 9 từ
};
const WS_LEVEL_NAMES = { 3: "Nhỏ", 6: "Vừa", 9: "Nhiều" };
let wsLevel = 3;            // cỡ đợt: 3 / 6 / 9
let wsPool = [];            // cards dùng được (theo mức đã chọn), đã xáo trộn
let wsCursor = 0;           // vị trí đợt tiếp theo trong wsPool
let wsBatchCount = 0;       // số đợt đã chơi xong
let wsBatchWords = [];      // từ của đợt hiện tại: { front, back }
let wsGrid = [];            // ma trận chữ (n x n)
let wsN = 0;                // cạnh ma trận hiện tại
let wsCellEls = [];         // tham chiếu ô: wsCellEls[r][c]
let wsFoundSet = new Set(); // front đã tìm trong đợt (lowercase)
let wsFoundCells = new Set(); // "r,c" đã xanh
let wsDragging = false;
let wsStartCell = null;
let wsCurCells = [];
let wsProcessing = false;
let wsDone = false;

// maxLen = giới hạn ký tự theo mức (từ dài hơn tự bị lọc, không kẹt khi xếp)
function wordSearchUsableCards(maxLen) {
    const cap = Math.min(maxLen || WS_LEVELS[wsLevel].maxLen, WS_GRID_MAX);
    return cards.filter(c => c && typeof c.front === "string" && c.front.trim() && c.front.length <= cap);
}

function initWordSearch() {
    stopAllSounds();
    setGlobalProgressVisible(false);
    wsDone = false;

    const startScreen = document.getElementById("wordsearch-start-screen");
    const content = document.getElementById("wordsearch-content");
    if (startScreen) startScreen.style.display = "block";
    if (content) content.style.display = "none";

    wsPool = shuffle(wordSearchUsableCards(18));

    // Mỗi mức: số từ & cỡ ô CỐ ĐỊNH (không chia dư động)
    const buttons = document.querySelectorAll(".ws-level-btn");
    let chosen = 3;
    buttons.forEach(b => {
        const n = parseInt(b.getAttribute("data-ws-level"), 10);
        const lvl = WS_LEVELS[n];
        const ok = wordSearchUsableCards(lvl.maxLen).length >= lvl.words;
        b.classList.toggle("muted", !ok);
        b.disabled = !ok;
        // Nhãn cố định theo yêu cầu: "Nhỏ · 3 từ" / "Vừa · 6 từ" / "Nhiều · 9 từ"
        b.innerText = WS_LEVEL_NAMES[n] + " · " + lvl.words + " từ";
        if (ok && n > chosen) chosen = n;
    });
    wsLevel = chosen;
    buttons.forEach(b => {
        b.classList.toggle("active", parseInt(b.getAttribute("data-ws-level"), 10) === chosen && !b.disabled);
    });

    const hint = document.getElementById("wsLevelHint");
    if (hint) {
        const totalOk = wordSearchUsableCards(18).length; // tổng từ vừa mức lớn nhất
        if (totalOk === 0) hint.innerText = "⚠️ Bộ này không có từ đủ ngắn để xếp ô chữ.";
        else if (totalOk < 3) hint.innerText = "⚠️ Chỉ xếp được đợt " + totalOk + " từ.";
        else hint.innerText = "🎯 Nhỏ 10×10 · 3 từ — Vừa 15×15 · 6 từ — Nhiều 20×20 · 9 từ. Tổng " + totalOk + " từ.";
    }
}

function pickWordSearchLevel(n) {
    if (!wsPool || n > wsPool.length) return;
    wsLevel = n;
    document.querySelectorAll(".ws-level-btn").forEach(b => {
        b.classList.toggle("active", parseInt(b.getAttribute("data-ws-level"), 10) === n && !b.disabled);
    });
}

function startWordSearchGame() {
    playBGM("match");
    setGlobalProgressVisible(true);
    gameProgress.wordsearch = 0;
    updateProgress();

    document.getElementById("wordsearch-start-screen").style.display = "none";
    document.getElementById("wordsearch-content").style.display = "block";

    wsPool = shuffle(wordSearchUsableCards(WS_LEVELS[wsLevel].maxLen));
    if (wsPool.length === 0) {
        if (typeof lhToast === "function") lhToast("Bộ này không có từ nào xếp được ô chữ!", 'error');
        return;
    }
    if (wsPool.length < wsLevel) {
        if (typeof lhToast === "function") lhToast("Bộ chỉ còn đủ " + wsPool.length + " từ — tạm chơi với đợt " + Math.min(wsPool.length, 3) + " từ.", 'error');
        wsLevel = Math.min(wsPool.length, 3);
        wsPool = shuffle(wordSearchUsableCards(WS_LEVELS[wsLevel].maxLen));
    }

    wsCursor = 0;
    wsBatchCount = 0;
    wsDone = false;

    // Gắn sự kiện kéo 1 lần
    const gridEl = document.getElementById("wsGrid");
    if (!gridEl.dataset.seeded) {
        gridEl.dataset.seeded = "1";
        gridEl.addEventListener("pointerdown", wsPointerDown);
        gridEl.addEventListener("pointermove", wsPointerMove);
        gridEl.addEventListener("pointerup", wsPointerUp);
        gridEl.addEventListener("pointercancel", wsPointerUp);
    }

    wordSearchNextBatch();
}

// Xếp từ vào lưới CỐ ĐỊNH theo mức (10/15/20); nếu không khít thì giảm bớt từ
// (từ bị bớt được dồn về đợt sau bởi wsCursor). Luôn trả về { grid, words, n }.
function buildWordSearchPlacement(words) {
    const n = WS_LEVELS[wsLevel] ? WS_LEVELS[wsLevel].grid : 10;
    let grid = placeWordSearchWords(words, n);
    let attempts = 0;
    while (!grid && attempts < 60) { grid = placeWordSearchWords(words, n); attempts++; }
    if (grid) return { grid: grid, words: words, n: n };

    const pool = words.slice().sort((a, b) => b.front.length - a.front.length);
    while (pool.length > 1) {
        pool.pop();
        grid = null; attempts = 0;
        while (!grid && attempts < 60) { grid = placeWordSearchWords(pool, n); attempts++; }
        if (grid) return { grid: grid, words: pool.slice(), n: n };
    }
    return { grid: forceSingleWord(pool[0], n), words: pool.slice(), n: n };
}

function wordSearchNextBatch() {
    // Số từ mỗi đợt cố định theo mức; phiên cuối tự gom phần còn lại
    const batchCards = wsPool.slice(wsCursor, wsCursor + WS_LEVELS[wsLevel].words);
    if (batchCards.length === 0) { wsDone = true; checkComplete(); return; }
    wsBatchCount++;

    wsFoundSet = new Set();
    wsFoundCells = new Set();
    wsProcessing = false;

    const placement = buildWordSearchPlacement(batchCards);
    wsGrid = placement.grid;
    wsN = placement.n;
    wsBatchWords = placement.words.map(c => ({ front: String(c.front), back: c.back }));
    // Chỉ tính số từ THỰC SỰ dùng trong đợt; từ bị bớt nằm trong pool sẽ được đợt sau chọn.
    wsCursor += placement.words.length;

    renderWordSearchGrid();
    renderWordSearchList();
    const bc = document.getElementById("wsBatchCount");
    if (bc) bc.textContent = wsBatchCount;
    // Đưa lưới vào giữa màn hình (tránh bị khuất trên/dưới), trừ header dính
    requestAnimationFrame(() => requestAnimationFrame(() => wsScrollToGrid()));
}

// Cuộn sao cho toàn bộ bảng ô chữ vừa khít trong màn hình (không khuất trên/dưới).
function wsScrollToGrid() {
    const grid = document.getElementById("wsGrid");
    if (!grid) return;
    const head = document.querySelector(".app-topbar");
    const headH = head ? head.getBoundingClientRect().height : 0;
    const vh = window.innerHeight - headH;
    const r = grid.getBoundingClientRect();
    // Nếu bảng cao hơn màn hình: canh trên khít dưới header; còn không: canh giữa
    let top;
    if (r.height + headH >= window.innerHeight) top = window.scrollY + r.top - headH - Math.min(10, vh * 0.08);
    else top = window.scrollY + r.top - headH - Math.max(0, (vh - r.height) / 2);
    window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
}

function forceSingleWord(card, n) {
    const g = Array.from({ length: n }, () => new Array(n).fill(""));
    if (card.front.length > n) return g;
    const r0 = Math.floor((n - card.front.length) / 2);
    const c0 = Math.floor((n - card.front.length) / 2);
    for (let k = 0; k < card.front.length; k++) g[r0][c0 + k] = card.front[k].toLowerCase();
    return g;
}

// ===== ĐẶT TỪ: 8 hướng, cho trùng chữ =====
function placeWordSearchWords(words, n) {
    const grid = Array.from({ length: n }, () => new Array(n).fill(""));
    // 4 hướng nhưng LUÔN đọc trái→phải: ngang (→), dọc trên→xuống (↓),
    // chéo xuống phải (↘) và chéo LÊN phải (↗). Không có hướng nào viết ngược.
    const dirs = [[0, 1], [1, 0], [1, 1], [-1, 1]];
    const order = words.slice().sort((a, b) => b.front.length - a.front.length);

    for (const card of order) {
        const w = String(card.front).toLowerCase();
        let ok = false;
        for (let t = 0; t < 160 && !ok; t++) {
            const d = dirs[Math.floor(Math.random() * dirs.length)];
            const r0 = Math.floor(Math.random() * n), c0 = Math.floor(Math.random() * n);
            const r1 = r0 + d[0] * (w.length - 1), c1 = c0 + d[1] * (w.length - 1);
            if (r1 < 0 || r1 >= n || c1 < 0 || c1 >= n) continue;
            let conflict = false;
            for (let k = 0; k < w.length; k++) {
                const cur = grid[r0 + d[0] * k][c0 + d[1] * k];
                if (cur !== "" && cur !== w[k]) { conflict = true; break; }
            }
            if (conflict) continue;
            for (let k = 0; k < w.length; k++) grid[r0 + d[0] * k][c0 + d[1] * k] = w[k];
            ok = true;
        }
        if (!ok) return null;
    }
    return grid;
}

function renderWordSearchGrid() {
    const gridEl = document.getElementById("wsGrid");
    gridEl.innerHTML = "";
    wsCellEls = [];
    if (wsN <= 0) return;
    gridEl.style.gridTemplateColumns = `repeat(${wsN}, 1fr)`;
    for (let r = 0; r < wsN; r++) {
        wsCellEls[r] = [];
        for (let c = 0; c < wsN; c++) {
            if (!wsGrid[r][c]) wsGrid[r][c] = String.fromCharCode(65 + Math.floor(Math.random() * 26)).toLowerCase();
            const cell = document.createElement("div");
            cell.className = "ws-cell";
            cell.dataset.r = r; cell.dataset.c = c;
            cell.textContent = wsGrid[r][c].toUpperCase();
            gridEl.appendChild(cell);
            wsCellEls[r][c] = cell;
        }
    }
}

function renderWordSearchList() {
    const listEl = document.getElementById("wsWordList");
    listEl.innerHTML = "";
    wsBatchWords.forEach(c => {
        const item = document.createElement("div");
        item.className = "ws-word-item";
        item.dataset.key = c.front.toLowerCase();
        item.innerHTML = '<span class="ws-word-en">' + fcEsc(c.front) + '</span><span class="ws-word-vi"></span>';
        listEl.appendChild(item);
    });
}

function wsMarkWordInList(card) {
    const item = document.querySelector('#wsWordList .ws-word-item[data-key="' + card.front.toLowerCase().replace(/"/g, '\\"') + '"]');
    if (!item) return;
    item.classList.add("found-word");
    const en = item.querySelector(".ws-word-en");
    if (en) en.classList.add("strike");
    const vi = item.querySelector(".ws-word-vi");
    if (vi) vi.innerText = fcEsc(card.back || "");
}

// ===== KÉO CHỌN =====
function wsCellFromEvent(e) {
    const gridEl = document.getElementById("wsGrid");
    const rect = gridEl.getBoundingClientRect();
    const cell = document.elementFromPoint(e.clientX, e.clientY);
    if (!cell || !cell.classList || !cell.classList.contains("ws-cell")) return null;
    return cell;
}

function wsPointerDown(e) {
    if (wsProcessing || wsDone) return;
    const cell = wsCellFromEvent(e);
    if (!cell) return;
    e.preventDefault();
    wsDragging = true;
    wsStartCell = { r: +cell.dataset.r, c: +cell.dataset.c };
    wsCurCells = [];
    wsApplyPath([wsStartCell]);
}

function wsPointerMove(e) {
    if (!wsDragging) return;
    if (e.buttons === 0) { wsPointerUp(e); return; } // tay rời chuột
    const cell = wsCellFromEvent(e);
    if (!cell) return;
    const pt = { r: +cell.dataset.r, c: +cell.dataset.c };
    wsApplyPath(wsLineTo(pt));
}

function wsPointerUp(e) {
    if (!wsDragging) return;
    wsDragging = false;
    wsValidateSelection();
}

// Đường thẳng theo 1 trong 8 tia từ ô bắt đầu → ô đang rê
function wsLineTo(pt) {
    const dr = pt.r - wsStartCell.r, dc = pt.c - wsStartCell.c;
    if (dr === 0 && dc === 0) return [{ r: wsStartCell.r, c: wsStartCell.c }];
    const adr = Math.abs(dr), adc = Math.abs(dc);
    let sr, sc, k;
    if (adr === 0) { sr = 0; sc = dc > 0 ? 1 : -1; k = adc; }
    else if (adc === 0) { sr = dr > 0 ? 1 : -1; sc = 0; k = adr; }
    else { sr = dr > 0 ? 1 : -1; sc = dc > 0 ? 1 : -1; k = Math.min(adr, adc); }
    const cells = [];
    for (let i = 0; i <= k; i++) cells.push({ r: wsStartCell.r + sr * i, c: wsStartCell.c + sc * i });
    return cells;
}

function wsApplyPath(cells) {
    wsClearSelectStyles();
    wsCurCells = cells.filter(p =>
        p.r >= 0 && p.r < wsN && p.c >= 0 && p.c < wsN &&
        wsCellEls[p.r] && wsCellEls[p.r][p.c]);
    wsCurCells.forEach(p => {
        const el = wsCellEls[p.r][p.c];
        if (el && !el.classList.contains("found")) el.classList.add("sel");
    });
}

function wsClearSelectStyles() {
    if (!wsCellEls) return;
    for (let r = 0; r < wsN; r++) {
        if (!wsCellEls[r]) continue;
        for (let c = 0; c < wsN; c++) {
            const el = wsCellEls[r][c];
            if (el && el.classList.contains("sel")) el.classList.remove("sel");
        }
    }
}

function wsValidateSelection() {
    if (!wsCurCells || wsCurCells.length < 2) { wsClearSelectStyles(); return; }
    const cells = wsCurCells;
    const raw = cells.map(p => wsGrid[p.r][p.c]).join("");
    const word = raw.toLowerCase();
    const rev = word.split("").reverse().join("");

    let target = null;
    for (const c of wsBatchWords) {
        const key = c.front.toLowerCase();
        if (wsFoundSet.has(key)) continue;
        if (key === word || key === rev) { target = c; break; }
    }

    if (target) {
        wsFoundSet.add(target.front.toLowerCase());
        cells.forEach(p => {
            const el = wsCellEls[p.r][p.c];
            el.classList.remove("sel");
            if (!el.classList.contains("found")) {
                el.classList.add("found");
                wsFoundCells.add(p.r + "," + p.c);
            }
        });
        playSound(soundCorrect);
        wsMarkWordInList(target);
        gameProgress.wordsearch = Math.min((gameProgress.wordsearch || 0) + 1, wsPool.length);
        updateProgress();
        if (wsFoundSet.size >= wsBatchWords.length) {
            wsProcessing = true;
            setTimeout(wsFinishBatch, 300);
        }
    } else {
        wsProcessing = true;
        playSound(soundWrong);
        cells.forEach(p => {
            const el = wsCellEls[p.r][p.c];
            if (el && !el.classList.contains("found")) el.classList.add("bad");
        });
        setTimeout(() => {
            cells.forEach(p => {
                const el = wsCellEls[p.r][p.c];
                el.classList.remove("bad", "sel");
            });
            wsProcessing = false;
        }, 420);
    }
}

function wsFinishBatch() {
    wsProcessing = false;
    if (wsCursor >= wsPool.length) {
        // Đợt cuối, tìm xong toàn bộ → popup hoàn thành
        wsDone = true;
        checkComplete();
        return;
    }
    const banner = document.getElementById("wsBatchBanner");
    if (banner) {
        banner.style.display = "block";
        banner.innerText = "🎉 Xong đợt " + wsBatchCount + "! Lưới mới đang đến...";
    }
    setTimeout(() => {
        if (banner) banner.style.display = "none";
        wordSearchNextBatch();
    }, 1200);
}

