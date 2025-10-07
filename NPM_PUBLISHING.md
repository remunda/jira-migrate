# NPM Publishing Setup

This document describes the setup for publishing `jira-migrate` to npm.

## Package Configuration

The package is configured to be published as `jira-migrate` on npm and can be used with:

```bash
npx jira-migrate [command]
```

### Key Configuration Points

1. **package.json**
   - Package name: `jira-migrate`
   - Binary name: `jira-migrate`
   - License: MIT
   - Files included in package: `dist/`, `README.md`, `LICENSE`
   - Minimum Node.js version: 18.0.0

2. **.npmignore**
   - Excludes source files, development configs, and documentation
   - Only distributes compiled code in `dist/` directory

## GitHub Actions Workflows

### CI Workflow (.github/workflows/ci.yml)

Runs on every push to `main` or `develop` branches and on pull requests.

**Tests:**
- Biome format check
- Biome lint check
- Biome check (combined)
- TypeScript build
- Build artifact verification

**Matrix:**
- Node.js versions: 18.x, 20.x

### Publish Workflow (.github/workflows/publish.yml)

Publishes to npm when:
1. A new GitHub release is created
2. Manually triggered via workflow_dispatch

**Steps:**
1. Checkout code
2. Install dependencies
3. Run precommit checks (format, lint, biome check)
4. Build project
5. Publish to npm with provenance
6. Create summary

## Setup Instructions

### 1. Configure npm Token

1. Go to [npmjs.com](https://www.npmjs.com/) and log in
2. Click on your profile → Access Tokens → Generate New Token
3. Choose "Automation" type (for CI/CD)
4. Copy the token

5. In your GitHub repository:
   - Go to Settings → Secrets and variables → Actions
   - Click "New repository secret"
   - Name: `NPM_TOKEN`
   - Value: paste your npm token
   - Click "Add secret"

### 2. Verify Repository Settings

Ensure your repository settings match package.json:
- Repository URL: https://github.com/remunda/jira-migrate

### 3. Publishing Process

#### Option A: Via GitHub Release (Recommended)

1. Update version in package.json:
   ```bash
   npm version patch  # or minor, or major
   ```

2. Commit and push:
   ```bash
   git add package.json
   git commit -m "Bump version to x.y.z"
   git push
   ```

3. Create a GitHub release:
   - Go to repository → Releases → "Create a new release"
   - Click "Choose a tag" → type version (e.g., `v1.0.0`) → "Create new tag"
   - Set release title (e.g., `v1.0.0`)
   - Add release notes
   - Click "Publish release"

4. The publish workflow will automatically run and publish to npm

#### Option B: Manual Workflow Dispatch

1. Go to repository → Actions → "Publish to npm"
2. Click "Run workflow"
3. Optionally specify a version (will update package.json)
4. Click "Run workflow"

### 4. Verify Publication

After publishing, verify at:
- https://www.npmjs.com/package/jira-migrate

Test installation:
```bash
npx jira-migrate@latest --help
```

## Version Management

Follow [Semantic Versioning](https://semver.org/):
- **MAJOR** (1.x.x): Breaking changes
- **MINOR** (x.1.x): New features, backwards compatible
- **PATCH** (x.x.1): Bug fixes, backwards compatible

Update version using:
```bash
npm version patch  # 1.0.0 → 1.0.1
npm version minor  # 1.0.0 → 1.1.0
npm version major  # 1.0.0 → 2.0.0
```

## Troubleshooting

### Publication fails with "You cannot publish over the previously published versions"
- The version in package.json already exists on npm
- Update to a new version and try again

### Publication fails with "403 Forbidden"
- Check that NPM_TOKEN secret is correctly set
- Verify the token hasn't expired
- Ensure the token has "Automation" permissions

### CI fails on biome checks
- Run locally: `yarn precommit`
- Fix all formatting and linting issues
- Commit and push fixes

## Pre-publish Checklist

Before publishing a new version:

- [ ] All tests pass locally
- [ ] Run `yarn precommit` without errors
- [ ] Update CHANGELOG.md with changes
- [ ] Update version in package.json
- [ ] Update README.md if needed
- [ ] Commit all changes
- [ ] CI workflow passes on GitHub
- [ ] Create GitHub release or trigger manual workflow
