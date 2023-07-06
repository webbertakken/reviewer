import { Octokit } from '@octokit/rest'
import { createAppAuth } from '@octokit/auth-app'
import { config } from '../config/config.mjs'
import { GetResponseDataTypeFromEndpointMethod } from '@octokit/types'

const octokit = new Octokit()
export type PullRequests = GetResponseDataTypeFromEndpointMethod<typeof octokit.pulls.list>
export type PullRequest = PullRequests[number]
export type PullRequestDetails = GetResponseDataTypeFromEndpointMethod<typeof octokit.pulls.get>

type PullRequestFilesRaw = GetResponseDataTypeFromEndpointMethod<typeof octokit.pulls.listFiles>
export type PullRequestFiles = Array<{ contents: string } & PullRequestFilesRaw[number]>

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

  async getMostRecentPr(): Promise<PullRequest | null> {
    const { data: pullRequests } = await this.client.pulls.list({
      ...this.meta,
      sort: 'created',
      direction: 'desc',
      per_page: 1,
    })

    return pullRequests[0] || null
  }

  async getPrDetails(pullRequestNumber: number): Promise<PullRequestDetails | null> {
    const { data: pullRequestDetails } = await this.client.pulls.get({
      ...this.meta,
      pull_number: pullRequestNumber,
    })

    return pullRequestDetails
  }

  async getPrChangedFiles(pullRequestNumber: number): Promise<PullRequestFiles> {
    const { data: files } = await this.client.pulls.listFiles({
      ...this.meta,
      pull_number: pullRequestNumber,
    })

    return Promise.all(
      files.map(async (file) => ({
        ...file,
        contents: await this.fetchFileContents(file.raw_url),
      })),
    )
  }

  async fetchFileContents(httpUrl: string): Promise<string> {
    const { data: fileContents } = await this.client.request(httpUrl)
    return fileContents
  }
}
