import { EmitterWebhookEvent } from '@octokit/webhooks/dist-types/types.js'
import { pullRequestActions } from '../pullRequestActions.mjs'

export class PullRequestTriggers {
  static async onSynchronise(event: EmitterWebhookEvent<'pull_request.synchronize'>) {
    console.log('PullRequest.onSynchronise')

    const pr = pullRequestActions(event)
    await pr.reviewTitleAndDescription()
    await pr.reviewCodeChanges()
    await pr.placeOrUpdateComment()
  }

  static async onOpened(event: EmitterWebhookEvent<'pull_request.opened'>) {
    console.log('PullRequest.onOpened')

    const pr = pullRequestActions(event)
    await pr.reviewTitleAndDescription()
    await pr.reviewCodeChanges()
    await pr.placeOrUpdateComment()
  }

  static async onReopened(event: EmitterWebhookEvent<'pull_request.reopened'>) {
    console.log('PullRequest.onReopened')

    const pr = pullRequestActions(event)
    await pr.reviewTitleAndDescription()
    await pr.reviewCodeChanges()
    await pr.placeOrUpdateComment()
  }

  static async onEdited(event: EmitterWebhookEvent<'pull_request.edited'>) {
    console.log('PullRequest.onEdited, only reviewing ')

    const pr = pullRequestActions(event)
    await pr.reviewTitleAndDescription()
    await pr.placeOrUpdateComment()
  }
}
