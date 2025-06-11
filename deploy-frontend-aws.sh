#!/bin/bash

echo "🚀 Desplegament del Frontend a AWS S3..."

# Verificar que estem al directori correcte
if [ ! -f "package.json" ]; then
    echo "❌ Error: Executa aquest script des del directori frontend/"
    exit 1
fi

# Variables
S3_BUCKET="agrupam-distribucio-frontend"
CLOUDFRONT_DISTRIBUTION_ID=""

echo "📦 Instal·lant dependències..."
npm install

echo "🔨 Creant build de producció..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Error durant el build"
    exit 1
fi

echo "☁️ Pujant a S3..."
aws s3 sync build/ s3://$S3_BUCKET --delete --acl public-read

if [ $? -ne 0 ]; then
    echo "❌ Error pujant a S3"
    exit 1
fi

echo "🔄 Invalidant cache de CloudFront..."
if [ ! -z "$CLOUDFRONT_DISTRIBUTION_ID" ]; then
    aws cloudfront create-invalidation --distribution-id $CLOUDFRONT_DISTRIBUTION_ID --paths "/*"
    echo "✅ Invalidació de CloudFront creada"
else
    echo "⚠️ CLOUDFRONT_DISTRIBUTION_ID no configurat - saltant invalidació"
fi

echo ""
echo "🎉 Frontend desplegat correctament!"
echo "🌐 URL: https://agrupam.com"
