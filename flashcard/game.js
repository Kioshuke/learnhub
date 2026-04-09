const soundCorrect = new Audio("https://www.myinstants.com/media/sounds/correct-answer-sound-effect-19.mp3");
const soundWrong = new Audio("https://www.myinstants.com/media/sounds/2-incorrect-answer.mp3");
const soundHappy = new Audio("https://www.myinstants.com/media/sounds/correcto_Xgyp04B.mp3");
// ===== GLOBAL =====
let currentMode = "flashcard";
let progress = 0;
let total = cards.length;

function updateProgress() {
    const percent = Math.min((progress / total) * 100, 100);
    const pText = document.getElementById("progressText");
    const pInner = document.getElementById("progressInner");
    if (pText) pText.innerText = progress + " / " + total;
    if (pInner) pInner.style.width = percent + "%";
}

// Tìm đến hàm checkComplete() trong game.js, thay bằng đoạn này:
function checkComplete() {
    if (progress >= total) {
        const popup = document.getElementById("popup");
        if (popup) {
            // 1. Hiện Popup
            popup.classList.add("show");
            
            // 2. PHÁT SOUND HẠNH PHÚC NGAY
            soundHappy.currentTime = 0; // Reset về đầu
            soundHappy.play().catch(e => console.log("Sound hớn hở chưa sẵn sàng"));

            // 3. BẮN PHÁO GIẤY RÌNH RANG
            startConfetti();
        }
    }
}

function switchMode(mode) {
    currentMode = mode;
    
    // Cập nhật trạng thái nút Menu (active-nav cho đẹp)
    document.querySelectorAll("#menu button").forEach(btn => {
        btn.classList.remove("active-nav");
        // Kiểm tra chữ trên nút để active đúng (Học, Ghép thẻ, Blast)
        const txt = btn.innerText.toLowerCase();
        if ((mode === 'flashcard' && txt.includes('học')) || 
            (mode === 'match' && txt.includes('ghép')) || 
            (mode === 'blast' && txt.includes('blast'))) {
            btn.classList.add("active-nav");
        }
    });

    // Hiện/Ẩn các Mode
    document.querySelectorAll(".mode").forEach(el => el.classList.remove("active"));
    const targetMode = document.getElementById(mode);
    if (targetMode) targetMode.classList.add("active");

    if (mode === 'match') {
        initMatch(); 
    } else if (mode === "flashcard") {
        initFlashcard();
    } else if (mode === "blast") {
        initBlast();
    }
}

