// ============================================================================
// LearnHub shared period/time math (week-math.js)
// ----------------------------------------------------------------------------
// Dùng chung cho profile.html / leaderboard.html.
// Chu kỳ: THEO THÁNG DƯƠNG LỊCH, mốc reset 00:00 ngày 1 đầu tháng (giờ VN).
// Khoá kỳ dạng 'YYYY-MM' (ví dụ '2026-11').
// ============================================================================
const VN_OFFSET_MS = 7 * 60 * 60 * 1000; // UTC+7

// Mốc bắt đầu kỳ (00:00 ngày 1 tháng hiện tại, giờ VN) quy về epoch ms (UTC).
export function getPeriodStartMs() {
  const vnNow = new Date(Date.now() + VN_OFFSET_MS);
  const startUtcMs = Date.UTC(vnNow.getUTCFullYear(), vnNow.getUTCMonth(), 1);
  return startUtcMs - VN_OFFSET_MS;
}

// Khoá kỳ hiện tại 'YYYY-MM' theo giờ VN.
export function getPeriodKey() {
  const vnNow = new Date(Date.now() + VN_OFFSET_MS);
  return `${vnNow.getUTCFullYear()}-${String(vnNow.getUTCMonth() + 1).padStart(2, '0')}`;
}

// Nhãn hiển thị 'Tháng 11/2026' theo giờ VN.
export function formatPeriodLabel() {
  const vnNow = new Date(Date.now() + VN_OFFSET_MS);
  return `Tháng ${vnNow.getUTCMonth() + 1}/${vnNow.getUTCFullYear()}`;
}

export function formatTimer(totalSeconds) {
  totalSeconds = Math.max(0, Math.floor(totalSeconds || 0));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
}
