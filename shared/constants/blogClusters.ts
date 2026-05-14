// Кластеры блога — соответствуют разделам CONTENT-PLAN.md.
// Каждая статья во frontmatter указывает один из этих кодов.
export interface BlogCluster {
  code: string
  name: string
  description: string
}

export const BLOG_CLUSTERS: BlogCluster[] = [
  {
    code: 'returns-rating',
    name: 'Возвраты и рейтинг',
    description: 'Как инструкции и постпокупочный опыт влияют на отзывы, возвраты и рейтинг карточки на маркетплейсах.'
  },
  {
    code: 'qr-codes',
    name: 'QR-коды на упаковке',
    description: 'Печать, размещение, тестирование и аналитика QR-кодов на товаре и вкладыше.'
  },
  {
    code: 'instructions',
    name: 'Электронные инструкции',
    description: 'Форматы, структура и содержание инструкций, которые покупатель действительно прочитает.'
  },
  {
    code: 'marketplace-law',
    name: 'Маркетплейсы и закон',
    description: 'Требования WB, Ozon, ЕАЭС и нормативка к информации о товаре и его инструкции.'
  },
  {
    code: 'post-purchase',
    name: 'Постпокупочный опыт',
    description: 'Что делать с покупателем после покупки: связь, поддержка, гарантия, допродажи.'
  },
  {
    code: 'niche',
    name: 'Шаблоны по нишам',
    description: 'Конкретные сценарии инструкций для отдельных категорий товаров.'
  }
]

export function getClusterByCode(code: string): BlogCluster | null {
  return BLOG_CLUSTERS.find((c) => c.code === code) ?? null
}
