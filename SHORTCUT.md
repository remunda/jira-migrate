# Shortcut Migration Guide

Complete guide for migrating JIRA issues to Shortcut (formerly Clubhouse).

---

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Usage](#usage)
- [Epic Support](#epic-support)
- [Features](#features)
- [Type Mapping](#type-mapping)

---

## Overview

The JIRA to Shortcut migration tool provides full support for migrating JIRA issues to Shortcut with the following features:

- ✅ **Epic Support** - Epics are migrated as full-featured Epics in Shortcut
- ✅ **Idempotent Migration** - re-running updates instead of duplicating
- ✅ **Iterations** - assignment to current or specific iteration
- ✅ **ADF Support** - converts Atlassian Document Format to Markdown
- ✅ **Assignee Mapping** - automatic user mapping by email
- ✅ **Label Transfer** - all JIRA labels are transferred as tags
- ✅ **Metadata** - preserves original JIRA information in description
- ✅ **Attachments** - attachment information including links
- ✅ **Bulk Migration** - migrate multiple issues at once
- ✅ **Dry Run Mode** - preview before executing migration

---

## Quick Start

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

```env
JIRA_BASE_URL=https://your-domain.atlassian.net
JIRA_EMAIL=your-email@example.com
JIRA_API_TOKEN=your-jira-api-token

TARGET_PLATFORM=shortcut
SHORTCUT_API_TOKEN=your-shortcut-api-token
```

### 3. Test Connection

```bash
yarn dev test
```

### 4. Migration

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

## Configuration

### Get Shortcut API Token

1. Go to https://app.shortcut.com/settings/api/tokens
2. Click "Generate Token"
3. Copy the generated token

### Complete .env Example

```env
# JIRA Configuration
JIRA_BASE_URL=https://your-domain.atlassian.net
JIRA_EMAIL=your-email@example.com
JIRA_API_TOKEN=your-jira-api-token

# Target Platform
TARGET_PLATFORM=shortcut

# Shortcut Configuration
SHORTCUT_API_TOKEN=your-shortcut-api-token
```

---

## Usage

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

# With assignment to current iteration
yarn dev migrate PROJ-123 --current-iteration

# With assignment to specific iteration
yarn dev migrate PROJ-123 --iteration 58
```

### Bulk Migration
```bash
# Migrate multiple issues at once
yarn dev bulk --keys PROJ-123 PROJ-124 PROJ-125

# Migrate from file (one key per line)
yarn dev bulk --file jira-keys.txt

# Dry run for bulk migration
yarn dev bulk --file jira-keys.txt --dry-run

# With iteration assignment
yarn dev bulk --keys PROJ-123 PROJ-124 --current-iteration
```

### Re-migration (Update)
```bash
# If issue already exists, it will be updated
yarn dev migrate PROJ-123
```

---

## Epic Support

### Overview

The tool fully supports JIRA Epics migration to Shortcut with complete feature parity.

### How It Works

#### Recognizing Epic vs Story

JIRA issue types are mapped as follows:

```typescript
'Epic' → Shortcut Epic
'Story' → Shortcut Story
'Task' → Shortcut Story
'Bug' → Shortcut Story
'Feature' → Shortcut Story
'User Story' → Shortcut Story
```

#### Creating New Epic

When you migrate a JIRA issue of type "Epic", a Shortcut Epic is created with:

- **Name**: From JIRA summary
- **Description**: Converted ADF text including metadata and attachments
- **State**: Mapped from JIRA status (to do / in progress / done)
- **External ID**: JIRA key (e.g. ES-123)
- **Labels**: Converted from JIRA labels
- **Owners**: Mapped JIRA assignee by email

#### Updating Existing Epic

When you run migration for a JIRA epic that already exists in Shortcut (has the same external_id):

- Searches for existing epic using Shortcut Search API
- Updates all properties (name, description, state, labels, owners)
- Does not overwrite external_id (cannot be changed)

### Epic Usage Examples

```bash
# Inspect JIRA issue to determine type
yarn dev inspect ES-123

# Migrate epic (works the same as story)
yarn dev migrate ES-123

# Re-migration (update) of epic
yarn dev migrate ES-123

# Bulk migration including epics
yarn dev bulk --keys ES-100 ES-101 ES-102
yarn dev bulk --file epic-keys.txt

# Note: Epics CANNOT be assigned to iterations (they are not stories)
# This command will create epic without iteration
yarn dev migrate ES-123 --current-iteration
```

### Epic State Mapping

```typescript
// JIRA Status → Shortcut Epic State
'To Do', 'Open' → 'to do'
'In Progress', 'In Review' → 'in progress'
'Done', 'Closed', 'Resolved' → 'done'
```

### Example Output

**Creating New Epic:**
```
✔ Connections validated
Searching for epic with external-id: ES-100
No epic found with external-id: ES-100
Creating new epic for ES-100
✔ Successfully migrated ES-100
Shortcut URL: https://app.shortcut.com/myaccount/epic/42
```

**Updating Existing Epic:**
```
✔ Connections validated
Searching for epic with external-id: ES-100
Found existing epic: 42 - My Epic Name
Updating existing epic ID 42 for ES-100
✔ Successfully migrated ES-100
Shortcut URL: https://app.shortcut.com/myaccount/epic/42
```

### Notes

- Epics cannot be assigned to iterations (stories only)
- Epic state has only 3 values: 'to do', 'in progress', 'done'
- External links and other advanced properties are part of description text

---

## Features

### What Gets Migrated

Each migrated issue contains:
- ✅ Title and description
- ✅ Link to original JIRA issue
- ✅ Issue type (Epic/Story with appropriate subtype)
- ✅ Status (mapped to workflow states)
- ✅ Assignee (if exists with same email)
- ✅ Labels/Tags
- ✅ Original metadata (type, status, priority, reporter, dates)
- ✅ External ID for origin identification
- ✅ Attachment information

### Iteration Support

Shortcut supports assigning stories to iterations (sprints):

```bash
# Assign to current iteration
yarn dev migrate PROJ-123 --current-iteration

# Assign to specific iteration by ID
yarn dev migrate PROJ-123 --iteration 58

# Bulk migration with iteration
yarn dev bulk --file sprint-items.txt --current-iteration
```

**Note:** Epics cannot be assigned to iterations.

---

## Type Mapping

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

| JIRA Status              | Shortcut Story State | Shortcut Epic State |
|--------------------------|----------------------|---------------------|
| To Do, Open              | Unstarted            | to do               |
| In Progress, Review      | Started              | in progress         |
| Done, Closed, Resolved   | Done                 | done                |

---

## Advanced Features

### Idempotent Migration

Stories and Epics are tracked by External ID (JIRA key):

1. **First run**: Creates new story/epic with External ID set to JIRA key
2. **Second run**: Finds existing story/epic by External ID and updates it
3. **No duplicates**: Safe to run multiple times

### Story Type Detection

Automatic story type assignment based on JIRA issue type:

- **feature**: Story, User Story, Feature
- **bug**: Bug
- **chore**: Task

### Assignee Mapping

- Automatically maps JIRA assignee to Shortcut member by email
- If no matching email found, story is created unassigned
- Case-insensitive email matching

### Label Transfer

- All JIRA labels are converted to Shortcut labels
- Labels are created if they don't exist
- Label names are preserved exactly as in JIRA

---

## Testing

### Test Migration Flow

1. **Inspect JIRA issue**:
   ```bash
   yarn dev inspect PROJ-123
   ```
   Shows type (Epic vs Story) and other details

2. **Test migration** (dry-run):
   ```bash
   yarn dev migrate PROJ-123 --dry-run
   ```

3. **Actual migration**:
   ```bash
   yarn dev migrate PROJ-123
   ```

4. **Re-migration** (test update):
   ```bash
   yarn dev migrate PROJ-123
   # Run again - should update, not create duplicate
   ```

---

**Good luck with your Shortcut migration! 🚀**
