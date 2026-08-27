# ============================================================================
# release.ps1 — Phát hành phiên bản mới LearnHub Platform (tự sinh số version)
# ----------------------------------------------------------------------------
# Công thức: v{era}.{YY}.{M}.{dec}
#   era = năm phát hành đầu tiên - 2025 (2026 → 1)
#   YY  = 2 số cuối năm (2026 → 26)
#   M   = tháng, không thêm số 0 (tháng 8 → 8)
#   dec = floor(ngày / 10) (ngày 21 → 2, nhóm 20-29)
#
# Trùng ngày:
#   Lần 1 trong ngày      → v1.26.8.2
#   Lần 2 cùng ngày       → v1.26.8.27       (full ngày, bỏ hàng chục)
#   Lần 3+ cùng ngày      → v1.26.8.27.3 ...  (thêm số đếm)
#
# Cách dùng:  release.bat              (hỏi xác nhận trước khi push)
#             release.bat -Yes         (không hỏi, đẩy luôn)
#             release.bat -DryRun      (chỉ xem số version sẽ sinh, không ghi/push)
#
# LƯU Ý: release.bat = push.bat + tự bump phiên bản (đẩy toàn bộ thay đổi code).
# Muốn đẩy code mà KHÔNG đổi phiên bản thì dùng push.bat như cũ.
# ============================================================================
param(
    [switch]$Yes,
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path  # .../LearnHub/version
$root      = Split-Path -Parent $scriptDir                    # .../LearnHub (gốc repo, chỗ chạy git)
Set-Location $root

try {
    # ---------- 1. Ngày giờ hiện tại ----------
    $now       = Get-Date
    $dateIso   = $now.ToString("yyyy-MM-dd")
    $updatedVi = $now.ToString("dd/MM/yyyy")

    # ---------- 2. Đọc version.json hiện tại ----------
    $vjPath = Join-Path $scriptDir "version.json"
    if (-not (Test-Path $vjPath)) { throw "Không tìm thấy version.json" }
    $data = Get-Content $vjPath -Raw -Encoding UTF8 | ConvertFrom-Json
    $metaDate  = if ($data._meta -and $data._meta.date)  { [string]$data._meta.date }  else { "" }
    $metaCount = if ($data._meta -and $data._meta.count) { [int]$data._meta.count }   else { 0 }

    # ---------- 3. Tính base version theo công thức ----------
    $era  = $now.Year - 2025
    $yy   = $now.ToString("yy")
    $m    = $now.Month
    $dec  = [math]::Floor($now.Day / 10)
    $base = "{0}.{1}.{2}.{3}" -f $era, $yy, $m, $dec

    # ---------- 4. Xử lý trùng ngày ----------
    # Lần 1: v1.26.8.2  (lấy hàng chục ngày: floor(day/10))
    # Lần 2: v1.26.8.27 (lấy full ngày, bỏ hàng chục)
    # Lần 3+: v1.26.8.27.3, v1.26.8.27.4 ... (thêm số đếm)
    if ($metaDate -eq $dateIso) {
        $count = $metaCount + 1
        if ($count -eq 2) { $newVersion = "{0}.{1}.{2}.{3}" -f $era, $yy, $m, $now.Day }
        else              { $newVersion = "{0}.{1}.{2}.{3}.{4}" -f $era, $yy, $m, $now.Day, $count }
    } else {
        $count      = 1
        $newVersion = $base
    }

    Write-Host ""
    Write-Host "=============================================" -ForegroundColor Cyan
    Write-Host " LearnHub Release" -ForegroundColor Cyan
    Write-Host "=============================================" -ForegroundColor Cyan
    Write-Host " Hôm nay          : $updatedVi"
    Write-Host " Phiên bản cũ     : v$($data.version)"
    Write-Host " Phiên bản mới    : v$newVersion"
    if ($metaDate -eq $dateIso) {
        Write-Host " (Lần thứ $count phát hành trong hôm nay)" -ForegroundColor Yellow
    }
    Write-Host "=============================================" -ForegroundColor Cyan

    if ($DryRun) {
        Write-Host ""
        Write-Host "[DryRun] Không ghi file, không commit, không push." -ForegroundColor Magenta
        exit 0
    }

    # ---------- 5. Xác nhận ----------
    if (-not $Yes) {
        $confirm = Read-Host " Commit + push bản mới? (Y/N)"
        if ($confirm -notmatch '^[Yy]') { Write-Host "Đã hủy." ; exit 0 }
    }

    # ---------- 6. Ghi version.json ----------
    $json = @{
        version = $newVersion
        updated = $updatedVi
        _meta   = @{ date = $dateIso; count = $count }
    } | ConvertTo-Json -Depth 5
    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($vjPath, $json + "`n", $utf8NoBom)

    # ---------- 7. Vá LH_VERSION trong version-check.js ----------
    $jsPath = Join-Path $scriptDir "version-check.js"
    if (-not (Test-Path $jsPath)) { throw "Không tìm thấy version-check.js" }
    $js = [System.IO.File]::ReadAllText($jsPath)
    $pattern = 'window\.LH_VERSION\s*=\s*"[^"]*"'
    if ($js -notmatch $pattern) { throw "Không tìm thấy window.LH_VERSION trong version-check.js" }
    $js = [regex]::Replace($js, $pattern, ('window.LH_VERSION = "' + $newVersion + '"'))
    [System.IO.File]::WriteAllText($jsPath, $js, $utf8NoBom)

    # ---------- 8. Tự bump CACHE_VERSION trong service-worker.js ----------
    $swPath = Join-Path $root "service-worker.js"
    if (-not (Test-Path $swPath)) { throw "Không tìm thấy service-worker.js" }
    $sw = [System.IO.File]::ReadAllText($swPath)
    $swPattern = 'CACHE_VERSION\s*=\s*"learnhub-v(\d+)"'
    if ($sw -notmatch $swPattern) { throw "Không tìm thấy CACHE_VERSION trong service-worker.js" }
    $sw = [regex]::Replace($sw, $swPattern, {
        param($m)
        $newNum = [int]$m.Groups[1].Value + 1
        'CACHE_VERSION = "learnhub-v' + $newNum + '"'
    })
    [System.IO.File]::WriteAllText($swPath, $sw, $utf8NoBom)

    # ---------- 9. Commit + push TOÀN BỘ thay đổi (như push.bat) + kèm version mới ----------
    git add .
    git commit -m "release v$newVersion ($updatedVi)"
    git push origin main

    Write-Host ""
    Write-Host "✅ Đã phát hành v$newVersion — người dùng online sẽ thấy thông báo trong tối đa 2 phút." -ForegroundColor Green
} catch {
    Write-Host ""
    Write-Host "❌ Lỗi: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
