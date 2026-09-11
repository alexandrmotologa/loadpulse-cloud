# Stage 1: Build Web App
FROM node:20-alpine AS web-builder
WORKDIR /app/web
COPY web/package*.json ./
RUN npm install
COPY web/ ./
RUN npm run build

# Stage 2: Build Server
FROM node:20-alpine AS server-builder
WORKDIR /app/server
COPY server/package*.json ./
RUN npm install
COPY server/ ./
RUN npm run build

# Stage 3: Production Runtime
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080
ENV DEMO_MODE=true
ENV DATA_DIR=/app/server/data

# Copy built server
WORKDIR /app/server
COPY server/package*.json ./
RUN npm install --omit=dev
COPY --from=server-builder /app/server/dist ./dist

# Copy built web assets to /app/web/dist
WORKDIR /app
COPY --from=web-builder /app/web/dist ./web/dist

# Create persistent data directory
RUN mkdir -p /app/server/data

EXPOSE 8080

WORKDIR /app/server
CMD ["node", "dist/index.js"]
