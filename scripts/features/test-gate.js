/**
 * test-gate.js — Cổng mở đề: GIỚI HẠN SỐ LẦN LÀM + MẬT KHẨU BÀI LÀM.
 * ---------------------------------------------------------------------------
 * Dùng chung cho 2 engine làm bài: pages/cauhoi/filetest.html và
 * pages/cauhoi/questionenglish.html.
 *
 * Cách dùng (sau khi đã đọc xong cấu hình đề từ get_test_content):
 *
 *   const ok = await openTestGate({
 *     supabase, testDe: TEST_DE,
 *     maxAttempts: examConfig.maxAttempts,   // 0 = không giới hạn
 *     hasPassword: examConfig.hasPassword,   // true = đề có mật khẩu
 *     testName: examMeta.name
 *   });
 *   if (!ok) return;   // học sinh bấm huỷ / đã hết lượt / không kiểm tra được
 *
 * Nguyên tắc:
 *  - Cả 2 cấu hình đều TẮT (maxAttempts = 0, hasPassword = false) → trả về true
 *    ngay, KHÔNG gọi RPC, KHÔNG hiện gì (giữ nguyên hành vi cũ).
 *  - Số lượt đếm ở SERVER (RPC test_attempt_status dùng auth.uid()), mỗi lần
 *    nộp bài = 1 lượt. Client không tự quyết định số lượt.
 *  - Mật khẩu so sánh ở SERVER (RPC verify_test_password); cột password không
 *    bao giờ được gửi xuống trình duyệt của học sinh.
 */
"use strict";

const STYLE_ID = "lh-test-gate-style";

const GATE_CSS = `
.lh-gate{position:fixed;inset:0;z-index:3000;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(15,23,42,.58);backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px);font-family:inherit}
.lh-gate-card{width:100%;max-width:470px;max-height:88vh;overflow:auto;background:#fff;color:#0f172a;border-radius:20px;padding:26px 26px 22px;box-shadow:0 24px 60px rgba(15,23,42,.35);animation:lh-gate-in .18s ease-out}
@keyframes lh-gate-in{from{opacity:0;transform:translateY(8px) scale(.985)}to{opacity:1;transform:none}}
.lh-gate-icon{width:52px;height:52px;border-radius:15px;display:grid;place-items:center;background:linear-gradient(135deg,#dbeafe,#eff6ff);color:#1d4ed8;font-size:20px;margin-bottom:14px}
.lh-gate-title{margin:0 0 4px;font-size:19px;font-weight:800;letter-spacing:-.2px;line-height:1.25}
.lh-gate-sub{margin:0 0 16px;font-size:13px;color:#64748b;line-height:1.4;word-break:break-word}
.lh-gate-line{display:flex;gap:10px;align-items:flex-start;padding:11px 13px;border-radius:12px;background:#f1f5f9;color:#334155;font-size:13.5px;line-height:1.5;margin-bottom:9px}
.lh-gate-line i{color:#2563eb;margin-top:3px;width:16px;text-align:center;flex-shrink:0}
.lh-gate-line b{color:#1d4ed8}
.lh-gate-line.warn{background:#fef2f2;color:#b91c1c}
.lh-gate-line.warn i{color:#dc2626}
.lh-gate-line.warn b{color:#991b1b}
.lh-gate-pass{margin-top:14px}
.lh-gate-pass label{display:block;font-size:12.5px;font-weight:700;color:#475569;margin-bottom:6px}
.lh-gate-input{width:100%;padding:11px 14px;border:1.5px solid #e2e8f0;border-radius:11px;font-size:14px;font-family:inherit;outline:none;transition:border-color .15s,box-shadow .15s;box-sizing:border-box;background:#fff;color:#0f172a}
.lh-gate-input:focus{border-color:#2563eb;box-shadow:0 0 0 3px rgba(37,99,235,.14)}
.lh-gate-err{display:none;margin-top:8px;font-size:12.5px;font-weight:600;color:#dc2626}
.lh-gate-actions{display:flex;gap:10px;justify-content:flex-end;margin-top:20px;flex-wrap:wrap}
.lh-gate-btn{border:none;cursor:pointer;border-radius:11px;padding:11px 20px;font-family:inherit;font-size:13.5px;font-weight:700;background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#fff;box-shadow:0 6px 16px rgba(37,99,235,.28);transition:filter .15s,opacity .15s}
.lh-gate-btn:hover{filter:brightness(1.06)}
.lh-gate-btn:disabled{opacity:.6;cursor:progress;box-shadow:none}
.lh-gate-btn.ghost{background:#f1f5f9;color:#475569;box-shadow:none}
.lh-gate-btn.ghost:hover{filter:none;background:#e2e8f0}
body.dark-mode .lh-gate-card{background:#0f172a;color:#e2e8f0}
body.dark-mode .lh-gate-title{color:#f1f5f9}
body.dark-mode .lh-gate-sub{color:#94a3b8}
body.dark-mode .lh-gate-line{background:#1e293b;color:#cbd5e1}
body.dark-mode .lh-gate-line b{color:#93c5fd}
body.dark-mode .lh-gate-line.warn{background:#3f1d1d;color:#fca5a5}
body.dark-mode .lh-gate-line.warn b{color:#fecaca}
body.dark-mode .lh-gate-pass label{color:#cbd5e1}
body.dark-mode .lh-gate-input{background:#1e293b;border-color:#334155;color:#e2e8f0}
body.dark-mode .lh-gate-btn.ghost{background:#1e293b;color:#cbd5e1}
body.dark-mode .lh-gate-btn.ghost:hover{background:#334155}
`;

function ensureStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = GATE_CSS;
  document.head.appendChild(style);
}

function esc(value) {
  return String(value == null ? "" : value).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[c]);
}

/** Lấy trạng thái lượt làm từ server. Trả null nếu RPC lỗi / chưa chạy migration. */
export async function fetchTestAttemptStatus(supabase, testDe) {
  try {
    const { data, error } = await supabase.rpc("test_attempt_status", { p_de: testDe });
    if (error) throw error;
    if (!data || data.ok !== true) throw new Error((data && data.error) || "status_failed");
    return data;
  } catch (e) {
    console.warn("[test-gate] test_attempt_status lỗi:", e);
    return null;
  }
}

/**
 * Hiện cổng chặn trước khi làm bài.
 * @returns {Promise<boolean>} true = được vào làm bài, false = bị chặn/huỷ.
 */
export async function openTestGate(options = {}) {
  const {
    supabase,
    testDe,
    hasPassword = false,
    maxAttempts = 0,
    testName = ""
  } = options;

  const attemptsOn = Number(maxAttempts) > 0;
  if (!supabase || (!attemptsOn && !hasPassword)) return true;

  ensureStyle();

  const status = await fetchTestAttemptStatus(supabase, testDe);

  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "lh-gate";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-labelledby", "lhGateTitle");

    let bodyHtml = "";
    let canStart = true;

    if (!status) {
      // Không gọi được server → không thể kiểm tra lượt/mật khẩu.
      canStart = false;
      bodyHtml =
        '<div class="lh-gate-line warn"><i class="fa-solid fa-triangle-exclamation"></i><span>' +
        "Không kiểm tra được trạng thái bài làm. Vui lòng tải lại trang để thử lại." +
        "</span></div>";
    } else {
      const used = Number(status.attempts_used) || 0;
      const max = Number(status.max_attempts) || 0;
      const remaining = status.remaining == null ? null : Math.max(0, Number(status.remaining) || 0);
      const authenticated = status.authenticated === true;
      const needPass = status.has_password === true;

      if (max > 0) {
        if (!authenticated) {
          canStart = false;
          bodyHtml +=
            '<div class="lh-gate-line warn"><i class="fa-solid fa-user-lock"></i><span>' +
            "Bài làm này giới hạn <b>" + max + " lượt làm</b> nên bạn cần <b>đăng nhập</b> để làm bài." +
            "</span></div>";
        } else if ((remaining || 0) <= 0) {
          canStart = false;
          bodyHtml +=
            '<div class="lh-gate-line warn"><i class="fa-solid fa-ban"></i><span>' +
            "Bạn đã dùng hết <b>" + max + " lượt làm</b> của bài này (đã nộp " + used + " lần)." +
            "</span></div>";
        } else {
          bodyHtml +=
            '<div class="lh-gate-line"><i class="fa-solid fa-repeat"></i><span>' +
            "Bài làm này có <b>" + max + " lượt làm</b>. Số lượt làm còn lại của bạn là <b>" +
            remaining + "</b>." +
            "</span></div>";
        }
      }

      if (needPass && canStart) {
        bodyHtml +=
          '<div class="lh-gate-line"><i class="fa-solid fa-lock"></i><span>' +
          "Bài làm này được bảo vệ bằng <b>mật khẩu</b>, vui lòng nhập mật khẩu để tiếp tục." +
          "</span></div>";
        bodyHtml +=
          '<div class="lh-gate-pass">' +
          '<label for="lhGatePassword">Mật khẩu bài làm</label>' +
          '<input id="lhGatePassword" class="lh-gate-input" type="password" autocomplete="off" placeholder="Nhập mật khẩu…">' +
          '<div class="lh-gate-err" id="lhGateError"></div>' +
          "</div>";
      }
    }

    overlay.innerHTML =
      '<div class="lh-gate-card">' +
      '<div class="lh-gate-icon"><i class="fa-solid ' + (hasPassword ? "fa-lock" : "fa-repeat") + '"></i></div>' +
      '<h3 class="lh-gate-title" id="lhGateTitle">' + (canStart ? "Trước khi làm bài" : "Không thể làm bài") + "</h3>" +
      (testName ? '<p class="lh-gate-sub">' + esc(testName) + "</p>" : "") +
      bodyHtml +
      '<div class="lh-gate-actions">' +
      (canStart
        ? '<button type="button" class="lh-gate-btn" id="lhGateStart">Bắt đầu làm bài</button>'
        : '<button type="button" class="lh-gate-btn ghost" id="lhGateReload">Tải lại trang</button>') +
      "</div>" +
      "</div>";

    document.body.appendChild(overlay);

    const reloadBtn = overlay.querySelector("#lhGateReload");
    if (reloadBtn) {
      reloadBtn.addEventListener("click", () => window.location.reload());
      resolve(false);
      return;
    }

    const startBtn = overlay.querySelector("#lhGateStart");
    const passInput = overlay.querySelector("#lhGatePassword");
    const errEl = overlay.querySelector("#lhGateError");

    let busy = false;
    const showErr = (msg) => {
      if (!errEl) return;
      errEl.textContent = msg;
      errEl.style.display = "block";
    };
    const resetBtn = () => {
      if (!startBtn) return;
      startBtn.disabled = false;
      startBtn.textContent = "Bắt đầu làm bài";
    };

    async function tryStart() {
      if (busy) return;
      if (errEl) errEl.style.display = "none";

      const needPass = !!status.has_password;
      if (needPass) {
        const value = passInput ? passInput.value.trim() : "";
        if (!value) {
          showErr("Vui lòng nhập mật khẩu để tiếp tục.");
          if (passInput) passInput.focus();
          return;
        }
        busy = true;
        if (startBtn) { startBtn.disabled = true; startBtn.textContent = "Đang kiểm tra…"; }
        try {
          const { data, error } = await supabase.rpc("verify_test_password", {
            p_de: testDe,
            p_password: value
          });
          if (error) throw error;
          if (!data || data.ok !== true) throw new Error("verify_failed");
          if (data.valid !== true) {
            showErr("Mật khẩu không đúng, vui lòng thử lại.");
            busy = false;
            resetBtn();
            if (passInput) { passInput.select(); passInput.focus(); }
            return;
          }
        } catch (e) {
          console.warn("[test-gate] verify_test_password lỗi:", e);
          showErr("Không kiểm tra được mật khẩu. Vui lòng thử lại.");
          busy = false;
          resetBtn();
          return;
        }
        busy = false;
      }

      overlay.remove();
      resolve(true);
    }

    if (startBtn) startBtn.addEventListener("click", tryStart);
    if (passInput) {
      passInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") { e.preventDefault(); tryStart(); }
      });
      setTimeout(() => { try { passInput.focus(); } catch (e) {} }, 60);
    }
  });
}
