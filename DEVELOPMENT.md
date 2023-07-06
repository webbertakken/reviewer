# Development

## Prerequisites

- Volta

## Setup

### Install dependencies

```bash
yarn
```

### Environment variables

Create a `.env.local` file in the root of the project

```bash
cp .env.local.dist .env.local
```

Now fill the `.env.local` file with the correct values.

## Develop

```bash
yarn dev
```

## Deploy

```bash
firebase deploy
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
