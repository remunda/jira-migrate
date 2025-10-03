# JIRA to Shortcut/ClickUp Migration Tool

CLI tool for migrating tasks from JIRA to Shortcut.com or ClickUp. Supports migration of **Epics** and **Stories** (including Features, User Stories, Tasks, and Bugs).

---

## 🚀 Quick Start

### 1. Installation

```bash
yarn install
yarn build
```

### 2. Configuration

```bash
yarn dev setup
```

Edit the created `.env` file:

**For Shortcut:**
```env
JIRA_BASE_URL=https://your-domain.atlassian.net
JIRA_EMAIL=your-email@example.com
JIRA_API_TOKEN=your-jira-api-token

TARGET_PLATFORM=shortcut
SHORTCUT_API_TOKEN=your-shortcut-api-token
```

**For ClickUp:**
```env
JIRA_BASE_URL=https://your-domain.atlassian.net
JIRA_EMAIL=your-email@example.com
JIRA_API_TOKEN=your-jira-api-token

TARGET_PLATFORM=clickup
CLICKUP_API_TOKEN=your-clickup-api-token
CLICKUP_TEAM_ID=your-team-id
CLICKUP_SPACE_ID=your-space-id
CLICKUP_LIST_ID=your-list-id
CLICKUP_EXTERNAL_ID_FIELD_ID=custom-field-id  # Optional, for idempotent migrations
```

### 3. Test Connection

```bash
yarn dev test
```

### 4. Basic Migration

```bash
# Inspect JIRA issue before migration
yarn dev inspect PROJ-123

# Migrate single issue
yarn dev migrate PROJ-123

# Migrate multiple issues at once
yarn dev bulk --keys PROJ-123 PROJ-124 PROJ-125

# Migrate from file
yarn dev bulk --file jira-keys.txt
```

---

## 📖 Getting API Tokens

**JIRA API Token:**
1. Go to https://id.atlassian.com/manage-profile/security/api-tokens
2. Click "Create API token"
3. Copy the generated token

**Shortcut API Token:**
1. Go to https://app.shortcut.com/settings/api/tokens
2. Click "Generate Token"
3. Copy the generated token

**ClickUp API Token:**
1. Log in to ClickUp
2. Click your avatar in the bottom left
3. Go to **Settings** → **Apps**
4. Click **Generate** under API Token

---

## 💡 Common Commands

### Inspect Issue
```bash
# Find out type and details before migration
yarn dev inspect PROJ-123
```

### Single Issue Migration
```bash
# Basic migration
yarn dev migrate PROJ-123

# Dry run (shows what will happen without executing)
yarn dev migrate PROJ-123 --dry-run

# With assignment to current iteration (Shortcut only)
yarn dev migrate PROJ-123 --current-iteration

# With assignment to specific iteration (Shortcut only)
yarn dev migrate PROJ-123 --iteration 58

# Migrate to specific list (ClickUp only)
yarn dev migrate PROJ-123 --list 87654321
```

### Bulk Migration
```bash
# Migrate multiple issues at once
yarn dev bulk --keys PROJ-123 PROJ-124 PROJ-125

# Migrate from file (one key per line)
yarn dev bulk --file jira-keys.txt

# Dry run for bulk migration
yarn dev bulk --file jira-keys.txt --dry-run

# With iteration assignment (Shortcut)
yarn dev bulk --keys PROJ-123 PROJ-124 --current-iteration
```

### Re-migration (Update)
```bash
# If issue already exists, it will be updated
yarn dev migrate PROJ-123
```

---

## ✨ Key Features

