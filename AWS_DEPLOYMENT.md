# Guia de Desplegament AWS - Distribució de Taules

## 🏗️ Arquitectura

- **Frontend**: AWS S3 + CloudFront + Domini personalitzat (agrupam.com)
- **Backend**: AWS EC2 t2.micro + Docker + PostgreSQL
- **Domini**: agrupam.com (frontend) / api.agrupam.com (backend)

## 📋 Prerequisites

- AWS CLI configurat (`aws configure`)
- Domini `agrupam.com` comprat i gestionat al teu proveïdor DNS
- Git repositori del projecte (públic o privat amb accés SSH)

## 🚀 Desplegament Pas a Pas

### Pas 1: Crear clau SSH per EC2

```bash
# Crear clau SSH per accedir a la instància EC2
aws ec2 create-key-pair --key-name agrupam-key --query 'KeyMaterial' --output text > ~/.ssh/agrupam-key.pem
chmod 600 ~/.ssh/agrupam-key.pem
```

### Pas 2: Crear Security Group

```bash
# Crear security group
aws ec2 create-security-group \
  --group-name agrupam-sg \
  --description "Security group per Agrupam app"

# Obtenir ID del security group creat
SG_ID=$(aws ec2 describe-security-groups --group-names agrupam-sg --query 'SecurityGroups[0].GroupId' --output text)

# Afegir regles de seguretat
aws ec2 authorize-security-group-ingress --group-id $SG_ID --protocol tcp --port 22 --cidr 0.0.0.0/0    # SSH
aws ec2 authorize-security-group-ingress --group-id $SG_ID --protocol tcp --port 80 --cidr 0.0.0.0/0    # HTTP
aws ec2 authorize-security-group-ingress --group-id $SG_ID --protocol tcp --port 443 --cidr 0.0.0.0/0   # HTTPS
aws ec2 authorize-security-group-ingress --group-id $SG_ID --protocol tcp --port 3001 --cidr 0.0.0.0/0  # Backend API
```

### Pas 3: Crear instància EC2

```bash
# Crear instància EC2 t2.micro (capa gratuita)
aws ec2 run-instances \
  --image-id ami-0abcdef1234567890 \
  --count 1 \
  --instance-type t2.micro \
  --key-name agrupam-key \
  --security-group-ids $SG_ID \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=agrupam-backend}]'

# Obtenir IP pública de la instància
INSTANCE_ID=$(aws ec2 describe-instances --filters "Name=tag:Name,Values=agrupam-backend" --query 'Reservations[0].Instances[0].InstanceId' --output text)
EC2_IP=$(aws ec2 describe-instances --instance-ids $INSTANCE_ID --query 'Reservations[0].Instances[0].PublicIpAddress' --output text)

echo "🌐 IP de la instància EC2: $EC2_IP"
```

### Pas 4: Crear Elastic IP (opcional però recomanat)

```bash
# Crear Elastic IP
aws ec2 allocate-address --domain vpc

# Associar Elastic IP a la instància
ALLOCATION_ID=$(aws ec2 describe-addresses --query 'Addresses[0].AllocationId' --output text)
aws ec2 associate-address --instance-id $INSTANCE_ID --allocation-id $ALLOCATION_ID

# Obtenir la nova IP estàtica
ELASTIC_IP=$(aws ec2 describe-addresses --allocation-ids $ALLOCATION_ID --query 'Addresses[0].PublicIp' --output text)
echo "🌐 Elastic IP: $ELASTIC_IP"
```

### Pas 5: Configurar DNS

Configura els següents registres DNS al teu proveïdor de domini:

```
Tipus: A
Nom: api
Valor: [ELASTIC_IP o EC2_IP]
TTL: 3600

Tipus: A  
Nom: @
Valor: [S'omplirà amb CloudFront]
TTL: 3600
```

### Pas 6: Crear bucket S3 per al frontend

