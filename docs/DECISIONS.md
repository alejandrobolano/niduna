# Architecture decisions

## Universal Expo client

Niduna uses a single Expo Router application for Android, iOS, and web. Platform-specific implementations are permitted only when a native capability materially improves the experience.

## Measurements are events

Weight, length, and head circumference change over time. They are stored as dated measurements with provenance rather than overwritten on the baby profile.

## Optional clinical fields

Blood group, Rh factor, gestational age, and sex recorded at birth are optional. The product never asks a caregiver to infer clinical data.

## Family authorization

Relationship labels and permissions are separate. A member may identify as a parent, grandparent, relative, or professional caregiver while receiving an administrator, caregiver, or read-only permission set.

## Cloudflare environments

Niduna uses `niduna-dev` for development and `niduna` for production.
Development is exposed only through `dev.niduna.com`; its `workers.dev` route is
disabled to keep project namespaces isolated. The `niduna.com` production
domain is connected only when production is ready.
