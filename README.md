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

**Scripts disponibles** (mètode recomanat):

```powershell
# 1. Neteja l'entorn local si hi ha problemes (opcional)
.\reset-local-environment.ps1

# 2. Iniciar backend local (Docker + PostgreSQL, sense SSL)
.\start-backend-local.ps1

# 3. Iniciar frontend (React) - en una altra terminal
.\start-frontend-local.ps1
```

**URLs locals**:
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001/api
- PostgreSQL: localhost:5432

**Nota**: Per a problemes de configuració local, consulta [LOCAL_DEVELOPMENT.md](LOCAL_DEVELOPMENT.md)

### Desplegament de Producció

Consulta [AWS_DEPLOYMENT.md](AWS_DEPLOYMENT.md) per a instruccions de desplegament a AWS.

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

### Desplegament Local
Per desenvolupament local, consulta [LOCAL_DEVELOPMENT.md](./LOCAL_DEVELOPMENT.md)

### Desplegament a AWS (Producció)
L'aplicació es pot desplegar a AWS utilitzant la capa gratuita:

- **Frontend**: AWS S3 + CloudFront amb domini personalitzat (agrupam.com)
- **Backend**: AWS EC2 t2.micro amb Docker i PostgreSQL

📖 **Guia completa**: Consulta [AWS_DEPLOYMENT.md](./AWS_DEPLOYMENT.md) per instruccions detallades pas a pas.

**Scripts de desplegament**:
- `deploy-frontend-aws.sh`: Desplegament del frontend a S3
- `deploy-backend-aws.sh`: Desplegament del backend a EC2

## Manteniment

### Documentació del Projecte

- **Desenvolupament local**: Consulta `LOCAL_DEVELOPMENT.md` per instruccions completes
- **Autenticació**: Consulta `AUTHENTICATION.md` per gestió d'usuaris i autenticació

### Fitxers Importants

- `start-backend-local.ps1`: Script per iniciar backend en local
- `start-frontend-local.ps1`: Script per iniciar frontend en local  
- `reset-database.ps1`: Script per reiniciar la base de dades local
- `deploy-frontend-aws.sh`: Script de desplegament del frontend a AWS
- `deploy-backend-aws.sh`: Script de desplegament del backend a AWS
- `LOCAL_DEVELOPMENT.md`: Guia completa de desenvolupament local
- `AWS_DEPLOYMENT.md`: Guia completa de desplegament a AWS
- `AUTHENTICATION.md`: Documentació del sistema d'autenticació

