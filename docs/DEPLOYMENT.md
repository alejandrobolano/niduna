# Web deployment

## Environments

| Git event | GitHub environment | Cloudflare Worker |
| --- | --- | --- |
| Pull request targeting `master` | `development` | `dev` |
| Push or merge to `master` | `production` | `niduna` |

Both Workers initially use Cloudflare `workers.dev` addresses. If the account
subdomain is `nudina`, development is available at
`dev.nudina.workers.dev`. A custom domain is not required during development.

## GitHub configuration

Create `development` and `production` environments in the repository. Configure:

- Secret `CLOUDFLARE_ACCOUNT_ID`.
- Secret `CLOUDFLARE_API_TOKEN` with permission to deploy Workers.
- Variable `EXPO_PUBLIC_SUPABASE_URL`.
- Secret `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.

The Supabase publishable key is designed for public clients. It is stored as a secret to keep environment management consistent. Never add a Supabase secret key or service-role key to GitHub Actions that builds the public client.

## Domain

Connect `nudina.com` to the `niduna` Worker when the production experience is
ready. Keep the development Worker on its `workers.dev` address or protect it
with Cloudflare Access.
