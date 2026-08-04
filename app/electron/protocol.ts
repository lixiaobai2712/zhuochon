import { protocol } from 'electron'
import path from 'node:path'
import fs from 'node:fs/promises'
import { getPaths } from './paths'

const MIME: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
}

export function toPetFileUrl(absPath: string): string {
  return 'petfile://' + absPath.replace(/\\/g, '/')
}

function resolveFromUrl(url: string): string | null {
  try {
    const u = new URL(url)
    const p = path.normalize(decodeURIComponent(u.host + u.pathname))
    const { roleRoots, galleryRoot } = getPaths()
    const np = path.resolve(p).toLowerCase()
    const roots = [...roleRoots, galleryRoot].map((r) => path.resolve(r).toLowerCase())
    const ok = roots.some((r) => np === r || np.startsWith(r + path.sep))
    return ok ? p : null
  } catch {
    return null
  }
}

export function registerPetFileProtocol() {
  protocol.handle('petfile', async (request) => {
    const fp = resolveFromUrl(request.url)
    if (!fp) return new Response('Forbidden', { status: 403 })
    try {
      const data = await fs.readFile(fp)
      const mime = MIME[path.extname(fp).toLowerCase()] || 'application/octet-stream'
      return new Response(new Uint8Array(data), {
        headers: { 'content-type': mime, 'cache-control': 'no-cache' },
      })
    } catch {
      return new Response('Not Found', { status: 404 })
    }
  })
}
