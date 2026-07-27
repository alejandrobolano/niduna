# Web deployment

## Environments

| Git event | GitHub environment | Cloudflare Worker |
| --- | --- | --- |
| Pull request targeting `master` | `development` | `niduna-dev` |
| Push or merge to `master` | `production` | `niduna` |

Development uses the `niduna-dev` Worker through the custom domain
`dev.niduna.com`. Its `workers.dev` route is disabled so it cannot collide with
or appear under another project's account subdomain.

Production uses the separate `niduna` Worker through the custom domain
`niduna.com`. Its `workers.dev` route and preview URLs are also disabled.

## GitHub configuration

Create `development` and `production` environments in the repository. Configure:

- Repository variable `DEPLOYMENTS_ENABLED` with value `true` after all
  deployment credentials are configured.
- Secret `CLOUDFLARE_ACCOUNT_ID`.
- Secret `CLOUDFLARE_API_TOKEN` with permission to deploy Workers.
- Variable `EXPO_PUBLIC_SUPABASE_URL`.
- Variable `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.

The Supabase publishable key is designed for public clients. Never add a
Supabase secret key or service-role key to GitHub Actions that builds the
public client.

## Domain

The first successful deployment to each environment provisions its declared
custom domain. Protect `dev.niduna.com` with Cloudflare Access before using real
family data.
