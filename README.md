# Distribució de Grups

Aplicació web per gestionar i distribuir alumnes en grups dins d'una aula. Permet la gestió dels alumnes, els grups i la distribució dels alumnes de manera visual mitjançant arrossegament (drag and drop).

## Índex

- [Descripció](#descripció)
- [Funcionalitats](#funcionalitats)
- [Tecnologies](#tecnologies)
- [Instal·lació](#instal·lació)
- [Ús](#ús)
- [Estructura del projecte](#estructura-del-projecte)
- [Desplegament](#desplegament)
- [Manteniment](#manteniment)

## Descripció

L'aplicació Distribució de Grups és una eina dissenyada per ajudar els docents a organitzar els i els alumnes dins de l'aula. Permet crear, editar i gestionar alumnes i grups, així com assignar alumnes a grups específics mitjançant una interfície intuïtiva de  drag and drop.

## Funcionalitats

- **Gestió d'alumnes**: Crear, editar, veure i eliminar alumnes.
- **Gestió de grups**: Crear, editar, veure i eliminar grups.
- **Distribució d'alumnes**: Assignar alumnes a grups mitjançant drag and drop.
- **Guardar configuracions**: Guardar i recuperar diferents configuracions de distribució d'alumnes.

## Tecnologies

### Backend
- Node.js
- Express.js
- PostgreSQL (Base de dades)
- Cors
- Dotenv

### Frontend
- React
- React Router Dom
- React DnD (Drag and Drop)
- Axios (Peticions HTTP)
- React Toastify (Notificacions)
- CSS

## Instal·lació

### Requisits previs
- Node.js
- npm (Node Package Manager)
- PostgreSQL

### Passos d'instal·lació

1. **Clonar el repositori**:
   ```bash
   git clone <url-del-repositori>
   cd distribucio_taules
   ```

2. **Instal·lar les dependències del backend**:
   ```bash
   cd backend
   npm install
   ```

3. **Configurar la base de dades**:
   - Crear una base de dades PostgreSQL
   - Crear un fitxer `.env` a la carpeta `backend` amb les següents variables:
     ```
     DB_HOST=localhost
     DB_USER=<usuari>
     DB_PASSWORD=<contrasenya>
     DB_NAME=<nom-de-la-base-de-dades>
     DB_PORT=5432
     PORT=3001
     ```

4. **Instal·lar les dependències del frontend**:
   ```bash
   cd ../frontend
   npm install
   ```

## Ús

### Desplegament Local (Desenvolupament)

### Desplegament Local (Desenvolupament)

**Scripts disponibles** (mètode recomanat):

```powershell
# 1. Reset i configuració inicial de la base de dades
.\reset-database.ps1

# 2. Iniciar backend (Docker + PostgreSQL)
.\start-backend-local.ps1

# 3. Iniciar frontend (React) - en una altra terminal
.\start-frontend-local.ps1
```

**URLs locals:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001

Per més detalls, consulta [LOCAL_DEVELOPMENT.md](./LOCAL_DEVELOPMENT.md)
   ```env
   DB_HOST=localhost
   DB_USER=postgres
   DB_PASSWORD=<contrasenya>
   DB_NAME=distribucio_taules
   DB_PORT=5432
   PORT=3001
   ```

2. **WSL amb Docker** configurat i funcionant

#### URLs Locals
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001

### Execució amb script (Desenvolupament tradicional)

El projecte també inclou scripts per desenvolupament tradicional (sense Docker):
```bash
./start-dev.bat
```

## Estructura del Projecte

### Backend
- `/backend/server.js`: Punt d'entrada del servidor
- `/backend/src/controllers/`: Controladors per a cada entitat
- `/backend/src/routes/`: Definició de rutes de l'API
- `/backend/src/db/`: Configuració de la connexió a la base de dades
- `/backend/src/models/`: Models de dades

### Frontend
- `/frontend/src/App.js`: Component principal
- `/frontend/src/pages/`: Pàgines principals de l'aplicació
- `/frontend/src/components/`: Components reutilitzables
- `/frontend/src/services/`: Serveis per a peticions API
- `/frontend/src/contexts/`: Contextos de React (p. ex. DragContext)
- `/frontend/src/utils/`: Utilitats i funcions auxiliars

## Desplegament

### Desplegament del Frontend

El frontend està desplegat a AWS S3 amb CloudFront com a CDN:

1. **Generar build de producció**:
   ```bash
   cd frontend
   npm run build
   ```

2. **Pujar a S3**:
   ```bash
   aws s3 sync build/ s3://distribucio-taules-frontend-1749583112 --delete
   ```

3. **Invalidar cache de CloudFront**:
   ```bash
   aws cloudfront create-invalidation --distribution-id E2E6KNDTJH5XOJ --paths "/*"
   ```

### Desplegament del Backend

El backend està desplegat a una instància EC2 amb Docker. 
**Nota**: Per Windows, es recomana utilitzar WSL per al deployment del backend.

#### Configuració inicial WSL (primera vegada)

```bash
# Des de WSL, executar script de configuració
./setup-wsl-deployment.sh
```

#### Desplegament

1. **Via WSL (recomanat per Windows)**:
   ```bash
   # Des de WSL
   ./deploy-backend.sh
   ```

2. **Via PowerShell**:
   ```powershell
   Import-Module .\deploy-scripts.ps1
   Deploy-Backend-WSL
   ```

3. **Verificar estat**:
   ```bash
   # Des de WSL - connectar i verificar
   ssh -i ~/.ssh/distribucio-key.pem ec2-user@api.agrupam.com
   cd /home/ec2-user/distribucio_taules/backend
   docker-compose ps
   docker-compose logs -f backend
   ```

### URLs del projecte

- **Frontend**: https://agrupam.com
- **Backend API**: https://api.agrupam.com
- **Documentació de desplegament**: Consultar `DEPLOYMENT.md` per a més detalls

## Manteniment

### Documentació del Projecte

- **Desenvolupament local**: Consulta `LOCAL_DEVELOPMENT.md` per instruccions completes
- **Guia ràpida**: Consulta `QUICK_DEPLOY.md` per instruccions essencials
- **Desplegament producció**: Consulta `DEPLOYMENT.md` per instruccions detallades
- **Neteja del projecte**: Consulta `CLEANUP_SUMMARY.md` per veure els canvis recents
- **Scripts d'automatització**: Utilitza els scripts `start-local.*`, `deploy-*.sh` o `deploy-scripts.ps1`

### Fitxers Importants

- `start-local.bat` / `start-local.ps1`: Scripts per iniciar en local
- `stop-local.bat` / `stop-local.ps1`: Scripts per aturar serveis locals
- `start-dev.bat`: Script per desenvolupament tradicional (sense Docker)
- `setup-wsl-deployment.sh`: Configuració inicial de WSL per deployment
- `deploy-frontend.sh`: Desplegament automàtic del frontend a AWS
- `deploy-backend.sh`: Desplegament automàtic del backend a EC2 (WSL)
- `deploy-scripts.ps1`: Scripts PowerShell per Windows (inclou WSL)
- `LOCAL_DEVELOPMENT.md`: Guia completa de desenvolupament local
- `DEPLOYMENT.md`: Guia completa de desplegament en producció
- `CLEANUP_SUMMARY.md`: Resum de la neteja del projecte

