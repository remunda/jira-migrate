# GitHub Actions Quick Reference

## 🔧 Setup Required

### 1. NPM Token
1. Visit https://www.npmjs.com/
2. Login or create account
3. Go to Account Settings → Access Tokens
4. Click "Generate New Token" → Choose "Automation"
5. Copy the token
6. In GitHub: Settings → Secrets and variables → Actions → New repository secret
7. Name: `NPM_TOKEN`, Value: [paste token]

## 🚀 Workflows Overview

### CI Workflow (Automatic)
**File:** `.github/workflows/ci.yml`
**Runs on:**
- Every push to `main` or `develop`
- Every pull request to `main` or `develop`

**What it does:**
- ✅ Biome format check
- ✅ Biome lint check  
- ✅ Biome combined check
- ✅ TypeScript build
- ✅ Verify build artifacts
- ✅ Tests on Node 18.x and 20.x

### Publish Workflow (Manual/Release)
**File:** `.github/workflows/publish.yml`
**Runs on:**
- GitHub release creation (automatic)
- Manual trigger via Actions tab

**What it does:**
- ✅ All precommit checks
- ✅ Build project
- ✅ Publish to npm
- ✅ Create deployment summary

## 📦 Publishing Process

### Method 1: GitHub Release (Recommended)
```bash
# 1. Update version
npm version patch  # or minor, major

# 2. Commit and push
git add package.json
git commit -m "Bump version to 1.0.1"
git push

# 3. Create release on GitHub
# Go to: Repository → Releases → "Create a new release"
# Tag: v1.0.1
# Title: v1.0.1
# Description: [Release notes]
# Click "Publish release"

# 4. Workflow runs automatically
```

### Method 2: Manual Dispatch
```bash
# Go to: Repository → Actions → "Publish to npm" → "Run workflow"
# Optionally specify version
# Click "Run workflow"
```

## 🧪 Testing Locally Before Publish

```bash
# Format, lint, and check
yarn precommit

# Build
yarn build

# Test CLI
node dist/cli.js --help

# See what will be published
npm pack --dry-run

# Test as if installed
npm link
jira-migrate --help
npm unlink jira-migrate
```

## 📊 Monitoring

### View Workflows
- Repository → Actions tab
- Click on workflow run to see details

### Check NPM Package
- https://www.npmjs.com/package/jira-migrate

### Test Published Package
```bash
npx jira-migrate@latest --help
```

## 🔍 Troubleshooting

### CI Fails: Biome Errors
```bash
# Fix locally
yarn precommit
git add .
git commit -m "Fix formatting and linting"
git push
```

### CI Fails: Build Error
```bash
# Test build locally
yarn build

# Check for TypeScript errors
tsc --noEmit
```

### Publish Fails: NPM_TOKEN Invalid
1. Check token expiration at npmjs.com
2. Generate new token
3. Update GitHub secret

### Publish Fails: Version Already Exists
```bash
# Update to new version
npm version patch
git push
```

## 📋 Workflow Status Badges

Add to README.md:
```markdown
[![CI](https://github.com/remunda/jira-migrate/actions/workflows/ci.yml/badge.svg)](https://github.com/remunda/jira-migrate/actions/workflows/ci.yml)
[![npm version](https://badge.fury.io/js/jira-migrate.svg)](https://www.npmjs.com/package/jira-migrate)
```

## 🎯 Common Commands

```bash
# Check workflow syntax locally (optional, requires act)
act -l

# Test build matrix locally
yarn install
yarn build

# Verify package contents
npm pack --dry-run
tar -tzf jira-migrate-*.tgz  # Linux/Mac
# or extract and inspect on Windows
```

## ✅ Pre-Publish Checklist

- [ ] NPM_TOKEN secret configured in GitHub
- [ ] CI workflow passing on main branch
- [ ] Version updated in package.json
- [ ] CHANGELOG.md updated
- [ ] README.md accurate
- [ ] All tests passing
- [ ] `yarn precommit` successful
- [ ] `yarn build` successful
- [ ] Reviewed `npm pack --dry-run` output
