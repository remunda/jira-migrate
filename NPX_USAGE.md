# NPX Usage Guide

## Package Information

**Package Name:** `@remunda/jira-migrate`  
**Binary Command:** `jira-migrate`

## How to Use with NPX

### Quick Start (No Installation Required)

```bash
# Setup configuration
npx @remunda/jira-migrate setup

# Test connection
npx @remunda/jira-migrate test

# Inspect a JIRA issue
npx @remunda/jira-migrate inspect PROJ-123

# Migrate a single issue
npx @remunda/jira-migrate migrate PROJ-123

# Bulk migration
npx @remunda/jira-migrate bulk --keys PROJ-123 PROJ-124 PROJ-125
npx @remunda/jira-migrate bulk --file jira-keys.txt
```

### Global Installation

If you prefer to install globally:

```bash
# Install globally
npm install -g @remunda/jira-migrate

# Then use without npx
jira-migrate setup
jira-migrate migrate PROJ-123
```

### Alternative with Yarn

```bash
# One-time execution
yarn dlx @remunda/jira-migrate setup

# Or global installation
yarn global add @remunda/jira-migrate
```

## Configuration Management

### How It Works with NPX

1. **Initial Setup:**
   ```bash
   npx @remunda/jira-migrate setup
   ```
   This creates a `.env` file in your **current working directory**.

2. **Configuration Location:**
   - The `.env` file is created in `process.cwd()` (where you run the command)
   - All subsequent commands read from this `.env` file
   - Different projects can have different configurations

3. **Configuration Flow:**
   ```
   Your Project Directory/
   ├── .env                 # Created by 'setup' command
   └── jira-keys.txt        # Optional: your JIRA keys
   
   Then run: npx @remunda/jira-migrate migrate PROJ-123
   ```

### Environment Variables

**Required for JIRA:**
```env
JIRA_BASE_URL=https://your-domain.atlassian.net
JIRA_EMAIL=your-email@example.com
JIRA_API_TOKEN=your-jira-api-token
```

**For Shortcut:**
```env
TARGET_PLATFORM=shortcut
SHORTCUT_API_TOKEN=your-shortcut-api-token
```

**For ClickUp:**
```env
TARGET_PLATFORM=clickup
CLICKUP_API_TOKEN=your-clickup-api-token
CLICKUP_TEAM_ID=your-team-id
CLICKUP_SPACE_ID=your-space-id
CLICKUP_LIST_ID=your-list-id
CLICKUP_EXTERNAL_ID_FIELD_ID=custom-field-id  # Optional
```

### Alternative Configuration Methods

#### 1. Manual .env File Creation

Instead of using `setup`, you can manually create a `.env` file:

```bash
# Create .env file
echo "JIRA_BASE_URL=https://your-domain.atlassian.net" > .env
echo "JIRA_EMAIL=your@email.com" >> .env
# ... add more variables
```

#### 2. Environment Variables (for CI/CD)

Set environment variables directly (future enhancement):
```bash
# This could be supported in the future
export JIRA_BASE_URL=https://your-domain.atlassian.net
npx @remunda/jira-migrate migrate PROJ-123
```

#### 3. Config File Path (future enhancement)

```bash
# This could be supported in the future
npx @remunda/jira-migrate migrate PROJ-123 --config /path/to/custom.env
```

## Best Practices

### For Individual Use

```bash
# Navigate to your project directory
cd ~/my-migration-project

# Setup once
npx @remunda/jira-migrate setup

# Edit .env with your credentials
# Then use as needed
npx @remunda/jira-migrate migrate PROJ-123
```

### For Team Use

```bash
# Create a shared template
cat > .env.example <<EOF
JIRA_BASE_URL=https://company.atlassian.net
JIRA_EMAIL=
JIRA_API_TOKEN=
TARGET_PLATFORM=shortcut
SHORTCUT_API_TOKEN=
EOF

# Team members copy and fill in their credentials
cp .env.example .env
# Edit .env with personal tokens
```

### For CI/CD

```bash
# Set secrets in your CI/CD environment
# Then run commands directly
npx @remunda/jira-migrate bulk --file jira-keys.txt
```

## Publishing

To publish this package to npm:

```bash
# Login to npm
npm login

# Build the package
yarn build

# Publish (version bump as needed)
npm publish
```

The package will be available at: https://www.npmjs.com/package/@remunda/jira-migrate

## Troubleshooting NPX Usage

### Issue: "Config not found"
**Solution:** Make sure you're running commands from the same directory where `.env` exists, or run `setup` first.

### Issue: "Package not found"
**Solution:** The package needs to be published to npm first. Use `npm publish` after building.

### Issue: "Permission denied"
**Solution:** 
- For global install: Use `sudo npm install -g @remunda/jira-migrate` (Unix/Mac) or run as administrator (Windows)
- For npx: No special permissions needed

### Issue: "Different versions"
**Solution:** NPX caches packages. Force fresh download:
```bash
npx --yes @remunda/jira-migrate@latest migrate PROJ-123
```
