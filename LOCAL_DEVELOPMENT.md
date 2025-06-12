# Configuració per a Desenvolupament Local

Aquest document explica com configurar i executar l'aplicació en un entorn de desenvolupament local.

## Problemes Comuns i Solucions

### Error: Certificats SSL no trobats

**Problema**: Nginx no pot trobar els certificats SSL de producció quan s'executa en local.

**Solució**: Utilitza la configuració local que exclou nginx i SSL:

```powershell
# Utilitza el script local en lloc del de producció
.\start-backend-local.ps1
```

### Error: Password authentication failed for user "postgres"

**Problema**: El backend no es pot connectar a PostgreSQL amb les credencials de producció.

**Solució**: Utilitza el fitxer `.env.local` amb credencials de desenvolupament:

1. El script `start-backend-local.ps1` crea automàticament un fitxer `.env.local`
2. Pots editar les credencials si cal:

```env
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres123
DB_PASSWORD=postgres123
```

## Configuració Recomanada per a Desenvolupament Local

### 1. Estructura de Fitxers

```
backend/
├── .env.local          # Variables d'entorn per a desenvolupament local
├── .env.aws            # Variables d'entorn per a AWS (producció)
├── docker-compose.yml  # Configuració de producció (amb nginx + SSL)
├── docker-compose.local.yml  # Configuració local (només backend + db)
└── ...
```

### 2. Scripts Disponibles

#### `start-backend-local.ps1`
- Inicia només el backend i PostgreSQL (sense nginx/SSL)
- Utilitza `docker-compose.local.yml`
- Carrega variables de `.env.local`
- Backend disponible a: `http://localhost:3001`
- PostgreSQL disponible a: `localhost:5432`

#### `start-frontend-local.ps1`
- Inicia el frontend React en mode desenvolupament
- Frontend disponible a: `http://localhost:3000`
- Connecta automàticament al backend local

#### `reset-local-environment.ps1`
- Neteja completament l'entorn local
- Elimina contenidors, volums i imatges
- Útil quan hi ha problemes de configuració

### 3. Flux de Treball Recomanat

1. **Primera vegada o després de problemes**:
   ```powershell
   .\reset-local-environment.ps1
   ```

2. **Iniciar backend**:
   ```powershell
   .\start-backend-local.ps1
   ```

3. **Iniciar frontend** (nova terminal):
   ```powershell
   .\start-frontend-local.ps1
   ```

### 4. Configuració de Variables d'Entorn

#### Backend Local (`.env.local`)
```env
# Base de dades
POSTGRES_DB=distribucio_taules_dev
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres123

# Backend
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
```

#### Frontend Local (`.env`)
```env
REACT_APP_API_BASE_URL=http://localhost:3001/api
```

### 5. Troubleshooting

#### El backend no s'inicia

1. **Verificar Docker**: Assegura't que Docker Desktop està executant-se
2. **Ports ocupats**: Comprova que els ports 3001 i 5432 no estan en ús
3. **Netejar entorn**: Executa `.\reset-local-environment.ps1`

#### El frontend no es connecta al backend

1. **Verificar URL**: Comprova que `REACT_APP_API_BASE_URL` apunta a `http://localhost:3001/api`
2. **CORS**: El backend hauria de permetre requests des de `localhost:3000`
3. **Backend actiu**: Verifica que el backend respon a `http://localhost:3001/api/health`

#### Errors de base de dades

1. **Reset complet**: Executa `.\reset-local-environment.ps1` per eliminar volums
2. **Credencials**: Verifica que les credencials de `.env.local` coincideixen
3. **Port ocupat**: Comprova que no hi ha altres instàncies de PostgreSQL al port 5432

### 6. Diferències amb Producció

| Aspecte | Local | Producció |
|---------|-------|-----------|
| SSL/HTTPS | No | Sí (Let's Encrypt) |
| Nginx | No | Sí (reverse proxy) |
| Base de dades | PostgreSQL local | RDS/PostgreSQL extern |
| Variables | `.env.local` | `.env.aws` |
| Domini | localhost | api.agrupam.com |
| Docker Compose | `docker-compose.local.yml` | `docker-compose.yml` |

### 7. Comandos Útils

```powershell
# Veure logs del backend
wsl bash -c "cd backend && docker compose -f docker-compose.local.yml logs backend"

# Veure logs de la base de dades
wsl bash -c "cd backend && docker compose -f docker-compose.local.yml logs db"

# Connectar-se a la base de dades
wsl bash -c "cd backend && docker compose -f docker-compose.local.yml exec db psql -U postgres -d distribucio_taules_dev"

# Aturar només els serveis (sense eliminar volums)
wsl bash -c "cd backend && docker compose -f docker-compose.local.yml down"

# Reconstruir imatges (si hi ha canvis al Dockerfile)
wsl bash -c "cd backend && docker compose -f docker-compose.local.yml up --build"
```

### 8. Desenvolupament amb Hot Reload

Si vols desenvolupar amb hot reload (canvis automàtics), pots executar el backend fora de Docker:

1. **Configura variables d'entorn localment**:
   ```powershell
   # A PowerShell
   $env:DB_HOST="localhost"
   $env:DB_USER="postgres"
   $env:DB_PASSWORD="postgres123"
   $env:DB_NAME="distribucio_taules_dev"
   $env:DB_PORT="5432"
   $env:PORT="3001"
   $env:NODE_ENV="development"
   ```

2. **Executa només PostgreSQL**:
   ```powershell
   wsl bash -c "cd backend && docker compose -f docker-compose.local.yml up db"
   ```

3. **Executa el backend amb Node**:
   ```powershell
   cd backend
   npm install
   npm run dev  # o node server.js
   ```

Aquesta configuració permet canvis en temps real tant al frontend com al backend.
