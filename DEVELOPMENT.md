# Development

## Resources

- [PR Code Reviewer (GitHub App)](https://github.com/apps/pr-code-reviewer)
- GitHub App client [docs](https://github.com/octokit/octokit.js#app-client)
- GitHub API client [docs](https://github.com/octokit/octokit.js#octokit-api-client)
- Webhook [events and payloads](https://docs.github.com/en/webhooks-and-events/webhooks/webhook-events-and-payloads)

## Prerequisites

- mise (pins Node and Yarn in `mise.toml`, [installation](https://mise.jdx.dev/getting-started.html)), then run `mise install`

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

Then fire specific http requests from the `triggers` folder.

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

Upgrade Node or Yarn by editing the pins in `mise.toml`, then run `mise install`.
Keep `packageManager` in `package.json` in sync with the Yarn pin.

## Git hooks

Husky installs the hooks on `yarn install`, and `yarn dev` and `yarn test` reinstall them when they are missing.
In a fresh `git worktree`, run `yarn setup:hooks` once before committing.
