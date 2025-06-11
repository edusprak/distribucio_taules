# deploy-scripts.ps1
# Scripts PowerShell per desplegament de Distribució Taules

function Deploy-Frontend {
    Write-Host "🚀 Iniciating frontend deployment..." -ForegroundColor Green
    
    # Verificar que estem al directori correcte
    if (!(Test-Path "frontend/package.json")) {
        Write-Host "❌ Error: Aquest script s'ha d'executar des del directori arrel del projecte" -ForegroundColor Red
        return
    }
    
    try {
        # Canviar al directori frontend
        Set-Location frontend
        
        # Verificar node_modules
        if (!(Test-Path "node_modules")) {
            Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
            npm install
        }
        
        # Generar build
        Write-Host "🔨 Building production version..." -ForegroundColor Yellow
        npm run build
        
        if ($LASTEXITCODE -ne 0) {
            throw "Build failed"
        }
        
        # Pujar a S3
        Write-Host "☁️ Uploading to S3..." -ForegroundColor Yellow
        aws s3 sync build/ s3://distribucio-taules-frontend-1749583112 --delete
        
        if ($LASTEXITCODE -ne 0) {
            throw "S3 upload failed"
        }
        
        # Invalidar CloudFront
        Write-Host "🔄 Invalidating CloudFront cache..." -ForegroundColor Yellow
        $invalidation = aws cloudfront create-invalidation --distribution-id E2E6KNDTJH5XOJ --paths "/*" --query 'Invalidation.Id' --output text
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ CloudFront invalidation created: $invalidation" -ForegroundColor Green
            Write-Host "⏳ Cache invalidation can take up to 15 minutes..." -ForegroundColor Yellow
        } else {
            throw "CloudFront invalidation failed"
        }
        
        Write-Host ""
        Write-Host "🎉 Frontend deployment completed successfully!" -ForegroundColor Green
        Write-Host "🌐 Frontend URL: https://agrupam.com" -ForegroundColor Cyan
        
    } catch {
        Write-Host "❌ Error during frontend deployment: $_" -ForegroundColor Red
    } finally {
        # Tornar al directori arrel
        Set-Location ..
    }
}

function Deploy-Backend-WSL {
    Write-Host "🚀 Initiating backend deployment via WSL..." -ForegroundColor Green
    
    try {
        # Verificar que WSL està disponible
        $wslVersion = wsl --version 2>&1
        if ($LASTEXITCODE -ne 0) {
            throw "WSL not available or not configured"
        }
        
        # Verificar que la clau SSH existeix a WSL
        $sshKeyExists = wsl test -f ~/.ssh/distribucio-key.pem
        if ($LASTEXITCODE -ne 0) {
            Write-Host "❌ SSH key not found in WSL" -ForegroundColor Red
            Write-Host "💡 Run: wsl cp /mnt/c/Users/edusp/.ssh/distribucio-key.pem ~/.ssh/" -ForegroundColor Yellow
            return
        }
        
        # Executar script de deploy
        Write-Host "▶️ Executing deployment script..." -ForegroundColor Yellow
        wsl ./deploy-backend.sh
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host ""
            Write-Host "🎉 Backend deployment completed successfully!" -ForegroundColor Green
            Write-Host "🌐 API URL: https://api.agrupam.com" -ForegroundColor Cyan
        } else {
            throw "Backend deployment failed"
        }
        
    } catch {
        Write-Host "❌ Error during backend deployment: $_" -ForegroundColor Red
    }
}

function Setup-WSL-Deployment {
    Write-Host "🛠️ Setting up WSL for deployment..." -ForegroundColor Green
    
    try {
        # Copiar clau SSH a WSL
        Write-Host "🔑 Copying SSH key to WSL..." -ForegroundColor Yellow
        wsl cp /mnt/c/Users/edusp/.ssh/distribucio-key.pem ~/.ssh/
        wsl chmod 600 ~/.ssh/distribucio-key.pem
        
        # Verificar AWS CLI
        Write-Host "☁️ Checking AWS CLI configuration..." -ForegroundColor Yellow
        $awsConfig = wsl aws configure list 2>&1
        
        if ($awsConfig -match "not set") {
            Write-Host "⚠️ AWS CLI not fully configured in WSL" -ForegroundColor Yellow
            Write-Host "💡 Run: wsl aws configure" -ForegroundColor Cyan
        } else {
            Write-Host "✅ AWS CLI configured in WSL" -ForegroundColor Green
        }
        
        Write-Host "✅ WSL deployment setup completed!" -ForegroundColor Green
        
    } catch {
        Write-Host "❌ Error during WSL setup: $_" -ForegroundColor Red
    }
}

function Show-Deployment-Status {
    Write-Host "📊 Checking deployment status..." -ForegroundColor Green
    
    # Verificar frontend
    Write-Host "🌐 Frontend (https://agrupam.com):" -ForegroundColor Yellow
    try {
        $frontendResponse = Invoke-WebRequest -Uri "https://agrupam.com" -Method Head -TimeoutSec 10
        Write-Host "   ✅ Status: $($frontendResponse.StatusCode)" -ForegroundColor Green
    } catch {
        Write-Host "   ❌ Not accessible: $_" -ForegroundColor Red
    }
    
    # Verificar backend
    Write-Host "🔗 Backend API (https://api.agrupam.com):" -ForegroundColor Yellow
    try {
        $backendResponse = Invoke-WebRequest -Uri "https://api.agrupam.com" -Method Head -TimeoutSec 10
        Write-Host "   ✅ Status: $($backendResponse.StatusCode)" -ForegroundColor Green
    } catch {
        Write-Host "   ❌ Not accessible: $_" -ForegroundColor Red
    }
}

# Funcions d'ajuda
function Show-Deployment-Help {
    Write-Host "📚 Deployment Commands Help:" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Frontend Deployment:" -ForegroundColor Yellow
    Write-Host "   Deploy-Frontend" -ForegroundColor White
    Write-Host ""
    Write-Host "Backend Deployment:" -ForegroundColor Yellow
    Write-Host "   Deploy-Backend-WSL" -ForegroundColor White
    Write-Host ""
    Write-Host "Setup:" -ForegroundColor Yellow
    Write-Host "   Setup-WSL-Deployment" -ForegroundColor White
    Write-Host ""
    Write-Host "Status Check:" -ForegroundColor Yellow
    Write-Host "   Show-Deployment-Status" -ForegroundColor White
    Write-Host ""
    Write-Host "URLs:" -ForegroundColor Yellow
    Write-Host "   Frontend: https://agrupam.com" -ForegroundColor Cyan
    Write-Host "   Backend:  https://api.agrupam.com" -ForegroundColor Cyan
}

# Exportar funcions
Export-ModuleMember -Function Deploy-Frontend, Deploy-Backend-WSL, Setup-WSL-Deployment, Show-Deployment-Status, Show-Deployment-Help

Write-Host "✅ Deployment scripts loaded!" -ForegroundColor Green
Write-Host "💡 Run 'Show-Deployment-Help' for available commands" -ForegroundColor Yellow
