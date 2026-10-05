# Etapa 1: Construcción
FROM node:20 AS builder
WORKDIR /app
COPY package*.json ./
# Instalamos en la raíz
RUN npm install --legacy-peer-deps
COPY . .
RUN chmod -R +x node_modules/.bin
RUN npm run build

# Etapa 2: Producción
FROM node:20-slim
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server
COPY package*.json ./

# Instalamos librerías de producción en la raíz
RUN npm install --only=production --legacy-peer-deps

# MUY IMPORTANTE: Si 'server' tiene su propio package.json, instalamos ahí también
RUN if [ -f "server/package.json" ]; then cd server && npm install --only=production --legacy-peer-deps; fi

EXPOSE 3001
CMD ["node", "server/index.js"]
