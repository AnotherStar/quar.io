import { customAlphabet } from 'nanoid'

const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz'
const SHORT_ID_LEN = 10

export const generateShortId = customAlphabet(ALPHABET, SHORT_ID_LEN)

export function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9Ѐ-ӿ]+/g, '-')   // allow Cyrillic
    .replace(/^-+|-+$/g, '')
    .slice(0, 64)
}

export function reservedSlugs(): Set<string> {
  const cfg = useRuntimeConfig()
  return new Set(cfg.reservedSlugs.split(',').map(s => s.trim()).filter(Boolean))
}

export function isReservedSlug(slug: string) {
  return reservedSlugs().has(slug.toLowerCase())
}
