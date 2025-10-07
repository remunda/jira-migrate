# Comment Sync Feature (Jira → ClickUp)

## Overview
Added support for one-way syncing of comments from Jira to ClickUp during migration.

## Changes Made

### 1. Types (`src/types.ts`)
- Added `JiraComment` interface to represent Jira comments
- Updated `JiraIssue` interface to include optional `comment` field
- Updated `MigrationConfig` interface to include `clickupSyncComments` boolean option

### 2. Jira Client (`src/jira-client.ts`)
- Updated `getIssue()` method to accept optional `includeComments` parameter
- Added `getComments()` method to fetch comments for a specific Jira issue
- When `includeComments` is true, the `comment` field is included in the API request

### 3. ClickUp Migrator (`src/clickup-migrator.ts`)
- Added `formatJiraComment()` method to format Jira comments for ClickUp
  - Includes author name and timestamp
  - Parses ADF (Atlassian Document Format) to plain text/Markdown
- Updated `migrateIssue()` method:
  - Added `syncComments` parameter (optional)
  - Syncs comments after creating/updating task if enabled
  - Respects both CLI flag and config file setting
- Updated `migrateBulk()` method to pass through `syncComments` parameter

### 4. Configuration (`src/config.ts`)
- Added `CLICKUP_SYNC_COMMENTS` environment variable support
- Parses as boolean (set to "true" to enable)

### 5. CLI (`src/cli.ts`)
- Added `-s, --sync-comments` option to both `migrate` and `bulk` commands
- Option is ClickUp-specific (ignored for Shortcut migrations)
- CLI flag overrides environment variable setting

## Usage

### Environment Variable
Add to your `.env` file:
```bash
CLICKUP_SYNC_COMMENTS=true
```

### CLI Options

Single migration with comment sync:
```bash
yarn dev migrate PROJ-123 --sync-comments
```

Bulk migration with comment sync:
```bash
yarn dev bulk --file jira-keys.txt --sync-comments
```

Or using the short flag:
```bash
yarn dev migrate PROJ-123 -s
```

### Behavior
- If `--sync-comments` flag is provided, comments will be synced
- If flag is not provided, falls back to `CLICKUP_SYNC_COMMENTS` environment variable
- Default is `false` (no comment syncing)
- Comments are synced for both new task creation and task updates
- Each comment includes:
  - Author's display name
  - Comment creation timestamp
  - Comment body (parsed from ADF to Markdown)

## Comment Format
Comments are formatted as:
```
**John Doe** (1/1/2024, 10:30:00 AM):
This is the comment text...

---
*[Jira Comment ID: 12345]*
```

The Jira Comment ID is included as a hidden marker to prevent duplicate syncing when updating tasks.

## Deduplication
- When updating an existing task, the migrator checks for existing ClickUp comments
- Comments with matching Jira Comment IDs are skipped
- Only new comments (not previously synced) are added
- This prevents duplicate comments when running migrations multiple times
- The deduplication works by:
  1. Fetching existing ClickUp comments on the task
  2. Extracting Jira Comment IDs from the comment text
  3. Comparing with incoming Jira comments
  4. Syncing only comments that don't already exist

## Error Handling
- If a comment fails to sync, an error is logged but migration continues
- Rate limiting is handled via existing retry mechanism in ClickUp client
- Errors don't stop the overall migration process

## Notes
- This is a one-way sync: Jira → ClickUp only
- Comments include a hidden Jira Comment ID marker for deduplication
- Running migration multiple times will NOT duplicate comments (thanks to deduplication)
- Suitable for both initial migrations and ongoing updates
- When creating a new task, all comments are synced
- When updating an existing task, only new comments (not yet synced) are added
