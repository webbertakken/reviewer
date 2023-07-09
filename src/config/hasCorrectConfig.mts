import type { Config } from './config.mjs'

export const hasCorrectConfig = (config: Config) => {
  if (!config.gpt.apiKey?.startsWith('sk-')) {
    console.log('OpenAI API key is NOT set.')
    return false
  }

  if (!config.gitHub.app.privateKey) {
    console.log('Github App client secret is NOT set.')
    return false
  }

  if (!config.gitHub.api.auth.privateKey) {
    console.log('Github API client secret is NOT set.')
    return false
  }

  console.log('Variables are set up correctly 🎉')
  return true
}
