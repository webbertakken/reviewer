import type { Request } from '@cloudflare/workers-types'
import { Env } from './config/env.mjs'
import { Config, createConfig } from './config/config.mjs'
import { Controller, createController } from './domain/Controller.mjs'
import { App as GitHubApp } from 'octokit'
import { WebhookEventName } from '@octokit/webhooks-types'

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Config
    const config: Config = createConfig(env)
    const { verbose } = config.app

    // Show that service is healthy. Don't serve anything other than post
    if (request.method === 'GET') return new Response('OK', { status: 200 })
    if (request.method !== 'POST') return new Response('Invalid method', { status: 400 })

    // Get request info
    const requestBody = await request.text()
    if (!requestBody) throw new Error('Request body is empty')
    const requestPayload = JSON.parse(requestBody)
    const requestHeaders = Object.fromEntries(request.headers)
    if (verbose) console.log('Request:', JSON.stringify(requestHeaders, null, 2), requestBody)

    // Event
    const event = request.headers.get('X-GitHub-Event') as WebhookEventName
    if (!event) return new Response('Invalid event', { status: 400 })
    if (verbose) console.log('Event:', event)

    // Installation ID
    const installationIdString = request.headers.get('X-GitHub-Hook-Installation-Target-Id')
    const installationId = installationIdString !== null ? parseInt(installationIdString) : null
    if (!installationId) return new Response('Invalid installation', { status: 400 })
    if (verbose) console.log('Installation:', installationId)

    // GitHub App
    const { appId, privateKey, webhooks, oauth } = config.gitHub.app
    const app = new GitHubApp({ appId, privateKey, webhooks, oauth })
    if (verbose) {
      app.webhooks.onAny((event) => console.log(`${event.name} (${event.id})`, event.payload))
      app.webhooks.onError(({ name, event, message }) =>
        console.error(name, message, event.payload),
      )
    }

    // Controller
    const controller: Controller = createController(config, installationId)
    app.webhooks.on('pull_request.synchronize', controller.onSynchronise)
    app.webhooks.on('pull_request.opened', controller.onOpened)
    app.webhooks.on('pull_request.reopened', controller.onReopened)
    app.webhooks.on('pull_request.edited', controller.onEdited)

    try {
      // Verify request
      const id = request.headers.get('CF-Ray') || 'local'
      const signature = request.headers.get('X-Hub-Signature-256') || ''
      if (verbose) console.log(id, event, signature)
      await app.webhooks.verify(requestBody, signature)
      if (verbose) console.log('Verified')

      // Handle request
      // Todo first send the response, then `receive` using ExecutionContext.waitUntil(promise)
      // Todo - find correct types
      // @ts-expect-error - find correct types
      await app.webhooks.receive({ id, name: event, payload: requestPayload })
      if (verbose) console.log('Received')

      // Respond
      return new Response('{ ok: true }', { status: 200 })
    } catch (error) {
      console.error(error)
      return new Response(`An error occurred ${error}`, { status: 500 })
    }
  },
}
