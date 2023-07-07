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
cp .env.dist .env
```

Now fill the `.env` file with the correct values.

## Develop

```bash
yarn dev
```

## Deploy

TBD

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
