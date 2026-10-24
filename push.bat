@echo off
chcp 65001 >nul
title LearnHub Git Push
git add .
rem Chi commit neu co thay doi moi (tranh commit rong)
git diff --staged --quiet
if %errorlevel% equ 0 (
  echo * Khong co thay doi nao de commit.
) else (
  git commit -m "feat: update - %date%"
  git push origin main
)
echo Da push thay doi.
pause