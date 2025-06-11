#!/bin/bash

echo "🚀 Initiating backend deployment to AWS EC2..."

# Verificar que la clau SSH existeix
SSH_KEY="$HOME/.ssh/distribucio-key.pem"
if [ ! -f "$SSH_KEY" ]; then
    echo "❌ Error: SSH key not found at $SSH_KEY"
    echo "💡 Run setup: wsl cp /mnt/c/Users/edusp/.ssh/distribucio-key.pem ~/.ssh/"
    exit 1
fi

# Verificar permisos de la clau SSH
chmod 600 "$SSH_KEY"

echo "🔗 Connecting to EC2 instance..."

# Commands to execute on EC2
DEPLOY_COMMANDS='
echo "📍 Connected to EC2 instance"
echo "📂 Navigating to project directory..."
cd /home/ec2-user/distribucio_taules || { echo "❌ Project directory not found"; exit 1; }

echo "📥 Pulling latest changes from git..."
git pull origin main || { echo "❌ Git pull failed"; exit 1; }

echo "🐳 Navigating to backend directory..."
cd backend || { echo "❌ Backend directory not found"; exit 1; }

echo "🛑 Stopping current containers..."
docker-compose down

echo "🔨 Building new containers (no cache)..."
docker-compose build --no-cache || { echo "❌ Docker build failed"; exit 1; }

echo "▶️ Starting containers..."
docker-compose up -d || { echo "❌ Failed to start containers"; exit 1; }

echo "⏳ Waiting for containers to start..."
sleep 10

echo "🔍 Checking container status..."
docker-compose ps

echo "✅ Backend deployment completed!"
echo "🌐 Backend URL: https://api.agrupam.com"
'

# Execute commands on EC2
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no ec2-user@api.agrupam.com "$DEPLOY_COMMANDS"

if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 Backend deployment completed successfully!"
    echo "🌐 API URL: https://api.agrupam.com"
    echo "📋 To view logs: ssh -i ~/.ssh/distribucio-key.pem ec2-user@api.agrupam.com"
    echo "   Then: cd /home/ec2-user/distribucio_taules/backend && docker-compose logs -f backend"
else
    echo "❌ Deployment failed"
    exit 1
fi
