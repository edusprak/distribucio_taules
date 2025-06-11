#!/bin/bash

echo "🚀 Desplegament del Backend a AWS EC2..."

# Variables de configuració
EC2_HOST="13.37.128.222"  # Elastic IP de la instància EC2
SSH_KEY="~/.ssh/agrupam-key.pem"

# Verificar clau SSH
if [ ! -f "$SSH_KEY" ]; then
    echo "❌ Error: Clau SSH no trobada a $SSH_KEY"
    echo "💡 Assegura't que tens la clau SSH d'EC2 configurada"
    exit 1
fi

# Verificar que tenim l'host d'EC2
if [ -z "$EC2_HOST" ]; then
    echo "❌ Error: EC2_HOST no configurat"
    echo "💡 Edita aquest script i afegeix l'IP o domini de la instància EC2"
    exit 1
fi

echo "🔗 Connectant a la instància EC2..."

# Comandaments a executar a EC2
DEPLOY_COMMANDS='
echo "📍 Connectat a la instància EC2"
echo "📂 Navegant al directori del projecte..."

# Actualitzar el sistema
sudo yum update -y

# Instal·lar Docker si no està instal·lat
if ! command -v docker &> /dev/null; then
    echo "🐳 Instal·lant Docker..."
    sudo yum install -y docker
    sudo systemctl start docker
    sudo systemctl enable docker
    sudo usermod -aG docker ec2-user
fi

# Instal·lar Docker Compose si no està instal·lat
if ! command -v docker-compose &> /dev/null; then
    echo "🐙 Instal·lant Docker Compose..."
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
fi

# Instal·lar Git si no està instal·lat
if ! command -v git &> /dev/null; then
    echo "📚 Instal·lant Git..."
    sudo yum install -y git
fi

# Clonar o actualitzar el projecte
if [ ! -d "distribucio_taules" ]; then
    echo "📥 Clonant el projecte..."
    git clone https://github.com/YOUR_USERNAME/distribucio_taules.git
else
    echo "📥 Actualitzant el projecte..."
    cd distribucio_taules
    git pull origin main
fi

cd distribucio_taules/backend

# Aturar contenidors existents
echo "🛑 Aturant contenidors existents..."
docker-compose down

# Construir i iniciar els contenidors
echo "🔨 Construint i iniciant contenidors..."
docker-compose --env-file .env.aws up -d --build

echo "⏳ Esperant que els contenidors estiguin llestos..."
sleep 20

echo "🔍 Verificant estat dels contenidors..."
docker-compose ps

echo "✅ Desplegament del backend completat!"
'

# Executar comandaments a EC2
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no ec2-user@$EC2_HOST "$DEPLOY_COMMANDS"

if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 Backend desplegat correctament!"
    echo "🌐 API URL: https://api.agrupam.com"
    echo "📋 Per veure logs: ssh -i $SSH_KEY ec2-user@$EC2_HOST"
    echo "   Després: cd distribucio_taules/backend && docker-compose logs -f"
else
    echo "❌ Error durant el desplegament"
    exit 1
fi
