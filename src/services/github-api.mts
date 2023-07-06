import {Octokit} from '@octokit/rest'
import {createAppAuth} from '@octokit/auth-app'
import * as fs from 'node:fs';
import * as path from 'node:path';
import {fileURLToPath} from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type GithubApiConfig = {
  repoName: string
  repoOwner: string
  installationId: string
  appId: string
  privateKey: string
}

type fileChange = {
  filename: string
  content: string
  patch: string
  ignored: boolean
}

// helpers move it away ...
// --------------------------------------------

function readGithubPemKey() {
  const filePath = path.join(__dirname, `../../pr-code-reviewer.private-key.pem`)
  return fs.readFileSync(filePath, 'utf8')
}

// --------------------------------------------

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

  async getMostRecentPullRequest() {
    try {
      const response = await this.app.pulls.list({
        ...this.meta,
        sort: 'created',
        direction: 'desc',
        per_page: 1,
      })

      const pullRequests = response.data
      if (!pullRequests.length) {
        throw new Error('No pull requests found in the repository')
      }
      const mostRecentPullRequest = pullRequests[0]
      return mostRecentPullRequest
    } catch (error) {
      console.error('Error fetching pull requests:', error)
      throw error
    }
  }

  async getPullRequestInfo(pullRequestNumber: number): Promise<any> {
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
  async getFileChanges(pullRequestNumber: number): Promise<fileChange[]> {
    try {
      const response = await this.app.pulls.listFiles({
        ...this.meta,
        pull_number: pullRequestNumber,
      })

      const files = await Promise.all(
        response.data.map(async (file: any) => {
          const { filename } = file
          if (!filename.startsWith('src')) {
            return {
              filename,
              content: '',
              patch: '',
              ignored: true,
            }
          }
          return {
            filename,
            content: await this.fetchFileContent(file.raw_url),
            patch: file.patch,
            ignored: false,
          }
        }),
      )

      return files.filter((file: any) => !file.ignored)
    } catch (error) {
      console.error('Error fetching file changes:', error)
      throw error
    }
  }

  // Fetches content from the blob http url
  async fetchFileContent(httpUrl: string): Promise<string> {
    try {
      const response = await this.app.request(httpUrl)
      return response.data
    } catch (error) {
      console.error('Error fetching file content:', error)
      throw error
    }
  }
}
