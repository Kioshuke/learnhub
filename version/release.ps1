# ============================================================================
# release.ps1 — Phát hành phiên bản mới LearnHub Platform (tự sinh số version)
# ----------------------------------------------------------------------------
# Công thức: v{era}.{YY}.{M}.{day}
#   era = năm phát hành đầu tiên - 2025 (2026 → 1)
#   YY  = 2 số cuối năm (2026 → 26)
#   M   = tháng, không thêm số 0 (tháng 8 → 8)
#   day = ngày trong tháng (1..31) — luôn full ngày để version tăng đơn điệu qua các ngày
#
# Trùng ngày:
#   Lần 1 trong ngày      → v1.26.10.24
#   Lần 2 cùng ngày       → v1.26.10.24.2
#   Lần 3+ cùng ngày      → v1.26.10.24.3 ...  (thêm số đếm)
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
    if (-not (Test-Path $vjPath)) { throw "Khong tim thay version.json" }
    $data = Get-Content $vjPath -Raw -Encoding UTF8 | ConvertFrom-Json
    $metaDate  = if ($data._meta -and $data._meta.date)  { [string]$data._meta.date }  else { "" }
    $metaCount = if ($data._meta -and $data._meta.count) { [int]$data._meta.count }   else { 0 }

    # ---------- 3. Tính base version theo công thức ----------
    $era  = $now.Year - 2025
    $yy   = $now.ToString("yy")
    $m    = $now.Month
    # Đoạn thứ 4 LUÔN là full ngày (1..31) để version tăng đơn điệu qua các ngày.
    # (Trước đây dùng floor(day/10) → chỉ 0..3, khiến release đầu tiên của ngày mới
    #  trùng với ngày cũ → so sánh version = 0 → banner cập nhật không hiện.)
    $base = "{0}.{1}.{2}.{3}" -f $era, $yy, $m, $now.Day

    # ---------- 4. Xử lý trùng ngày ----------
    # Lần 1 trong ngày: v1.26.10.24
    # Lần 2: v1.26.10.24.2
    # Lần 3+: v1.26.10.24.3, v1.26.10.24.4 ... (thêm số đếm)
    if ($metaDate -eq $dateIso) { $count = $metaCount + 1 } else { $count = 1 }
    if ($count -eq 1) { $newVersion = $base }
    else              { $newVersion = "{0}.{1}" -f $base, $count }

    Write-Host ""
    Write-Host "=============================================" -ForegroundColor Cyan
    Write-Host " LearnHub Release" -ForegroundColor Cyan
    Write-Host "=============================================" -ForegroundColor Cyan
    Write-Host " Hom nay          : $updatedVi"
    Write-Host " Phien ban cu     : v$($data.version)"
    Write-Host " Phien ban moi    : v$newVersion"
    if ($metaDate -eq $dateIso) {
        Write-Host " (Lan thu $count phat hanh trong hom nay)" -ForegroundColor Yellow
    }
    Write-Host "=============================================" -ForegroundColor Cyan

    if ($DryRun) {
        Write-Host ""
        Write-Host "[DryRun] Khong ghi file, khong commit, khong push." -ForegroundColor Magenta
        exit 0
    }

    # ---------- 5. Xác nhận ----------
    if (-not $Yes) {
        $confirm = Read-Host " Commit + push ban moi? (Y/N)"
        if ($confirm -notmatch '^[Yy]') { Write-Host "Da huy." ; exit 0 }
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
    if (-not (Test-Path $jsPath)) { throw "Khong tim thay version-check.js" }
    $js = [System.IO.File]::ReadAllText($jsPath)
    $pattern = 'window\.LH_VERSION\s*=\s*"[^"]*"'
    if ($js -notmatch $pattern) { throw "Khong tim thay window.LH_VERSION trong version-check.js" }
    $js = [regex]::Replace($js, $pattern, ('window.LH_VERSION = "' + $newVersion + '"'))
    [System.IO.File]::WriteAllText($jsPath, $js, $utf8NoBom)

    # ---------- 8. Tự bump CACHE_VERSION trong service-worker.js ----------
    $swPath = Join-Path $root "service-worker.js"
    if (-not (Test-Path $swPath)) { throw "Khong tim thay service-worker.js" }
    $sw = [System.IO.File]::ReadAllText($swPath)
    $swPattern = 'CACHE_VERSION\s*=\s*"learnhub-v(\d+)"'
    if ($sw -notmatch $swPattern) { throw "Khong tim thay CACHE_VERSION trong service-worker.js" }
    $sw = [regex]::Replace($sw, $swPattern, {
        param($m)
        $newNum = [int]$m.Groups[1].Value + 1
        'CACHE_VERSION = "learnhub-v' + $newNum + '"'
    })
    [System.IO.File]::WriteAllText($swPath, $sw, $utf8NoBom)

    # ---------- 9. Commit + push ONLY nếu có thay đổi ---
    # Kiểm tra có file thay đổi nào không trước khi commit
    $hasChanges = git status --porcelain | Measure-Object -Line > $null
    if ($hasChanges.Line -gt 0) {
        git add .
        git commit -m "release v$newVersion ($updatedVi)"
        git push origin main

        Write-Host ""
        Write-Host "Da phat hanh v$newVersion - nguoi dung online se thay thong bao trong toi da 2 phut." -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "Khong co thay doi nao de commit (git status rong). Version.json van da duoc cap nhat." -ForegroundColor Yellow
        Write-Host "   Run 'git reset HEAD version.json' neu muon hoan tac file version." -ForegroundColor Cyan
        # Vẫn in thông báo thành công nhưng không push
        Write-Host "Version.json da duoc cap nhat ve v$newVersion." -ForegroundColor Green
    }
}
catch {
    Write-Host ""
    Write-Host "LOI: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}