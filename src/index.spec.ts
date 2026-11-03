import { createHmac, generateKeyPairSync } from 'node:crypto'
import type { ExecutionContext, Request as WorkerRequest } from '@cloudflare/workers-types'
import { unstable_dev } from 'wrangler'
import type { UnstableDevWorker } from 'wrangler'
import { describe, expect, it, beforeAll, afterAll, afterEach, vi } from 'vitest'
import type { Env } from './config/env.mjs'
import workerHandler from './index.mjs'
import { isTransientUpstreamError } from './services/GitHub.mjs'

describe('Worker', () => {
  let worker: UnstableDevWorker

  beforeAll(async () => {
    worker = await unstable_dev('src/index.mts', {
      vars: process.env,
      experimental: { disableExperimentalWarning: true },
    })
  })

  afterAll(async () => {
    await worker.stop()
  })

  it('should return 200 response', async () => {
    // Arrange
    const req = new Request('https://example.com', { method: 'GET' })

    // Act
    const response = await worker.fetch(req.url)

    // Assert
    expect(await response.text()).toBe('OK')
    expect(response.status).toBe(200)
  })

  describe('upstream gateway handling', () => {
    let privateKeyPem: string
    const webhookSecret = 'test-webhook-secret'

    beforeAll(() => {
      const { privateKey } = generateKeyPairSync('rsa', {
        modulusLength: 2048,
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
        publicKeyEncoding: { type: 'spki', format: 'pem' },
      })
      privateKeyPem = privateKey
    })

    afterEach(() => {
      vi.restoreAllMocks()
    })

    const createTestEnv = (): Env => ({
      ENVIRONMENT: 'local',
      MODE: 'development',
      MOCK_GPT: 'true',
      APP_VERBOSE: 'false',
      GPT_DEBUG: 'false',
      OPENAI_API_KEY: 'test-openai-key',
      GH_APP_CLIENT_SECRET: 'test-client-secret',
      GH_APP_SECRET_TOKEN: webhookSecret,
      GH_APP_PRIVATE_KEY: privateKeyPem,
      SENTRY_DSN: 'https://public@sentry.example.com/1',
    })

    const createSignedWebhookRequest = (payload: Record<string, unknown>): WorkerRequest => {
      const body = JSON.stringify(payload)
      const signature = `sha256=${createHmac('sha256', webhookSecret).update(body).digest('hex')}`
      return new Request('https://hooks.code-reviewer.net/', {
        method: 'POST',
        headers: {
          'CF-Ray': 'test-ray-id',
          'X-GitHub-Event': 'pull_request',
          'X-Hub-Signature-256': signature,
          'Content-Type': 'application/json',
        },
        body,
      }) as unknown as WorkerRequest
    }

    const createExecutionContext = (): ExecutionContext => ({
      waitUntil: vi.fn(),
      passThroughOnException: vi.fn(),
      props: {},
    })

    it('retries transient upstream gateway responses when looking up installation', async () => {
      // Arrange
      const fetchSpy = vi
        .spyOn(globalThis, 'fetch')
        .mockResolvedValueOnce(new Response('Bad gateway', { status: 502 }))
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ id: 1337 }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          }),
        )
      const req = createSignedWebhookRequest({
        action: 'closed',
        repository: { name: 'reviewer', owner: { login: 'webbertakken' } },
      })

      // Act
      const response = await workerHandler.fetch(req, createTestEnv(), createExecutionContext())

      // Assert
      expect(response.status).toBe(200)
      expect(fetchSpy).toHaveBeenCalledTimes(2)
    })

    it('returns 503 with Retry-After when upstream gateway remains unavailable', async () => {
      // Arrange
      vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
        return new Response('Upstream gateway unavailable', { status: 503 })
      })
      const req = createSignedWebhookRequest({
        action: 'closed',
        repository: { name: 'reviewer', owner: { login: 'webbertakken' } },
      })

      // Act
      const response = await workerHandler.fetch(req, createTestEnv(), createExecutionContext())

      // Assert
      expect(response.status).toBe(503)
      expect(response.headers.get('Retry-After')).toBe('5')
      expect(await response.text()).toBe('Upstream service unavailable')
    })

    it('uses installation id from webhook payload without querying repository installation', async () => {
      // Arrange
      const fetchSpy = vi.spyOn(globalThis, 'fetch')
      const req = createSignedWebhookRequest({
        action: 'closed',
        installation: { id: 1337 },
        repository: { name: 'reviewer', owner: { login: 'webbertakken' } },
      })

      // Act
      const response = await workerHandler.fetch(req, createTestEnv(), createExecutionContext())

      // Assert
      expect(response.status).toBe(200)
      expect(fetchSpy).not.toHaveBeenCalled()
    })

    it('classifies upstream gateway errors including wrapped webhook errors', () => {
      expect(isTransientUpstreamError({ status: 502 })).toBe(true)
      expect(isTransientUpstreamError({ status: 503 })).toBe(true)
      expect(isTransientUpstreamError({ errors: [{ status: 504 }] })).toBe(true)
      expect(isTransientUpstreamError({ status: 500 })).toBe(false)
      expect(isTransientUpstreamError({ status: 404 })).toBe(false)
      expect(isTransientUpstreamError(new Error('unexpected failure'))).toBe(false)
      expect(isTransientUpstreamError(null)).toBe(false)
    })
  })
})
