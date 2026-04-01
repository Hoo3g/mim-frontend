# syntax=docker/dockerfile:1.7

FROM node:22-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:22-alpine AS runtime
WORKDIR /app

COPY --from=builder /app/dist/mim-frontend/browser ./public

RUN printf '%s\n' \
  "const fs = require('fs');" \
  "const path = require('path');" \
  "const http = require('http');" \
  "const https = require('https');" \
  "const { URL } = require('url');" \
  "const publicDir = path.join(__dirname, 'public');" \
  "const configDir = path.join(publicDir, 'assets');" \
  "fs.mkdirSync(configDir, { recursive: true });" \
  "const apiBaseUrl = (process.env.APP_API_BASE_URL || 'http://localhost:8080').replace(/\\/+$/, '');" \
  "const googleClientId = process.env.APP_GOOGLE_CLIENT_ID || '';" \
  "const backendTarget = process.env.INTERNAL_BACKEND_BASE_URL || 'http://backend:8080';" \
  "fs.writeFileSync(path.join(configDir, 'app-config.js'), 'window.__APP_CONFIG__ = ' + JSON.stringify({ API_BASE_URL: apiBaseUrl, GOOGLE_CLIENT_ID: googleClientId }, null, 2) + ';\\n');" \
  "const contentTypes = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.mjs': 'application/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon', '.woff': 'font/woff', '.woff2': 'font/woff2' };" \
  "function proxyApi(req, res) {" \
  "  const target = new URL((req.url || '/'), backendTarget);" \
  "  const transport = target.protocol === 'https:' ? https : http;" \
  "  const proxyReq = transport.request({" \
  "    protocol: target.protocol," \
  "    hostname: target.hostname," \
  "    port: target.port || (target.protocol === 'https:' ? 443 : 80)," \
  "    method: req.method," \
  "    path: target.pathname + target.search," \
  "    headers: { ...req.headers, host: target.host }" \
  "  }, (proxyRes) => {" \
  "    res.writeHead(proxyRes.statusCode || 502, proxyRes.headers);" \
  "    proxyRes.pipe(res);" \
  "  });" \
  "  proxyReq.on('error', () => { res.statusCode = 502; res.end('Bad Gateway'); });" \
  "  req.pipe(proxyReq);" \
  "}" \
  "const server = http.createServer((req, res) => {" \
  "  const requestUrl = new URL(req.url || '/', 'http://localhost');" \
  "  if (requestUrl.pathname.startsWith('/api/')) { proxyApi(req, res); return; }" \
  "  let pathname = decodeURIComponent(requestUrl.pathname);" \
  "  if (pathname === '/') pathname = '/index.html';" \
  "  let filePath = path.join(publicDir, pathname);" \
  "  if (!filePath.startsWith(publicDir)) { res.statusCode = 403; res.end('Forbidden'); return; }" \
  "  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) filePath = path.join(publicDir, 'index.html');" \
  "  const ext = path.extname(filePath).toLowerCase();" \
  "  res.setHeader('Content-Type', contentTypes[ext] || 'application/octet-stream');" \
  "  fs.createReadStream(filePath).on('error', () => { res.statusCode = 500; res.end('Internal Server Error'); }).pipe(res);" \
  "});" \
  "const port = Number(process.env.PORT || 80);" \
  "server.listen(port, '0.0.0.0', () => console.log('Frontend listening on port ' + port));" \
  > /app/server.js

EXPOSE 80

CMD ["node", "/app/server.js"]
