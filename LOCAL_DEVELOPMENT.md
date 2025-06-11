# Desenvolupament Local

Aquest document conté les instruccions per executar l'aplicació en l'entorn de desenvolupament local.

## Prerequisits

- Node.js (versió 16 o superior)
- Docker Desktop
- WSL2 (Windows Subsystem for Linux)
- PowerShell

## Scripts Disponibles

Tenim 3 scripts principals per al desenvolupament local:

### 1. 🚀 Iniciar Backend
```powershell
.\start-backend-local.ps1
```
Aixeca la base de dades PostgreSQL i el servidor backend amb Docker.

### 2. 🎨 Iniciar Frontend  
```powershell
.\start-frontend-local.ps1
```
Aixeca el servidor de desenvolupament React del frontend.

### 3. 🔄 Reset Base de Dades
```powershell
.\reset-database.ps1
```
Elimina completament la base de dades i la recrea des de zero.

## Ús Típic

### Primera vegada:
1. Executa el reset per configurar la BD: `.\reset-database.ps1`
2. En una altra terminal, inicia el frontend: `.\start-frontend-local.ps1`

### Desenvolupament diari:
1. Inicia el backend: `.\start-backend-local.ps1`  
2. En una altra terminal, inicia el frontend: `.\start-frontend-local.ps1`

### Si tens problemes amb la BD:
1. Executa: `.\reset-database.ps1`

## URLs d'accés

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:3001
- **Base de dades:** localhost:5432

## Notes Importants

- Els scripts utilitzen WSL per executar Docker
- El frontend s'executa amb npm de Windows
- Les variables d'entorn estan configurades a `backend/.env.production`
- La base de dades es crea automàticament amb totes les taules necessàries

### Configuració Inicial

#### 1. Configurar Backend

Crear fitxer `backend/.env.production`:
```env
DB_HOST=localhost
DB_USER=postgres
DB_PASSWORD=yourpassword
DB_NAME=distribucio_taules
DB_PORT=5432
PORT=3001
NODE_ENV=production
```

#### 2. Instal·lar Dependències Frontend

```powershell
cd frontend
npm install
```

### 🚀 Iniciar Aplicació

### 🚀 Iniciar Aplicació

#### Opció A: Scripts Separats (Recomanat per debugging)

**Backend (Terminal 1)**:
```powershell
.\start-backend-local.ps1
```

**Frontend (Terminal 2)**:
```powershell
.\start-frontend-local.ps1
```

#### Opció B: Script Automatitzat

```powershell
# Iniciar tots els serveis
.\start-local-simple.ps1

# Opcions PowerShell
.\start-local.ps1                    # Iniciar tot
.\start-local.ps1 -SkipBackend      # Només frontend
.\start-local.ps1 -SkipFrontend     # Només backend
.\start-local.ps1 -Rebuild          # Rebuild backend
```

#### Opció C: Manual (el teu mètode actual)

**Terminal 1 - Backend (WSL)**:
```bash
wsl
cd /mnt/c/Users/edusp/projectes/distribucio_taules/backend
docker compose --env-file .env.production up --build
```

**Terminal 2 - Frontend (Windows)**:
```powershell
cd frontend
npm start
```

### 🌐 URLs de Desenvolupament

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **PostgreSQL**: localhost:5432

### 🛑 Aturar Serveis

```powershell
# Script automatitzat
.\stop-local.bat
# o
.\stop-local.ps1

# Manual
# Frontend: Ctrl+C a la terminal
# Backend: Ctrl+C + docker compose down
```

### 📊 Verificar Estat

```bash
# Verificar contenidors Docker
wsl docker ps

# Verificar logs backend
wsl docker compose logs -f backend

# Verificar logs PostgreSQL
wsl docker compose logs -f db
```

### 🔧 Troubleshooting

#### Backend no inicia
```bash
# Verificar Docker
wsl docker --version

# Verificar fitxer .env.production
ls -la backend/.env.production

# Logs detallats
wsl docker compose --env-file .env.production logs
```

#### Frontend no carrega
```powershell
# Reinstal·lar dependències
cd frontend
Remove-Item node_modules -Recurse -Force
npm install
npm start
```

#### Port ocupat
```powershell
# Verificar ports ocupats
netstat -ano | findstr :3000
netstat -ano | findstr :3001

# Matar procés si cal
taskkill /PID <PID> /F
```

### 📝 Notes de Desenvolupament

1. **Hot Reload**: El frontend té hot reload automàtic
2. **Base de Dades**: PostgreSQL via Docker, dades persistents
3. **Logs**: Disponibles via `docker compose logs`
4. **Debug**: Utilitzar eines de desenvolupador del navegador

### 🗂️ Estructura de Fitxers de Configuració

```
backend/
├── .env.production          # Configuració local
├── docker-compose.yml       # Serveis Docker
└── Dockerfile              # Imatge backend

frontend/
├── package.json             # Dependències
└── src/                    # Codi font
```

### 🎯 Workflow Recomanat

1. **Iniciar**: `.\start-local.bat`
2. **Desenvolupar**: Editar fitxers (hot reload automàtic)
3. **Testejar**: http://localhost:3000
4. **Commit**: Git workflow normal
5. **Aturar**: `.\stop-local.bat`

### 🔄 Actualitzar Dependències

```powershell
# Frontend
cd frontend
npm update

# Backend (reconstruir Docker)
.\start-local.ps1 -Rebuild
```
