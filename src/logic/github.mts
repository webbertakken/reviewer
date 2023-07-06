import { ghApi, GitHubApi } from '../services/github-api.mjs'

type GithubApiConfig = {
  repoName: string
  repoOwner: string
}

type fileChange = {
  filename: string
  content: string
  patch: string
  ignored: boolean
}

export class GitHub {
  app: GitHubApi
  meta: {
    owner: string
    repo: string
  }

  // Authenticates and stores token
  constructor({ repoName, repoOwner }: GithubApiConfig) {
    // Todo - use this later to switch `ghApi` between different installations and repos.
    this.meta = {
      owner: repoOwner,
      repo: repoName,
    }

    this.app = ghApi
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
  async getFileChanges(pullRequestNumber: number): Promise<fileChange[]> {
    try {
      const response = await this.app.pulls.listFiles({
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
      const response = await this.app.request(httpUrl)
      return response.data
    } catch (error) {
      console.error('Error fetching file content:', error)
      throw error
    }
  }
}
