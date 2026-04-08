// ===== GLOBAL =====
let currentMode = "flashcard";
let progress = 0;
let total = cards.length;

// ===== SWITCH MODE =====
function switchMode(mode) {
  currentMode = mode;

  // 1. Ẩn/Hiện các trang (Giữ nguyên code cũ của mă)
  document.querySelectorAll(".mode").forEach(el => el.classList.remove("active"));
  document.getElementById(mode).classList.add("active");

  // 2. CHÈN THÊM ĐOẠN NÀY: Xử lý thắp sáng nút Menu
  const buttons = document.querySelectorAll("#menu button");
  buttons.forEach(btn => btn.classList.remove("active-nav")); // Tắt đèn tất cả các nút

  // Thắp sáng đúng cái nút vừa bấm (0: Học, 1: Ghép thẻ, 2: Blast)
  if (mode === "flashcard") buttons[0].classList.add("active-nav");
  if (mode === "match") buttons[1].classList.add("active-nav");
  if (mode === "blast") buttons[2].classList.add("active-nav");

  // 3. Khởi tạo game (Giữ nguyên code cũ)
  if (mode === "flashcard") initFlashcard();
  if (mode === "match") initMatch();
  if (mode === "blast") initBlast();
}

// ===== UTILS =====
function shuffle(arr) {
  return arr.sort(() => Math.random() - 0.5);
}

function random(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ===== PROGRESS =====
function updateProgress() {
  const percent = Math.min((progress / total) * 100, 100);

  document.getElementById("progressText").innerText =
    progress + " / " + total;

  document.getElementById("progressInner").style.width =
    percent + "%";
}

function checkComplete() {
  if (progress >= total) {
    document.getElementById("popup").classList.add("show");
  }
}

function restartGame() {
  document.getElementById("popup").classList.remove("show");

  progress = 0;
  updateProgress();

  if (currentMode === "flashcard") initFlashcard();
  if (currentMode === "match") initMatch();
  if (currentMode === "blast") initBlast();
}

////////////////////////////////////////////////////////////////////////////////
// 🟢 FLASHCARD
////////////////////////////////////////////////////////////////////////////////

let current = 0;

function initFlashcard() {
  current = 0;

  progress = 0;
  updateProgress();

  document.querySelector(".flash-inner").classList.remove("flipped");

  showCard();
}

function showCard() {
  const card = cards[current];

  document.getElementById("front").innerText = card.front;
  document.getElementById("back").innerText = card.back;
}

function flipCard() {
  if (progress >= total) return;

  document.querySelector(".flash-inner").classList.toggle("flipped");
}

function nextCard() {
  if (progress >= total) return;

  const cardEl = document.querySelector(".flashcard");

  // 👉 card cũ trượt sang trái
  cardEl.classList.add("slide-out-left");

  setTimeout(() => {
    current = (current + 1) % cards.length;

    progress = Math.min(progress + 1, total);
    updateProgress();
    checkComplete();

    showCard();

    document.querySelector(".flash-inner").classList.remove("flipped");

    // reset trạng thái
    cardEl.classList.remove("slide-out-left");
    cardEl.classList.add("slide-in-right");

    setTimeout(() => {
      cardEl.classList.add("slide-active");
    }, 20);

    // dọn class sau animation
    setTimeout(() => {
      cardEl.classList.remove("slide-in-right", "slide-active");
    }, 350);

  }, 200);
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

    setTimeout(() => {
      cardEl.classList.add("slide-active");
    }, 20);

    setTimeout(() => {
      cardEl.classList.remove("slide-in-right", "slide-active");
    }, 350);

  }, 200);
}

////////////////////////////////////////////////////////////////////////////////
// 🟣 MATCH
////////////////////////////////////////////////////////////////////////////////

let matchPool = [];
let matchIndex = 0;
let selected = [];
let isChecking = false;

function initMatch() {
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
    grid.innerHTML = "<h2>🎉 Hoàn thành!</h2>";
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
  if (progress >= total) return;

  if (
    isChecking ||
    selected.length >= 2 ||
    el.classList.contains("hidden") ||
    selected.some(s => s.el === el)
  ) return;

  el.classList.add("selected");
  selected.push({ card, el });

  if (selected.length === 2) {
    isChecking = true;

    const [a, b] = selected;

    if (a.card.id === b.card.id) {

      progress = Math.min(progress + 1, total);
      updateProgress();
      checkComplete();

      a.el.classList.add("correct");
      b.el.classList.add("correct");

      setTimeout(() => {
        a.el.classList.add("hidden");
        b.el.classList.add("hidden");

        checkBatchDone();
        isChecking = false;
      }, 300);

    } else {
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

function checkBatchDone() {
  const remain = document.querySelectorAll(".match-card:not(.hidden)");

  if (remain.length === 0) {
    setTimeout(() => {
      loadNextBatch();
    }, 500);
  }
}

////////////////////////////////////////////////////////////////////////////////
// 🔴 BLAST
////////////////////////////////////////////////////////////////////////////////

let streak = 0;
let currentQuestion = null;

function initBlast() {
  progress = 0;
  updateProgress();

  streak = 0; // ✅ reset đúng
  document.getElementById("score").innerText = "Streak: 0 🔥";

  nextQuestion();
}

function nextQuestion() {
  const correct = random(cards);

  let options = [correct.back];

  while (options.length < 4) {
    const rand = random(cards).back;
    if (!options.includes(rand)) options.push(rand);
  }

  options = shuffle(options);

  currentQuestion = {
    question: correct.front,
    answer: correct.back
  };

  document.getElementById("question").innerText = currentQuestion.question;

  const optionsDiv = document.getElementById("options");
  optionsDiv.innerHTML = "";

  options.forEach(opt => {
    const btn = document.createElement("button");
    btn.innerText = opt;

    btn.onclick = () => answerBlast(opt, btn);

    optionsDiv.appendChild(btn);
  });
}

function answerBlast(choice, btn) {
  if (progress >= total) return;

  const buttons = document.querySelectorAll("#options button");

  // ❌ chọn sai
  if (choice !== currentQuestion.answer) {
    btn.classList.add("wrong");

    streak = 0;
    document.getElementById("score").innerText = "Streak: 0 💀";

    setTimeout(() => {
      btn.classList.remove("wrong");
    }, 400);

    return;
  }

  // ✔ chọn đúng
  progress = Math.min(progress + 1, total);
  updateProgress();
  checkComplete();

  streak++; // ✅ đúng phải tăng streak

  btn.classList.add("correct");

  buttons.forEach(b => b.disabled = true);

  document.getElementById("score").innerText =
    "Streak: " + streak + " 🔥";

  setTimeout(() => {
    nextQuestionSmooth();
  }, 400);
}
function nextQuestionSmooth() {
  const q = document.getElementById("question");
  const opt = document.getElementById("options");

  q.style.opacity = "0";
  opt.style.opacity = "0";

  setTimeout(() => {
    nextQuestion();

    q.style.opacity = "1";
    opt.style.opacity = "1";
  }, 300);
}

////////////////////////////////////////////////////////////////////////////////

// AUTO START
switchMode('flashcard');;