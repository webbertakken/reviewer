import { Octokit } from '@octokit/rest'
import { createAppAuth } from '@octokit/auth-app'
import { config } from '../config/config.mjs'

type fileChange = {
  filename: string
  content: string
  patch: string
  ignored: boolean
}

export class GitHub {
  private readonly client: Octokit
  private readonly meta: { owner: string; repo: string }
  private readonly installationId: number

  constructor(owner: string, repo: string, installationId = 0) {
    const { auth } = config.gitHub.api

    this.meta = { owner, repo }
    this.installationId = installationId

    this.client = new Octokit({ authStrategy: createAppAuth, auth })
  }

  async getMostRecentPullRequest() {
    try {
      const response = await this.client.pulls.list({
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

  async getPullRequestInfo(pullRequestNumber: number) {
    try {
      const response = await this.client.pulls.get({
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
      const response = await this.client.pulls.listFiles({
        ...this.meta,
        pull_number: pullRequestNumber,
      })

      const files: fileChange[] = (await Promise.all(
        response.data.map(async (file) => {
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
            content: (await this.fetchFileContent(file.raw_url)) || '',
            patch: file.patch,
            ignored: false,
          }
        }),
      )) as fileChange[]

      return files.filter((file) => !file.ignored)
    } catch (error) {
      console.error('Error fetching file changes:', error)
      throw error
    }
  }

  // Fetches content from the blob http url
  async fetchFileContent(httpUrl: string): Promise<string> {
    try {
      const response = await this.client.request(httpUrl)
      return response.data
    } catch (error) {
      console.error('Error fetching file content:', error)
      throw error
    }
  }
}
