# Niduna Engineering Guide

## Product

Niduna is a family coordination app for newborn care. It targets Android, iOS, and web from one Expo codebase. The initial interface language is Spanish.

## Engineering

- Write identifiers, types, filenames, tests, commit messages, and technical documentation in English.
- Keep user-facing strings outside domain logic and prepare them for localization.
- Use strict TypeScript. Avoid `any`, unjustified type assertions, and implicit nullable states.
- Prefer small, cohesive modules with explicit dependencies.
- Keep domain rules independent from React Native, Expo, Supabase, and Cloudflare.
- Do not add commented-out code, placeholder implementations, generated clutter, or speculative abstractions.
- Add dependencies only when they remove meaningful complexity.
- Validate external input at application boundaries.
- Treat baby and family data as sensitive personal data.
- Never expose Supabase secret or service-role keys in a client.
- Enable and test RLS on every exposed Supabase table.
- Pin dependency versions and commit the lockfile.

## Structure

- `src/app`: Expo Router routes and composition.
- `src/features`: product features grouped by domain.
- `src/shared`: reusable presentation and infrastructure primitives.
- `docs`: product, architecture, privacy, and operational decisions.
- `.github/workflows`: CI and deployment automation.

## Verification

Before handing off a change, run:

```text
pnpm typecheck
pnpm lint
pnpm test
pnpm web:export
```

## Git

- The protected integration branch is `master`.
- Use `feature/<short-description>` for product work and `fix/<short-description>` for corrections.
- Pull requests target `master`.
- Pull requests deploy the web client to development.
- Merges to `master` deploy the web client to production.
- Commits must use the configured GitHub `users.noreply.github.com` address.

## Versioned documentation

Read the Expo SDK 57 documentation before using Expo APIs:
https://docs.expo.dev/versions/v57.0.0/
