import { describe, test } from 'vitest'
import { PullRequestTriggers } from '../src/domain/triggers/PullRequestTriggers.mjs'
import { EmitterWebhookEvent } from '@octokit/webhooks/dist-types/types'

describe('Triggers', () => {
  describe('PullRequest', () => {
    test('creating a new pull request', async () => {
      // Arrange
      const event = {
        name: 'pull_request',
        payload: {
          pull_request: {
            number: 1,
            title: 'title',
            body: 'body',
          },
        },
      } as EmitterWebhookEvent<'pull_request.opened'>

      // Act
      await PullRequestTriggers.onOpened(event)
    })
  })
})
