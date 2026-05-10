import { requireTenant } from '~~/server/utils/tenant'
import { prisma } from '~~/server/utils/prisma'
import { productBarcodeSchema } from '~~/shared/schemas/instruction'

// Look up a tenant instruction by its productBarcode. Returns either the
// matching instruction (any status — the linker uses this to decide whether
// to show "barcode unknown" UI) or null.
export default defineEventHandler(async (event) => {
  const { tenant } = await requireTenant(event)
  const query = getQuery(event)
  // The linker pipes raw scanner output here — it can be junk on bad frames.
  // Return null instead of 400 so the camera loop just keeps trying.
  const parsed = productBarcodeSchema.safeParse(query.barcode)
  if (!parsed.success) return { instruction: null }
  const barcode = parsed.data

  const instruction = await prisma.instruction.findFirst({
    where: { tenantId: tenant.id, productBarcode: barcode },
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      status: true,
      productBarcode: true
    }
  })

  return { instruction }
})
