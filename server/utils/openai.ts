export function getOpenAIBaseUrl() {
  const baseUrl = process.env.OPENAI_BASE_URL?.trim()

  if (!baseUrl) {
    throw new Error('OPENAI_BASE_URL must be explicitly set before starting quar.io')
  }

  try {
    const parsed = new URL(baseUrl)
    if (!['https:', 'http:'].includes(parsed.protocol)) {
      throw new Error('invalid protocol')
    }
  } catch {
    throw new Error(`OPENAI_BASE_URL must be a valid absolute HTTP(S) URL, got "${baseUrl}"`)
  }

  return baseUrl
}

export function getOpenAIApiKey(configuredApiKey = '') {
  const apiKey = process.env.OPENAI_API_KEY?.trim() || configuredApiKey.trim()

  if (!apiKey) {
    throw new Error('OPENAI_API_KEY must be set before calling OpenAI')
  }

  return apiKey
}
