param(
    [Parameter(Mandatory=$true)]
    [string]$SshHost,
    [string]$SshUser = "root",
    [string]$SshKey  = ""
)

$Remote  = "$SshUser@$SshHost"
$AppDir  = "/var/www/phanmem"
$SshArgs = if ($SshKey) { @("-i", $SshKey) } else { @() }
$SshArgs += @("-o", "StrictHostKeyChecking=no")

function Invoke-SSH {
    param([string]$cmd)
    Write-Host ">>> Executing: $cmd" -ForegroundColor DarkCyan
    & ssh.exe @SshArgs $Remote $cmd
    if ($LASTEXITCODE -ne 0) { Write-Error "SSH command failed"; exit 1 }
}

function Invoke-SCP {
    param([string]$src, [string]$dst)
    Write-Host ">>> Copying $src to ${Remote}:${dst}" -ForegroundColor DarkCyan
    & scp.exe @SshArgs -r $src "${Remote}:${dst}"
    if ($LASTEXITCODE -ne 0) { Write-Error "SCP failed"; exit 1 }
}

Write-Host "=== DEPLOY TO $SshHost ($AppDir) ===" -ForegroundColor Green

# 0. CI/CD Pre-flight Checks (Lint & Typecheck)
Write-Host "`n[0/6] Running CI/CD Lint Checks..." -ForegroundColor Cyan
Push-Location backend
npm run lint
if ($LASTEXITCODE -ne 0) { Write-Error "Backend lint failed"; exit 1 }
Pop-Location

Push-Location frontend
npm run lint
if ($LASTEXITCODE -ne 0) { Write-Error "Frontend lint failed"; exit 1 }
Pop-Location

# 1. Build frontend
Write-Host "`n[1/6] Building frontend..." -ForegroundColor Cyan
Push-Location frontend
npm run build
if ($LASTEXITCODE -ne 0) { Write-Error "Frontend build failed"; exit 1 }
Pop-Location

# 2. Build backend
Write-Host "`n[2/6] Building backend..." -ForegroundColor Cyan
Push-Location backend
npm run build
if ($LASTEXITCODE -ne 0) { Write-Error "Backend build failed"; exit 1 }
Pop-Location

# 3. Setup VPS and clean old process
Write-Host "`n[3/6] Setting up VPS environment..." -ForegroundColor Cyan
Invoke-SSH "mkdir -p $AppDir/backend $AppDir/frontend/dist; pm2 delete ktnb-api 2>/dev/null || true; rm -f /etc/nginx/sites-enabled/ktnb /etc/nginx/sites-available/ktnb"

# 4. Upload files
Write-Host "`n[4/6] Packaging and uploading files to ${Remote}:${AppDir}..." -ForegroundColor Cyan

$backendArchive = "backend-deploy.tar.gz"
$frontendArchive = "frontend-deploy.tar.gz"

if (Test-Path $backendArchive) { Remove-Item $backendArchive -Force }
if (Test-Path $frontendArchive) { Remove-Item $frontendArchive -Force }

Write-Host "Creating backend archive..." -ForegroundColor DarkGray
tar.exe -czf $backendArchive -C backend dist package.json package-lock.json templates

Write-Host "Creating frontend archive..." -ForegroundColor DarkGray
tar.exe -czf $frontendArchive -C frontend/dist .

Write-Host "Uploading archives via SCP..." -ForegroundColor DarkGray
Invoke-SCP $backendArchive "$AppDir/$backendArchive"
Invoke-SCP $frontendArchive "$AppDir/$frontendArchive"

Write-Host "Extracting archives on VPS..." -ForegroundColor DarkGray
Invoke-SSH "tar -xzf $AppDir/$backendArchive -C $AppDir/backend && rm -rf $AppDir/frontend/dist/* && tar -xzf $AppDir/$frontendArchive -C $AppDir/frontend/dist && rm -f $AppDir/$backendArchive $AppDir/$frontendArchive"

Remove-Item $backendArchive -Force -ErrorAction SilentlyContinue
Remove-Item $frontendArchive -Force -ErrorAction SilentlyContinue

# 5. Dependencies and PM2
Write-Host "`n[5/6] Starting Backend with PM2..." -ForegroundColor Cyan
Invoke-SSH "cd $AppDir/backend && npm install --omit=dev --legacy-peer-deps --ignore-scripts --quiet && (pm2 restart nestjs-backend || pm2 start dist/src/main.js --name nestjs-backend) && pm2 save"

# 6. Reload Nginx
Write-Host "`n[6/6] Reloading Nginx..." -ForegroundColor Cyan
Invoke-SSH "nginx -t && systemctl reload nginx"

Write-Host "`n==========================================" -ForegroundColor Green
Write-Host "   DEPLOY SUCCESSFUL!" -ForegroundColor Green
Write-Host "   Website: https://chinhta.io.vn" -ForegroundColor White
Write-Host "==========================================" -ForegroundColor Green
