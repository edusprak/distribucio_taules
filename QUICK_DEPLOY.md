# Guia Ràpida de Desplegament

## 🏠 Desplegament Local

### Iniciar en Local
```powershell
# Mètode ràpid (scripts separats)
.\start-backend-local.ps1    # Terminal 1
.\start-frontend-local.ps1   # Terminal 2

# O script automatitzat
.\start-local-simple.ps1

# O mètode manual
# Backend: wsl + cd backend + docker compose --env-file .env.production up --build
# Frontend: cd frontend + npm start
```

### Aturar Serveis Locals
```powershell
.\stop-local.bat
```

### URLs Locals
- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:3001

## 🚀 Desplegament Producció

### Frontend
```bash
cd frontend
../deploy-frontend.sh
```

### Backend
```bash
# Des de WSL
wsl ./deploy-backend.sh

# O des de PowerShell
Import-Module .\deploy-scripts.ps1
Deploy-Backend-WSL
```

## 🔗 URLs del Projecte
- **Frontend**: https://agrupam.com
- **Backend API**: https://api.agrupam.com

## 🔧 Configuració Inicial (Només primera vegada)
```bash
# Configurar WSL per backend
wsl ./setup-wsl-deployment.sh
```

## 🔍 Verificació Ràpida
```bash
# Frontend: Obrir navegador a https://agrupam.com
# Backend: curl -I https://api.agrupam.com
```

## 📋 Connexió SSH a EC2
```bash
# Des de WSL
ssh -i ~/.ssh/distribucio-key.pem ec2-user@api.agrupam.com
```

## 📊 Logs del Backend
```bash
# Un cop connectat a EC2
cd /home/ec2-user/distribucio_taules/backend
docker-compose logs -f backend
```

## 🆘 Troubleshooting
1. **Frontend no carrega**: Espera 15 min per propagació CloudFront
2. **Backend no respon**: Verifica `docker-compose ps` a EC2
3. **SSH no funciona**: Verifica clau a `~/.ssh/distribucio-key.pem`

Per més detalls, consulta `DEPLOYMENT.md`
