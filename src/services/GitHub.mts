import { Octokit } from '@octokit/rest'
import { createAppAuth } from '@octokit/auth-app'
import { Config } from '../config/config.mjs'
import { GetResponseDataTypeFromEndpointMethod } from '@octokit/types'

const octokit = new Octokit()
export type PullRequests = GetResponseDataTypeFromEndpointMethod<typeof octokit.pulls.list>
export type PullRequest = PullRequests[number]
export type PullRequestDetails = GetResponseDataTypeFromEndpointMethod<typeof octokit.pulls.get>
export type PullRequestComments = GetResponseDataTypeFromEndpointMethod<
  typeof octokit.issues.listComments
>

type PullRequestFilesRaw = GetResponseDataTypeFromEndpointMethod<typeof octokit.pulls.listFiles>
export type PullRequestFiles = Array<{ contents: string } & PullRequestFilesRaw[number]>

export class GitHub {
  private readonly client: Octokit
  private readonly repository: { owner: string; repo: string }
  private readonly webhookSecret: string

  constructor(
    config: Config['gitHub']['api'],
    installationId: number,
    owner: string,
    repo: string,
  ) {
    const { auth } = config

    this.webhookSecret = config.webhooks.secret
    this.repository = { owner, repo }

    this.client = new Octokit({ authStrategy: createAppAuth, auth: { ...auth, installationId } })
  }

  async checkIfWebhookExists() {
    const { data: hooks } = await this.client.repos.listWebhooks({
      ...this.repository,
    })

    return hooks.some((hook) => hook.config.url === 'https://hooks.code-reviewer.net/')
  }

  async createWebhook() {
    if (!this.webhookSecret) throw new Error('Webhook secret not set')

    await this.client.repos.createWebhook({
      ...this.repository,
      name: 'Code Reviewer Hook',
      active: true,
      events: ['push', 'pull_request'],
      config: {
        secret: this.webhookSecret,
        url: 'https://hooks.code-reviewer.net/',
        content_type: 'json',
        insecure_ssl: '0',
      },
    })
  }

  async getMostRecentPr(): Promise<PullRequest | null> {
    const { data: pullRequests } = await this.client.pulls.list({
      ...this.repository,
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
      ...this.repository,
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
      ...this.repository,
      issue_number: pullRequestNumber,
      body: comment,
    })
  }

  async updateComment(commentId: number, comment: string) {
    await this.client.issues.updateComment({
      ...this.repository,
      comment_id: commentId,
      body: comment,
    })
  }

  async getPrDetails(pullRequestNumber: number): Promise<PullRequestDetails | null> {
    const { data: pullRequestDetails } = await this.client.pulls.get({
      ...this.repository,
      pull_number: pullRequestNumber,
    })

    return pullRequestDetails
  }

  async getPrChangedFiles(pullRequestNumber: number): Promise<PullRequestFilesRaw[number][]> {
    const { data: files } = await this.client.pulls.listFiles({
      ...this.repository,
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
