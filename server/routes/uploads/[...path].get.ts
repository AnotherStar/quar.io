// Serves files written by the "local" storage driver.
// In production with STORAGE_DRIVER=s3 this route is unused (URLs point at S3).
import { readFile } from 'node:fs/promises'
import { resolve, normalize } from 'node:path'
import { lookup } from 'mime-types'

export default defineEventHandler(async (event) => {
  const cfg = useRuntimeConfig()
  if (cfg.storage.driver !== 'local') throw createError({ statusCode: 404 })

  const path = getRouterParam(event, 'path')
  if (!path) throw createError({ statusCode: 400 })

  // path-traversal guard
  const baseDir = resolve(process.cwd(), cfg.storage.localDir)
  const fullPath = resolve(baseDir, path)
  if (!normalize(fullPath).startsWith(baseDir)) throw createError({ statusCode: 400 })

  try {
    const buf = await readFile(fullPath)
    setHeader(event, 'content-type', String(lookup(fullPath) || 'application/octet-stream'))
    setHeader(event, 'cache-control', 'public, max-age=31536000, immutable')
    return buf
  } catch {
    throw createError({ statusCode: 404 })
  }
})
