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

const INTERNAL_SERVER_ERROR_STATUS = 500
const TEMPORARILY_UNAVAILABLE_ERROR_CODE = 'not_available'

export const isTransientUpstreamStatus = (status: number): boolean =>
  status >= MIN_UPSTREAM_GATEWAY_STATUS && status <= MAX_UPSTREAM_GATEWAY_STATUS

/**
 * GitHub answers some server errors with a body whose `errors` mark a resource as
 * temporarily unavailable (for example while it is too busy to compute it); a retry can succeed.
 */
const reportsTemporarilyUnavailableResource = (body: unknown): boolean =>
  typeof body === 'object' &&
  body !== null &&
  'errors' in body &&
  Array.isArray(body.errors) &&
  body.errors.some(
    (error: unknown) =>
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === TEMPORARILY_UNAVAILABLE_ERROR_CODE,
  )

const isTransientUpstreamResponse = async (response: Response): Promise<boolean> => {
  if (isTransientUpstreamStatus(response.status)) return true
  if (response.status !== INTERNAL_SERVER_ERROR_STATUS) return false

  const body: unknown = await response
    .clone()
    .json()
    .catch(() => null)
  return reportsTemporarilyUnavailableResource(body)
}

export const unwrapWebhookErrors = (error: unknown): unknown[] => {
  if (typeof error !== 'object' || error === null) return [error]

  if ('errors' in error && Array.isArray(error.errors) && error.errors.length > 0) {
    return error.errors.flatMap(unwrapWebhookErrors)
  }

  if (Symbol.iterator in error && typeof error[Symbol.iterator] === 'function') {
    const items = Array.from(error as Iterable<unknown>)
    if (items.length > 0) return items.flatMap(unwrapWebhookErrors)
  }

  return [error]
}

export const isTransientUpstreamError = (error: unknown): boolean => {
  if (typeof error !== 'object' || error === null) return false

  if ('status' in error && typeof error.status === 'number') {
    if (isTransientUpstreamStatus(error.status)) return true
    return (
      error.status === INTERNAL_SERVER_ERROR_STATUS &&
      'response' in error &&
      typeof error.response === 'object' &&
      error.response !== null &&
      'data' in error.response &&
      reportsTemporarilyUnavailableResource(error.response.data)
    )
  }

  const unwrapped = unwrapWebhookErrors(error)
  if (unwrapped.length === 1 && unwrapped[0] === error) return false

  return unwrapped.every(isTransientUpstreamError)
}

export const createFetchWithUpstreamRetry = (
  baseFetch: typeof fetch = (...args) => globalThis.fetch(...args),
  retries = 2,
  retryDelayMs = 50,
): typeof fetch => {
  return async (input, init) => {
    for (let attempt = 0; ; attempt++) {
      const response = await baseFetch(input, init)
      if (attempt >= retries || !(await isTransientUpstreamResponse(response))) {
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
