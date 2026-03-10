#!/bin/sh
set -eu

APP_API_BASE_URL=${APP_API_BASE_URL:-http://localhost:8080}
APP_GOOGLE_CLIENT_ID=${APP_GOOGLE_CLIENT_ID:-}

mkdir -p /usr/share/nginx/html/assets
cat >/usr/share/nginx/html/assets/app-config.js <<CONFIG
window.__APP_CONFIG__ = {
  API_BASE_URL: "${APP_API_BASE_URL}",
  GOOGLE_CLIENT_ID: "${APP_GOOGLE_CLIENT_ID}"
};
CONFIG
