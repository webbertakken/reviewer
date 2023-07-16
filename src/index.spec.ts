import { unstable_dev } from 'wrangler'
import type { UnstableDevWorker } from 'wrangler'
import { describe, expect, it, beforeAll, afterAll } from 'vitest'

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
})
