# Android preview updates

Niduna stores the latest finished Android `preview` build and notifies active
Android devices without modifying the care notification function.

## Flow

1. EAS finishes an internal Android build created with the `preview` profile.
2. EAS calls `handle-eas-build-webhook` and signs the raw body.
3. The function validates the signature and Expo project ID.
4. The build metadata is stored in `public.app_releases`.
5. One update notification is sent to each active Android push device.
6. Authenticated web and Android clients read the latest release from Supabase.

Repeated webhook deliveries are idempotent. A build can create at most one
delivery per registered device.

## Required Supabase secrets

- `EAS_WEBHOOK_SECRET`: random value with at least 16 characters.
- `EAS_PROJECT_ID`: `6573326c-c393-4dec-bbdd-36b15aeffe12`.

`SUPABASE_URL` and the administrative Supabase credentials are provided by the
Edge Functions runtime.

Deploy the function without the platform JWT check because EAS does not send a
Supabase user token. The function authenticates EAS by validating the
`expo-signature` HMAC before reading or writing data.

```text
supabase functions deploy handle-eas-build-webhook --no-verify-jwt
```

## EAS webhook

Create one `BUILD` webhook for the Niduna Expo project. Use the same secret set
as `EAS_WEBHOOK_SECRET` and this URL:

```text
https://rctmjaessvhwscwqteox.supabase.co/functions/v1/handle-eas-build-webhook
```

```text
eas webhook:create --event BUILD --url https://rctmjaessvhwscwqteox.supabase.co/functions/v1/handle-eas-build-webhook
```

The first APK containing this feature must still be installed manually. Older
installed APKs can display the push notification but do not yet contain the
listener or update panel needed to open the artifact. Later previews can open
the APK download directly from the notification.
