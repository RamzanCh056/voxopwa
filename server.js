// Production static file server with SPA fallback for Railway
import { createServer } from 'http'
import { createReadStream, existsSync, statSync } from 'fs'
import { join, extname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const PORT = process.env.PORT || 3000
const DIST = join(__dirname, 'dist')

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.woff2':'font/woff2',
  '.woff': 'font/woff',
  '.webp': 'image/webp',
}

createServer((req, res) => {
  // Strip query string
  let pathname = req.url.split('?')[0]
  let filePath = join(DIST, pathname)

  // SPA fallback — serve index.html for any path that isn't a real file
  if (!existsSync(filePath) || statSync(filePath).isDirectory()) {
    filePath = join(DIST, 'index.html')
  }

  const ext    = extname(filePath).toLowerCase()
  const mime   = MIME[ext] || 'application/octet-stream'
  const isAsset = ext && ext !== '.html'

  res.writeHead(200, {
    'Content-Type': mime,
    // Cache static assets for 1 year, HTML never
    'Cache-Control': isAsset ? 'public, max-age=31536000, immutable' : 'no-cache',
  })

  createReadStream(filePath).pipe(res).on('error', () => {
    res.writeHead(500)
    res.end('Server error')
  })
}).listen(PORT, '0.0.0.0', () => {
  console.log(`Voxofied running on http://0.0.0.0:${PORT}`)
})
