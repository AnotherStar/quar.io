import type { PrintTemplate } from './types'
import { stickerTemplate } from './sticker-50x80'
import { brandStickerTemplate } from './sticker-50x80-brand'
import { minimalStickerTemplate } from './sticker-50x80-minimal'
import { horizontalStickerTemplate } from './sticker-80x50-horizontal'

// Registry всех доступных шаблонов печати. Когда появится редактор шаблонов
// в UI, рядом с этим списком появится загрузка пользовательских шаблонов из
// БД — но контракт PrintTemplate останется тем же, и downstream-код
// (API, dashboard) не будет знать, откуда пришёл шаблон.
export const printTemplates: PrintTemplate[] = [
  stickerTemplate,
  minimalStickerTemplate,
  brandStickerTemplate,
  horizontalStickerTemplate
]

export function getPrintTemplate(code: string): PrintTemplate | undefined {
  return printTemplates.find((t) => t.manifest.code === code)
}
