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
# Install production dependencies only (plus we need devDependencies to build, but that's in builder stage)
RUN npm install --production
COPY --from=builder /app/dist ./dist

ENV PORT=8080
EXPOSE 8080

CMD ["npx", "srvx", "serve", "--entry", "./dist/server/server.js", "--static", "/app/dist/client", "--port", "8080", "--prod"]
