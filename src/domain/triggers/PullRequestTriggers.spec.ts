import { vi, it, describe, expect, beforeEach } from 'vitest'
import { PullRequestTriggers } from './PullRequestTriggers.mjs'
import { EmitterWebhookEvent } from '@octokit/webhooks/dist-types/types.js'

// Methods must be hoisted to reference them in `vi.mock`
const prActionMethods = vi.hoisted(() => ({
  reviewTitleAndDescription: vi.fn(),
  reviewCodeChanges: vi.fn(),
  placeOrUpdateComment: vi.fn(),
}))

vi.mock('../pullRequestActions.mjs', () => ({
  pullRequestActions: vi.fn().mockReturnValue({ ...prActionMethods }),
}))

describe('PullRequestTriggers', () => {
  vi.stubGlobal('console', { log: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('onSynchronise', () => {
    const event = {} as EmitterWebhookEvent<'pull_request.synchronize'>

    it('calls reviewTitleAndDescription', async () => {
      await PullRequestTriggers.onSynchronise(event)
      expect(prActionMethods.reviewTitleAndDescription).toHaveBeenCalledTimes(1)
    })

    it('calls reviewCodeChanges', async () => {
      await PullRequestTriggers.onSynchronise(event)
      expect(prActionMethods.reviewCodeChanges).toHaveBeenCalledTimes(1)
    })

    it('calls placeOrUpdateComment', async () => {
      await PullRequestTriggers.onSynchronise(event)
      expect(prActionMethods.placeOrUpdateComment).toHaveBeenCalledTimes(1)
    })
  })

  describe('onOpened', () => {
    const event = {} as EmitterWebhookEvent<'pull_request.opened'>

    it('calls reviewTitleAndDescription', async () => {
      await PullRequestTriggers.onOpened(event)
      expect(prActionMethods.reviewTitleAndDescription).toHaveBeenCalledTimes(1)
    })

    it('calls reviewCodeChanges', async () => {
      await PullRequestTriggers.onOpened(event)
      expect(prActionMethods.reviewCodeChanges).toHaveBeenCalledTimes(1)
    })

    it('calls placeOrUpdateComment', async () => {
      await PullRequestTriggers.onOpened(event)
      expect(prActionMethods.placeOrUpdateComment).toHaveBeenCalledTimes(1)
    })
  })

  describe('onReopened', () => {
    const event = {} as EmitterWebhookEvent<'pull_request.reopened'>

    it('calls reviewTitleAndDescription', async () => {
      await PullRequestTriggers.onReopened(event)
      expect(prActionMethods.reviewTitleAndDescription).toHaveBeenCalledTimes(1)
    })

    it('calls reviewCodeChanges', async () => {
      await PullRequestTriggers.onReopened(event)
      expect(prActionMethods.reviewCodeChanges).toHaveBeenCalledTimes(1)
    })

    it('calls placeOrUpdateComment', async () => {
      await PullRequestTriggers.onReopened(event)
      expect(prActionMethods.placeOrUpdateComment).toHaveBeenCalledTimes(1)
    })
  })

  describe('onEdited', () => {
    const event = {} as EmitterWebhookEvent<'pull_request.edited'>

    it('calls reviewTitleAndDescription', async () => {
      await PullRequestTriggers.onEdited(event)
      expect(prActionMethods.reviewTitleAndDescription).toHaveBeenCalledTimes(1)
    })

    it('calls placeOrUpdateComment', async () => {
      await PullRequestTriggers.onEdited(event)
      expect(prActionMethods.placeOrUpdateComment).toHaveBeenCalledTimes(1)
    })

    it('does not call reviewCodeChanges', async () => {
      await PullRequestTriggers.onEdited(event)
      expect(prActionMethods.reviewCodeChanges).not.toHaveBeenCalled()
    })
  })
})
