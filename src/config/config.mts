import { getGithubPrivateKey } from './getGithubPrivateKey.mjs'

export const config = {
  gitHub: {
    app: {
      appId: '353840',
      privateKey: process.env.GH_APP_CLIENT_SECRET || '',
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
}
