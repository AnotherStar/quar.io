import { getOpenAIBaseUrl } from '~~/server/utils/openai'

export default defineNitroPlugin(() => {
  getOpenAIBaseUrl()
})
