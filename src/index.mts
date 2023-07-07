import 'dotenv/config'
import { hasCorrectConfig } from './config/hasCorrectConfig.mjs'
import { createServer } from 'node:http'
import { config } from './config/config.mjs'
import { App as GitHubApp, createNodeMiddleware } from 'octokit'
import { PullRequestTriggers } from './domain/triggers/PullRequestTriggers.mjs'

const app = async () => {
  if (hasCorrectConfig()) {
    const { appId, privateKey, webhooks, oauth } = config.gitHub.app

    // Initialize the GitHub App
    const app = new GitHubApp({ appId, privateKey, webhooks, oauth })
    if (config.app.verbose) {
      app.webhooks.onAny((event) => console.log(`${event.name} (${event.id})`, event.payload))
      app.webhooks.onError(({ name, event, message }) =>
        console.error(name, message, event.payload),
      )
    }

    // Controller
    app.webhooks.on('pull_request.synchronize', PullRequestTriggers.onSynchronise)
    app.webhooks.on('pull_request.opened', PullRequestTriggers.onOpened)
    app.webhooks.on('pull_request.reopened', PullRequestTriggers.onReopened)
    app.webhooks.on('pull_request.edited', PullRequestTriggers.onEdited)

    // Listen for events
    createServer(createNodeMiddleware(app)).listen(config.app.port)
  } else {
    console.error('Missing configuration')
  }
}

app().catch((error) => {
  console.error(error)
  process.exit(1)
})
