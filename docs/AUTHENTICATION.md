# Authentication

## Initial access method

Niduna uses passwordless email OTP authentication through Supabase Auth.
Registration and sign-in share the same flow:

1. The person enters an email address.
2. Supabase sends an eight-digit, single-use code.
3. The person enters the code in Niduna.
4. Supabase creates the account when it does not exist or restores access when
   it already exists.

The email link is supported as an alternative to typing the code. Niduna
accepts token-hash, authorization-code, and implicit-session callbacks, then
removes authentication parameters from the web address.

Social providers are intentionally deferred until the email flow is stable.

## Session lifecycle

The Supabase client persists the session in local storage on web and in
Expo SQLite-backed local storage on Android and iOS. Access tokens refresh
automatically while the app is active. Signing out clears only the current
device session.

## Supabase email template

The Magic Link template must render `{{ .Token }}` so Supabase sends a code
instead of requiring a link. The versioned source is
`supabase/templates/email-otp.html`.

Configure the project with:

- Subject: `Tu código de acceso a Niduna`
- Template: the contents of `supabase/templates/email-otp.html`
- OTP length: eight digits
- OTP lifetime: ten minutes

Allow these authentication redirects in Supabase:

- `https://app.niduna.com/**`
- `https://dev.niduna.com/**`
- `niduna://**`

Codes and links are single-use credentials. Completing either option invalidates
the other option from the same email.

Development may use Supabase's default email service within its delivery and
rate limits. Production must use a custom SMTP provider, a verified sender, and
domain authentication before inviting real families.

## Security boundaries

- Client code uses only the Supabase publishable key.
- Service-role and secret keys never reach the Expo bundle.
- Authentication failures shown to the person do not reveal whether an email
  was already registered.
- Family membership and data access remain protected by database RLS policies;
  authentication alone never grants access to another family.
