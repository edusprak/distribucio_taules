# reset-database-local.ps1 - Reinicialitzar completament la base de dades local

Write-Host "🔄 Reinicialitzant base de dades local..." -ForegroundColor Yellow
Write-Host ""

# Canviar al directori backend
Set-Location backend

Write-Host "🛑 Aturant contenidors existents..." -ForegroundColor Red
wsl docker compose -f docker-compose.local.yml --env-file .env.local down -v

Write-Host "🗑️ Netejant volums i xarxes..." -ForegroundColor Yellow
wsl docker volume prune -f
wsl docker network prune -f

Write-Host "🐳 Eliminant imatges del projecte..." -ForegroundColor Yellow
wsl docker images --format "table {{.Repository}}:{{.Tag}}" | Select-String "backend" | ForEach-Object {
    $imageName = $_.ToString().Split()[0]
    wsl docker rmi $imageName 2>$null
}

Write-Host "🚀 Recreant contenidors amb base de dades fresca..." -ForegroundColor Green
wsl docker compose -f docker-compose.local.yml --env-file .env.local up --build

# Tornar al directori original
Set-Location ..

Write-Host ""
Write-Host "✅ Base de dades local reinicialitzada correctament!" -ForegroundColor Green
Write-Host "🌐 Backend disponible a: http://localhost:3001" -ForegroundColor Cyan
Write-Host "🗄️ Base de dades PostgreSQL disponible al port 5432" -ForegroundColor Cyan
