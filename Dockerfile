# syntax=docker/dockerfile:1.7

FROM node:22-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:1.27-alpine

COPY docker/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY docker/entrypoint/40-generate-app-config.sh /docker-entrypoint.d/40-generate-app-config.sh
COPY --from=builder /app/dist/mim-frontend/browser /usr/share/nginx/html
RUN chmod +x /docker-entrypoint.d/40-generate-app-config.sh

EXPOSE 80
