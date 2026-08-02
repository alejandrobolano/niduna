# Push notifications

Niduna uses `expo-notifications` on Android and iOS. The web application does
not request notification permissions and remains fully usable without push.

## Privacy model

- Permission is requested only after the user selects **Activar en este dispositivo**.
- Expo receives the device push token and a generic title and body. The payload
  does not contain baby names, family names, notes, medical observations, event
  identifiers, or family identifiers.
- Push tokens are stored in Supabase and are never exposed to another family
  member.
- Row Level Security lets each user read only their own devices and preferences.
- Delivery records are server-only and inaccessible to authenticated clients.
- The person who records a care event is excluded from its recipients.
- Removed members and people who stopped following a baby are excluded through
  the `baby_followers` relationship.

## Delivery flow

1. A signed-in user records feeding, diaper, or sleep information.
2. The client invokes the authenticated `dispatch-care-notification` Edge
   Function with the new event identifier.
3. The function verifies that the caller created the event.
4. Supabase calculates active followers, category preferences, temporary pauses,
   and registered devices.
5. A unique `(care_event_id, push_device_id)` constraint prevents duplicates.
6. Expo Push Service forwards the generic notification to FCM or APNs.
7. Later invocations process Expo receipts and deactivate tokens rejected with
   `DeviceNotRegistered`.

An event remains saved if notification delivery fails. Push is an auxiliary
signal and must never block care tracking.

## Native credentials

The application must be rebuilt after adding the `expo-notifications` config
plugin.

### Android

1. Create or select a Firebase project for `com.niduna.app`.
2. Enable Firebase Cloud Messaging API v1.
3. Create a service-account JSON key outside the repository.
4. Upload it to the Niduna EAS project with `eas credentials` or the EAS
   credentials dashboard.
5. Create a new preview build and install it on a physical device. Expo Go does
   not support remote push notifications on Android.

### iOS

1. Use the Apple Developer account associated with `com.niduna.app`.
2. Configure the APNs key through `eas credentials`.
3. Register the test device and create a new EAS build.

Official references:

- https://docs.expo.dev/versions/v57.0.0/sdk/notifications/
- https://docs.expo.dev/push-notifications/push-notifications-setup/
- https://docs.expo.dev/push-notifications/sending-notifications/

## Supabase deployment

Apply the two notification migrations in order and deploy
`dispatch-care-notification` with JWT verification enabled. The function uses
Supabase-provided environment keys and does not require a service key in the
repository or client application.
