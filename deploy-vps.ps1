#!/usr/bin/env pwsh
# =========================================================================
# DEPLOY TO VINAHOST VPS – chinhta.io.vn
# Chạy: .\deploy-vps.ps1 -SshUser root -SshHost <IP_VPS>
# =========================================================================
param(
    [Parameter(Mandatory=$true)]
    [string]$SshHost,   # IP hoặc hostname VPS
    [string]$SshUser = "root",
    [string]$SshKey  = ""       # Đường dẫn đến private key (tuỳ chọn)
)

$Remote  = "${SshUser}@${SshHost}"
$AppDir  = "/opt/ktnb"
$SshArgs = if ($SshKey) { @("-i", $SshKey) } else { @() }

function Invoke-SSH { param([string]$cmd)
    & ssh.exe @SshArgs $Remote $cmd
}
function Invoke-SCP { param([string]$src, [string]$dst)
    & scp.exe @SshArgs -r $src "${Remote}:${dst}"
}

Write-Host "=== DEPLOY chinhta.io.vn ===" -ForegroundColor Green

# ── 1. Build frontend production ──────────────────────────────────────────
Write-Host "[1/6] Building frontend..." -ForegroundColor Cyan
Push-Location frontend
npm run build
if ($LASTEXITCODE -ne 0) { Write-Error "Frontend build failed"; exit 1 }
Pop-Location

# ── 2. Build backend ──────────────────────────────────────────────────────
Write-Host "[2/6] Building backend..." -ForegroundColor Cyan
Push-Location backend
npm run build
if ($LASTEXITCODE -ne 0) { Write-Error "Backend build failed"; exit 1 }
Pop-Location

# ── 3. Upload files lên VPS ───────────────────────────────────────────────
Write-Host "[3/6] Uploading files to ${Remote}:${AppDir}..." -ForegroundColor Cyan
Invoke-SSH "mkdir -p ${AppDir}/backend ${AppDir}/frontend ${AppDir}/deployVinahost"

# Upload backend source (excluding node_modules – VPS sẽ npm install)
$tempBackend = ".\backend-deploy-tmp"
if (Test-Path $tempBackend) { Remove-Item $tempBackend -Recurse -Force }
Copy-Item .\backend $tempBackend -Recurse
Remove-Item "$tempBackend\node_modules" -Recurse -Force -ErrorAction SilentlyContinue

Invoke-SCP $tempBackend "${AppDir}/backend"
Remove-Item $tempBackend -Recurse -Force

# Upload built frontend
Invoke-SCP ".\frontend\dist" "${AppDir}/frontend/dist"

# Upload deploy configs
Invoke-SCP ".\deployVinahost\docker-compose.yml" "${AppDir}/"
Invoke-SCP ".\deployVinahost\nginx.conf"         "${AppDir}/"
Invoke-SCP ".\deployVinahost\deploy.sh"          "${AppDir}/"
Invoke-SCP ".\deployVinahost\.env.example"       "${AppDir}/"
Invoke-SCP ".\deployVinahost\setup-ssl.sh"       "${AppDir}/"

# ── 4. Đảm bảo .env tồn tại trên VPS ────────────────────────────────────
Write-Host "[4/6] Checking .env on VPS..." -ForegroundColor Cyan
Invoke-SSH @"
cd ${AppDir}
if [ ! -f .env ]; then
  cp .env.example .env
  echo '⚠️  .env created from example – review DB_PASSWORD & JWT_SECRET!'
fi
"@

# ── 5. Chạy Docker Compose ────────────────────────────────────────────────
Write-Host "[5/6] Starting Docker containers..." -ForegroundColor Cyan
Invoke-SSH @"
cd ${AppDir}
chmod +x deploy.sh
docker compose down --remove-orphans
docker compose up -d --build
docker compose ps
"@

# ── 6. Cài đặt SSL (nếu chưa có) ─────────────────────────────────────────
Write-Host "[6/6] SSL check..." -ForegroundColor Cyan
Invoke-SSH @"
if [ ! -d /etc/letsencrypt/live/chinhta.io.vn ]; then
  echo 'Chạy certbot để cài SSL...'
  apt-get install -y certbot python3-certbot-nginx -q
  certbot --nginx -d chinhta.io.vn --non-interactive --agree-tos \
    -m admin@chinhta.io.vn --redirect
  systemctl reload nginx
  echo '✅ SSL đã được cài đặt!'
else
  echo '✅ SSL certificate đã tồn tại.'
fi
"@

Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
Write-Host "   DEPLOY HOÀN TẤT!" -ForegroundColor Green
Write-Host "   https://chinhta.io.vn" -ForegroundColor White
Write-Host "   Collab WS: wss://chinhta.io.vn/collab" -ForegroundColor White
Write-Host "==========================================" -ForegroundColor Green
