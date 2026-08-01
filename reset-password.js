// ============================================================================
// reset-password.js
// ----------------------------------------------------------------------------
// Dùng chung cho mọi trang: hiển thị form đặt lại mật khẩu khi user bấm link
// "Reset your password" trong email từ Supabase (sự kiện PASSWORD_RECOVERY).
//
// Cách dùng:
//   import { initResetPassword, isPasswordRecovery, showResetPasswordForm } from "./reset-password.js";
//   initResetPassword({ notice: myNoticeFn, onSuccessRedirect: () => {} });
//
//   // Trong handler onAuthChange (gọi ở đầu, trước logic khác):
//   if (isPasswordRecovery(event)) return;
// ============================================================================

import { supabase } from "./supabase-config.js";

let noticeFn = (message) => console.log("[reset-password]", message);
let onSuccess = () => {
  try { window.location.replace("login.html"); } catch (e) {}
};

function buildModal() {
  if (document.getElementById("learnhubResetModal")) return;

  const overlay = document.createElement("div");
  overlay.id = "learnhubResetModal";
  overlay.className = "lh-reset-overlay";
  overlay.innerHTML = `
    <div class="lh-reset-modal" role="dialog" aria-modal="true">
      <h3>Đặt lại mật khẩu</h3>
      <p class="lh-reset-sub">Nhập mật khẩu mới cho tài khoản của bạn.</p>
      <label class="lh-reset-label">Mật khẩu mới <span class="req-star">*</span></label>
      <input type="password" class="lh-reset-input" id="lhResetPassword" autocomplete="new-password">
      <label class="lh-reset-label">Nhập lại mật khẩu mới <span class="req-star">*</span></label>
      <input type="password" class="lh-reset-input" id="lhResetConfirmPassword" autocomplete="new-password">
      <button type="button" class="lh-reset-btn" id="lhResetSubmit">Cập nhật mật khẩu</button>
    </div>`;
  document.body.appendChild(overlay);

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) hideResetPasswordForm();
  });

  const submitBtn = overlay.querySelector("#lhResetSubmit");
  submitBtn.addEventListener("click", submitNewPassword);
  overlay.querySelector("#lhResetPassword").addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); submitNewPassword(); }
  });
  overlay.querySelector("#lhResetConfirmPassword").addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); submitNewPassword(); }
  });
}

async function submitNewPassword() {
  const overlay = document.getElementById("learnhubResetModal");
  if (!overlay) return;
  const passInput = overlay.querySelector("#lhResetPassword");
  const confirmInput = overlay.querySelector("#lhResetConfirmPassword");
  const submitBtn = overlay.querySelector("#lhResetSubmit");

  const newPassword = passInput.value;
  const confirmPassword = confirmInput.value;

  if (newPassword.length < 6) {
    noticeFn("Mật khẩu mới phải có ít nhất 6 ký tự", "error", "Mật khẩu quá ngắn");
    return;
  }
  if (newPassword !== confirmPassword) {
    noticeFn("Mật khẩu nhập lại không khớp", "error", "Lỗi xác nhận");
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = "Đang cập nhật...";
  try {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
    passInput.value = "";
    confirmInput.value = "";
    hideResetPasswordForm();
    noticeFn("Đặt lại mật khẩu thành công! Vui lòng đăng nhập bằng mật khẩu mới.", "success", "Thành công");
    setTimeout(async () => {
      await supabase.auth.signOut().catch(() => {});
      onSuccess();
    }, 2000);
  } catch (error) {
    console.error("[reset-password] Lỗi đặt lại mật khẩu:", error);
    noticeFn("Đặt lại mật khẩu thất bại: " + error.message, "error", "Lỗi");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Cập nhật mật khẩu";
  }
}

function hideResetPasswordForm() {
  const overlay = document.getElementById("learnhubResetModal");
  if (overlay) overlay.classList.remove("show");
}

export function showResetPasswordForm() {
  buildModal();
  document.getElementById("learnhubResetModal").classList.add("show");
  setTimeout(() => {
    const input = document.getElementById("lhResetPassword");
    if (input) input.focus();
  }, 100);
}

// Trả về true nếu event là PASSWORD_RECOVERY (và đã hiện form đặt lại mật khẩu).
export function isPasswordRecovery(event) {
  if (event !== "PASSWORD_RECOVERY") return false;
  showResetPasswordForm();
  return true;
}

// Gọi 1 lần ở mỗi trang để cấu hình thông báo + chuyển trang sau khi đổi mật khẩu.
export function initResetPassword({ notice, onSuccessRedirect } = {}) {
  if (notice) noticeFn = notice;
  if (onSuccessRedirect) onSuccess = onSuccessRedirect;
}
