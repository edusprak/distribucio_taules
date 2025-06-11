# start-frontend-local.ps1 - Només iniciar frontend local

Write-Host "🎨 Iniciant frontend en local..." -ForegroundColor Cyan
Write-Host ""

# Verificar dependències
if (!(Test-Path "frontend\node_modules")) {
    Write-Host "📦 Instal·lant dependències del frontend..." -ForegroundColor Yellow
    Set-Location frontend
    npm install
    Set-Location ..
}

# Navegar al directori frontend i executar
Set-Location frontend

Write-Host "🚀 Executant npm start..." -ForegroundColor Yellow
Write-Host "📍 Directori: $(Get-Location)" -ForegroundColor Gray

try {
    npm start
} catch {
    Write-Host "❌ Error executant npm start: $($_.Exception.Message)" -ForegroundColor Red
} finally {
    # Tornar al directori original
    Set-Location ..
}
