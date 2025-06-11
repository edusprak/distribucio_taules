# Sistema d'Autenticació - Distribució de Taules

## Descripció
S'ha implementat un sistema d'autenticació senzill per protegir l'aplicació de distribució d'alumnes. El sistema utilitza JWT (JSON Web Tokens) per gestionar les sessions d'usuari.

## Característiques

### Backend
- **JWT Authentication**: Tokens amb expiració de 24 hores
- **Middleware de protecció**: Totes les rutes de l'API requereixen autenticació excepte `/api/auth/login`
- **Credencials configurables**: Via variables d'entorn
- **Encriptació**: Suport per contrasenyes encriptades (actualment desactivat per simplicitat)

### Frontend
- **Context d'autenticació**: Gestió global de l'estat de login
- **Protecció de rutes**: Components protegits automàticament
- **Interfície Material-UI**: Pantalla de login professional
- **Persistència**: Token guardat al localStorage
- **Logout segur**: Neteja completa de l'estat

## Credencials per defecte

```
Usuari: admin
Contrasenya: distribucio2025
```

## Configuració

### Variables d'entorn del Backend (.env)
```bash
JWT_SECRET=super-secret-key-for-distribucio-taules-2025
ADMIN_USERNAME=admin
ADMIN_PASSWORD=distribucio2025
```

### Variables d'entorn del Frontend (.env)
```bash
REACT_APP_API_BASE_URL=http://localhost:3001
```

## Endpoints d'autenticació

### POST /api/auth/login
Autenticar usuari i obtenir token.

**Request:**
```json
{
  "username": "admin",
  "password": "distribucio2025"
}
```

**Response (èxit):**
```json
{
  "message": "Login exitós",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "username": "admin"
  }
}
```

### GET /api/auth/verify
Verificar validesa del token (requereix autenticació).

**Headers:**
```
Authorization: Bearer <token>
```

## Rutes protegides

Totes les següents rutes requereixen un token vàlid:
- `/api/students/*`
- `/api/classes/*`
- `/api/plantilles_aula/*`
- `/api/distribucions/*`
- `/api/assignments/*`

## Funcionament del Frontend

1. **Càrrega inicial**: L'aplicació comprova si hi ha un token vàlid al localStorage
2. **No autenticat**: Mostra la pantalla de login
3. **Autenticat**: Mostra l'aplicació principal amb navegació
4. **Token expirat**: Redirigeix automàticament al login
5. **Logout**: Neteja el token i torna al login

## Components clau

### AuthContext
- Gestiona l'estat global d'autenticació
- Proporciona funcions `login()` i `logout()`
- Configura automàticament els headers d'axios

### ProtectedRoute
- Component wrapper que protegeix rutes
- Redirigeix al login si no hi ha autenticació

### LoginPage
- Interfície d'usuari per fer login
- Validació de camps i gestió d'errors
- Disseny responsive amb Material-UI

## Millores futures

1. **Contrasenyes encriptades**: Utilitzar bcrypt per contrasenyes hasheadas
2. **Base de dades d'usuaris**: Guardar usuaris en PostgreSQL
3. **Rols i permisos**: Sistema de rols per diferents nivells d'accés
4. **Renovació de tokens**: Refresh tokens per sessions més llargues
5. **2FA**: Autenticació de dos factors
6. **Registre d'usuaris**: Funcionalitat per crear nous comptes

## Seguretat

- ✅ Tokens JWT amb expiració
- ✅ Headers d'autorització
- ✅ Validació de credencials
- ✅ Neteja de tokens en logout
- ⚠️ Secret key configurable (canviar en producció)
- ⚠️ Contrasenyes en text pla (millorar en producció)

## Ús en producció

Per utilitzar en producció, assegura't de:

1. Canviar `JWT_SECRET` per una clau segura i llarga
2. Configurar `ADMIN_PASSWORD` amb una contrasenya forta
3. Considerar l'ús de HTTPS
4. Implementar contrasenyes encriptades
5. Configurar les variables d'entorn al servidor
