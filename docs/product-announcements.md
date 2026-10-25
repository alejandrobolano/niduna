# Product announcements

Niduna stores important product announcements in Supabase and records when each user has seen them. Care notifications remain a separate channel.

## Adding an announcement

Add a JSON manifest to `.github/product-announcements/`. Use a stable, unique `id` and include only changes that materially affect how the product is used.

`minimumNativeVersion` prevents an older Android or iOS installation from announcing functionality it does not contain. Web ignores this field because production is deployed before the announcement is published.

Run `pnpm announcements:validate` before opening or updating the pull request. The announcement copy is reviewed in GitHub with the rest of the change.

## Publication

Pull requests never publish announcements. After a push to `master`, the production workflow:

1. exports and deploys the web client;
2. upserts every manifest into Supabase;
3. marks the manifest as published or archived;
4. preserves the original publication date across later deployments.

The production GitHub environment requires `SUPABASE_SECRET_KEY`, using a modern Supabase secret key (`sb_secret_...`). It must never be exposed through an `EXPO_PUBLIC_` variable or committed to the repository.

To withdraw an announcement permanently, change its manifest `status` to `archived` and merge that change. An emergency archive in Supabase takes effect immediately, but the manifest must also be updated before the next production deployment.

## Presentation

The app shows at most one unseen announcement per session. Closing it records the receipt in Supabase for that user across devices. If the announcement has a destination, its primary action opens that section directly.
