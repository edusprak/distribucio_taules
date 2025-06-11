# reset-database.ps1 - Reinicialitzar completament la base de dades local

Write-Host "🔄 Reinicialitzant base de dades local..." -ForegroundColor Yellow
Write-Host ""

# Canviar al directori backend
Set-Location backend

Write-Host "🛑 Aturant contenidors existents..." -ForegroundColor Red
wsl docker compose --env-file .env.production down -v

Write-Host "🗑️ Netejant volums i xarxes..." -ForegroundColor Yellow
wsl docker volume prune -f
wsl docker network prune -f

Write-Host "🐳 Eliminant imatges del projecte..." -ForegroundColor Yellow
wsl docker images --format "table {{.Repository}}:{{.Tag}}" | Select-String "backend" | ForEach-Object {
    $imageName = $_.ToString().Split()[0]
    wsl docker rmi $imageName 2>$null
}

Write-Host "🚀 Recreant contenidors amb base de dades fresca..." -ForegroundColor Green
wsl docker compose --env-file .env.production up --build

# Tornar al directori original
Set-Location ..
