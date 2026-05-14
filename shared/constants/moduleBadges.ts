// Module codes that surface an inbox-style sidebar badge with a count of
// "new since last visit" items. Keep in sync with instruction-modules/*/index.ts —
// only modules that produce inbound items (submissions / messages / requests)
// belong here. Modules like FAQ that have no inbound data don't.
export const BADGE_MODULE_CODES = [
  'feedback',
  'chat-consultant',
  'warranty-registration'
] as const

export type BadgeModuleCode = (typeof BADGE_MODULE_CODES)[number]

export function isBadgeModuleCode(code: string): code is BadgeModuleCode {
  return (BADGE_MODULE_CODES as readonly string[]).includes(code)
}
