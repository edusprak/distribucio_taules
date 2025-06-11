#!/bin/bash

echo "🚀 Iniciating frontend deployment..."

# Verificar que estem al directori frontend
if [ ! -f "package.json" ]; then
    echo "❌ Error: Aquest script s'ha d'executar des del directori frontend/"
    exit 1
fi

# Instal·lar dependències si no existeixen
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Generar build de producció
echo "🔨 Building production version..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Error during build process"
    exit 1
fi

# Verificar que el build s'ha generat
if [ ! -d "build" ]; then
    echo "❌ Error: Build directory not found"
    exit 1
fi

# Pujar a S3
echo "☁️ Uploading to S3..."
aws s3 sync build/ s3://distribucio-taules-frontend-1749583112 --delete

if [ $? -ne 0 ]; then
    echo "❌ Error uploading to S3"
    exit 1
fi

# Invalidar cache de CloudFront
echo "🔄 Invalidating CloudFront cache..."
INVALIDATION_ID=$(aws cloudfront create-invalidation --distribution-id E2E6KNDTJH5XOJ --paths "/*" --query 'Invalidation.Id' --output text)

if [ $? -eq 0 ]; then
    echo "✅ CloudFront invalidation created: $INVALIDATION_ID"
    echo "⏳ Cache invalidation can take up to 15 minutes..."
else
    echo "❌ Error creating CloudFront invalidation"
    exit 1
fi

echo ""
echo "🎉 Frontend deployment completed successfully!"
echo "🌐 Frontend URL: https://agrupam.com"
echo "⏰ Changes may take 15 minutes to propagate due to CloudFront cache"
