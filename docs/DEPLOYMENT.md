# Web deployment

## Environments

| Git event | GitHub environment | Cloudflare Worker |
| --- | --- | --- |
| Pull request targeting `master` | `development` | `dev` |
| Push or merge to `master` | `production` | `niduna` |

The shared Cloudflare account currently uses `viberadio` as its only
`workers.dev` subdomain, so development is available at
`dev.viberadio.workers.dev`. Changing that account-wide subdomain would also
change the addresses of the other Workers in the account.

Use `dev.nudina.com` as the branded development address when a custom domain is
needed. Cloudflare recommends custom domains or routes for production traffic.

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

Connect `nudina.com` to the `niduna` Worker when the production experience is
ready. The development Worker can stay at `dev.viberadio.workers.dev` or use
`dev.nudina.com`; protect it with Cloudflare Access if it starts containing
real family data.
