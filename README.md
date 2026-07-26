# Niduna

Niduna helps families coordinate a baby's daily care without replacing medical advice.

## Requirements

- Node.js 24
- pnpm 11.9

## Local development

```bash
pnpm install
cp .env.example .env.local
pnpm start
```

The Expo project targets Android, iOS, and the web from one TypeScript codebase.

## Quality checks

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm web:export
```

## Delivery

- Pull requests into `master` run quality checks and deploy the web build to development.
- Merges into `master` deploy the web build to production.
- Native releases will use Expo Application Services after the first product slice is validated.

See [docs/PRODUCT_CONTEXT.md](docs/PRODUCT_CONTEXT.md) and [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).
