# Distribució de taules

Aplicació web per gestionar i distribuir alumnes en taules dins d'una aula. Permet la gestió dels alumnes, les taules i la distribució dels alumnes de manera visual mitjançant arrossegament (drag and drop).

## Índex

- [Descripció](#descripció)
- [Funcionalitats](#funcionalitats)
- [Tecnologies](#tecnologies)
- [Instal·lació](#instal·lació)
- [Ús](#ús)
- [Estructura del projecte](#estructura-del-projecte)

## Descripció

L'aplicació Distribució de Taules és una eina dissenyada per ajudar els docents a organitzar les taules i els alumnes dins de l'aula. Permet crear, editar i gestionar alumnes i taules, així com assignar alumnes a taules específiques mitjançant una interfície intuïtiva de  drag and drop.

## Funcionalitats

- **Gestió d'alumnes**: Crear, editar, veure i eliminar alumnes.
- **Gestió de taules**: Crear, editar, veure i eliminar taules.
- **Distribució d'alumnes**: Assignar alumnes a taules mitjançant drag and drop.
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

### Execució manual

1. **Iniciar el backend**:
   ```bash
   cd backend
   npm start
   ```

2. **Iniciar el frontend**:
   ```bash
   cd frontend
   npm start
   ```

3. **Accedir a l'aplicació**:
   - Obrir el navegador i accedir a: `http://localhost:3000`

### Execució amb script

El projecte inclou un script batch (`start.bat`) que inicia tant el backend com el frontend automàticament:
   ```bash
   ./start.bat
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

