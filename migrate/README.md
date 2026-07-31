# Migrate LearnHub từ Firebase sang Supabase

## Chuẩn bị

1. **Supabase** — chạy file `supabase/schema.sql` trong Supabase Dashboard → **SQL Editor** → dán toàn bộ → **Run** (có thể chạy lại nhiều lần).
2. **Firebase service account**:
   - Vào [Firebase Console](https://console.firebase.google.com) → chọn project `onthi12-thpttanhong`
   - **Project settings** (⚙️) → tab **Service accounts** → **Generate new private key** → tải file JSON
   - Đặt file JSON vào thư mục này, đặt tên dạng `learnhub-firebase-service-account.json`
3. **Supabase secret key**:
   - Supabase Dashboard → **Project Settings** → **API Keys** → tạo/copy **secret key** (dạng `sb_secret_...`)
   - Key này có toàn quyền database, chỉ dùng cho script, **không được** đưa vào code web
4. Tạo file `.env` từ `.env.example` và điền 2 giá trị trên.

## Chạy

```bash
npm install

# Bước 1: xuất dữ liệu Firebase ra ./export
npm run export

# Bước 2: import vào Supabase (upsert, chạy lại không sao)
npm run import

# Nếu muốn xóa sạch bảng rồi import lại
npm run import -- --fresh
```

## Sau khi import

- Kiểm tra bảng đếm số dòng ở cuối log.
- User cũ đăng nhập lại lần đầu (Google/email cùng email cũ) sẽ tự động **nhận lại** dữ liệu cũ (bài viết forum, điểm, chức danh) qua RPC `claim_legacy_data`.
- **Bảo mật:** sau khi migrate xong nên tạo lại secret key mới trong Supabase Dashboard và xóa secret key cũ (đảm bảo key này chưa từng lộ).

## Thư mục

| File | Mô tả |
|---|---|
| `export-firestore.js` | Xuất Firestore + Realtime Database → `./export/*.json` |
| `import-supabase.js` | Import `./export/*.json` vào Supabase (secret key) |
| `.env` | URL + secret key + đường dẫn service account (đã gitignore) |
| `export/` | Dữ liệu JSON đã xuất (đã gitignore) |
