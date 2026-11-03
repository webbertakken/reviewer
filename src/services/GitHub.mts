import { Octokit } from '@octokit/rest'
import { createAppAuth } from '@octokit/auth-app'
import { Config } from '../config/config.mjs'
import { GetResponseDataTypeFromEndpointMethod } from '@octokit/types'

export type PullRequests = GetResponseDataTypeFromEndpointMethod<Octokit['pulls']['list']>
export type PullRequest = PullRequests[number]
export type PullRequestDetails = GetResponseDataTypeFromEndpointMethod<Octokit['pulls']['get']>
export type PullRequestComments = GetResponseDataTypeFromEndpointMethod<
  Octokit['issues']['listComments']
>

type PullRequestFilesRaw = GetResponseDataTypeFromEndpointMethod<Octokit['pulls']['listFiles']>
export type PullRequestFiles = Array<{ contents: string } & PullRequestFilesRaw[number]>

const MIN_UPSTREAM_GATEWAY_STATUS = 502
const MAX_UPSTREAM_GATEWAY_STATUS = 599

export const isTransientUpstreamStatus = (status: number): boolean =>
  status >= MIN_UPSTREAM_GATEWAY_STATUS && status <= MAX_UPSTREAM_GATEWAY_STATUS

export const isTransientUpstreamError = (error: unknown): boolean => {
  if (typeof error !== 'object' || error === null) return false

  if ('status' in error && typeof error.status === 'number') {
    return isTransientUpstreamStatus(error.status)
  }

  if ('errors' in error && Array.isArray(error.errors) && error.errors.length > 0) {
    return error.errors.every(isTransientUpstreamError)
  }

  return false
}

export const createFetchWithUpstreamRetry = (
  baseFetch: typeof fetch = (...args) => globalThis.fetch(...args),
  retries = 2,
  retryDelayMs = 50,
): typeof fetch => {
  return async (input, init) => {
    for (let attempt = 0; ; attempt++) {
      const response = await baseFetch(input, init)
      if (!isTransientUpstreamStatus(response.status) || attempt >= retries) {
        return response
      }
      await response.body?.cancel().catch(() => {})
      if (retryDelayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs * (attempt + 1)))
      }
    }
  }
}

export class GitHub {
  private readonly client: Octokit
  private readonly meta: { owner: string; repo: string }

  constructor(
    config: Config['gitHub']['api'],
    installationId: number,
    owner: string,
    repo: string,
  ) {
    const { auth } = config

    this.meta = { owner, repo }

    this.client = new Octokit({
      authStrategy: createAppAuth,
      auth: { ...auth, installationId },
      request: { fetch: createFetchWithUpstreamRetry() },
    })
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

  async getCommentsByUser(
    pullRequestNumber: number,
    userName: string,
  ): Promise<PullRequestComments> {
    const response = await this.client.issues.listComments({
      ...this.meta,
      issue_number: pullRequestNumber,
    })

    const reviews = response.data.filter((review) => {
      return review.user && review.user.login === userName
    })

    return reviews
  }

  // Function to place a comment by the bot-reviewer
  async placeComment(pullRequestNumber: number, comment: string) {
    await this.client.issues.createComment({
      ...this.meta,
      issue_number: pullRequestNumber,
      body: comment,
    })
  }

  async updateComment(commentId: number, comment: string) {
    await this.client.issues.updateComment({
      ...this.meta,
      comment_id: commentId,
      body: comment,
    })
  }

  async getPrDetails(pullRequestNumber: number): Promise<PullRequestDetails | null> {
    const { data: pullRequestDetails } = await this.client.pulls.get({
      ...this.meta,
      pull_number: pullRequestNumber,
    })

    return pullRequestDetails
  }

  async getPrChangedFiles(pullRequestNumber: number): Promise<PullRequestFilesRaw[number][]> {
    const { data: files } = await this.client.pulls.listFiles({
      ...this.meta,
      pull_number: pullRequestNumber,
    })

    // return Promise.all(
    //   files.map(async (file) => ({
    //     ...file,
    //     contents: await this.fetchFileContents(file.raw_url),
    //   })),
    // )

    return files
  }

  // private async fetchFileContents(httpUrl: string): Promise<string> {
  //   const { data: fileContents } = await this.client.request(httpUrl)
  //   return fileContents
  // }
}
