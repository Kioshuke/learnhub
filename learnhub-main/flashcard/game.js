const soundCorrect = new Audio("https://www.myinstants.com/media/sounds/correct-answer-sound-effect-19.mp3");
const soundWrong = new Audio("https://www.myinstants.com/media/sounds/2-incorrect-answer.mp3");
const soundHappy = new Audio("https://www.myinstants.com/media/sounds/correcto_Xgyp04B.mp3");
const soundlazer = new Audio("https://www.myinstants.com/media/sounds/weapon_1.mp3");
const soundwaring = new Audio("https://www.myinstants.com/media/sounds/family-fortunes-wrong-buzzer.mp3");
const soundclick = new Audio("https://www.myinstants.com/media/sounds/clicksoundeffect.mp3");

const soundGame2 = new Audio("bgm_match.mp3");     // Match
const soundGame3 = new Audio("bgm_blast.mp3");     // Blast
const soundGame4 = new Audio("bgm_defender.mp3");  // Defender
const soundGame1 = new Audio("bgm_flashcard.mp3"); // Flashcard
let SFX_VOLUME = 0.5;
let BGM_VOLUME = 1.0;
let audioUnlocked = false;

// Settings from localStorage
let settings = {
  bgmEnabled: true,
  sfxEnabled: true,
  speechEnabled: true
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

const bgm = {
    flashcard: soundGame1,
    match: soundGame2,
    blast: soundGame3,
    defender: soundGame4
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
    fillblank: 0
};

// Biến bổ trợ cho Defender
let defenderHP = 3;
let currentMonsterNode = null;
let enemyFallInterval = null;
let shuffledCards = [];

function playBGM(mode) {
    if (!settings.bgmEnabled) return;
    // tắt hết nhạc trước
    Object.values(bgm).forEach(s => {
        s.pause();
        s.currentTime = 0;
    });

    // bật đúng nhạc của mode
    const current = bgm[mode];
    if (current) {
        current.currentTime = 0;
        current.play().catch(()=>{});
    }
}
document.addEventListener("click", () => {
    if (!audioUnlocked) {
        allSounds.forEach(a => {
            a.volume = 0;
            a.play().then(() => {
                a.pause();
                a.currentTime = 0;

                // 🔥 FIX QUAN TRỌNG: trả lại volume
                if (Object.values(bgm).includes(a)) {
                    a.volume = BGM_VOLUME; // nhạc nền
                } else {
                    a.volume = SFX_VOLUME; // hiệu ứng
                }

            }).catch(() => {});
        });
        audioUnlocked = true;
    }
});
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
    const currentProg = gameProgress[currentMode] || 0;
    const percent = total > 0 ? Math.min((currentProg / total) * 100, 100) : 0;
    
    // 2. Cập nhật UI App dùng chung (Thanh trên cùng)
    const pText = document.getElementById("progressText");
    const pInner = document.getElementById("progressInner");
    if (pText) pText.innerText = `${currentProg} / ${total}`;
    if (pInner) pInner.style.width = percent + "%";

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
    // Check theo mode hiện tại
    if (gameProgress[currentMode] >= total && total > 0) {
        const popup = document.getElementById("popup");
        if (popup) {
            popup.classList.add("show");
            playSound(soundHappy);
        }
    }
}

