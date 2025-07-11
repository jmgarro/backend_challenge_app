# Dockerfile para desarrollo
FROM node:18-alpine
WORKDIR /app

# Instala dependencias completas (incluye dev)
COPY package*.json ./
RUN npm install

# Copia el código fuente
COPY . .

# Expone el puerto
EXPOSE 3000

# Usa ts-node-dev para recarga automática
CMD ["npx", "ts-node-dev", "--respawn", "--transpile-only", "src/index.ts"]
