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

1. In the pull request, bump the version: `pnpm version patch|minor|major --no-git-tag-version`.
2. Add the CHANGELOG entry for that version.
3. If `react-pdf` was upgraded, run `pnpm sync:pdfjs` (the build fails when `pdfjs-dist` diverges).
4. Merge into `main`. Nothing else is needed: no tag, no `npm publish`.
5. Check the `Release` run, then:

   ```bash
   npm view @jdominguezg89/react-doc-viewer version dist-tags
   ```

   The npm page should show the provenance badge; the GitHub Release and https://jdominguezg89.github.io/react-doc-viewer/ should be updated.

Pre-releases: a version such as `2.1.0-beta.0` (`pnpm version prerelease --preid beta --no-git-tag-version`) is published under the `beta` dist-tag, not `latest`, and marked as a pre-release on GitHub. A version without a named identifier (`2.0.1-0`) goes to the `next` dist-tag.

Merges that do not change the version publish nothing. To redeploy Storybook only, run the workflow manually on `main` with "Redeploy Storybook" ticked.

## Troubleshooting

| Symptom | Cause and fix |
| ------- | ------------- |
| The workflow never starts | Actions are disabled, or the run was started from a branch other than `main` (every job is skipped). |
| `ENEEDAUTH`, or `E404 Not Found - PUT https://registry.npmjs.org/@jdominguezg89%2freact-doc-viewer` | The Trusted Publisher does not match: check user, repository, `release.yml`, empty environment, and that **npm publish** is an allowed action. Also happens when the package does not exist yet (first publish is manual). |
| `E403 ... cannot publish over the previously published versions` | The version is already on npm. Use **Re-run all jobs** so the detection runs again, not "Re-run failed jobs". |
| `E422` mentioning `repository.url` | `repository.url` in `package.json` must be exactly this GitHub repository (provenance check). |
| `Failed to create deployment (status: 404) ... Ensure GitHub Pages has been enabled` | Pages source is not set to "GitHub Actions". Fix it, then "Re-run failed jobs". |
| Storybook job rejected by the environment | The `github-pages` environment must allow deployments from `main`. |
| Publish worked, tag/Release step failed | "Re-run failed jobs": the release job only creates what is missing. |
| A bad version went out | `npm deprecate @jdominguezg89/react-doc-viewer@X.Y.Z "reason"` and release a fix. Avoid `npm unpublish`. |

## Moving the package to another owner or scope

1. Change `name`, `repository.url`, `homepage` and `bugs.url` in `package.json`, plus the badges and install commands in the README, MIGRATION and the Next.js example.
2. Repeat the npm setup for the new package name: manual first publish, then a new Trusted Publisher (existing ones cannot be edited, only deleted and recreated).
3. Repeat the GitHub setup in the new repository (Actions, Pages, ruleset).
4. Keep the repository public: npm does not generate provenance from private repositories.
5. Deprecate the old package name with a pointer to the new one.
