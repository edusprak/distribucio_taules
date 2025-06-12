#!/bin/bash

# Script per arreglar el desplegament actual
EC2_HOST="35.181.242.74"
SSH_KEY="$HOME/.ssh/agrupam-key.pem"
APP_DOMAIN="api.agrupam.com"
CERTBOT_EMAIL="eduard.almacellas@gmail.com"

echo "🔧 Arreglant el desplegament actual..."

# Script remot per arreglar els problemes
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no ec2-user@$EC2_HOST << 'EOF'
set -e

echo "📍 Verificant l'estat actual..."
cd /home/ec2-user/distribucio_taules/backend

# 1. Verificar el fitxer .env.aws
echo "📋 Contingut del fitxer .env.aws:"
if [ -f .env.aws ]; then
    ls -la .env.aws
    echo "Primeres línies del fitxer:"
    head -5 .env.aws
else
    echo "❌ Fitxer .env.aws no trobat!"
    exit 1
fi

# 2. Instal·lar cronie si no està instal·lat
sudo dnf install -y cronie
sudo systemctl enable crond
sudo systemctl start crond

# 3. Verificar contenidors
echo "📦 Estat dels contenidors:"
sudo docker-compose ps

# 4. Verificar logs de nginx
echo "📜 Logs de Nginx (últimes 20 línies):"
sudo docker-compose logs --tail=20 nginx

# 5. Verificar configuració de nginx dins del contenidor
echo "🔍 Verificant configuració Nginx:"
sudo docker-compose exec nginx ls -la /var/www/certbot/
sudo docker-compose exec nginx ls -la /etc/letsencrypt/

# 6. Provar endpoint directament dins del contenidor
echo "🩺 Test de health check intern:"
sudo docker-compose exec backend curl -f http://localhost:3001/health || echo "Health check fallit"

# 7. Aturar i reiniciar amb logs detallats
echo "🔄 Reiniciant contenidors amb .env.aws..."
sudo docker-compose down
sudo docker-compose --env-file .env.aws up -d

echo "⏳ Esperant 30 segons..."
sleep 30

# 8. Verificar logs després del reinici
echo "📜 Logs del backend després del reinici:"
sudo docker-compose logs --tail=10 backend

echo "📜 Logs de nginx després del reinici:"
sudo docker-compose logs --tail=10 nginx

# 9. Provar health check un altre cop
echo "🩺 Test de health check després del reinici:"
curl -f http://localhost/health || echo "Health check extern fallit"

EOF

echo "✅ Script d'arregla completat. Comprova els logs per veure l'estat."
