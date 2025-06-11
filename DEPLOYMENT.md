# Guia de Desplegament - Distribució Taules

## Arquitectura Actual

- **Frontend**: AWS S3 + CloudFront (CDN) amb domini personalitzat
- **Backend**: AWS EC2 (t2.micro) amb Docker + PostgreSQL + Nginx
- **Domini**: agrupam.com (frontend) / api.agrupam.com (backend)

## Prerequisites

- AWS CLI configurat amb credencials adequades
- Accés SSH a la instància EC2
- Clau privada SSH (`distribucio-key.pem`)
- Docker i Docker Compose instal·lats a EC2
- **Per desenvolupament local**: WSL amb Docker instal·lat
- **Clau SSH accessible des de WSL**: Còpia de `distribucio-key.pem` a WSL

## Configuració Inicial WSL (Primera vegada)

Si utilitzes WSL per al deployment del backend, primer configura l'entorn:

```bash
# Des de PowerShell - executar script de configuració
wsl ./setup-wsl-deployment.sh
```

O manualment:

```bash
# Des de PowerShell - copiar clau SSH a WSL
wsl cp /mnt/c/Users/edusp/.ssh/distribucio-key.pem ~/.ssh/
wsl chmod 600 ~/.ssh/distribucio-key.pem

# Verificar que AWS CLI està configurat a WSL
wsl aws configure list

# Si no està configurat, configura-ho
wsl aws configure
```

## Desplegament del Frontend

### Mètode 1: Script Automatitzat (Recomanat)

```bash
# Des del directori frontend/
cd frontend
../deploy-frontend.sh
```

### Mètode 2: PowerShell

```powershell
# Des del directori frontend/
Import-Module ..\deploy-scripts.ps1
Deploy-Frontend
```

### Mètode 3: Manual

```bash
# 1. Generar build
cd frontend
npm run build

# 2. Pujar a S3
aws s3 sync build/ s3://distribucio-taules-frontend-1749583112 --delete

# 3. Invalidar cache CloudFront
aws cloudfront create-invalidation --distribution-id E2E6KNDTJH5XOJ --paths "/*"
```

## Desplegament del Backend

### Mètode 1: Script WSL (Recomanat)

```bash
# Des de WSL
wsl ./deploy-backend.sh
```

### Mètode 2: PowerShell amb WSL

```powershell
# Des de PowerShell
Import-Module .\deploy-scripts.ps1
Deploy-Backend-WSL
```

### Mètode 3: Connexió Manual

```bash
# 1. Connectar via SSH des de WSL
ssh -i ~/.ssh/distribucio-key.pem ec2-user@api.agrupam.com

# 2. Actualitzar codi
cd /home/ec2-user/distribucio_taules
git pull origin main

# 3. Reconstruir i reiniciar
cd backend
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# 4. Verificar estat
docker-compose ps
```

## Verificació dels Desplegaments

### Frontend
- Accedir a: **https://agrupam.com**
- Verificar que els canvis es mostren correctament
- Comprovar consola del navegador per errors

### Backend
```bash
# Verificar API funcionant
curl -I https://api.agrupam.com

# Veure logs en temps real (des de EC2)
docker-compose logs -f backend
```

## Monitorització i Manteniment

### Logs del Backend

```bash
# Connectar a EC2
ssh -i ~/.ssh/distribucio-key.pem ec2-user@api.agrupam.com

# Logs dels serveis
cd /home/ec2-user/distribucio_taules/backend
docker-compose logs -f backend    # Logs de l'aplicació
docker-compose logs -f db        # Logs de PostgreSQL
docker-compose logs -f nginx     # Logs de Nginx
```

### Backup de Base de Dades

```bash
# Crear backup
docker-compose exec db pg_dump -U postgres distribucio_taules > backup_$(date +%Y%m%d_%H%M%S).sql

# Restaurar backup
docker-compose exec -T db psql -U postgres distribucio_taules < backup_file.sql
```

### Verificacions de Salut

```bash
# Estat dels contenidors
docker-compose ps

# Ús de recursos
df -h          # Espai de disc
free -h        # Memòria RAM
htop           # CPU i processos
```

## Troubleshooting Comú

### Frontend no es carrega
1. Verificar que la invalidació de CloudFront s'ha completat (pot trigar 15 minuts)
2. Comprovar que els fitxers s'han pujat correctament a S3
3. Revisar consola del navegador per errors

### Backend no respon
1. Verificar que els contenidors estan funcionant: `docker-compose ps`
2. Revisar logs: `docker-compose logs -f backend`
3. Comprovar connectivitat de xarxa: `curl -I https://api.agrupam.com`
4. Verificar configuració de Nginx

### Problemes de Base de Dades
1. Verificar que PostgreSQL està actiu: `docker-compose ps`
2. Comprovar logs: `docker-compose logs -f db`
3. Verificar espai de disc: `df -h`
4. Comprovar variables d'entorn del contenidor

### Problemes de WSL
1. Verificar que WSL està funcionant: `wsl --version`
2. Comprovar que la clau SSH està accessible: `wsl test -f ~/.ssh/distribucio-key.pem`
3. Verificar permisos de la clau: `wsl ls -la ~/.ssh/distribucio-key.pem`

## Scripts Disponibles

### Scripts d'Automatització
- **`deploy-frontend.sh`**: Desplegament automàtic del frontend
- **`deploy-backend.sh`**: Desplegament automàtic del backend via WSL
- **`deploy-scripts.ps1`**: Scripts PowerShell per Windows
- **`setup-wsl-deployment.sh`**: Configuració inicial de WSL

### Executar Scripts

```bash
# Frontend (des de frontend/)
../deploy-frontend.sh

# Backend (des de WSL)
./deploy-backend.sh

# PowerShell
Import-Module .\deploy-scripts.ps1
Deploy-Frontend        # per frontend
Deploy-Backend-WSL     # per backend
```

## Configuració de Dominis

### DNS Actual (IONOS)
- **agrupam.com** → CloudFront (d2ink6bg7i5wrs.cloudfront.net)
- **api.agrupam.com** → Elastic IP de EC2

### Certificats SSL
- **Frontend**: Gestionat automàticament per CloudFront
- **Backend**: Let's Encrypt via Certbot a EC2

## URLs del Projecte

- **Frontend**: https://agrupam.com
- **Backend API**: https://api.agrupam.com
- **Documentació**: Aquest fitxer DEPLOYMENT.md

## Contacte i Suport

Per problemes de desplegament:
1. Verificar logs dels contenidors
2. Comprovar status dels serveis AWS
3. Validar configuració DNS
4. Revisar certificats SSL

---

**Última actualització**: 11 de Juny de 2025  
**Versió**: 2.0.0 (Actualitzada amb suport WSL)
