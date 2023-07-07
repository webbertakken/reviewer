import { getGithubPrivateKey } from './getGithubPrivateKey.mjs'

export const config = {
  app: {
    port: 3000,
    verbose: process.env.APP_VERBOSE === 'true',
  },
  gitHub: {
    owner: 'webbertakken',
    repo: 'reviewer',
    app: {
      name: 'PR Code Reviewer',
      handle: 'pr-code-reviewer[bot]',
      appId: '353840',
      privateKey: process.env.GH_APP_CLIENT_SECRET || '',
      webhooks: {
        secret: process.env.GH_APP_SECRET_TOKEN || '',
      },
      oauth: {
        clientId: 'Iv1.59c51d0842ad2f54',
        clientSecret: process.env.GH_APP_CLIENT_SECRET || '',
      },
    },
    api: {
      auth: {
        appId: 353840,
        installationId: 39090441,
        privateKey: getGithubPrivateKey(),
      },
    },
    actions: {},
  },
  openAi: {
    apiKey: process.env.OPENAI_API_KEY || '',
  },
  model: {
    name: 'GPT',
    version: '3.5-turbo',
  },
}
