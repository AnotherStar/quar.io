import { createError } from 'h3'
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { requireTenant } from '~~/server/utils/tenant'
import { prisma } from '~~/server/utils/prisma'

// Скачивание PDF тиража. Логика выбора способа:
//   • storage.driver === 's3'  → отдаём 302 на presigned GET URL (короткоживущий)
//   • storage.driver === 'local' → читаем файл с диска и стримим как attachment
//
// Альтернативой для S3 был бы прокси-скачивание через Node — это упростит
// тестирование и не светит S3-URL в браузер, но это лишняя нагрузка на наш
// nitro-процесс. На больших тиражах presigned-link заметно быстрее.
export default defineEventHandler(async (event) => {
  const { tenant } = await requireTenant(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'id required' })

  const batch = await prisma.printBatch.findFirst({
    where: { id, tenantId: tenant.id }
  })
  if (!batch) throw createError({ statusCode: 404, statusMessage: 'Тираж не найден' })
  if (batch.status !== 'READY' || !batch.pdfStorageKey) {
    throw createError({ statusCode: 409, statusMessage: 'PDF ещё не готов или сборка завершилась с ошибкой' })
  }

  const filename = `quar-print-${batch.id}.pdf`
  const cfg = useRuntimeConfig()

  if (cfg.storage.driver === 's3') {
    const client = new S3Client({
      region: cfg.s3.region,
      endpoint: cfg.s3.endpoint || undefined,
      forcePathStyle: true,
      credentials: { accessKeyId: cfg.s3.accessKey, secretAccessKey: cfg.s3.secretKey },
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED'
    })
    const url = await getSignedUrl(
      client,
      new GetObjectCommand({
        Bucket: cfg.s3.bucket,
        Key: batch.pdfStorageKey,
        ResponseContentDisposition: `attachment; filename="${filename}"`,
        ResponseContentType: 'application/pdf'
      }),
      { expiresIn: 60 * 5 }
    )
    await sendRedirect(event, url, 302)
    return
  }

  // local driver — читаем файл и стримим из nitro
  const filePath = path.resolve(process.cwd(), cfg.storage.localDir, batch.pdfStorageKey)
  const buf = await readFile(filePath)
  setHeader(event, 'content-type', 'application/pdf')
  setHeader(event, 'content-disposition', `attachment; filename="${filename}"`)
  return buf
})
