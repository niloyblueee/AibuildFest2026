# syntax=docker/dockerfile:1

# Build stage
FROM node:22-bookworm-slim AS build
WORKDIR /app

COPY frontend/package*.json ./
# Ensure devDependencies (e.g., vite) are installed for the build
ENV NPM_CONFIG_PRODUCTION=false
RUN npm ci

COPY frontend/ .
RUN npm run build

# Runtime stage
FROM node:22-bookworm-slim AS runner
WORKDIR /app

# Install a lightweight static file server
RUN npm install -g serve \
    && npm cache clean --force

COPY --from=build /app/dist ./dist

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=5173
EXPOSE 5173

CMD ["sh", "-c", "serve -s dist -l ${PORT:-5173}"]
