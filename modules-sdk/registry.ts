// Module registry — single source of truth for which modules are loaded.
// To add a new module: drop a folder under modules/<code>/ with index.ts that
// default-exports a ModuleDefinition, then import it here.
import type { ModuleDefinition } from './types'

import warranty from '~~/instruction-modules/warranty-registration'
import chat from '~~/instruction-modules/chat-consultant'
import faq from '~~/instruction-modules/faq'
import feedback from '~~/instruction-modules/feedback'

export const moduleRegistry: ModuleDefinition[] = [warranty, chat, faq, feedback]

export function getModuleByCode(code: string): ModuleDefinition | undefined {
  return moduleRegistry.find((m) => m.manifest.code === code)
}
