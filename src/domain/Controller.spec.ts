import { vi, it, describe, expect, beforeEach } from 'vitest'
import { createController } from './Controller.mjs'
import { EmitterWebhookEvent } from '@octokit/webhooks/dist-types/types.js'
import { createConfig } from '../config/config.mjs'
import { Env } from '../config/env.mjs'

// Methods must be hoisted to reference them in `vi.mock`
const prActionMethods = vi.hoisted(() => ({
  reviewTitleAndDescription: vi.fn(),
  reviewCodeChanges: vi.fn(),
  placeOrUpdateComment: vi.fn(),
}))

vi.mock('./createPullRequestActions.mjs', () => ({
  createPullRequestActions: vi.fn().mockReturnValue({ ...prActionMethods }),
}))

describe('createController', () => {
  const config = createConfig(process.env as never as Env)
  const controller = createController(config, 1337)

  vi.stubGlobal('console', { log: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('onSynchronise', () => {
    const event = {} as EmitterWebhookEvent<'pull_request.synchronize'>
    it('calls reviewTitleAndDescription', async () => {
      await controller.onSynchronise(event)
      expect(prActionMethods.reviewTitleAndDescription).toHaveBeenCalledTimes(1)
    })

    it('calls reviewCodeChanges', async () => {
      await controller.onSynchronise(event)
      expect(prActionMethods.reviewCodeChanges).toHaveBeenCalledTimes(1)
    })

    it('calls placeOrUpdateComment', async () => {
      await controller.onSynchronise(event)
      expect(prActionMethods.placeOrUpdateComment).toHaveBeenCalledTimes(1)
    })
  })

  describe('onOpened', () => {
    const event = {} as EmitterWebhookEvent<'pull_request.opened'>

    it('calls reviewTitleAndDescription', async () => {
      await controller.onOpened(event)
      expect(prActionMethods.reviewTitleAndDescription).toHaveBeenCalledTimes(1)
    })

    it('calls reviewCodeChanges', async () => {
      await controller.onOpened(event)
      expect(prActionMethods.reviewCodeChanges).toHaveBeenCalledTimes(1)
    })

    it('calls placeOrUpdateComment', async () => {
      await controller.onOpened(event)
      expect(prActionMethods.placeOrUpdateComment).toHaveBeenCalledTimes(1)
    })
  })

  describe('onReopened', () => {
    const event = {} as EmitterWebhookEvent<'pull_request.reopened'>

    it('calls reviewTitleAndDescription', async () => {
      await controller.onReopened(event)
      expect(prActionMethods.reviewTitleAndDescription).toHaveBeenCalledTimes(1)
    })

    it('calls reviewCodeChanges', async () => {
      await controller.onReopened(event)
      expect(prActionMethods.reviewCodeChanges).toHaveBeenCalledTimes(1)
    })

    it('calls placeOrUpdateComment', async () => {
      await controller.onReopened(event)
      expect(prActionMethods.placeOrUpdateComment).toHaveBeenCalledTimes(1)
    })
  })

  describe('onEdited', () => {
    const event = {} as EmitterWebhookEvent<'pull_request.edited'>

    it('calls reviewTitleAndDescription', async () => {
      await controller.onEdited(event)
      expect(prActionMethods.reviewTitleAndDescription).toHaveBeenCalledTimes(1)
    })

    it('calls placeOrUpdateComment', async () => {
      await controller.onEdited(event)
      expect(prActionMethods.placeOrUpdateComment).toHaveBeenCalledTimes(1)
    })

    it('does not call reviewCodeChanges', async () => {
      await controller.onEdited(event)
      expect(prActionMethods.reviewCodeChanges).not.toHaveBeenCalled()
    })
  })
})
