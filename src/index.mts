import type { Request } from '@cloudflare/workers-types'
import { Env } from './config/env.mjs'
import { Config, createConfig } from './config/config.mjs'
import { Controller, createController } from './domain/Controller.mjs'
import { App as GitHubApp } from 'octokit'
import { EmitterWebhookEventName } from '@octokit/webhooks/dist-types/types.js'
import { RepositoryContext } from './domain/RepositoryContext.mjs'

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const config: Config = createConfig(env)

    const { verbose } = config.app
    const { appId, privateKey, webhooks, oauth } = config.gitHub.app

    // Request
    if (verbose) console.log('Request:', request.headers, request.body)

    // Event
    const event = request.headers.get('X-GitHub-Event') as EmitterWebhookEventName
    if (!event) return new Response('Invalid event', { status: 400 })
    if (verbose) console.log('Event:', event)

    // GitHub App
    const app = new GitHubApp({ appId, privateKey, webhooks, oauth })
    if (verbose) {
      app.webhooks.onAny((event) => console.log(`${event.name} (${event.id})`, event.payload))
      app.webhooks.onError(({ name, event, message }) =>
        console.error(name, message, event.payload),
      )
    }

    // Todo - get this from the request or execution context
    const repository: RepositoryContext = {
      owner: 'webbertakken',
      repo: 'reviewer',
    }

    // Controller
    const controller: Controller = createController(config, repository)
    app.webhooks.on('pull_request.synchronize', controller.onSynchronise)
    app.webhooks.on('pull_request.opened', controller.onOpened)
    app.webhooks.on('pull_request.reopened', controller.onReopened)
    app.webhooks.on('pull_request.edited', controller.onEdited)

    // Receive and respond
    const id = request.headers.get('CF-Ray') || 'local'
    const payload = request.body?.toString() || ''
    const signature = request.headers.get('X-Hub-Signature-256') || ''
    console.log(id, event, payload, signature)

    try {
      // Todo - separate verify and receive. Call `receive` using ExecutionContext.waitUntil(promise)
      await app.webhooks.verifyAndReceive({ id, name: event, payload, signature })
      return new Response('{ ok: true }', { status: 200 })
    } catch (error) {
      console.error(error)
      return new Response('An error occurred', { status: 500 })
    }
  },
}
