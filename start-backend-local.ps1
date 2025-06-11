# start-backend-local.ps1 - Només iniciar backend local

Write-Host "🐳 Iniciant backend en local..." -ForegroundColor Cyan
Write-Host ""

# Verificar fitxers necessaris
if (!(Test-Path "backend\.env.production")) {
    Write-Host "❌ Error: No es troba backend\.env.production" -ForegroundColor Red
    exit 1
}

# Navegar al directori backend i executar
Set-Location backend

Write-Host "🚀 Executant Docker Compose..." -ForegroundColor Yellow
Write-Host "📍 Directori: $(Get-Location)" -ForegroundColor Gray

try {
    # Executar docker compose amb les variables d'entorn
    wsl bash -c "docker compose --env-file .env.production up --build"
} catch {
    Write-Host "❌ Error executant Docker Compose: $($_.Exception.Message)" -ForegroundColor Red
} finally {
    # Tornar al directori original
    Set-Location ..
}
