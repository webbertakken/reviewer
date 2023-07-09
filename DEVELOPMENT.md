# Development

## Resources

- [PR Code Reviewer (GitHub App)](https://github.com/apps/pr-code-reviewer)
- GitHub App client [docs](https://github.com/octokit/octokit.js#app-client)
- GitHub API client [docs](https://github.com/octokit/octokit.js#octokit-api-client)
- Webhook [events and payloads](https://docs.github.com/en/webhooks-and-events/webhooks/webhook-events-and-payloads)

## Prerequisites

- Volta (a lightweight zero-config tool manager, [installation](https://docs.volta.sh/guide/getting-started#installation))

## Setup

### Install dependencies

```bash
yarn
```

### Environment variables

Create a `.env` file in the root of the project

```bash
cp .dev.vars.dist .dev.vars
```

Now fill the `.dev.vars` file with the correct values.

## Develop

```bash
yarn dev
```

or trigger specific events using the triggers

```bash
yarn test triggers/pullRequest
```

## Test

```bash
yarn coverage
```

## Updating secrets

#### Local

Update the `.dev.vars` file

#### Production

Run the following command, which will prompt you for a value.

```bash
yarn wrangler secret put NAME_OF_MY_SECRET
```

> **Note:** In case of the private key, be sure to preserve the newlines.

## Deploy

```bash
yarn deploy
```

## Upgrading tools

Upgrade Node

```bash
volta pin node@lts
```

Upgrade Yarn

```bash
yarn set version stable
volta pin yarn
```
