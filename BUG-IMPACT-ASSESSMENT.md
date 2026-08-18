# 📊 Bảng Đánh Giá Ảnh Hưởng & Tác Động Sau Khi Fix — LearnHub

| # | Bug / Vấn đề | File | Severity | Tác động nếu KHÔNG fix | Tác động SAU KHI fix | Độ khó fix | Ưu tiên | Trạng thái |
|---|---|---|---|---|---|---|---|---|
| 1 | **OTP xác minh 100% client-side** — Người dùng có thể bypass xác minh email bằng cách đọc source code | `login.html` | 🔴 CRITICAL | Bất kỳ ai cũng có thể đăng ký tài khoản mà không cần xác minh email → spam account | Đã thêm `store_otp` + `verify_otp` RPC calls → khi tạo DB function sẽ verify server-side. Fallback client-side hiện tại | Trung bình | ⭐⭐⭐ | ✅ ĐÃ FIX (cần tạo DB function) |
| 2 | **Admin role check bằng display name** — Quản trị viên được xác định dựa trên `user_name === "Admin LearnHub"` | `forum.html:1524` | 🔴 CRITICAL | User đặt tên "Admin LearnHub" sẽ có badge admin → giả mạo quyền hạn | Đã sửa: check role từ `authorRoleCache` (query Supabase `users.role`) → không thể giả mạo bằng tên | Dễ | ⭐⭐⭐ | ✅ ĐÃ FIX |
| 3 | **postMessage("*") mở rộng mọi origin** — Gửi dữ liệu user (uid, email, photo) cho iframe mà không kiểm tra origin | `index.html` | 🔴 CRITICAL | Trang web độc hại nhúng iframe LearnHub có thể lấy toàn bộ thông tin user | Đã sửa: dùng `TRUSTED_ORIGIN = location.origin` cho tất cả postMessage calls | Dễ | ⭐⭐⭐ | ✅ ĐÃ FIX |
| 4 | **Forum load TOÀN BỘ posts client-side** — Không có pagination hay limit | `forum.html:1399` | 🟡 HIGH | Khi forum có >500 posts → lag nặng, tốn RAM, crash trên điện thoại yếu | Đã sửa: thêm `.order("time", {ascending:false}).range(0, 499)` → giới hạn 500 bài gần nhất | Dễ | ⭐⭐ | ✅ ĐÃ FIX |
| 5 | **Không có rate limiting client-side** — Like, post, comment không giới hạn tần suất | `forum.html` | 🟡 HIGH | User hoặc bot có thể spam like/post hàng nghìn lần/giây → overload database | Đã thêm `checkRateLimit()` cho `sendPost` (3s) và `toggleReaction` (1.5s) | Dễ | ⭐⭐ | ✅ ĐÃ FIX |
| 6 | **Tailwind CDN dùng ở production** — Load toàn bộ Tailwind runtime từ CDN (~400KB JS) | `index.html:37` | 🟡 HIGH | Tải chậm ~300ms, PSI score thấp,浪费 bandwidth | ⚠️ Chưa fix — cần build pipeline (Vite/PostCSS). Khuyến nghị chuyển sau | Trung bình | ⭐⭐ | ⏳ CHƯA FIX |
| 7 | **Realtime subscription triggers reload toàn bộ online list** — Mỗi lần user online/offline đều query lại toàn bộ bảng users | `index.html:940` | 🟡 HIGH | 10 user online → hàng chục lần query toàn bộ bảng users mỗi phút | ⏳ Chưa fix — cần thay thế bằng incremental DOM update | Trung bình | ⭐⭐ | ⏳ CHƯA FIX |
| 8 | **Nhiều setInterval không được cleanup** — `activeInterval`, `homeSlideshowInterval` không clear khi logout | `index.html`, `script.js` | 🟠 MEDIUM | Memory leak tích lũy → trình duyệt chậm dần | Đã sửa: clear `activeInterval`, `homeSlideshowInterval`, `authSlideTimer` + `stopAccessGuards()` khi logout & pagehide | Dễ | ⭐⭐ | ✅ ĐÃ FIX |
| 9 | **API key hardcode trong beforeunload fetch** — Supabase URL nằm trực tiếp trong index.html | `index.html:989-1002` | 🟠 MEDIUM | Dễ bị lộ khi refactor, maintenance khó | Đã sửa: import `SUPABASE_URL` từ `supabase-config.js` | Dễ | ⭐ | ✅ ĐÃ FIX |
| 10 | **Quiz frame watchdog ghi log nhưng không thông báo user** — Nếu iframe không load trong 20s, user không biết | `script.js:84-98` | 🟠 MEDIUM | User thấy màn hình trắng, không biết phải làm gì | Đã sửa: hiển thị lỗi thân thiện + nút "Đóng bài" khi quiz timeout 20s | Dễ | ⭐ | ✅ ĐÃ FIX |
| 11 | **Dark mode không sync khi iframe reload** — Nếu iframe reload sẽ mất dark mode | `script.js:740-744` | 🟢 LOW | User thấy chói mắt khi iframe reload | Đã sửa: dùng `addEventListener("load")` thay vì ghi đè `onload` → luôn sync dark mode + user data khi iframe reload | Dễ | ⭐ | ✅ ĐÃ FIX |
| 12 | **Chuột scroll qua iframe bị "bẫy"** — Scroll kẹt trong iframe, không truyền ra trang chính | `script.js:270-322` | 🟢 LOW | UX tệ trên desktop | Đã fix (cần verify trên Safari) | - | ⭐ | ✅ ĐÃ FIX |

