import { toggleModule } from '~~/server/utils/moduleToggle'

// Required because the static `warranty/` dir shadows /api/modules/[code]
// for PUT requests — see moduleToggle.ts header.
export default defineEventHandler((event) => toggleModule(event, 'warranty'))
