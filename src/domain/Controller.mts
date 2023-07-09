import { EmitterWebhookEvent } from '@octokit/webhooks/dist-types/types.js'
import { createPullRequestActions } from './PullRequestActions.mjs'
import { hasCorrectConfig } from '../config/hasCorrectConfig.mjs'
import type { Config } from '../config/config.mjs'
import { GitHub } from '../services/GitHub.mjs'
import { Gpt } from '../services/Gpt.mjs'
import { RepositoryContext } from './RepositoryContext.mjs'

export type Controller = ReturnType<typeof createController>

export const createController = (config: Config, { owner, repo }: RepositoryContext) => {
  if (!hasCorrectConfig(config)) throw new Error('Config is not set up correctly')

  // Services
  const gh = new GitHub(config.gitHub.api, owner, repo)
  const gpt = new Gpt(config.gpt, config.app.mockGpt)

  return {
    async onSynchronise(event: EmitterWebhookEvent<'pull_request.synchronize'>) {
      console.log('PullRequest.onSynchronise')

      const pr = createPullRequestActions(event, config, gh, gpt)
      await pr.reviewTitleAndDescription()
      await pr.reviewCodeChanges()
      await pr.placeOrUpdateComment()
    },

    async onOpened(event: EmitterWebhookEvent<'pull_request.opened'>) {
      console.log('PullRequest.onOpened')

      const pr = createPullRequestActions(event, config, gh, gpt)
      await pr.reviewTitleAndDescription()
      await pr.reviewCodeChanges()
      await pr.placeOrUpdateComment()
    },

    async onReopened(event: EmitterWebhookEvent<'pull_request.reopened'>) {
      console.log('PullRequest.onReopened')

      const pr = createPullRequestActions(event, config, gh, gpt)
      await pr.reviewTitleAndDescription()
      await pr.reviewCodeChanges()
      await pr.placeOrUpdateComment()
    },

    async onEdited(event: EmitterWebhookEvent<'pull_request.edited'>) {
      console.log('PullRequest.onEdited, only reviewing ')

      const pr = createPullRequestActions(event, config, gh, gpt)
      await pr.reviewTitleAndDescription()
      await pr.placeOrUpdateComment()
    },
  }
}
