import type { Env } from './env.mjs'

export type Config = ReturnType<typeof createConfig>
export const createConfig = (env: Env) => {
  if (!env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is not set')
  if (!env.GH_APP_CLIENT_SECRET) throw new Error('GH_APP_CLIENT_SECRET is not set')
  if (!env.GH_APP_SECRET_TOKEN) throw new Error('GH_APP_SECRET_TOKEN is not set')
  if (!env.GH_APP_PRIVATE_KEY) throw new Error('GH_APP_PRIVATE_KEY is not set')
  if (!env.SENTRY_DSN) throw new Error('SENTRY_DSN is not set')
  if (!env.ENVIRONMENT) throw new Error('ENVIRONMENT is not set')
  if (!env.MODE) throw new Error('MODE is not set')

  return {
    app: {
      port: 3000,
      verbose: env.APP_VERBOSE === 'true',
      veryVerbose: false,
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
          privateKey: env.GH_APP_PRIVATE_KEY || '',
        },
      },
      actions: {},
    },
    gpt: {
      apiKey: env.OPENAI_API_KEY || '',
      model: 'gpt-3.5-turbo', // 'gpt-4', // access not yet granted, should show up here: https://platform.openai.com/account/rate-limits
      debug: env.GPT_DEBUG === 'true',
    },
    sentry: {
      dsn: env.SENTRY_DSN || '',
      environment: env.ENVIRONMENT,
      clientId: env.SENTRY_DSN?.split('/')[3] || '',
      clientSecret: env.SENTRY_DSN?.split('/')[2]?.split('@')[0] || '',
    },
  }
}
