param(
    [Parameter(Mandatory=$true)]
    [string]$SshHost,
    [string]$SshUser = "root",
    [string]$SshKey  = ""
)

$Remote  = "$SshUser@$SshHost"
$AppDir  = "/var/www/phanmem"
$SshBaseArgs = if ($SshKey) { @("-i", $SshKey) } else { @() }
$SshBaseArgs += @("-o", "StrictHostKeyChecking=no")

function Invoke-SSH {
    param([string]$cmd)
    Write-Host ">>> Executing: $cmd" -ForegroundColor DarkCyan
    & ssh.exe -n -T @SshBaseArgs $Remote "export TERM=xterm; $cmd"
    if ($LASTEXITCODE -ne 0) { Write-Error "SSH failed: $cmd"; exit 1 }
}

function Invoke-SCP {
    param([string]$src, [string]$dst)
    Write-Host ">>> Copying $src to ${Remote}:${dst}" -ForegroundColor DarkCyan
    & scp.exe @SshBaseArgs -r $src "${Remote}:${dst}"
    if ($LASTEXITCODE -ne 0) { Write-Error "SCP failed: $src to $dst"; exit 1 }
}

Write-Host "=== FAST UPDATE TO $SshHost ($AppDir) ===" -ForegroundColor Green

# 1. Package & Upload Backend
Write-Host "`n[1/3] Packaging & Uploading Backend dist..." -ForegroundColor Cyan
$backendArchive = "backend-update.tar.gz"
if (Test-Path $backendArchive) { Remove-Item $backendArchive -Force }
tar.exe -czf $backendArchive -C backend dist package.json package-lock.json templates
Invoke-SCP $backendArchive "$AppDir/$backendArchive"
Invoke-SSH "tar -xzf $AppDir/$backendArchive -C $AppDir/backend && rm -f $AppDir/$backendArchive && chown -R www-data:www-data $AppDir/backend"
Remove-Item $backendArchive -Force -ErrorAction SilentlyContinue

# 2. Package & Upload Frontend
Write-Host "`n[2/3] Packaging & Uploading Frontend dist..." -ForegroundColor Cyan
$frontendArchive = "frontend-update.tar.gz"
if (Test-Path $frontendArchive) { Remove-Item $frontendArchive -Force }
tar.exe -czf $frontendArchive -C frontend/dist .
Invoke-SCP $frontendArchive "$AppDir/$frontendArchive"
Invoke-SSH "mkdir -p $AppDir/frontend/dist && rm -rf $AppDir/frontend/dist/* && tar -xzf $AppDir/$frontendArchive -C $AppDir/frontend/dist && rm -f $AppDir/$frontendArchive && chown -R www-data:www-data $AppDir/frontend/dist"
Remove-Item $frontendArchive -Force -ErrorAction SilentlyContinue

# 3. Restart PM2 & Reload Nginx
Write-Host "`n[3/3] Restarting PM2 Backend & Reloading Nginx..." -ForegroundColor Cyan
Invoke-SSH "pm2 restart nestjs-backend ktnb-collab && pm2 status && nginx -t && systemctl reload nginx"

Write-Host "`n==========================================" -ForegroundColor Green
Write-Host "   UPDATE COMPLETED!" -ForegroundColor Green
Write-Host "   Website: https://chinhta.io.vn" -ForegroundColor White
Write-Host "==========================================" -ForegroundColor Green
