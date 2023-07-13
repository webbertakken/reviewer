import { EmitterWebhookEvent } from '@octokit/webhooks/dist-types/types.js'
import { WebhookEventName } from '@octokit/webhooks-types'

export class WebhookEvent {
  static create(
    id: string,
    name: WebhookEventName,
    payload: EmitterWebhookEvent<'pull_request'>['payload'],
  ) {
    return { id, name, payload }
  }

  static getRepository(event: EmitterWebhookEvent<'pull_request'>) {
    const owner = event.payload.repository?.owner?.login
    if (!owner) throw Error('No owner found in event')

    const repo = event.payload.repository?.name
    const repository = `${owner}/${repo}`
    if (!repo) throw Error('No repo found in event')

    return { owner, repo, repository }
  }
}
