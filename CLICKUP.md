# ClickUp Migration Guide

Complete guide for migrating JIRA issues to ClickUp.

---

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Setup Instructions](#setup-instructions)
- [Configuration](#configuration)
- [Usage](#usage)
- [Features](#features)
- [Troubleshooting](#troubleshooting)

---

## Overview

The JIRA to ClickUp migration tool provides full support for migrating JIRA issues to ClickUp with the following features:

- ✅ **Idempotent migration** - Re-running updates instead of duplicating
- ✅ **Full ADF support** - Converts Atlassian Document Format to Markdown
- ✅ **Assignee mapping** - Maps JIRA users to ClickUp users by email
- ✅ **Priority mapping** - Automatically maps JIRA priorities to ClickUp (1-4 scale)
- ✅ **Status mapping** - Converts JIRA statuses to ClickUp statuses
- ✅ **Labels/Tags** - Transfers all JIRA labels as ClickUp tags
- ✅ **Attachments info** - Includes links to JIRA attachments in description
- ✅ **Metadata preservation** - Stores original JIRA details in description
- ✅ **Bulk migration** - Migrate multiple issues at once
- ✅ **Dry run mode** - Preview migrations before executing

---

## Quick Start

### 1. Install & Build

```bash
yarn install
yarn build
```

### 2. Setup Configuration

```bash
yarn dev setup
```

This creates a `.env` file. Edit it:

```env
# JIRA Configuration
JIRA_BASE_URL=https://your-company.atlassian.net
JIRA_EMAIL=your-email@company.com
JIRA_API_TOKEN=your-jira-token

# Set target to ClickUp
TARGET_PLATFORM=clickup

# ClickUp Configuration
CLICKUP_API_TOKEN=pk_your_clickup_token
CLICKUP_TEAM_ID=your_team_id
CLICKUP_SPACE_ID=your_space_id
CLICKUP_LIST_ID=your_list_id

# Optional: for idempotent migrations (recommended)
CLICKUP_EXTERNAL_ID_FIELD_ID=your_custom_field_id
```

### 3. Test Connection

```bash
yarn dev test
```

Expected output:
```
Target platform: CLICKUP
JIRA connection: ✅
ClickUp connection: ✅
🎉 All connections working!
```

### 4. Try a Single Migration

```bash
# Preview (dry run)
yarn dev migrate PROJ-123 --dry-run

# Actual migration
yarn dev migrate PROJ-123
```

### 5. Bulk Migration

Create a file with JIRA keys:

```bash
# jira-keys.txt
PROJ-100
PROJ-101
PROJ-102
```

Then migrate:

```bash
yarn dev bulk --file jira-keys.txt
```

---

## Setup Instructions

### Step 1: Get API Token

1. Open ClickUp in your browser
2. Click your avatar (bottom left corner)
3. Click **Settings**
4. Go to **Apps** tab
5. Under "API Token", click **Generate**
6. Copy the token (starts with `pk_`)
7. Save it - you won't see it again!

```env
CLICKUP_API_TOKEN=pk_123456_ABCDEFGHIJ...
```

### Step 2: Find Team ID

**Method 1: From URL**
1. Open ClickUp
2. Look at the URL: `https://app.clickup.com/XXXXXXX/home`
3. The number is your Team ID

**Method 2: From API**
```bash
curl https://api.clickup.com/api/v2/team \
  -H "Authorization: YOUR_API_TOKEN"
```

```env
CLICKUP_TEAM_ID=9876543
```

### Step 3: Find Space ID

**Method 1: From URL**
1. Navigate to a Space in ClickUp
2. URL shows: `https://app.clickup.com/<TEAM_ID>/v/o/s/<SPACE_ID>`
3. Or click Space name → Settings → look at URL

**Method 2: From API**
```bash
curl https://api.clickup.com/api/v2/team/YOUR_TEAM_ID/space \
  -H "Authorization: YOUR_API_TOKEN"
```

Response will show all spaces:
```json
{
  "spaces": [
    {
      "id": "12345678",
      "name": "My Space",
      ...
    }
  ]
}
```

```env
CLICKUP_SPACE_ID=12345678
```

### Step 4: Find List ID

**Method 1: From URL**
1. Navigate to a List
2. Click the three dots (•••) next to list name
3. Click **Copy Link**
4. Extract from URL: `https://app.clickup.com/...`

**Method 2: From API**

First, get your Folder ID:
```bash
curl https://api.clickup.com/api/v2/space/YOUR_SPACE_ID/folder \
  -H "Authorization: YOUR_API_TOKEN"
```

Then get Lists in that Folder:
```bash
curl https://api.clickup.com/api/v2/folder/YOUR_FOLDER_ID/list \
  -H "Authorization: YOUR_API_TOKEN"
```

Or get Lists directly from Space (folderless lists):
```bash
curl https://api.clickup.com/api/v2/space/YOUR_SPACE_ID/list \
  -H "Authorization: YOUR_API_TOKEN"
```

```env
CLICKUP_LIST_ID=87654321
```

### Step 5: (Optional but Recommended) Create Custom Field for External ID

This enables idempotent migration (update instead of duplicate).

**Using ClickUp UI:**
1. Open the List where you want to migrate
2. Click **+ Add** (in table header area)
3. Select **Custom Field**
4. Configure:
   - **Name**: "JIRA ID" or "External ID"
   - **Type**: Text
   - **Required**: No
5. Click **Create**

**Get Field ID via API:**
```bash
curl https://api.clickup.com/api/v2/list/YOUR_LIST_ID/field \
  -H "Authorization: YOUR_API_TOKEN"
```

Look for your field in response:
```json
{
  "fields": [
    {
      "id": "abc123-def456-ghi789",
      "name": "JIRA ID",
      "type": "text",
      ...
    }
  ]
}
```

```env
CLICKUP_EXTERNAL_ID_FIELD_ID=abc123-def456-ghi789
```

---

## Configuration

### Complete .env Example

```env
# JIRA Configuration
JIRA_BASE_URL=https://mycompany.atlassian.net
JIRA_EMAIL=john.doe@mycompany.com
JIRA_API_TOKEN=ATATT3xFfGF0...

# Target Platform
TARGET_PLATFORM=clickup

# ClickUp Configuration
CLICKUP_API_TOKEN=pk_123456_ABCDEFGHIJ...
CLICKUP_TEAM_ID=9876543
CLICKUP_SPACE_ID=12345678
CLICKUP_LIST_ID=87654321
CLICKUP_EXTERNAL_ID_FIELD_ID=abc123-def456-ghi789
```

### Switching Between Shortcut and ClickUp

Just change `TARGET_PLATFORM` in `.env`:

```env
# For ClickUp
TARGET_PLATFORM=clickup
CLICKUP_API_TOKEN=your_clickup_token
CLICKUP_TEAM_ID=...
CLICKUP_SPACE_ID=...
CLICKUP_LIST_ID=...

# For Shortcut
TARGET_PLATFORM=shortcut
SHORTCUT_API_TOKEN=your_shortcut_token
```

---

## Usage

### Common Commands

```bash
# Inspect JIRA issue before migrating
yarn dev inspect PROJ-123

# Migrate single issue
yarn dev migrate PROJ-123

# Dry run (preview without executing)
yarn dev migrate PROJ-123 --dry-run

# Migrate to specific list
yarn dev migrate PROJ-123 --list 87654321

# Migrate multiple issues
yarn dev bulk --keys PROJ-123 PROJ-124 PROJ-125

# Migrate from file
yarn dev bulk --file jira-keys.txt

# Bulk migration with dry run
yarn dev bulk --file keys.txt --dry-run
```

### Idempotent Migration (Update Instead of Duplicate)

When `CLICKUP_EXTERNAL_ID_FIELD_ID` is configured:

1. **First migration**: Creates new task with JIRA key stored in custom field
2. **Re-migration**: Finds existing task by custom field and updates it
3. **No duplicates**: Safe to run multiple times

Example workflow:
```bash
# First run - creates task
yarn dev migrate PROJ-123

# Make changes in JIRA (description, status, assignee, etc.)

# Second run - updates existing task
yarn dev migrate PROJ-123
# Output: "Found existing task: 123456 - Task Name"
# Output: "(Updated existing task)"
```

---

## Features

### What Gets Migrated

Each migrated task contains:

- ✅ **Name**: `[JIRA-KEY] Summary`
- ✅ **Description**: Formatted with:
  - Link to original JIRA issue
  - Converted ADF content (Markdown)
  - JIRA metadata (type, status, priority, reporter, dates)
  - Components
  - Attachments with links
- ✅ **Status**: Mapped from JIRA status
- ✅ **Priority**: Mapped from JIRA priority (1-4 scale)
- ✅ **Tags**: All JIRA labels
- ✅ **Assignees**: Mapped by email address
- ✅ **Custom Field**: JIRA key (if configured)

### Status Mapping

Default mapping:
- **JIRA "Done/Closed/Resolved"** → ClickUp "complete"
- **JIRA "In Progress/Review"** → ClickUp "in progress"
- **JIRA "To Do/Open/Backlog"** → ClickUp "to do"

### Priority Mapping

- **JIRA "Highest"** → ClickUp 1 (Urgent)
- **JIRA "High"** → ClickUp 2 (High)
- **JIRA "Medium"** → ClickUp 3 (Normal)
- **JIRA "Low/Lowest"** → ClickUp 4 (Low)

### Features Comparison: ClickUp vs Shortcut

| Feature | Shortcut | ClickUp |
|---------|----------|---------|
| Idempotent Migration | ✅ | ✅ |
| ADF Parsing | ✅ | ✅ |
| Assignee Mapping | ✅ (by email) | ✅ (by email) |
| Status Mapping | ✅ | ✅ |
| Priority Mapping | ✅ | ✅ |
| Labels/Tags | ✅ | ✅ |
| Iterations/Sprints | ✅ | ❌* |
| Epic Support | ✅ | ❌* |
| Bulk Migration | ✅ | ✅ |
| Dry Run | ✅ | ✅ |
| Attachments | Links only | Links only |

*ClickUp uses Folders/Lists instead of Iterations and doesn't have a separate Epic type

---

## Troubleshooting

### "Failed to connect to ClickUp"
- Double-check your API token
- Ensure token hasn't been revoked
- Try generating a new token

### "Failed to create task"
- Verify List ID is correct
- Check you have write permissions to the list
- Ensure you're a member of the workspace

### Can't find Space/List IDs
- Use the API endpoints listed in [Setup Instructions](#setup-instructions)
- Check ClickUp URL while navigating
- Ensure you have access to the Space/List

### "No tasks found" (for re-migration)
- Verify `CLICKUP_EXTERNAL_ID_FIELD_ID` is correct
- Field must be type "Text"
- Field must exist in the target list

### Assignee not mapping
- User must exist in ClickUp workspace
- Email must match exactly (case-insensitive)
- User must have access to the list

### Rate limiting
- Tool automatically delays 1 second between requests
- ClickUp limit: 100 requests/minute
- For large migrations (100+ items), expect ~2 minutes per 100 items

### Verification Steps

Test your configuration:

```bash
# Build the project
yarn build

# Test connections
yarn dev test
```

Expected output:
```
Target platform: CLICKUP
Testing connections...
JIRA connection: ✅
ClickUp connection: ✅

🎉 All connections working!
```

---

## Implementation Details

### Technical Architecture

**Files Created:**
1. `src/clickup-client.ts` - ClickUp API client
2. `src/clickup-migrator.ts` - ClickUp-specific migration logic

**Core Features:**
- ✅ Task creation, update, retrieval
- ✅ Custom field management
- ✅ Team member lookup
- ✅ Search functionality
- ✅ Comment support
- ✅ Rate limiting (1s between requests)

**Design Patterns:**
- **Factory Pattern** - Migrator selection based on config
- **Strategy Pattern** - Different migration strategies per platform
- **Adapter Pattern** - Unified interface for different APIs

### Migration Process

1. **Validation** - Check JIRA and ClickUp connections
2. **Fetch** - Retrieve JIRA issue data
3. **Search** - Check if task already exists (if custom field configured)
4. **Transform** - Convert JIRA data to ClickUp format
5. **Execute** - Create or update ClickUp task
6. **Verify** - Confirm migration success

---

## Resources

- 📖 **ClickUp API Docs**: https://clickup.com/api
- 📖 **ClickUp Status**: https://status.clickup.com/
- 📖 **Test your token**: `curl https://api.clickup.com/api/v2/user -H "Authorization: YOUR_TOKEN"`

---

**Good luck with your ClickUp migration! 🚀**
