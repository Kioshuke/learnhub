# Hướng dẫn deploy Cloudflare Worker

## Bước 1: Tạo tài khoản Cloudflare
- Vào https://dash.cloudflare.com/sign-up
- Đăng ký miễn phí (không cần credit card)

## Bước 2: Cài Wrangler CLI
```bash
npm install -g wrangler
```

## Bước 3: Đăng nhập Cloudflare
```bash
wrangler login
```

## Bước 4: Deploy Worker
```bash
cd worker/
wrangler deploy
```

Sau khi deploy, bạn sẽ nhận được URL dạng:
`https://hubie-proxy.YOUR_SUBDOMAIN.workers.dev`

## Bước 5: Cập nhật URL vào AI.html
Mở file `AI.html`, tìm dòng:
```javascript
const WORKER_URL = "https://hubie-proxy.YOUR_SUBDOMAIN.workers.dev";
```
Thay `YOUR_SUBDOMAIN` bằng subdomain bạn đã tạo ở Bước 4.

## Bước 6: Cập nhật CORS Origin
Mở file `worker/worker.js`, tìm dòng:
```javascript
const ALLOWED_ORIGIN = "https://YOUR_GITHUB_USERNAME.github.io";
```
Thay `YOUR_GITHUB_USERNAME` bằng username GitHub của bạn.

Sau đó redeploy:
```bash
wrangler deploy
```

## Bước 7: Kiểm tra
1. Mở GitHub Pages
2. Mở chat Hubie
3. Gửi tin nhắn test
4. Kiểm tra DevTools Network - không còn thấy request trực tiếp đến `generativelanguage.googleapis.com`

## Lưu ý quan trọng
- **KHÔNG BAO GIỜ** commit file `worker/worker.js` chứa API key lên GitHub
- API key chỉ nằm trên Cloudflare Worker (server-side)
- Nếu muốn đổi key, chỉ cần sửa file worker.js và redeploy
