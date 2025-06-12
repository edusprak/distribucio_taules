# reset-local-environment.ps1 - Neteja l'entorn de desenvolupament local

Write-Host "🧹 Netejant entorn de desenvolupament local..." -ForegroundColor Cyan
Write-Host ""

# Navegar al directori backend
Set-Location backend

Write-Host "🛑 Aturant contenidors locals..." -ForegroundColor Yellow
try {
    wsl bash -c "docker compose -f docker-compose.local.yml down"
} catch {
    Write-Host "⚠️  No hi havia contenidors executant-se" -ForegroundColor Yellow
}

Write-Host "🗑️  Eliminant volums locals..." -ForegroundColor Yellow
try {
    wsl bash -c "docker volume rm backend_postgres_data_local" 2>$null
} catch {
    Write-Host "⚠️  El volum ja estava eliminat o no existia" -ForegroundColor Yellow
}

Write-Host "🧼 Netejant imatges no utilitzades..." -ForegroundColor Yellow
try {
    wsl bash -c "docker system prune -f"
} catch {
    Write-Host "⚠️  Error netejant imatges" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "✅ Entorn local netejat!" -ForegroundColor Green
Write-Host "💡 Ara pots executar .\start-backend-local.ps1 per iniciar de nou" -ForegroundColor Cyan

# Tornar al directori original
Set-Location ..
