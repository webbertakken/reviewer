export const checkEnv = () => {
  const openApiKey = process.env.OPENAI_API_KEY || ''
  const githubAppClientSecret = process.env.GH_APP_CLIENT_SECRET || ''

  if (!openApiKey?.startsWith('sk-')) {
    console.log('OpenAI API key is NOT set.')
    return false
  }

  if (!githubAppClientSecret) {
    console.log('Github App client secret is NOT set.')
    return false
  }

  console.log('Variables are set up correctly 🎉')
  return true
}
