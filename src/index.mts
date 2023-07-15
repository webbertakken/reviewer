import type { Request, ExecutionContext } from '@cloudflare/workers-types'
import { Env } from './config/env.mjs'
import { Config, createConfig } from './config/config.mjs'
import { Controller, createController } from './domain/Controller.mjs'
import { App as GitHubApp } from 'octokit'
import { WebhookEventName } from '@octokit/webhooks-types'
import { Octokit } from '@octokit/rest'
import { createAppAuth } from '@octokit/auth-app'
import { WebhookEvent } from './domain/WebhookEvent.mjs'
import { initSentry } from './config/initSentry.mjs'

export default {
  async fetch(request: Request, env: Env, context: ExecutionContext): Promise<Response> {
    // Config
    const config: Config = createConfig(env)
    const sentry = initSentry(config.sentry, request, context)
    const { verbose, veryVerbose } = config.app

    try {
      // Show that service is healthy. Don't serve anything other than post
      if (request.method === 'GET') return new Response('OK', { status: 200 })
      if (request.method !== 'POST') return new Response('Invalid method', { status: 400 })

      // Get request info
      const requestBody = await request.text()
      if (!requestBody) throw new Error('Request body is empty')
      const requestPayload = JSON.parse(requestBody)

      // Log request (veryVerbose only)
      if (veryVerbose) {
        const requestHeaders = Object.fromEntries(request.headers)
        console.log('Request:', JSON.stringify(requestHeaders, null, 2), requestBody)
      }

      // Event
      const id = request.headers.get('CF-Ray') || 'local'
      const signature = request.headers.get('X-Hub-Signature-256') || ''
      const eventName = request.headers.get('X-GitHub-Event') as WebhookEventName
      if (!eventName || !id || !signature) return new Response('Invalid event', { status: 400 })
      const event = WebhookEvent.create(id, eventName, requestPayload)
      if (verbose) console.log(`Event: ${event.name} (${event.id})`)

      // Skip unused events
      const unusedEvents = ['check_suite', 'push']
      if (!unusedEvents.includes(event.name)) return new Response('OK', { status: 200 })

      // Log errors for unhandled events
      const handledEvents = ['ping', 'pull_request']
      if (!handledEvents.includes(event.name)) {
        sentry.captureException(new Error(`Unhandled: ${event.name} ${event.payload?.action}`))
        return new Response('OK', { status: 200 })
      }

      // Prefilter events
      if (event.name === 'ping') return new Response('OK', { status: 200 })

      // GitHub App client
      const { appId, privateKey, webhooks, oauth } = config.gitHub.app
      const app = new GitHubApp({ appId, privateKey, webhooks, oauth })
      if (verbose) {
        app.webhooks.onAny((event) => console.log(`${event.name} (${event.id})`, event.payload))
        app.webhooks.onError(({ name, event, message }) =>
          console.error(name, message, event.payload),
        )
        console.log('App initialised')
      }

      // GitHub API client
      const { auth } = config.gitHub.api
      const topLevelClient = new Octokit({ authStrategy: createAppAuth, auth })
      if (verbose) console.log('Top level API client initialised')

      // Installation ID
      // @ts-expect-error - find correct types
      const { owner, repo, repository } = WebhookEvent.getRepository(event)
      console.log(repository, owner, repo)
      const { data: installation } = await topLevelClient.apps.getRepoInstallation({ owner, repo })
      const installationId = installation?.id || null
      if (!installationId) return new Response(`No installation in ${repository}`, { status: 400 })
      if (verbose) console.log('Installation ID:', installationId)

      // Controller
      const controller: Controller = createController(config, installationId)
      app.webhooks.on('pull_request.synchronize', controller.onSynchronise)
      app.webhooks.on('pull_request.opened', controller.onOpened)
      app.webhooks.on('pull_request.reopened', controller.onReopened)
      app.webhooks.on('pull_request.edited', controller.onEdited)

      // Verify request
      await app.webhooks.verify(requestBody, signature)
      if (verbose) console.log('Verified')

      // Handle request
      context.waitUntil(
        app.webhooks
          // @ts-expect-error - find correct types
          .receive(event)
          .then(() => verbose && console.log('Event processed. 🎉'))
          .catch((error) => {
            console.error('Error while processing event.', error)
            sentry.captureException(error)
          }),
      )

      // Respond
      if (verbose) console.log('Responding - 200')
      return new Response('{ ok: true }', { status: 200 })
    } catch (error) {
      if (verbose) console.error('Error caught:', error)
      sentry.captureException(error)
      return new Response(`An error occurred ${error}`, { status: 500 })
    }
  },
}
