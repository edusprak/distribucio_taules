# Dockerfile per al backend
FROM node:18-alpine

# Crear directori de treball
WORKDIR /app

# Copiar package.json i package-lock.json
COPY package*.json ./

# Instal·lar dependències
RUN npm ci --only=production

# Copiar el codi del backend
COPY . .

# Crear directori d'uploads
RUN mkdir -p uploads

# Exposar el port
EXPOSE 3001

# Comandament per iniciar l'aplicació
CMD ["node", "server.js"]
