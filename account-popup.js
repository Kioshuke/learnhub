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
      current.classList.add("cc-leave");
      setTimeout(function () {
        current.classList.remove("cc-pane-active", "cc-leave");
      }, 300);
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
    try { lhToast(message, { type: "info", title: "Giao diện", sound: false, durationMs: 2500 }); } catch (e) {}
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
