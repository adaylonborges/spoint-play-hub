# Stage 1: Build
FROM node:20-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Production
FROM node:20-slim
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY --from=builder /app/dist ./dist
# Se você for usar Service Account JSON, ele deve ser montado como secret no K8s ou copiado (menos seguro)
# COPY service-account.json ./service-account.json

EXPOSE 3000
CMD ["node", "dist/index.js"]