function shuffle(arr) { return arr.sort(() => Math.random() - 0.5); }
function random(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function restartGame() {
    document.getElementById("popup").classList.remove("show");
    progress = 0;
    updateProgress();
    switchMode(currentMode);
}

////////////////////////////////////////////////////////////////////////////////
// 🟢 FLASHCARD
////////////////////////////////////////////////////////////////////////////////
let current = 0;

function initFlashcard() {
    current = 0;
    progress = 0;
    updateProgress();
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
    if (progress >= total) return;
    const cardEl = document.querySelector(".flashcard");
    cardEl.classList.add("slide-out-left");

    setTimeout(() => {
        current = (current + 1) % cards.length;
        progress = Math.min(progress + 1, total);
        updateProgress();
        checkComplete();
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
    cardEl.classList.add("slide-out-left");

    setTimeout(() => {
        current = (current - 1 + cards.length) % cards.length;
        showCard();
        document.querySelector(".flash-inner").classList.remove("flipped");
        cardEl.classList.remove("slide-out-left");
        cardEl.classList.add("slide-in-right");

        setTimeout(() => { cardEl.classList.add("slide-active"); }, 20);
        setTimeout(() => { cardEl.classList.remove("slide-in-right", "slide-active"); }, 350);
    }, 200);
}

////////////////////////////////////////////////////////////////////////////////
// 🟣 MATCH
////////////////////////////////////////////////////////////////////////////////
let matchPool = [], matchIndex = 0, selected = [], isChecking = false;

function initMatch() {
    const startScreen = document.getElementById("match-start-screen");
    const grid = document.getElementById("matchGrid");
    if (startScreen && grid) {
        startScreen.style.display = "block";
        grid.style.display = "none";
    }
}

function startMatchGame() {
    document.getElementById("match-start-screen").style.display = "none";
    document.getElementById("matchGrid").style.display = "grid";
    matchPool = shuffle([...cards]);
    matchIndex = 0; 
    progress = 0; 
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
    if (isChecking || el.classList.contains("hidden") || el.classList.contains("selected")) return;

    el.classList.add("selected");
    selected.push({ card, el });

    if (selected.length === 2) {
        isChecking = true;
        const [a, b] = selected;

        if (a.card.id === b.card.id) {
            progress = Math.min(progress + 1, total);
            updateProgress(); 
            checkComplete();
            soundCorrect.play().catch(() => {});
            a.el.classList.add("correct"); 
            b.el.classList.add("correct");

            setTimeout(() => {
                a.el.classList.add("hidden"); 
                b.el.classList.add("hidden");
                if (document.querySelectorAll(".match-card:not(.hidden)").length === 0) {
                    loadNextBatch();
                }
                isChecking = false;
            }, 300);
        } else {
            soundWrong.play().catch(() => {});
            a.el.classList.add("wrong"); 
            b.el.classList.add("wrong");
            setTimeout(() => {
                a.el.classList.remove("wrong", "selected");
                b.el.classList.remove("wrong", "selected");
                isChecking = false;
            }, 400);
        }
        selected = [];
    }
}

////////////////////////////////////////////////////////////////////////////////
// 🔴 BLAST - PHIÊN BẢN STREAK SIÊU CẤP
////////////////////////////////////////////////////////////////////////////////
let blastPool = [], blastIndex = 0, streak = 0, currentQuestion = null;

function initBlast() {
    progress = 0;
    updateProgress();
    streak = 0;
    const scoreEl = document.getElementById("score");
    // Khởi tạo giao diện streak có badge
    if(scoreEl) scoreEl.innerHTML = `Streak: <span class="streak-badge">0</span> 🔥`;
    
    blastPool = shuffle([...cards]); 
    blastIndex = 0;
    nextQuestion();
}

function nextQuestion() {
    if (blastIndex >= blastPool.length) {
        checkComplete();
        return;
    }

    const correct = blastPool[blastIndex];
    blastIndex++;

    let options = [correct.back];
    while (options.length < 4) {
        const rand = random(cards).back;
        if (!options.includes(rand)) options.push(rand);
    }
    options = shuffle(options);

    currentQuestion = { question: correct.front, answer: correct.back };
    document.getElementById("question").innerText = currentQuestion.question;
    const optDiv = document.getElementById("options");
    optDiv.innerHTML = "";
    
    options.forEach(opt => {
        const btn = document.createElement("button");
        btn.innerText = opt;
        btn.onclick = () => answerBlast(opt, btn);
        optDiv.appendChild(btn);
    });
    speak(correct.front);
}

function answerBlast(choice, btn) {
    if (progress >= total) return;
    const buttons = document.querySelectorAll("#options button");
    const scoreEl = document.getElementById("score");

    if (choice !== currentQuestion.answer) {
        soundWrong.currentTime = 0;
        soundWrong.play().catch(() => {});
        btn.classList.add("wrong");
        
        // Reset streak về 0 - Hiện icon hụt hẫng
        streak = 0;
        if(scoreEl) scoreEl.innerHTML = `Streak: <span class="streak-badge dead">0</span> 💀`;
        
        setTimeout(() => btn.classList.remove("wrong"), 400);
        return;
    }

    // Nếu trả lời đúng
    soundCorrect.currentTime = 0;
    soundCorrect.play().catch(() => {});
    progress = Math.min(progress + 1, total);
    updateProgress();
    checkComplete();

    streak++;
    btn.classList.add("correct");
    buttons.forEach(b => b.disabled = true);

    // HỆ THỐNG ICON TIẾN HÓA THEO STREAK
    if(scoreEl) {
        let icon = "🔥"; // Mặc định dưới 10
        let levelClass = "active";

        if (streak >= 50) {
            icon = "🚀🌌"; // Trên 50: Bay vào vũ trụ
            levelClass = "ultra-streak";
        } else if (streak >= 20) {
            icon = "⚡⚡"; // Trên 20: Sét đánh ngang tai
            levelClass = "mega-streak";
        } else if (streak >= 10) {
            icon = "🌟"; // Trên 10: Tỏa sáng
            levelClass = "super-streak";
        }

        scoreEl.innerHTML = `Streak: <span class="streak-badge ${levelClass}">${streak}</span> ${icon}`;
    }

    setTimeout(() => { nextQuestionSmooth(); }, 400);
}

function nextQuestionSmooth() {
    const q = document.getElementById("question");
    const opt = document.getElementById("options");
    if(q) q.style.opacity = "0";
    if(opt) opt.style.opacity = "0";
    
    setTimeout(() => {
        nextQuestion();
        if(q) q.style.opacity = "1";
        if(opt) opt.style.opacity = "1";
    }, 300);
}

function speak(text) {
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
// Chạy mặc định
switchMode('flashcard');
