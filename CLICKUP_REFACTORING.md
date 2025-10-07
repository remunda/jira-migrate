# ClickUp Module Refactoring

## Overview
Refactored the ClickUp integration code from two monolithic files into a well-organized module structure in the `src/clickup/` folder.

## New Structure

```
src/clickup/
├── index.ts          # Public API exports
├── types.ts          # TypeScript interfaces and types
├── client.ts         # ClickUp API client
├── formatters.ts     # ADF parsing and text formatting
├── mappers.ts        # Status and priority mapping logic
└── migrator.ts       # Migration orchestration
```

## Files

### `clickup/types.ts`
- **Purpose**: All ClickUp-specific TypeScript types and interfaces
- **Exports**:
  - `ClickUpTask`, `ClickUpList`, `ClickUpSpace`, `ClickUpUser`, `ClickUpComment`
  - `CreateTaskPayload`, `UpdateTaskPayload`
  - `ClickUpMigrationResult`

### `clickup/client.ts`
- **Purpose**: Low-level ClickUp API client with rate limiting
- **Key Features**:
  - Axios-based HTTP client
  - Automatic retry with exponential backoff
  - Rate limit handling with precise timing
  - CRUD operations for tasks, comments, attachments
  - Custom field search
- **Main Methods**:
  - `createTask()`, `updateTask()`, `getTask()`
  - `searchTasksByCustomField()`
  - `uploadAttachment()`, `addTaskComment()`
  - `validateParentTask()`

### `clickup/formatters.ts`
- **Purpose**: Parse Jira's Atlassian Document Format (ADF) to Markdown
- **Functions**:
  - `parseAdfDescription()` - Convert ADF to markdown
  - `formatJiraComment()` - Format comments with deduplication markers
  - `formatIssueDescription()` - Complete issue description with metadata
- **Features**:
  - Handles paragraphs, headings, lists, code blocks, quotes
  - Preserves text formatting (bold, italic, code, links)
  - Adds structured metadata sections

### `clickup/mappers.ts`
- **Purpose**: Business logic for mapping Jira concepts to ClickUp
- **Functions**:
  - `mapJiraStatusToClickUp()` - Map Jira status to ClickUp status
  - `mapJiraPriorityToClickUp()` - Map priority levels (1-4)
  - `isBugIssueType()` - Detect bug issue types
  - `formatIssueTypeTag()` - Create consistent tags
- **Features**:
  - Custom status mapping support
  - Sensible defaults for common status names

### `clickup/migrator.ts`
- **Purpose**: High-level migration orchestration
- **Key Features**:
  - Idempotent migrations (checks for existing tasks)
  - Parent task validation
  - User email to ID mapping with caching
  - Attachment sync (avoids duplicates)
  - Comment sync with deduplication
  - Force update mode
- **Main Methods**:
  - `migrateIssue()` - Migrate single issue
  - `migrateBulk()` - Migrate multiple issues
  - `validateConnections()` - Check API connectivity
  - `inspectIssue()` - Preview Jira issue

### `clickup/index.ts`
- **Purpose**: Public API surface
- **Exports**: All public classes, functions, and types from the module

## Benefits of Refactoring

1. **Separation of Concerns**
   - API client separate from business logic
   - Formatters isolated for easier testing
   - Mappers contain pure functions

2. **Maintainability**
   - Smaller, focused files (~100-300 lines each)
   - Clear responsibilities
   - Easier to locate and modify functionality

3. **Testability**
   - Pure functions in formatters and mappers are easy to unit test
   - Client can be mocked for testing migrator
   - Clear boundaries for testing

4. **Reusability**
   - Formatters can be used independently
   - Client can be used without migrator
   - Mappers are pure functions

5. **Extensibility**
   - Easy to add new formatters or mappers
   - Clear place for new ClickUp features
   - Can add validators, transformers, etc.

## Migration Path

### Before
```typescript
import { ClickUpClient } from "./clickup-client";
import { JiraToClickUpMigrator } from "./clickup-migrator";
```

### After
```typescript
import { ClickUpClient, JiraToClickUpMigrator } from "./clickup";
```

## Changes Made

1. Created `src/clickup/` folder structure
2. Split `clickup-client.ts` → `client.ts` (core API)
3. Split `clickup-migrator.ts` → 
   - `migrator.ts` (orchestration)
   - `formatters.ts` (ADF parsing)
   - `mappers.ts` (status/priority mapping)
4. Extracted types → `types.ts`
5. Created barrel export → `index.ts`
6. Updated imports in `cli.ts`
7. Removed old files
8. All precommit checks pass ✓
9. Build succeeds ✓

## Code Quality

- ✅ TypeScript strict mode compatible
- ✅ Biome linter passing
- ✅ No breaking changes to public API
- ✅ Maintains all existing functionality
- ✅ Consistent code style
