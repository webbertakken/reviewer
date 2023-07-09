import type { Env } from './env.mjs'

export type Config = ReturnType<typeof createConfig>
export const createConfig = (env: Env) => ({
  app: {
    port: 3000,
    verbose: env.APP_VERBOSE === 'true',
    mockGpt: env.MOCK_GPT === 'true',
  },
  gitHub: {
    owner: 'webbertakken',
    repo: 'reviewer',
    app: {
      name: 'PR Code Reviewer',
      handle: 'pr-code-reviewer[bot]',
      appId: '353840',
      privateKey: env.GH_APP_CLIENT_SECRET || '',
      webhooks: {
        secret: env.GH_APP_SECRET_TOKEN || '',
      },
      oauth: {
        clientId: 'Iv1.59c51d0842ad2f54',
        clientSecret: env.GH_APP_CLIENT_SECRET || '',
      },
    },
    api: {
      auth: {
        appId: 353840,
        installationId: 39090441,
        privateKey: env.GH_APP_PRIVATE_KEY || '',
      },
    },
    actions: {},
  },
  gpt: {
    apiKey: env.OPENAI_API_KEY || '',
  },
  model: {
    name: 'GPT',
    version: '3.5-turbo',
  },
})
