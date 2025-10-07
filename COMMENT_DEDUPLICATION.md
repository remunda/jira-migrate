# Comment Deduplication Implementation

## Problem
When migrating Jira issues to ClickUp multiple times (e.g., during updates), comments would be duplicated each time the migration ran.

## Solution
Implemented an intelligent deduplication system that tracks which Jira comments have already been synced to ClickUp.

## How It Works

### 1. Comment Identification
Each synced comment includes a unique identifier footer:
```
**John Doe** (1/7/2025, 10:30:00 AM):
This is the comment text...

---
*[Jira Comment ID: 10045]*
```

The Jira Comment ID is appended to each synced comment in a standardized format.

### 2. Deduplication Logic (for Updates)

When updating an existing task with `syncComments` enabled:

1. **Fetch Existing ClickUp Comments**
   - Calls `getTaskComments()` to retrieve all comments on the task

2. **Extract Synced Jira IDs**
   - Parses each ClickUp comment looking for the pattern: `[Jira Comment ID: xxx]`
   - Builds a Set of already-synced Jira comment IDs

3. **Filter New Comments**
   - Compares incoming Jira comments against the Set
   - Only processes comments whose ID is NOT in the Set

4. **Sync Only New Comments**
   - Adds only the filtered (new) comments to ClickUp
   - Provides feedback on how many were synced vs. skipped

### 3. First-Time Creation
When creating a new task, all comments are synced (no deduplication needed since it's a new task).

## Code Changes

### ClickUpClient (`src/clickup-client.ts`)
- Added `ClickUpComment` interface
- Added `getTaskComments()` method to fetch existing comments

### ClickUpMigrator (`src/clickup-migrator.ts`)
- Updated `formatJiraComment()` to include Jira Comment ID marker
- Updated comment syncing logic in `migrateIssue()`:
  - For **updates**: Checks existing comments and skips duplicates
  - For **creates**: Syncs all comments (first time)
- Enhanced logging to show synced vs. skipped counts

## Example Output

When updating a task with 5 Jira comments (3 already synced, 2 new):
```
Syncing 5 comment(s)...
  ✓ Synced comment from Jane Smith
  ✓ Synced comment from Bob Johnson
  ℹ Skipped 3 already synced comment(s)
  ✓ Synced 2 new comment(s)
```

## Benefits

1. **Safe to Re-run**: Can migrate the same issue multiple times without duplicating comments
2. **Incremental Updates**: Only new comments are synced on subsequent runs
3. **Transparent**: Clear logging shows what's being synced vs. skipped
4. **Efficient**: Avoids unnecessary API calls for already-synced comments
5. **Robust**: Uses unique Jira comment IDs for reliable matching

## Performance Considerations

- Additional API call to fetch existing comments (only during updates)
- Regex pattern matching on comment text (minimal overhead)
- Set-based lookup for O(1) deduplication checking

## Edge Cases Handled

- Comments without IDs: Won't be matched (re-synced if pattern changes)
- Manual comment edits in ClickUp: Marker preserved unless manually removed
- Multiple migrations: Each comment synced exactly once
- Failed syncs: Don't affect already-synced comments on retry
