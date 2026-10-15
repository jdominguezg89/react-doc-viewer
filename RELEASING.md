# Releasing

Releases are published by `.github/workflows/release.yml`. On every push to `main` it:

1. publishes to npm when the `package.json` version is not on npm yet (npm Trusted Publishing, no stored tokens, with provenance);
2. creates the `vX.Y.Z` tag and GitHub Release when they do not exist yet;
3. deploys Storybook to GitHub Pages when a release was created.

Each step checks the real state first, so re-running the workflow after a partial failure is safe.

## One-time setup

Do these once per repository / npm package. Until they are done the workflow cannot succeed.

### GitHub

1. **Actions**: Settings → Actions → General → allow actions, with read-only default workflow permissions.
2. **Pages**: Settings → Pages → Build and deployment → Source: **GitHub Actions**. This also creates the `github-pages` environment; keep its deployment branch rule on `main`.
3. **Protect `main`**: Settings → Rules → new branch ruleset for `main`: require a pull request and the status checks `Lint, test and build (Node 22)` and `Lint, test and build (Node 24)` (from `ci.yml`). The release workflow does not wait for CI, so this is what keeps a red commit from being published.
4. **Issues**: Settings → General → Features → Issues (`bugs.url` in `package.json` points there).

### release-please token

The `Release PR` workflow opens pull requests. Pull requests opened with the default `GITHUB_TOKEN` do not trigger CI, and the `main` ruleset requires CI, so the workflow uses a token of your own:

1. GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token. Repository access: only `react-doc-viewer`. Permissions: **Contents: Read and write**, **Pull requests: Read and write**. Pick an expiration and note it down.
2. Repository → Settings → Secrets and variables → Actions → New repository secret: name `RELEASE_PLEASE_TOKEN`, value the token.
3. Repository → Settings → Actions → General → Workflow permissions: tick **Allow GitHub Actions to create and approve pull requests**.

When the token expires, the `Release PR` workflow fails with a 401 until the secret is replaced.

### npm

1. The `@jdominguezg89` scope must be your npm user name or an npm organisation you own. Enable 2FA on the account.
2. **First publish is manual.** npm cannot attach a Trusted Publisher to a package that does not exist yet. From a clean checkout of the commit to release:

   ```bash
   corepack pnpm install --frozen-lockfile
   npm login
   npm publish --access public   # `prepack` builds and verifies dist; needs `pnpm` on PATH
   ```

   Do not pass `--provenance` locally; it only works in CI. This first version has no provenance attestation, later ones do.
3. **Trusted Publisher**: npmjs.com → the package → Settings → Trusted Publisher → GitHub Actions:

   | Field                | Value                                   |
   | -------------------- | --------------------------------------- |
   | Organization or user | `jdominguezg89`                         |
   | Repository           | `react-doc-viewer`                      |
   | Workflow filename    | `release.yml`                           |
   | Environment name     | leave empty                             |
   | Allowed actions      | tick **npm publish**                    |

   New configurations only allow `npm stage publish` unless `npm publish` is ticked. All fields are case-sensitive and npm does not validate them when saving. CLI equivalent (npm 11.15+):

   ```bash
   npm trust github @jdominguezg89/react-doc-viewer --repo jdominguezg89/react-doc-viewer --file release.yml --allow-publish
   ```
4. Merge to `main` (or run the `Release` workflow manually on `main`). The version is already on npm, so the workflow only creates the tag, the GitHub Release and the Storybook site.
5. After the first automated release has worked: package Settings → Publishing access → **Require two-factor authentication and disallow tokens**.

## Cutting a release

Versions are decided from the commit messages on `main` (Conventional Commits). Use "Squash and merge" so the pull request title becomes the commit message.

| Commit / PR title | Effect |
| --- | --- |
| `fix: ...` | patch release (2.0.x) |
| `feat: ...` | minor release (2.x.0) |
| `feat!: ...` or a `BREAKING CHANGE:` footer | major release |
| `chore:`, `docs:`, `ci:`, `test:`, `refactor:` | no release |

Renovate follows the same rule: its PRs are `chore(deps)` and release nothing, except updates of the runtime dependencies (`react-pdf`, `pdfjs-dist`, `papaparse`), which it titles `fix(deps)` so a patch goes out.

