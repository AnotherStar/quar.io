// Контракт для шаблонов печати. Сейчас все шаблоны живут в коде
// (print-templates/<code>/index.ts) и регистрируются в registry.ts. На
// будущее предусмотрены поля definition / definitionFormat — туда будут
// складываться JSON / SVG / HTML описания, когда появится визуальный
// редактор шаблонов: render() для таких шаблонов будет один общий, читающий
// definition из БД, и тогда же мы заведём модель PrintTemplate в Prisma.

export type PrintTemplateDefinitionFormat = 'code' | 'json' | 'svg' | 'html'

export interface PrintTemplateSize {
  // Физический размер одной наклейки. Шаблон сам решает, верстать ли N
  // наклеек на A4 или одна-страница-один-стикер.
  widthMm: number
  heightMm: number
}

export interface PrintTemplateManifest {
  code: string                     // 'sticker-50x80'
  name: string                     // человекочитаемое имя
  description: string
  size: PrintTemplateSize
  // Версия шаблона. Любое изменение, которое меняет визуальный результат,
  // должно её бампать — иначе исторический тираж может разъехаться с тем,
  // что было в момент генерации.
  version: number
  // Превью для карточки выбора в /dashboard/print/new. Путь от корня сайта
  // (public/...) либо null если превью пока нет.
  previewUrl: string | null
  // Формат описания шаблона. Сейчас всегда 'code' — шаблон захардкожен в
  // соответствующей папке. С появлением редактора появятся другие форматы.
  definitionFormat: PrintTemplateDefinitionFormat
  definition?: unknown             // зарезервировано для будущих форматов
}

export interface PrintRenderContext {
  // Список QR-кодов, попавших в тираж. shortId — то, что вшито в URL,
  // url — полный публичный URL, который кодируется в QR-матрице.
  items: Array<{ shortId: string; url: string }>
  // Метаданные тенанта. brandingLogoUrl — лого клиента из настроек; если
  // не задан, шаблон сам решает, чем подменить (обычно — наш plug-in лого).
  tenant: {
    id: string
    name: string
    slug: string
    brandingLogoUrl: string | null
  }
}

export interface PrintTemplate {
  manifest: PrintTemplateManifest
  render: (ctx: PrintRenderContext) => Promise<Buffer> | Buffer
}
