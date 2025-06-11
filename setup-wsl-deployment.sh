#!/bin/bash

echo "🛠️ Setting up WSL for deployment..."

# Crear directori .ssh si no existeix
if [ ! -d "$HOME/.ssh" ]; then
    echo "📁 Creating .ssh directory..."
    mkdir -p "$HOME/.ssh"
    chmod 700 "$HOME/.ssh"
fi

# Copiar clau SSH des de Windows
SSH_KEY_SOURCE="/mnt/c/Users/edusp/.ssh/distribucio-key.pem"
SSH_KEY_DEST="$HOME/.ssh/distribucio-key.pem"

if [ -f "$SSH_KEY_SOURCE" ]; then
    echo "🔑 Copying SSH key from Windows..."
    cp "$SSH_KEY_SOURCE" "$SSH_KEY_DEST"
    chmod 600 "$SSH_KEY_DEST"
    echo "✅ SSH key copied and permissions set"
else
    echo "❌ SSH key not found at $SSH_KEY_SOURCE"
    echo "💡 Make sure you have the SSH key at C:\Users\edusp\.ssh\distribucio-key.pem"
    exit 1
fi

# Verificar AWS CLI
echo "☁️ Checking AWS CLI..."
if command -v aws &> /dev/null; then
    echo "✅ AWS CLI found"
    
    # Verificar configuració
    if aws configure list | grep -q "not set"; then
        echo "⚠️ AWS CLI not fully configured"
        echo "💡 Please run: aws configure"
        echo "   You'll need:"
        echo "   - AWS Access Key ID"
        echo "   - AWS Secret Access Key" 
        echo "   - Default region name (e.g., eu-west-1)"
        echo "   - Default output format (json)"
    else
        echo "✅ AWS CLI configured"
    fi
else
    echo "⚠️ AWS CLI not found"
    echo "💡 Install with: curl 'https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip' -o 'awscliv2.zip' && unzip awscliv2.zip && sudo ./aws/install"
fi

# Verificar Git
echo "📂 Checking Git..."
if command -v git &> /dev/null; then
    echo "✅ Git found"
else
    echo "⚠️ Git not found"
    echo "💡 Install with: sudo apt update && sudo apt install git"
fi

# Verificar connectivitat amb EC2
echo "🔗 Testing EC2 connectivity..."
if ssh -i "$SSH_KEY_DEST" -o ConnectTimeout=10 -o StrictHostKeyChecking=no ec2-user@api.agrupam.com "echo 'Connection successful'" 2>/dev/null; then
    echo "✅ EC2 connection successful"
else
    echo "⚠️ Cannot connect to EC2"
    echo "💡 Check:"
    echo "   - SSH key permissions: ls -la ~/.ssh/distribucio-key.pem"
    echo "   - Network connectivity"
    echo "   - EC2 instance status"
fi

echo ""
echo "🎉 WSL deployment setup completed!"
echo ""
echo "📋 Next steps:"
echo "   1. Configure AWS CLI if needed: aws configure"
echo "   2. Test deployment: ./deploy-backend.sh"
echo ""
echo "🌐 Project URLs:"
echo "   Frontend: https://agrupam.com"
echo "   Backend:  https://api.agrupam.com"
