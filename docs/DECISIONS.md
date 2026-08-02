# Architecture decisions

## Universal Expo client

Niduna uses a single Expo Router application for Android, iOS, and web. Platform-specific implementations are permitted only when a native capability materially improves the experience.

## Measurements are events

Weight, length, and head circumference change over time. They are stored as dated measurements with provenance rather than overwritten on the baby profile.

## Care history is event based

Feeding, diaper, and sleep records are immutable care events with recorder and
time provenance. Sleep is the only event that starts open and is completed when
the baby wakes. A partial unique index prevents more than one open sleep per
baby.

The handoff panel remains visible while a baby is expected so families can
understand the workflow. Creating care events stays disabled until the profile
is marked as born.

## Optional clinical fields

Blood group, Rh factor, gestational age, and sex recorded at birth are optional. The product never asks a caregiver to infer clinical data.

## Family authorization

Relationship labels and permissions are separate. A member may identify as a parent, grandparent, relative, or professional caregiver while receiving an administrator, caregiver, or read-only permission set.

## Explicit family and baby context

A person may belong to multiple families, and each family may contain multiple
babies. The client always selects a family before a baby and passes both
identifiers to profile and care operations. Repositories never infer context by
loading the first accessible row.

The active selection is a device preference, not an authorization mechanism.
Supabase RLS remains responsible for validating every read and write.

## Baby following and family removal

Following a baby is a reversible preference belonging to one family member.
New babies and members begin with all active babies followed so existing family
workflows remain unchanged.

Removing a baby from a family archives it for everyone and preserves its profile
and care history. Only owners and administrators may archive or restore it.
Removing a person deletes only that family membership; it never deletes the
person's account. Both privileged operations run transactionally, validate roles
in Postgres, and write minimal audit records in the private schema.

## Cloudflare environments

Niduna uses `niduna-dev` for development and `niduna` for production.
Development is exposed only through `dev.niduna.com`; its `workers.dev` route is
disabled to keep project namespaces isolated. Production is exposed only
through `niduna.com`, with its `workers.dev` route and preview URLs disabled as
well.

# Native network transport

- Native EAS builds use React Native's established fetch implementation through `EXPO_PUBLIC_USE_RN_FETCH=1`.
- Expo SDK 57 installs `expo/fetch` globally on Android and iOS by default; the explicit fallback keeps Supabase Auth on the transport supported by React Native while web remains unchanged.
- Authentication errors are classified from Supabase error types and stable error codes without logging emails, tokens, or API keys.
