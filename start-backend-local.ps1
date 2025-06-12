# start-backend-local.ps1 - Només iniciar backend local (sense nginx/SSL)

Write-Host "🐳 Iniciant backend en local (desenvolupament)..." -ForegroundColor Cyan
Write-Host ""

# Verificar fitxers necessaris
if (!(Test-Path "backend\.env.local")) {
    Write-Host "❌ Error: No es troba backend\.env.local" -ForegroundColor Red
    Write-Host "💡 Creant fitxer .env.local per defecte..." -ForegroundColor Yellow
    
    # Crear fitxer .env.local per defecte si no existeix
    @"
# Configuració per a desenvolupament local
POSTGRES_DB=distribucio_taules_dev
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres123

# Variables del backend
DB_HOST=db
DB_USER=postgres
DB_PASSWORD=postgres123
DB_NAME=distribucio_taules_dev
DB_PORT=5432
PORT=3001
NODE_ENV=development
JWT_SECRET=your-super-secret-jwt-key-for-local-dev
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
"@ | Out-File -FilePath "backend\.env.local" -Encoding UTF8
    
    Write-Host "✅ Fitxer .env.local creat. Pots editar-lo si cal." -ForegroundColor Green
}

# Navegar al directori backend i executar
Set-Location backend

Write-Host "🚀 Executant Docker Compose per a desenvolupament local..." -ForegroundColor Yellow
Write-Host "📍 Directori: $(Get-Location)" -ForegroundColor Gray
Write-Host "🌐 Backend estarà disponible a: http://localhost:3001" -ForegroundColor Green
Write-Host "🗄️  PostgreSQL estarà disponible a: localhost:5432" -ForegroundColor Green
Write-Host ""

try {
    # Executar docker compose amb la configuració local
    wsl bash -c "docker compose -f docker-compose.local.yml --env-file .env.local up --build"
} catch {
    Write-Host "❌ Error executant Docker Compose: $($_.Exception.Message)" -ForegroundColor Red
} finally {
    # Tornar al directori original
    Set-Location ..
}
