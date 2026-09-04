# Portable data exports

Niduna offers two deliberately separate export scopes.

## Personal copy

`Descargar mis datos` is available to every authenticated user. Its scope does
not expand when that user is a family owner or administrator. It contains:

- Account profile, memberships and notification preferences.
- Care events, notes, measurements and active stories authored by the user.
- Contacts and document metadata authored by the user.
- Active document files and story images still available in private storage.

## Family copy

`Exportar datos de esta familia` is available to the family owner and
administrators. It contains the shared family, member and baby data, all family
care contributions, contacts and document metadata, plus active baby photos,
stories and document files.

Authorization is checked again by the `export-portable-data` Edge Function. UI
visibility is not treated as an access control.

## Archive format and limits

Exports are ZIP archives with JSON and spreadsheet-safe CSV representations in
`data/` and available binary files in `files/`. The archive contains a manifest
and a README describing its scope and generation time.

Binary content is limited to 25 MiB per export to keep the Edge Function request
bounded. Retired, expired or already removed files are not included as binary
content, although accessible contribution metadata may remain in the export.