- ✅ **Epic Support** - Epics are migrated as full-featured Epics in Shortcut
- ✅ **Idempotent Migration** - re-running updates instead of duplicating
- ✅ **Iterations** (Shortcut) - assignment to current or specific iteration
- ✅ **ADF Support** - converts Atlassian Document Format to Markdown
- ✅ **Assignee Mapping** - automatic user mapping by email
- ✅ **Label Transfer** - all JIRA labels are transferred as tags
- ✅ **Metadata** - preserves original JIRA information in description
- ✅ **Attachments** - attachment information including links
- ✅ **Bulk Migration** - migrate multiple issues at once
- ✅ **Dry Run Mode** - preview before executing migration
- ✅ **Connection Validation** - verification before starting migration

---

## 🔄 Platform Support

### Shortcut.com
- ✅ Full support for Epics and Stories
- ✅ Iteration assignment
- ✅ Automatic story type detection (feature/bug/chore)
- ✅ Idempotent migration via External ID

📖 **[Complete Shortcut Guide →](./SHORTCUT.md)**

### ClickUp
- ✅ Full support for task migration
- ✅ Custom field for External ID
- ✅ Priority mapping (1-4)
- ✅ Specific list selection (`--list <id>`)
- ✅ Idempotent migration via custom field

📖 **[Complete ClickUp Guide →](./CLICKUP.md)**

---

## 🗺️ Type & Status Mapping

### JIRA Types → Shortcut

| JIRA Type      | Shortcut Type | Shortcut Story Type |
|----------------|---------------|---------------------|
| Epic           | Epic          | -                   |
| Story          | Story         | feature             |
| User Story     | Story         | feature             |
| Task           | Story         | chore               |
| Bug            | Story         | bug                 |
| Feature        | Story         | feature             |

### JIRA Status → State

| JIRA Status              | Shortcut Story State | Shortcut Epic State | ClickUp Status    |
|--------------------------|----------------------|---------------------|-------------------|
| To Do, Open              | Unstarted            | to do               | to do             |
| In Progress, Review      | Started              | in progress         | in progress       |
| Done, Closed, Resolved   | Done                 | done                | complete          |

---

## 🎯 What Gets Migrated

Each migrated issue contains:
- ✅ Title and description
- ✅ Link to original JIRA issue
- ✅ Issue type (Epic/Story with appropriate subtype for Shortcut)
- ✅ Status (mapped to workflow states)
- ✅ Assignee (if exists with same email)
- ✅ Labels/Tags
- ✅ Original metadata (type, status, priority, reporter, dates)
- ✅ External ID for origin identification
- ✅ Attachment information

---

## 🚨 Troubleshooting

### Connection Errors
```bash
# Test connection
yarn dev test
```

**Possible causes:**
- Check JIRA URL (must end with `.atlassian.net`)
- Verify email and API token for JIRA
- Verify API token for target platform (Shortcut or ClickUp)
- Check correct `TARGET_PLATFORM` setting in `.env`

### Rate Limiting
- Tool automatically adds pauses between requests
- If you get rate limit errors, try migrating in smaller batches
- ClickUp: 100 requests/minute (stricter than Shortcut)

### Mapping Errors
- Assignment only works if user exists with same email
- Unsupported issue types will be skipped with error message

## 📚 Documentation

- 📖 **[SHORTCUT.md](./SHORTCUT.md)** - Complete Shortcut migration guide (includes Epic support)
- 📖 **[CLICKUP.md](./CLICKUP.md)** - Complete ClickUp migration guide (includes setup instructions)
- 📖 **[CHANGELOG.md](./CHANGELOG.md)** - Version history

---

## 🔧 Local Development

### Prerequisites

- Node.js (version 18 or higher)
- Yarn (recommended) or npm

### Build Locally

```bash
# Install dependencies
yarn install

# Compile TypeScript
yarn build

# Run in dev mode (no compilation needed)
yarn dev <command>
```

---

## 📄 License

**CC BY-SA 4.0** - Free to use commercially, but cannot sell the code itself.

- ✅ Use for commercial migration projects
- ✅ Modify and share improvements
- ❌ Cannot sell the source code or create proprietary versions

Full license: https://creativecommons.org/licenses/by-sa/4.0/

---

**Good luck with your migration! 🚀**
