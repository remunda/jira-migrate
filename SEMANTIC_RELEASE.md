# Semantic Release Setup

This project uses [semantic-release](https://github.com/semantic-release/semantic-release) to automate the versioning and publishing process.

## How It Works

When you push commits to the `main` branch, the semantic release workflow automatically:

1. Analyzes commit messages to determine the next version number
2. Generates release notes
3. Updates the `CHANGELOG.md` file
4. Updates the version in `package.json`
5. Publishes the package to npm
6. Creates a GitHub release with release notes
7. Commits the version bump and changelog back to the repository

## Commit Message Format

Semantic release uses the commit message to determine the type of version bump:

### Breaking Changes (Major version bump)
```
feat!: remove deprecated API

BREAKING CHANGE: The old API has been removed
```

### Features (Minor version bump)
```
feat: add support for custom fields
feat(clickup): add new migration options
```

### Bug Fixes (Patch version bump)
```
fix: resolve issue with comment synchronization
fix(jira): handle rate limiting correctly
```

### Other Commit Types (No version bump)
```
chore: update dependencies
docs: update README
ci: update GitHub Actions workflow
style: format code
refactor: restructure migrator
test: add unit tests
```

## Examples

- `fix: resolve attachment upload issue` → 1.0.0 → 1.0.1
- `feat: add ClickUp integration` → 1.0.0 → 1.1.0
- `feat!: change config file format` → 1.0.0 → 2.0.0

## Configuration

The semantic release configuration is in `.releaserc.json`:

- **Branches**: Only releases from `main` branch
- **Plugins**:
  - `commit-analyzer`: Analyzes commits to determine version
  - `release-notes-generator`: Generates release notes
  - `changelog`: Updates CHANGELOG.md
  - `npm`: Publishes to npm registry
  - `git`: Commits version and changelog changes
  - `github`: Creates GitHub releases

## GitHub Secrets Required

Make sure these secrets are configured in GitHub:

- `NPM_TOKEN`: Token for publishing to npm (already configured in npm environment)
- `GITHUB_TOKEN`: Automatically provided by GitHub Actions

## Manual Publishing

The old `publish.yml` workflow is still available for manual publishing if needed. It can be triggered:
- Manually via workflow dispatch
- Automatically when a GitHub release is created

## Skip CI

To skip the CI workflow on commits made by semantic-release, the commit message includes `[skip ci]`.
