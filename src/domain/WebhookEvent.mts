import type { EmitterWebhookEvent, EmitterWebhookEventName } from '@octokit/webhooks'

type PullRequestPayload = EmitterWebhookEvent<'pull_request'>['payload']

export type IncomingWebhookEvent = {
  id: string
  name: EmitterWebhookEventName
  payload: PullRequestPayload
}

type WithPullRequestPayload = Pick<IncomingWebhookEvent, 'payload'>

export class WebhookEvent {
  static create(
    id: string,
    name: EmitterWebhookEventName,
    payload: PullRequestPayload,
  ): IncomingWebhookEvent {
    return { id, name, payload }
  }

  static getRepository(event: WithPullRequestPayload) {
    const owner = event.payload.repository?.owner?.login
    if (!owner) throw Error('No owner found in event')

    const repo = event.payload.repository?.name
    const repository = `${owner}/${repo}`
    if (!repo) throw Error('No repo found in event')

    return { owner, repo, repository }
  }

  static getInstallationId(event: WithPullRequestPayload): number | null {
    if (!('installation' in event.payload)) return null
    return event.payload.installation?.id ?? null
  }
}
