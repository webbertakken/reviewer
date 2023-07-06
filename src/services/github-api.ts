import { Octokit } from '@octokit/rest'
import { createAppAuth } from '@octokit/auth-app'
import path from 'path'
import fs from 'fs'

type GithubApiConfig = {
  repoName: string
  repoOwner: string
  installationId: string
  appId: string
  privateKey: string
}

function readGithubPemKey() {
  const filePath = path.join(__dirname, `../../pr-code-reviewer.private-key.pem`)
  const fileData = fs.readFileSync(filePath, 'utf8')
  return fileData
}

const ghApiKey = readGithubPemKey()

export class GithubApi {
  app: any
  token: string
  meta: {
    owner: string
    repo: string
  }

  // Authenticates and stores token
  constructor({ repoName, repoOwner, installationId, appId, privateKey }: GithubApiConfig) {
    this.meta = {
      owner: repoOwner,
      repo: repoName,
    }
    this.token = ''
    console.log('Authenticating with Github App...', privateKey)
    this.app = new Octokit({
      authStrategy: createAppAuth,
      auth: {
        appId: parseInt(appId, 10),
        privateKey: ghApiKey,
        // optional: this will make appOctokit authenticate as app (JWT)
        //           or installation (access token), depending on the request URL
        installationId: parseInt(installationId, 10),
      },
    })
  }

  async getPullRequestInfo(pullRequestNumber: number) {
    try {
      const response = await this.app.pulls.get({
        ...this.meta,
        pull_number: pullRequestNumber,
      })

      return response.data
    } catch (error) {
      console.error('Error fetching pull request information:', error)
      throw error
    }
  }

  // Function to fetch file changes from a pull request
  async getFileChanges(pullRequestNumber: number) {
    try {
      const response = await this.app.pulls.listFiles({
        ...this.meta,
        pull_number: pullRequestNumber,
      })

      const files = await Promise.all(
        response.data.map(async (file: any) => {
          const fileResponse = await this.app.repos.getContent({
            ...this.meta,
            path: file.filename,
            ref: file.sha,
          })

          const content = Buffer.from(fileResponse.data.content, 'base64').toString()
          return {
            filename: file.filename,
            content: content,
          }
        }),
      )

      return files
    } catch (error) {
      console.error('Error fetching file changes:', error)
      throw error
    }
  }
}
