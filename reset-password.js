// ============================================================================
// reset-password.js
// ----------------------------------------------------------------------------
// Helper dùng chung: khi user bấm link "Reset your password" trong email từ
// Supabase (sự kiện PASSWORD_RECOVERY), chuyển hướng sang trang riêng
// reset-password.html để nhập mật khẩu mới (không cập nhật ngay trong web chính).
//
// Cách dùng (trong handler onAuthChange, gọi ở đầu trước logic khác):
//   if (isPasswordRecovery(event)) return;
// ============================================================================

const PENDING_RESET_KEY = "learnhub-pending-reset";

// Lưu cờ "đang đợi đặt lại mật khẩu" rồi nhảy sang trang riêng.
export function redirectToResetPage() {
  try { sessionStorage.setItem(PENDING_RESET_KEY, "1"); } catch (e) {}
  // [FIX BUG #35] Dùng đường dẫn TUYỆT ĐỐI "/reset-password.html" (trước đây là tương đối
  // nên chạy từ trang trong thư mục con sẽ 404). Đồng thời giữ query + hash để link khôi phục
  // của Supabase mang theo token (#access_token=...&type=recovery) hoặc ?code=...
  var suffix = (window.location.search || "") + (window.location.hash || "");
  var target = "/reset-password.html" + suffix;
  try {
    window.location.replace(target);
  } catch (e) {
    window.location.href = target;
  }
}

// Trả về true nếu event là PASSWORD_RECOVERY (đã chuyển hướng sang trang riêng).
export function isPasswordRecovery(event) {
  if (event !== "PASSWORD_RECOVERY") return false;
  redirectToResetPage();
  return true;
}

export { PENDING_RESET_KEY };
