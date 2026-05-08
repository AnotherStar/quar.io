import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'

let _client: S3Client | null = null
function s3Client() {
  const cfg = useRuntimeConfig()
  if (_client) return _client
  _client = new S3Client({
    region: cfg.s3.region,
    endpoint: cfg.s3.endpoint || undefined,
    forcePathStyle: true,
    credentials: { accessKeyId: cfg.s3.accessKey, secretAccessKey: cfg.s3.secretKey },
    // AWS SDK v3.730+ requires CRC32 checksums by default and uses streaming
    // chunked uploads — both interact poorly with some S3-compatible servers
    // (MinIO, R2, etc). Force checksums only when the server actually asks.
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED'
  })
  return _client
}

// Returns the public URL of the uploaded object.
// Driver "local" writes to LOCAL_UPLOAD_DIR and serves via the
// /uploads/* route (server/routes/uploads/[...path].get.ts).
// Driver "s3" pushes to the configured S3 endpoint.
export async function uploadObject(key: string, body: Buffer, contentType: string) {
  const cfg = useRuntimeConfig()
  if (cfg.storage.driver === 's3') {
    await s3Client().send(
      new PutObjectCommand({
        Bucket: cfg.s3.bucket,
        Key: key,
        Body: body,
        ContentType: contentType
      })
    )
    return `${cfg.s3.publicUrl}/${key}`
  }

  // local driver
  const path = resolve(process.cwd(), cfg.storage.localDir, key)
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, body)
  return `/uploads/${key}`
}

// Server-side equivalent of the browser direct-upload flow: create a
// presigned PUT URL, then upload with fetch instead of AWS SDK PutObject.
// Useful for generated assets where there is no browser File object, and for
// S3-compatible servers that behave better with plain PUT requests.
export async function uploadObjectViaPresignedPut(key: string, body: Buffer, contentType: string) {
  const presigned = await presignUpload(key, contentType)
  if (!presigned) {
    return uploadObject(key, body, contentType)
  }

  const response = await fetch(presigned.uploadUrl, {
    method: 'PUT',
    headers: presigned.headers,
    body: new Uint8Array(body)
  })
  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`S3 presigned PUT ${response.status}: ${text.slice(0, 200)}`)
  }
  return presigned.publicUrl
}

// For S3 driver: pre-signed PUT URL so the browser uploads directly to S3
// (skips proxying through this Node.js process — faster, and avoids the
// double-VPN-hop issue when developing under a VPN).
// Returns null for local driver (caller falls back to server-side upload).
export interface PresignedUpload {
  uploadUrl: string
  publicUrl: string
  key: string
  headers: Record<string, string>
}

export async function presignUpload(
  key: string,
  contentType: string,
  expiresInSec = 60 * 5
): Promise<PresignedUpload | null> {
  const cfg = useRuntimeConfig()
  if (cfg.storage.driver !== 's3') return null
  const cmd = new PutObjectCommand({
    Bucket: cfg.s3.bucket,
    Key: key,
    ContentType: contentType
  })
  const uploadUrl = await getSignedUrl(s3Client(), cmd, { expiresIn: expiresInSec })
  return {
    uploadUrl,
    publicUrl: `${cfg.s3.publicUrl}/${key}`,
    key,
    headers: { 'Content-Type': contentType }
  }
}
