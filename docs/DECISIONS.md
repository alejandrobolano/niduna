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

## Cloudflare environments

Niduna uses `niduna-dev` for development and `niduna` for production.
Development is exposed only through `dev.niduna.com`; its `workers.dev` route is
disabled to keep project namespaces isolated. Production is exposed only
through `niduna.com`, with its `workers.dev` route and preview URLs disabled as
well.
