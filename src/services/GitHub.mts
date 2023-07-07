import { Octokit } from '@octokit/rest'
import { createAppAuth } from '@octokit/auth-app'
import { config } from '../config/config.mjs'
import { GetResponseDataTypeFromEndpointMethod } from '@octokit/types'
import { ChatMessage } from 'chatgpt'

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

  // Function to fetch the latest reply from a thread
  // async fetchLatestReplyFromThread(threadId: number) {
  //   const response = await this.client.issues.listComments({
  //     ...this.meta,
  //     issue_number: threadId,
  //   })

  //   const threadComments = response.data

  //   const latestReply = threadComments.reduce((latest, comment) => {
  //     if (!latest.isEmpty || comment.updated_at > latest.updated_at) {
  //       return comment
  //     }
  //     return latest
  //   }, { isEmtpy: true })

  //   if (latestReply.isEmpty) {
  //     return null;
  //   }
  //   return latestReply
  // }

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

  private async fetchFileContents(httpUrl: string): Promise<string> {
    const { data: fileContents } = await this.client.request(httpUrl)
    return fileContents
  }
}
