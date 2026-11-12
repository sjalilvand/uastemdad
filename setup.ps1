# ============================================================
#  اسکریپت نصب و راه‌اندازی سامانه uastemdad در ویندوز
#  اجرا:  PowerShell  →   .\setup.ps1
# ============================================================

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host ""
Write-Host "==============================================" -ForegroundColor Green
Write-Host "  نصب و راه‌اندازی سامانه مرکز علمی-کاربردی" -ForegroundColor Green
Write-Host "==============================================" -ForegroundColor Green
Write-Host ""

# ---- ۱) بررسی Node.js ----
$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
    Write-Host "خطا: Node.js نصب نیست. ابتدا Node.js نسخه ۲۰ یا جدیدتر را از https://nodejs.org نصب کنید." -ForegroundColor Red
    exit 1
}
$nodeVersion = (node --version) -replace "v", ""
Write-Host "✓ Node.js نسخه $nodeVersion" -ForegroundColor Cyan

# ---- ۲) نصب وابستگی‌ها ----
$hasBun = Get-Command bun -ErrorAction SilentlyContinue
if ($hasBun) {
    Write-Host "→ نصب وابستگی‌ها با bun ..." -ForegroundColor Yellow
    bun install
} else {
    Write-Host "→ نصب وابستگی‌ها با npm (چند دقیقه طول می‌کشد) ..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) { Write-Host "خطا در نصب وابستگی‌ها" -ForegroundColor Red; exit 1 }
}

# ---- ۳) ساخت فایل .env ----
if (-not (Test-Path ".env")) {
    @"
DATABASE_URL=file:../db/custom.db
AUTH_SECRET=uastemdad-secret-please-change-in-production
"@ | Out-File -FilePath ".env" -Encoding utf8
    Write-Host "✓ فایل .env ساخته شد" -ForegroundColor Cyan
} else {
    Write-Host "✓ فایل .env موجود است" -ForegroundColor Cyan
}

# ---- ۴) ساخت دیتابیس ----
New-Item -ItemType Directory -Force -Path "db" | Out-Null
Write-Host "→ ساخت و همگام‌سازی دیتابیس (prisma) ..." -ForegroundColor Yellow
npx prisma db push --accept-data-loss
if ($LASTEXITCODE -ne 0) { Write-Host "خطا در ساخت دیتابیس" -ForegroundColor Red; exit 1 }

# ---- ۵) داده‌های اولیه ----
if ($hasBun) {
    bun prisma/seed.ts
} else {
    npx tsx prisma/seed.ts
}
if ($LASTEXITCODE -ne 0) { Write-Host "خطا در داده‌های اولیه" -ForegroundColor Red; exit 1 }

Write-Host ""
Write-Host "==============================================" -ForegroundColor Green
Write-Host "  نصب کامل شد!" -ForegroundColor Green
Write-Host "  آدرس سایت:      http://localhost:3003" -ForegroundColor Yellow
Write-Host "  پنل مدیریت:      http://localhost:3003/admin" -ForegroundColor Yellow
Write-Host "  ورود مدیر:       admin / admin123" -ForegroundColor Yellow
Write-Host "  عضو نمونه:       0921123456 / member1234" -ForegroundColor Yellow
Write-Host "==============================================" -ForegroundColor Green
Write-Host ""
Write-Host "→ اجرای سامانه روی پورت 3003 (برای توقف Ctrl+C) ..." -ForegroundColor Yellow

# ---- ۶) اجرا روی پورت 3003 ----
if ($hasBun) {
    bunx next dev -p 3003
} else {
    npm run dev:3003
}
