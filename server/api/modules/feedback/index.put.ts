import { toggleModule } from '~~/server/utils/moduleToggle'

// Required because the static `feedback/` dir shadows /api/modules/[code]
// for PUT requests — see moduleToggle.ts header.
export default defineEventHandler((event) => toggleModule(event, 'feedback'))
