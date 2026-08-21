@echo off
chcp 65001 >nul
title LearnHub Release
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0release.ps1" %*
pause
