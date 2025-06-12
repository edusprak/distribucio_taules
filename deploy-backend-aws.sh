#!/bin/bash

# --- Configuration ---
EC2_HOST="35.181.242.74"
SSH_KEY="$HOME/.ssh/agrupam-key.pem" # Assuming this path is correct in WSL
LOCAL_ENV_FILE="/mnt/c/Users/edusp/projectes/distribucio_taules/backend/.env.aws" # WSL path
REMOTE_ENV_FILE_PATH_ON_EC2="/tmp/distribucio_env_aws_from_local.tmp"
APP_DOMAIN="api.agrupam.com"
CERTBOT_EMAIL="eduard.almacellas@gmail.com"
PROJECT_REPO="https://github.com/edusprak/distribucio_taules.git"
PROJECT_DIR_ON_EC2="/home/ec2-user/distribucio_taules"
# --- End Configuration ---

error_exit() {
    echo "❌ Error: $1" >&2
    exit 1
}

echo "🚀 Iniciant desplegament del Backend a AWS EC2 (versió simplificada)..."

[ ! -f "$SSH_KEY" ] && error_exit "Clau SSH no trobada a $SSH_KEY"
[ -z "$EC2_HOST" ] && error_exit "EC2_HOST no configurat."
[ ! -f "$LOCAL_ENV_FILE" ] && error_exit "Fitxer .env.aws local no trobat a $LOCAL_ENV_FILE"
echo "✅ Validacions locals completades."

echo "📋 Copiant $LOCAL_ENV_FILE a ec2-user@$EC2_HOST:$REMOTE_ENV_FILE_PATH_ON_EC2..."
scp -i "$SSH_KEY" -o StrictHostKeyChecking=no -o ConnectTimeout=10 "$LOCAL_ENV_FILE" "ec2-user@$EC2_HOST:$REMOTE_ENV_FILE_PATH_ON_EC2"
if [ $? -ne 0 ]; then
    error_exit "Fallada al copiar .env.aws via scp."
fi
echo "✅ .env.aws copiat a $REMOTE_ENV_FILE_PATH_ON_EC2 a l'EC2."

REMOTE_SCRIPT=$(cat <<EOF
set -eux

echo "--- Inici script remot ---"
# Variables d'entorn ja disponibles: APP_DOMAIN, CERTBOT_EMAIL, PROJECT_DIR_ON_EC2, REMOTE_ENV_FILE_PATH_ON_EC2, PROJECT_REPO

sudo dnf update -y
sudo dnf install -y docker git certbot policycoreutils-python-utils cronie

sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker ec2-user || true # Pot fallar si ja hi és, no és crític aquí

if ! command -v docker-compose &> /dev/null; then
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
fi

if [ ! -d "$PROJECT_DIR_ON_EC2" ]; then
    git clone "$PROJECT_REPO" "$PROJECT_DIR_ON_EC2"
fi
cd "$PROJECT_DIR_ON_EC2"
git pull origin main # Assegura't que la branca 'main' existeix o canvia a la teva branca per defecte
cd "$PROJECT_DIR_ON_EC2/backend"

sudo mv "$REMOTE_ENV_FILE_PATH_ON_EC2" .env.aws
sudo chmod 600 .env.aws

sudo mkdir -p /opt/certbot/conf /opt/certbot/www
sudo chown -R ec2-user:ec2-user /opt/certbot # O l'usuari que corri nginx/certbot

DUMMY_CERT_LIVE_DIR="/opt/certbot/conf/live/$APP_DOMAIN"
sudo mkdir -p "$DUMMY_CERT_LIVE_DIR"
# Només crea dummy si no existeixen els fitxers reals
if [ ! -f "$DUMMY_CERT_LIVE_DIR/fullchain.pem" ] || [ ! -f "$DUMMY_CERT_LIVE_DIR/privkey.pem" ]; then
  sudo openssl req -x509 -nodes -days 1 -newkey rsa:2048 -keyout "$DUMMY_CERT_LIVE_DIR/privkey.pem" -out "$DUMMY_CERT_LIVE_DIR/fullchain.pem" -subj "/CN=$APP_DOMAIN"
fi

sudo docker-compose --env-file .env.aws down 2>/dev/null || true
sudo docker-compose --env-file .env.aws up -d --build

echo "Esperant 20s per Nginx..."
sleep 20

sudo certbot certonly --webroot -w /opt/certbot/www \
  --cert-name "$APP_DOMAIN" \
  --config-dir /opt/certbot/conf --logs-dir /opt/certbot/logs --work-dir /opt/certbot/work \
  --email "$CERTBOT_EMAIL" -d "$APP_DOMAIN" \
  --agree-tos --no-eff-email --keep-until-expiring --non-interactive --preferred-challenges http

CERTBOT_STATUS=$?
if [ $CERTBOT_STATUS -eq 0 ]; then
    echo "Certificat SSL OK. Recarregant Nginx."
    sudo docker-compose exec nginx nginx -s reload
else
    echo "Error Certbot: $CERTBOT_STATUS. Nginx no recarregat amb certificat nou."
fi

sudo docker-compose ps

CRON_COMMAND="0 3 * * * sudo certbot renew --quiet --config-dir /opt/certbot/conf --logs-dir /opt/certbot/logs --work-dir /opt/certbot/work --post-hook 'cd \$PROJECT_DIR_ON_EC2/backend && sudo docker-compose exec nginx nginx -s reload'"
(sudo crontab -l 2>/dev/null | grep -qF "certbot renew") || \\
  ( (sudo crontab -l 2>/dev/null; echo "\$CRON_COMMAND") | sudo crontab - )

echo "--- Fi script remot ---"
EOF
)

# Assegura salts de línia Unix (LF) i elimina espais en blanc al final de les línies
REMOTE_SCRIPT=$(echo "$REMOTE_SCRIPT" | sed 's/[ \t]*$//' | tr -d '\r')

echo "🔗 Connectant a ec2-user@$EC2_HOST per executar l'script remot..."
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no -o ConnectTimeout=15 "ec2-user@$EC2_HOST" \
  APP_DOMAIN="$APP_DOMAIN" \
  CERTBOT_EMAIL="$CERTBOT_EMAIL" \
  PROJECT_DIR_ON_EC2="$PROJECT_DIR_ON_EC2" \
  REMOTE_ENV_FILE_PATH_ON_EC2="$REMOTE_ENV_FILE_PATH_ON_EC2" \
  PROJECT_REPO="$PROJECT_REPO" \
  bash -c "$REMOTE_SCRIPT"

SSH_EXIT_CODE=$?

if [ $SSH_EXIT_CODE -eq 0 ]; then
    echo ""
    echo "✅✅ ÈXIT GENERAL: Desplegament del backend (simplificat) completat correctament a $EC2_HOST!"
    echo "🌐 API URL: https://$APP_DOMAIN/api"
    echo "🩺 Health Check: https://$APP_DOMAIN/health"
else
    error_exit "Fallada durant l'execució del script remot (simplificat) a l'EC2, codi de sortida SSH: $SSH_EXIT_CODE. Revisa la sortida."
fi

exit 0