function switchMode(mode) {
    currentMode = mode;

    stopAllSounds();

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
            (mode === 'defender' && txt.includes('phòng'))) {
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

    // 👉 QUAN TRỌNG: delay 1 tick cho chắc chắn audio ready
    setTimeout(() => {
        if (mode === 'flashcard') initFlashcard();
        else if (mode === 'match') initMatch();
        else if (mode === 'blast') initBlast();
        else if (mode === 'fillblank') initFillBlank();
        else if (mode === 'defender') initDefender();
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
    } else {
        switchMode(currentMode);
    }
}

////////////////////////////////////////////////////////////////////////////////
// 🟢 FLASHCARD
////////////////////////////////////////////////////////////////////////////////
let current = 0;
let viewedFlashcards = new Set();

function markFlashcardViewed(index) {
    if (!cards[index]) return;
    viewedFlashcards.add(index);
    gameProgress.flashcard = Math.min(viewedFlashcards.size, total);
    updateProgress();
}

function initFlashcard() {
    playBGM("flashcard");
    current = 0;
    viewedFlashcards = new Set();
    markFlashcardViewed(current);
    const inner = document.querySelector(".flash-inner");
    if (inner) inner.classList.remove("flipped");
    showCard();
}

function showCard() {
    if (!cards[current]) return;
    const card = cards[current];
    document.getElementById("front").innerText = card.front;
    document.getElementById("back").innerText = card.back;
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

    const batchCards = matchPool.slice(matchIndex, matchIndex + 10);
    matchIndex += 10;

    if (batchCards.length === 0) {
        grid.innerHTML = "<h2 style='grid-column: 1/-1; text-align: center; color: #4f46e5;'>🎉 Hoàn thành xuất sắc!</h2>";
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
let blastPool = [], blastIndex = 0, streak = 0, currentQuestion = null;

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

    gameProgress.blast = 0;
    updateProgress();
    streak = 0;
    const scoreEl = document.getElementById("score");
    if(scoreEl) scoreEl.innerHTML = `Streak: <span class="streak-badge">0</span> �`;
    
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
        
        setTimeout(() => {
            btn.classList.remove("wrong");
            btn.style.animation = "";
        }, 300);
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
        utterance.lang = 'en-US';
        utterance.rate = 0.9;
        window.speechSynthesis.speak(utterance);
    }
}

// Bàn phím & Cử chỉ
document.addEventListener('keydown', (e) => {
    if (currentMode === 'flashcard') {
        if (e.key === "ArrowLeft") prevCard();
        if (e.key === "ArrowRight") nextCard();
        if (e.key === " " || e.key === "ArrowUp") flipCard();
    }
});

let touchstartX = 0, touchendX = 0;
const gestureZone = document.getElementById('flashcard');
if (gestureZone) {
    gestureZone.addEventListener('touchstart', e => { touchstartX = e.changedTouches[0].screenX; });
    gestureZone.addEventListener('touchend', e => {
        touchendX = e.changedTouches[0].screenX;
        if (touchendX < touchstartX - 50) nextCard();
        if (touchendX > touchstartX + 50) prevCard();
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

    // Tắt nhạc các trò khác, bật nhạc Defender
    Object.values(bgm).forEach(s => { s.pause(); s.currentTime = 0; });
    if (settings.bgmEnabled && bgm.defender) bgm.defender.play().catch(() => {});

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
    if (settings.bgmEnabled && bgm.defender) bgm.defender.play().catch(() => {});
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
let fillLangDirection = 'en_to_vn'; // 'en_to_vn' or 'vn_to_en'
let fillHintEnabled = false;

// Hàm bỏ dấu tiếng Việt
function removeVietnameseDiacritics(str) {
    str = str.toLowerCase();
    str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, "a");
    str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, "e");
    str = str.replace(/ì|í|ị|ỉ|ĩ/g, "i");
    str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, "o");
    str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, "u");
    str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, "y");
    str = str.replace(/đ/g, "d");
    return str;
}

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
    playBGM("blast");
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
    document.getElementById("fillInput").value = "";
    document.getElementById("fillFeedback").innerText = "";
    document.getElementById("hintDisplay").innerText = "";
    fillLangDirection = 'en_to_vn';
    fillHintEnabled = false;
    document.getElementById("langToggle").innerText = "EN → VN";
    document.getElementById("hintToggle").innerText = "Tắt";

    loadNextFillQuestion();
}

function toggleLanguage() {
    fillLangDirection = fillLangDirection === 'en_to_vn' ? 'vn_to_en' : 'en_to_vn';
    document.getElementById("langToggle").innerText = fillLangDirection === 'en_to_vn' ? "EN → VN" : "VN → EN";
    // Reload current question with new direction
    if (currentFillCard) {
        showFillQuestion(currentFillCard);
    }
}

function toggleHint() {
    fillHintEnabled = !fillHintEnabled;
    document.getElementById("hintToggle").innerText = fillHintEnabled ? "Bật" : "Tắt";
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

    if (fillLangDirection === 'en_to_vn') {
        // Show word count for Vietnamese
        const wordCount = currentFillCard.back.split(' ').length;
        document.getElementById("hintDisplay").innerText = `Gợi ý: ${wordCount} từ`;
    } else {
        // Show first letter for English
        const firstLetter = currentFillCard.front.charAt(0).toUpperCase();
        document.getElementById("hintDisplay").innerText = `Gợi ý: Bắt đầu bằng "${firstLetter}"`;
    }
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

function showFillQuestion(card) {
    const questionEl = document.getElementById("fillQuestion");
    const inputEl = document.getElementById("fillInput");
    const feedbackEl = document.getElementById("fillFeedback");

    if (fillLangDirection === 'en_to_vn') {
        questionEl.innerText = card.front;
        inputEl.placeholder = "Nhập nghĩa tiếng Việt (không dấu)...";
    } else {
        questionEl.innerText = card.back;
        inputEl.placeholder = "Nhập từ tiếng Anh...";
    }

    inputEl.value = "";
    feedbackEl.innerText = "";

    if (fillHintEnabled) {
        showHint();
    } else {
        document.getElementById("hintDisplay").innerText = "";
    }
}

function checkFillAnswer() {
    if (!currentFillCard) return;

    const inputEl = document.getElementById("fillInput");
    const feedbackEl = document.getElementById("fillFeedback");
    const userAnswer = inputEl.value.trim().toLowerCase();

    const correctAnswer = fillLangDirection === 'en_to_vn' ? currentFillCard.back.toLowerCase() : currentFillCard.front.toLowerCase();

    // For Vietnamese answers, compare without diacritics
    let isCorrect = false;
    if (fillLangDirection === 'en_to_vn') {
        // Vietnamese answer - compare without diacritics
        isCorrect = removeVietnameseDiacritics(userAnswer) === removeVietnameseDiacritics(correctAnswer);
    } else {
        // English answer - exact match
        isCorrect = userAnswer === correctAnswer;
    }

    if (isCorrect) {
        // Correct
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
        // Wrong
        playSound(soundWrong);
        feedbackEl.innerText = `Sai! Đáp án đúng: ${fillLangDirection === 'en_to_vn' ? currentFillCard.back : currentFillCard.front}`;
        feedbackEl.style.color = "#ef4444";
        inputEl.style.animation = "shake 0.3s";
        setTimeout(() => {
            inputEl.style.animation = "";
        }, 300);
    }
}

function handleFillKeypress(event) {
    if (event.key === "Enter") {
        checkFillAnswer();
    }
}