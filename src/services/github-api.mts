import { Octokit } from '@octokit/rest'
import { createAppAuth } from '@octokit/auth-app'
import * as path from 'node:path'
import * as fs from 'node:fs'
import { __dirname } from '../deps.mjs'

function readGithubPemKey() {
  const filePath = path.join(__dirname, `../pr-code-reviewer.private-key.pem`)
  return fs.readFileSync(filePath, 'utf8')
}

// --------------------------------------------

const privateKey = readGithubPemKey()

export type GitHubApi = Octokit

export const ghApi: GitHubApi = (() => {
  const config = {
    appId: '353840',
    repoName: 'reviewer',
    repoOwner: 'webbertakken',
    installationId: '39090441',
  }

  console.log('Authenticating with Github App...')

  return new Octokit({
    authStrategy: createAppAuth,
    auth: {
      appId: parseInt(config.appId, 10),
      privateKey,
      // optional: this will make appOctokit authenticate as app (JWT)
      //           or installation (access token), depending on the request URL
      installationId: parseInt(config.installationId, 10),
    },
  })
})()
