# Base image for build stages
FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./

RUN npm install

# Build frontend
FROM base AS frontend-build
WORKDIR /app
COPY vite.config.ts ./
COPY tsconfig*.json ./
COPY ../index.html ./
COPY postcss.config.js tailwind.config.js ./
COPY src ./src

RUN npm run build:client

# Build backend
FROM base AS backend-build
WORKDIR /app
COPY server ./server
COPY tsconfig*.json ./

RUN npm run build:server

# Final production image
FROM node:20-alpine AS production
WORKDIR /app

# Copy backend dist + node_modules
COPY --from=backend-build /app/server/dist ./server/dist
COPY --from=base /app/node_modules ./node_modules

# Copy frontend build
COPY --from=frontend-build /app/dist ./server/public

# Copy env file for dotenv if you're using it
COPY .env ./

EXPOSE 5000
ENV NODE_ENV=production

CMD ["node", "server/dist/index.js"]
