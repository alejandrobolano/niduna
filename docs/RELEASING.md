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

Release Please uses the repository `GITHUB_TOKEN` by default. An optional
`RELEASE_PLEASE_TOKEN` fine-grained personal access token, with read/write
permissions for Contents and Pull requests, may replace it when release pull
requests must trigger other workflows as soon as they are created or updated.

The repository must also allow GitHub Actions to create pull requests under
Settings, Actions, General, Workflow permissions.

## One-time 1.0.0 bootstrap

The initial GitHub release and tag `v1.0.0` must point to the merge that
established the stable baseline. The repository variable
`RELEASE_AUTOMATION_ENABLED` then enables automatic release pull requests. This
gate prevents the baseline commit from being interpreted as work for `1.1.0`.

From that point onward, Release Please uses `v1.0.0` and
`.release-please-manifest.json` as the baseline and maintains future release
pull requests automatically.

Run `pnpm version:check` locally whenever version files are changed manually.
The existing `pnpm version:set <version>` command remains available for recovery
or an explicitly coordinated manual release.

Do not bump the version in ordinary product pull requests. Conventional commits
accumulate in the release pull request, which updates `package.json`, `app.json`,
`.release-please-manifest.json` and `CHANGELOG.md` together.