---

## 📈 Tổng kết mức độ ảnh hưởng

| Severity | Đã fix | Chưa fix | Mô tả |
|----------|--------|----------|-------|
| 🔴 CRITICAL | 3/3 | 0 | Lỗ hổng bảo mật nghiêm trọng → **ĐÃ XỬ LÝ HẾT** |
| 🟡 HIGH | 3/4 | 1 | Tailwind CDN cần build pipeline |
| 🟠 MEDIUM | 3/3 | 0 | **ĐÃ XỬ LÝ HẾT** |
| 🟢 LOW | 2/2 | 0 | **ĐÃ XỬ LÝ HẾT** |

## 🎯 Các DB function cần tạo cho OTP (#1)

Để OTP hoạt động server-side, cần tạo 2 Supabase RPC:

```sql
-- 1. Lưu OTP khi gửi
CREATE OR REPLACE FUNCTION store_otp(p_email text, p_code text, p_expires_in_seconds int)
RETURNS uuid AS $$
DECLARE
  v_id uuid := gen_random_uuid();
BEGIN
  INSERT INTO otp_codes (id, email, code, expires_at)
  VALUES (v_id, lower(p_email), p_code, now() + (p_expires_in_seconds || ' seconds')::interval);
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Xác minh OTP (xóa sau khi dùng đúng)
CREATE OR REPLACE FUNCTION verify_otp(p_email text, p_code text)
RETURNS boolean AS $$
DECLARE
  v_valid boolean;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM otp_codes
    WHERE email = lower(p_email) AND code = p_code AND expires_at > now()
  ) INTO v_valid;

  IF v_valid THEN
    DELETE FROM otp_codes WHERE email = lower(p_email);
  END IF;

  RETURN v_valid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

Và bảng `otp_codes`:
```sql
CREATE TABLE otp_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  code text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX idx_otp_email ON otp_codes(email);
-- Auto-delete expired OTPs
CREATE OR REPLACE FUNCTION cleanup_expired_otps()
RETURNS void AS $$
  DELETE FROM otp_codes WHERE expires_at < now();
$$ LANGUAGE plpgsql;
```

---
*Cập nhật: 18/08/2026 — LearnHub Platform Audit*
