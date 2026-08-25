# Niduna releases

Niduna follows semantic versioning from `1.0.0`. Release Please keeps
`package.json`, `app.json` and `CHANGELOG.md` synchronized.

## Commit convention

- `fix:` creates a patch release.
- `feat:` creates a minor release.
- `feat!:` or another conventional commit with `BREAKING CHANGE:` creates a
  major release.

Other commit types may be included in the changelog when a release already
contains a version-bumping change.

## Automated flow

1. Product pull requests are merged into `master`.
2. Release Please creates or updates one release pull request.
3. The release pull request shows the next version and generated changelog.
4. Merging it creates the GitHub tag and release.

The repository secret `RELEASE_PLEASE_TOKEN` must contain a fine-grained GitHub
personal access token with access to this repository and read/write permissions
for Contents and Pull requests. A user token is required so the generated
release pull request triggers the normal CI and deployment workflows.

The repository must also allow GitHub Actions to create pull requests under
Settings, Actions, General, Workflow permissions.

## One-time 1.0.0 bootstrap

After this change reaches `master`, create the initial GitHub release and tag
`v1.0.0` from that merge commit. Then set the repository variable
`RELEASE_AUTOMATION_ENABLED` to `true`. This gate prevents the commit that
establishes the stable baseline from being interpreted as work for `1.1.0`.

From that point onward, Release Please uses `v1.0.0` and
`.release-please-manifest.json` as the baseline and maintains future release
pull requests automatically.

Run `pnpm version:check` locally whenever version files are changed manually.
The existing `pnpm version:set <version>` command remains available for recovery
or an explicitly coordinated manual release.
