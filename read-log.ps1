# ============================================================================
#   خواندن سریع و فیلترکردن لاگ‌های سامانه  (app / caddy / monitor)
#
#   نمونه‌های اجرا:
#     powershell -ExecutionPolicy Bypass -File C:\uastemdad\app\read-log.ps1
#     powershell -ExecutionPolicy Bypass -File C:\uastemdad\app\read-log.ps1 -Log caddy -Tail 30
#     powershell -ExecutionPolicy Bypass -File C:\uastemdad\app\read-log.ps1 -Errors -Tail 100
#     powershell -ExecutionPolicy Bypass -File C:\uastemdad\app\read-log.ps1 -Bot -Tail 200
#     powershell -ExecutionPolicy Bypass -File C:\uastemdad\app\read-log.ps1 -Find "EADDRINUSE"
#     powershell -ExecutionPolicy Bypass -File C:\uastemdad\app\read-log.ps1 -Follow
#     powershell -ExecutionPolicy Bypass -File C:\uastemdad\app\read-log.ps1 -Log all
# ============================================================================

param(
    [ValidateSet("app", "caddy", "monitor", "all")]
    [string]$Log = "app",
    [int]$Tail = 50,
    [switch]$Errors,
    [switch]$Bot,
    [switch]$Follow,
    [string]$Find = ""
)

$ErrorActionPreference = "Continue"
try { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8 } catch {}

$Root  = "C:\uastemdad"
$Paths = @{
    app     = "$Root\logs\app.log"
    caddy   = "$Root\logs\caddy.log"
    monitor = "$Root\logs\monitor.log"
}

function Show-Log {
    param([string]$Name, [string]$Path)

    Write-Host ""
    Write-Host "================================================" -ForegroundColor Cyan
    Write-Host ("  لاگ: {0}   ({1})" -f $Name, $Path) -ForegroundColor Cyan
    Write-Host "================================================" -ForegroundColor Cyan

    if (-not (Test-Path $Path)) {
        Write-Host "این فایل لاگ هنوز وجود ندارد (سامانه هنوز اجرا نشده یا مسیر متفاوت است)." -ForegroundColor Yellow
        return
    }

    $item = Get-Item $Path
    $sizeMB = [math]::Round($item.Length / 1MB, 2)
    Write-Host ("حجم: {0} MB   |   آخرین تغییر: {1}" -f $sizeMB, $item.LastWriteTime) -ForegroundColor DarkGray

    if ($sizeMB -gt 50) {
        Write-Host "هشدار: لاگ خیلی بزرگ شده است؛ هرازگاهی محتوای قدیمی را حذف/بایگانی کنید." -ForegroundColor Yellow
    }

    # فیلترها
    $filter = $null
    if ($Bot)   { $filter = '\[bale-bot\]' }
    if ($Find)  { $filter  = [regex]::Escape($Find) }   # جستجوی متنی ساده
    if ($Errors) {
        $filter = '(?i)error|خطا|exception|unhandled|failed|EADDRINUSE|EPERM|EBUSY|database is locked|503|409|TIMEOUT|ECONNREFUSED'
    }

    if ($Follow) {
        Write-Host "نمایش زندهٔ لاگ — برای خروج Ctrl+C را بزنید." -ForegroundColor Magenta
        if ($filter) {
            Get-Content $Path -Wait -Tail $Tail -Encoding UTF8 -Encoding UTF8 | ForEach-Object { if ($_ -match $filter) { Write-Host $_ } }
        } else {
            Get-Content $Path -Wait -Tail $Tail
        }
        return
    }

    $lines = @(Get-Content $Path -Tail $Tail -Encoding UTF8)
    if ($filter) {
        $lines = @($lines | Where-Object { $_ -match $filter })
    }

    if ($lines.Count -eq 0) {
        Write-Host ("در {0} خط آخرِ لاگ، موردی مطابق فیلتر پیدا نشد — خبر خوب است." -f $Tail) -ForegroundColor Green
        return
    }

    foreach ($line in $lines) {
        $isErr = $line -match '(?i)error|خطا|exception|unhandled|failed|EADDRINUSE|EPERM|EBUSY|database is locked'
        if ($isErr) { Write-Host $line -ForegroundColor Red }
        elseif ($line -match '\[bale-bot\]') { Write-Host $line -ForegroundColor Cyan }
        else { Write-Host $line }
    }

    Write-Host ""
    Write-Host ("نمایش {0} خط. برای ادامه: -Tail را بیشتر کنید (مثلاً -Tail 500)." -f $lines.Count) -ForegroundColor DarkGray
}

if ($Log -eq "all") {
    Write-Host ""
    Write-Host "وضعیت خلاصهٔ هر سه لاگ (۱۵ خط آخر هر کدام):" -ForegroundColor White
    Show-Log -Name "app"     -Path $Paths.app
    Show-Log -Name "caddy"   -Path $Paths.caddy
    Show-Log -Name "monitor" -Path $Paths.monitor
} else {
    Show-Log -Name $Log -Path $Paths[$Log]
}

Write-Host ""
