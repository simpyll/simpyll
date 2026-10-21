# Contributing to Simpyll

Thanks for your interest in improving Simpyll.

## Getting started

Requires Node.js 24 and npm.

```bash
git clone https://github.com/simpyll/simpyll.git
cd simpyll
npm ci
npm run dev
```

## Before proposing a change

Review [open issues](https://github.com/simpyll/simpyll/issues) and open a focused issue or pull request. Keep changes scoped, describe their motivation and add tests where appropriate.

```bash
npm run lint
npm run build
node --test scripts/prerender.test.mjs
```

For publishing pipeline changes, also run `npm run test:notion` and `npm run test:notion:build`.

Do not commit credentials, private Notion content, or personal access tokens. See [architecture](docs/ARCHITECTURE.md), [deployment](docs/DEPLOYMENT.md) and [Notion publishing](docs/NOTION.md).
