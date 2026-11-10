import { createHmac, generateKeyPairSync } from 'node:crypto'
import type { ExecutionContext, Request as WorkerRequest } from '@cloudflare/workers-types'
import { unstable_dev } from 'wrangler'
import type { UnstableDevWorker } from 'wrangler'
import { describe, expect, it, beforeAll, afterAll, afterEach, vi } from 'vitest'
import type { Env } from './config/env.mjs'
import { createConfig } from './config/config.mjs'
import * as initSentryModule from './config/initSentry.mjs'
import workerHandler from './index.mjs'
import { createFetchWithUpstreamRetry, isTransientUpstreamError } from './services/GitHub.mjs'

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

    const createSignedWebhookRequest = (
      payload: Record<string, unknown>,
      eventName = 'pull_request',
    ): WorkerRequest => {
      const body = JSON.stringify(payload)
      const signature = `sha256=${createHmac('sha256', webhookSecret).update(body).digest('hex')}`
      return new Request('https://hooks.code-reviewer.net/', {
        method: 'POST',
        headers: {
          'CF-Ray': 'test-ray-id',
          'X-GitHub-Event': eventName,
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

    it('rejects webhooks whose signature does not match the secret', async () => {
      // Arrange
      const fetchSpy = vi.spyOn(globalThis, 'fetch')
      const context = createExecutionContext()
      const signed = createSignedWebhookRequest({
        action: 'opened',
        installation: { id: 1337 },
        repository: { name: 'reviewer', owner: { login: 'webbertakken' } },
      })
      const headers = new Headers(signed.headers as unknown as Headers)
      headers.set('X-Hub-Signature-256', `sha256=${'0'.repeat(64)}`)
      const forged = new Request(signed.url, {
        method: 'POST',
        headers,
        body: await signed.text(),
      }) as unknown as WorkerRequest

      // Act
      const response = await workerHandler.fetch(forged, createTestEnv(), context)

      // Assert
      expect(response.status).toBe(401)
      expect(context.waitUntil).not.toHaveBeenCalled()
      expect(fetchSpy).not.toHaveBeenCalled()
    })

    it('classifies upstream gateway errors including wrapped webhook errors', () => {
      const iterableWrapper = {
        *[Symbol.iterator]() {
          yield { status: 503 }
        },
      }
      expect(isTransientUpstreamError({ status: 502 })).toBe(true)
      expect(isTransientUpstreamError({ status: 503 })).toBe(true)
      expect(isTransientUpstreamError({ errors: [{ status: 504 }] })).toBe(true)
      expect(isTransientUpstreamError(iterableWrapper)).toBe(true)
      expect(isTransientUpstreamError({ status: 500 })).toBe(false)
      expect(isTransientUpstreamError({ status: 404 })).toBe(false)
      expect(isTransientUpstreamError(new Error('unexpected failure'))).toBe(false)
      expect(isTransientUpstreamError(null)).toBe(false)
    })

    const temporarilyUnavailableBody = {
      message: 'Unavailable for now',
      errors: [{ resource: 'PullRequest', field: 'files', code: 'not_available' }],
    }

    const createTemporarilyUnavailableResponse = () =>
      new Response(JSON.stringify(temporarilyUnavailableBody), {
        status: 500,
        headers: { 'content-type': 'application/json' },
      })

    it('classifies server errors that report a temporarily unavailable resource as transient', () => {
      expect(
        isTransientUpstreamError({ status: 500, response: { data: temporarilyUnavailableBody } }),
      ).toBe(true)
      expect(
        isTransientUpstreamError({
          errors: [{ status: 500, response: { data: temporarilyUnavailableBody } }],
        }),
      ).toBe(true)
      expect(
        isTransientUpstreamError({ status: 500, response: { data: { message: 'Broken' } } }),
      ).toBe(false)
      expect(
        isTransientUpstreamError({ status: 422, response: { data: temporarilyUnavailableBody } }),
      ).toBe(false)
    })

    it('retries server errors that report a temporarily unavailable resource', async () => {
      // Arrange
      const baseFetch = vi
        .fn<typeof fetch>()
        .mockResolvedValueOnce(createTemporarilyUnavailableResponse())
        .mockResolvedValueOnce(new Response('[]', { status: 200 }))
      const fetchWithRetry = createFetchWithUpstreamRetry(baseFetch, 2, 0)

      // Act
      const response = await fetchWithRetry('https://api.github.com/example')

      // Assert
      expect(response.status).toBe(200)
      expect(baseFetch).toHaveBeenCalledTimes(2)
    })

    it.each([
      ['a JSON body', JSON.stringify({ message: 'Broken' })],
      ['a plain text body', 'Broken'],
    ])('does not retry other server errors with %s', async (_, body) => {
      // Arrange
      const baseFetch = vi.fn<typeof fetch>().mockResolvedValue(new Response(body, { status: 500 }))
      const fetchWithRetry = createFetchWithUpstreamRetry(baseFetch, 2, 0)

      // Act
      const response = await fetchWithRetry('https://api.github.com/example')

      // Assert
      expect(response.status).toBe(500)
      expect(await response.text()).toBe(body)
      expect(baseFetch).toHaveBeenCalledTimes(1)
    })

    it('logs instead of reporting when changed files stay temporarily unavailable', async () => {
      // Arrange
      const captureException = vi.fn()
      vi.spyOn(initSentryModule, 'initSentry').mockReturnValue({
        captureException,
        captureMessage: vi.fn(),
      } as never)
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      let changedFilesRequests = 0
      vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
        const url = typeof input === 'string' ? input : input.toString()
        if (url.endsWith('/access_tokens')) {
          return new Response(
            JSON.stringify({ token: 'ghs_test', expires_at: '2099-01-01T00:00:00Z' }),
            { status: 201, headers: { 'content-type': 'application/json' } },
          )
        }
        if (url.endsWith('/pulls/9/files')) {
          changedFilesRequests++
          return createTemporarilyUnavailableResponse()
        }
        throw new Error(`Unexpected request to ${url}`)
      })
      const waitUntilPromises: Promise<unknown>[] = []
      const ctx: ExecutionContext = {
        waitUntil: (promise: Promise<unknown>) => {
          waitUntilPromises.push(promise)
        },
        passThroughOnException: vi.fn(),
        props: {},
      }
      const req = createSignedWebhookRequest({
        action: 'synchronize',
        installation: { id: 1337 },
        pull_request: { number: 9, title: 'Update the configuration', body: '' },
        repository: { name: 'reviewer', owner: { login: 'webbertakken' } },
      })

      // Act
      const response = await workerHandler.fetch(req, createTestEnv(), ctx)
      await Promise.all(waitUntilPromises)

      // Assert
      expect(response.status).toBe(200)
      expect(changedFilesRequests).toBe(3)
      expect(captureException).not.toHaveBeenCalled()
      expect(warn).toHaveBeenCalledWith(
        'Transient upstream gateway response while processing event:',
        expect.objectContaining({ errors: [expect.objectContaining({ status: 500 })] }),
      )
    })

    it('defaults chat model to gpt-4o-mini and supports GPT_MODEL override', () => {
      expect(createConfig(createTestEnv()).gpt.model).toBe('gpt-4o-mini')
      expect(createConfig({ ...createTestEnv(), GPT_MODEL: 'gpt-4o' } as Env).gpt.model).toBe(
        'gpt-4o',
      )
    })

    it('unwraps webhook handler errors before reporting to Sentry', async () => {
      // Arrange
      const captureException = vi.fn()
      vi.spyOn(initSentryModule, 'initSentry').mockReturnValue({
        captureException,
        captureMessage: vi.fn(),
      } as never)
      const rootCause = new Error('Model completion request failed')
      let openAiRequestBody = ''
      vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
        const url = typeof input === 'string' ? input : input.toString()
        if (url.endsWith('/access_tokens')) {
          return new Response(
            JSON.stringify({ token: 'ghs_test', expires_at: '2099-01-01T00:00:00Z' }),
            { status: 201, headers: { 'content-type': 'application/json' } },
          )
        }
        if (url.endsWith('/pulls/9/files')) {
          return new Response(
            JSON.stringify([{ filename: 'src/index.mts', patch: '+const x = 1' }]),
            {
              status: 200,
              headers: { 'content-type': 'application/json' },
            },
          )
        }
        openAiRequestBody = String(init?.body ?? '')
        throw rootCause
      })
      const waitUntilPromises: Promise<unknown>[] = []
      const ctx: ExecutionContext = {
        waitUntil: (promise: Promise<unknown>) => {
          waitUntilPromises.push(promise)
        },
        passThroughOnException: vi.fn(),
        props: {},
      }
      const req = createSignedWebhookRequest({
        action: 'opened',
        installation: { id: 1337 },
        pull_request: {
          number: 9,
          title: 'Add support for configurable model',
          body: 'This pull request updates the chat model configuration and adds tests covering webhook error handling in detail.',
        },
        repository: { name: 'reviewer', owner: { login: 'webbertakken' } },
      })

      // Act
      const response = await workerHandler.fetch(
        req,
        { ...createTestEnv(), MOCK_GPT: 'false' },
        ctx,
      )
      await Promise.all(waitUntilPromises)

      // Assert
      expect(response.status).toBe(200)
      expect(JSON.parse(openAiRequestBody)).toMatchObject({ model: 'gpt-4o-mini' })
      expect(captureException).toHaveBeenCalledTimes(1)
      expect(captureException).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Model completion request failed' }),
      )
    })

    it('ignores unused webhook events without reporting exceptions', async () => {
      // Arrange
      const captureException = vi.fn()
      vi.spyOn(initSentryModule, 'initSentry').mockReturnValue({
        captureException,
        captureMessage: vi.fn(),
      } as never)
      const eventsToSkip = [
        'check_run',
        'installation',
        'issue_comment',
        'pull_request_review',
        'pull_request_review_comment',
        'pull_request_review_thread',
        'status',
      ]

      // Act & Assert
      for (const eventName of eventsToSkip) {
        const req = createSignedWebhookRequest({ action: 'created' }, eventName)
        const response = await workerHandler.fetch(req, createTestEnv(), createExecutionContext())
        expect(response.status).toBe(200)
        expect(await response.text()).toBe('OK')
      }
      expect(captureException).not.toHaveBeenCalled()
    })

    it('returns 400 without reporting exceptions when webhook headers or JSON body are invalid', async () => {
      // Arrange
      const captureException = vi.fn()
      vi.spyOn(initSentryModule, 'initSentry').mockReturnValue({
        captureException,
        captureMessage: vi.fn(),
      } as never)

      const missingHeadersRequest = new Request('https://hooks.code-reviewer.net/', {
        method: 'POST',
        body: 'invalid-json-payload',
      }) as unknown as WorkerRequest

      const emptyBodyRequest = new Request('https://hooks.code-reviewer.net/', {
        method: 'POST',
        headers: {
          'CF-Ray': 'test-ray-id',
          'X-GitHub-Event': 'pull_request',
          'X-Hub-Signature-256': 'sha256=invalid',
        },
        body: '',
      }) as unknown as WorkerRequest

      const malformedJsonRequest = new Request('https://hooks.code-reviewer.net/', {
        method: 'POST',
        headers: {
          'CF-Ray': 'test-ray-id',
          'X-GitHub-Event': 'pull_request',
          'X-Hub-Signature-256': 'sha256=invalid',
          'Content-Type': 'application/json',
        },
        body: '{invalid-json',
      }) as unknown as WorkerRequest

      // Act
      const missingHeadersResponse = await workerHandler.fetch(
        missingHeadersRequest,
        createTestEnv(),
        createExecutionContext(),
      )
      const emptyBodyResponse = await workerHandler.fetch(
        emptyBodyRequest,
        createTestEnv(),
        createExecutionContext(),
      )
      const malformedJsonResponse = await workerHandler.fetch(
        malformedJsonRequest,
        createTestEnv(),
        createExecutionContext(),
      )

      // Assert
      expect(missingHeadersResponse.status).toBe(400)
      expect(await missingHeadersResponse.text()).toBe('Invalid event')
      expect(emptyBodyResponse.status).toBe(400)
      expect(await emptyBodyResponse.text()).toBe('Invalid request body')
      expect(malformedJsonResponse.status).toBe(400)
      expect(await malformedJsonResponse.text()).toBe('Invalid request body')
      expect(captureException).not.toHaveBeenCalled()
    })
  })
})