```bash
# Crear bucket S3
aws s3 mb s3://agrupam-distribucio-frontend --region eu-west-1

# Configurar bucket per hosting web estàtic
aws s3 website s3://agrupam-distribucio-frontend \
  --index-document index.html \
  --error-document index.html

# Configurar política del bucket per accés públic
cat > bucket-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::agrupam-distribucio-frontend/*"
    }
  ]
}
EOF

aws s3api put-bucket-policy --bucket agrupam-distribucio-frontend --policy file://bucket-policy.json
```

### Pas 7: Crear distribució CloudFront

```bash
# Crear distribució CloudFront
cat > cloudfront-config.json << EOF
{
  "CallerReference": "agrupam-$(date +%s)",
  "Aliases": {
    "Quantity": 1,
    "Items": ["agrupam.com"]
  },
  "DefaultRootObject": "index.html",
  "Origins": {
    "Quantity": 1,
    "Items": [
      {
        "Id": "agrupam-s3-origin",
        "DomainName": "agrupam-distribucio-frontend.s3.eu-west-1.amazonaws.com",
        "S3OriginConfig": {
          "OriginAccessIdentity": ""
        }
      }
    ]
  },
  "DefaultCacheBehavior": {
    "TargetOriginId": "agrupam-s3-origin",
    "ViewerProtocolPolicy": "redirect-to-https",
    "TrustedSigners": {
      "Enabled": false,
      "Quantity": 0
    },
    "ForwardedValues": {
      "QueryString": false,
      "Cookies": {"Forward": "none"}
    },
    "MinTTL": 0
  },
  "Comment": "Agrupam Frontend Distribution",
  "Enabled": true
}
EOF

aws cloudfront create-distribution --distribution-config file://cloudfront-config.json
```

### Pas 8: Configurar certificat SSL

```bash
# Sol·licitar certificat SSL per al domini
aws acm request-certificate \
  --domain-name agrupam.com \
  --subject-alternative-names *.agrupam.com \
  --validation-method DNS \
  --region us-east-1

# Nota: Segueix les instruccions per validar el domini
```

### Pas 9: Actualitzar scripts de desplegament

1. Edita `deploy-backend-aws.sh` i afegeix la IP d'EC2:
   ```bash
   EC2_HOST="[LA_TEVA_IP_EC2]"
   ```

2. Edita `deploy-frontend-aws.sh` i afegeix l'ID de CloudFront:
   ```bash
   CLOUDFRONT_DISTRIBUTION_ID="[EL_TEU_ID_CLOUDFRONT]"
   ```

### Pas 10: Desplegar l'aplicació

```bash
# Desplegament del backend
chmod +x deploy-backend-aws.sh
./deploy-backend-aws.sh

# Desplegament del frontend
cd frontend
chmod +x ../deploy-frontend-aws.sh
../deploy-frontend-aws.sh
```

## 🔧 Manteniment

### Logs del Backend
```bash
ssh -i ~/.ssh/agrupam-key.pem ec2-user@[EC2_IP]
cd distribucio_taules/backend
docker-compose logs -f backend
```

### Backup de Base de Dades
```bash
ssh -i ~/.ssh/agrupam-key.pem ec2-user@[EC2_IP]
cd distribucio_taules/backend
docker-compose exec db pg_dump -U postgres distribucio_taules > backup_$(date +%Y%m%d).sql
```

### Actualitzar l'aplicació
```bash
# Backend: Executar ./deploy-backend-aws.sh
# Frontend: Executar ./deploy-frontend-aws.sh des del directori frontend/
```

## 💰 Costos (Capa Gratuita)

- **EC2 t2.micro**: 750 hores/mes gratuïtes
- **S3**: 5GB d'emmagatzematge gratuït
- **CloudFront**: 50GB de transferència gratuïta
- **Elastic IP**: Gratuït mentre estigui associat a una instància en funcionament

## 🆘 Troubleshooting

1. **Backend no accessible**: Verifica security groups i ports oberts
2. **Frontend no carrega**: Comprova configuració S3 i CloudFront
3. **SSL no funciona**: Assegura't que el certificat està validat
4. **Dominis no resoluen**: Verifica configuració DNS

## 📞 Suport

Per problemes específics, revisa logs i comprova la configuració dels serveis AWS.
