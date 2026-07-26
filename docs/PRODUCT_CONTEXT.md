# Niduna Product Context

## Purpose

Niduna helps authorized family members and caregivers coordinate newborn care without relying on memory or waking another caregiver for an update.

## Core promise

Every authorized caregiver can understand what the baby needs and what happened recently.

## Initial users

- Parent or legal guardian who creates a family.
- Additional parent or guardian.
- Family caregiver.
- Professional caregiver.
- Read-only family member.

## Initial capabilities

- Create or join a family through an expiring invitation.
- Maintain separate user accounts and permissions.
- Create one or more baby profiles.
- Record feeding, diapers, and sleep.
- Produce a concise caregiver handoff.
- Keep an auditable history of who recorded or changed information.

## Baby profile

Profile data:

- Life stage: expected or born.
- Name.
- Expected due date or birth date.
- Sex recorded at birth, optional.
- Photo, optional.
- Blood group and Rh factor, optional and never inferred.
- Gestational age at birth, optional.
- Notes, optional.

Measurements are historical records rather than mutable profile properties:

- Weight.
- Length.
- Head circumference.
- Measurement date, source, and recorder.

## Medical boundary

Niduna records and summarizes information. It does not diagnose, prescribe, calculate medication doses, replace a pediatrician, or delay urgent care.

## Platforms

- Expo React Native for Android, iOS, and web.
- Supabase for authentication, Postgres, Realtime, and protected media storage.
- Cloudflare Workers Static Assets for the web client.

## Delivery

- `feature/*` and `fix/*` branches target `master`.
- Pull requests deploy the web client to development.
- Merges to `master` deploy the web client to production.
- Native releases are introduced after the shared product flow is stable.