The flow:

1. Merge pull requests into `main` as usual. Nothing is published yet.
2. Once the `Release` workflow has finished for that push, the `Release PR` workflow keeps one pull request open, "chore: release X.Y.Z", with the version bump in `package.json` and the CHANGELOG entry generated from the merged commits. It updates itself after every merge.
3. When you want the version out, merge that pull request. The `Release` workflow publishes it to npm with provenance, creates the tag and GitHub Release, and redeploys Storybook.
4. Check:

   ```bash
   npm view @jdominguezg89/react-doc-viewer version dist-tags
   ```

To force a specific version, add a footer `Release-As: 3.0.0` to a commit message (an empty `chore: release 3.0.0` commit with that footer works).

If `react-pdf` was upgraded, run `pnpm sync:pdfjs` on that branch; the build fails when `pdfjs-dist` diverges.

Pre-releases: edit the Release PR's version to e.g. `2.1.0-beta.0`; it is published under the `beta` dist-tag, not `latest`, and marked as a pre-release on GitHub. A version without a named identifier (`2.0.1-0`) goes to the `next` dist-tag.

To redeploy Storybook only, run the `Release` workflow manually on `main` with "Redeploy Storybook" ticked.

## Troubleshooting

| Symptom | Cause and fix |
| ------- | ------------- |
| The workflow never starts | Actions are disabled, or the run was started from a branch other than `main` (every job is skipped). |
| `ENEEDAUTH`, or `E404 Not Found - PUT https://registry.npmjs.org/@jdominguezg89%2freact-doc-viewer` | The Trusted Publisher does not match: check user, repository, `release.yml`, empty environment, and that **npm publish** is an allowed action. Also happens when the package does not exist yet (first publish is manual). |
| `E403 ... cannot publish over the previously published versions` | The version is already on npm. Use **Re-run all jobs** so the detection runs again, not "Re-run failed jobs". |
| `E422` mentioning `repository.url` | `repository.url` in `package.json` must be exactly this GitHub repository (provenance check). |
| `Failed to create deployment (status: 404) ... Ensure GitHub Pages has been enabled` | Pages source is not set to "GitHub Actions". Fix it, then "Re-run failed jobs". |
| Storybook job rejected by the environment | The `github-pages` environment must allow deployments from `main`. |
| `Release PR` workflow fails with 401 / "Resource not accessible" | The `RELEASE_PLEASE_TOKEN` secret is missing, expired, or lacks Contents + Pull requests write; or "Allow GitHub Actions to create and approve pull requests" is off. |
| No Release PR appears after merging | Only `fix:`/`feat:` commits produce one; `chore:`/`docs:` do not. Check the squash commit title on `main`. |
| The Release PR proposes a far too big version (for example 2.1.0 listing years-old features) | release-please did not find the latest GitHub Release and walked the whole history. Close that PR without merging; the next run proposes the right version. Happens when it runs alongside `Release` instead of after it. |
| `Release PR` log says `There are untagged, merged release PRs outstanding - aborting` | The last merged "chore: release X.Y.Z" PR still has the label `autorelease: pending` (the `Release` workflow normally swaps it for `autorelease: tagged` after creating the GitHub Release). Swap the labels on that PR by hand, then run the `Release PR` workflow from the Actions tab. |
| Publish worked, tag/Release step failed | "Re-run failed jobs": the release job only creates what is missing. |
| A bad version went out | `npm deprecate @jdominguezg89/react-doc-viewer@X.Y.Z "reason"` and release a fix. Avoid `npm unpublish`. |

## Moving the package to another owner or scope

1. Change `name`, `repository.url`, `homepage` and `bugs.url` in `package.json`, plus the badges and install commands in the README, MIGRATION and the Next.js example.
2. Repeat the npm setup for the new package name: manual first publish, then a new Trusted Publisher (existing ones cannot be edited, only deleted and recreated).
3. Repeat the GitHub setup in the new repository (Actions, Pages, ruleset).
4. Keep the repository public: npm does not generate provenance from private repositories.
5. Deprecate the old package name with a pointer to the new one.
