import { toggleModule } from '~~/server/utils/moduleToggle'

// Catch-all toggle for module codes that DON'T have a static sibling dir
// under /api/modules (e.g. chat-consultant, faq). Modules that DO have a
// dir (warranty, feedback) provide their own index.put.ts because Nitro's
// file router doesn't fall through static→dynamic for method mismatch.
export default defineEventHandler(async (event) => {
  const code = getRouterParam(event, 'code')!
  return toggleModule(event, code)
})
