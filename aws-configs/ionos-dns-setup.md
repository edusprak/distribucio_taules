# Configuració DNS final per IONOS

## Opció A: DNS Directes (Recomanada)

Si IONOS suporta registres ALIAS/ANAME:

```
Tipus: ALIAS
Nom: @
Valor: d3ovjaq7he0r89.cloudfront.net
TTL: 3600

Tipus: CNAME  
Nom: www
Valor: d3ovjaq7he0r89.cloudfront.net
TTL: 3600

Tipus: A
Nom: api  
Valor: 13.37.29.28
TTL: 3600
```

## Opció B: Registres A (Si no hi ha ALIAS)

Usa les IPs actuals de CloudFront:

```
Tipus: A
Nom: @
Valor: 108.157.109.67
TTL: 3600

Tipus: A
Nom: @
Valor: 108.157.109.101
TTL: 3600

Tipus: A
Nom: @
Valor: 108.157.109.53
TTL: 3600

Tipus: A
Nom: @
Valor: 108.157.109.75
TTL: 3600

Tipus: CNAME  
Nom: www
Valor: d3ovjaq7he0r89.cloudfront.net
TTL: 3600

Tipus: A
Nom: api  
Valor: 13.37.29.28
TTL: 3600
```

⚠️ **Nota**: Les IPs de CloudFront poden canviar. Si és possible, usa l'Opció A.

## Opció C: Redireccionament SSL Fix

Crear un certificat SSL per `agrupam.com` (no wildcard) a IONOS:

1. Ves a SSL/Certificats
2. Afegeix nou certificat
3. Domini: `agrupam.com` 
4. Tipus: SSL Starter (normal, no wildcard)
5. Validació: DNS

Després mantén el redireccionament a:
- Destí: `https://d3ovjaq7he0r89.cloudfront.net`
- SSL: Activat amb el nou certificat

## Verificació

Després de qualsevol canvi, executa:
```powershell
.\check-deployment.ps1
```

## Resultat esperat

✅ http://agrupam.com → Funciona
✅ https://agrupam.com → Funciona  
✅ https://www.agrupam.com → Funciona
✅ http://api.agrupam.com → Funciona
