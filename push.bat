@echo off
title LearnHub Git Push
git add .
:: Chỉ commit nếu có thay đổi (tránh commit rỗng gây confusion trong history)
git diff --staged --quiet
if %errorlevel% equ 0 (
  echo * Không có thay đổi nào để commit.
) else (
  git commit -m "feat: update - %date%"
  git push origin main
)
echo ✅ Đã push thay đổi.
pause