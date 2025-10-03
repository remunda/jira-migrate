# Changelog

## [2.0.0] - 2025-10-03

### Added - ClickUp Support
- ✅ **Full ClickUp migration support**
  - Create tasks in ClickUp from JIRA issues
  - Update existing tasks (idempotent migration via custom field)
  - Search for existing tasks using custom field for external ID
  - Map JIRA users to ClickUp users by email
  - Priority mapping (Highest=1, High=2, Medium=3, Low=4)
  - Status mapping with customizable defaults
  - Tags migration (JIRA labels → ClickUp tags)

### Added - Multi-Platform Architecture
- ✅ **TARGET_PLATFORM configuration**
  - Choose between 'shortcut' or 'clickup' in .env
  - Platform-specific command options
  - Unified CLI interface for both platforms
  - Automatic platform detection and validation

### Added - Platform-Specific Options
- ✅ **ClickUp-specific flags**
  - `--list <id>` - Assign to specific ClickUp list
  - Custom field support for external ID storage
  - Idempotent migration support with custom fields

### Improved - Documentation
- ✅ **Comprehensive ClickUp documentation**
  - New CLICKUP_SUPPORT.md guide
  - Setup instructions for ClickUp API
  - Configuration examples
  - Migration workflows and examples

### Technical
- New ClickUpClient class for API interactions
- New JiraToClickUpMigrator for ClickUp-specific migration logic
- Updated configuration to support both platforms
- Platform-agnostic CLI command structure
- Shared JIRA client and ADF parsing logic

## [1.0.0] - 2025-10-02

### Added - Epic Support
- ✅ **Full support for JIRA Epics**
  - Creating new epics in Shortcut
  - Updating existing epics (idempotent migration)
  - Searching for epics using Shortcut Search API with `external-id:` operator
  - Epic states mapping: 'to do' / 'in progress' / 'done'

### Added - Iteration Support
- ✅ **Assigning stories to iterations**
  - `--current-iteration` / `-c` - automatically finds and assigns to currently running iteration
  - `--iteration <id>` / `-i <id>` - assigns to specific iteration by ID
  - Works for both single and bulk migrations
  - Epics cannot be assigned to iterations (stories only)

### Added - Inspect Command
- ✅ **New `inspect` command**
  - Shows JIRA issue details before migration
  - Displays type (Epic vs Story), status, assignee, labels
  - Shows how the item will be migrated
  - Usage: `yarn dev inspect PROJ-123`

### Improved - Search Implementation
- ✅ **Improved searching for existing items**
  - Stories: Uses `/search/stories` with `external-id:` operator
  - Epics: Uses `/search/epics` with `external-id:` operator
  - More efficient than previous approach (loading all items)
  - Correct syntax per Shortcut documentation (dash instead of underscore)

### Improved - Idempotent Migration
- ✅ **Re-running updates instead of duplicating**
  - Searches for existing story/epic by external_id
  - If exists, performs update
  - If doesn't exist, creates new
  - External_id is preserved (cannot be changed during update)

### Improved - Description Parsing
- ✅ **Complete Atlassian Document Format (ADF) support**
  - Converting ADF to plain text
  - Support for paragraphs, headings, lists, code blocks
  - Support for inline formatting (bold, italic, code, links)
  - Preserving document structure

### Improved - Attachment Information
- ✅ **JIRA attachments information in description**
  - List of all attachments with links
  - File sizes in KB
  - Active links to original JIRA files

### Fixed
- ✅ **Fixed update operations**
  - External_id is not sent during update (API doesn't accept it)
  - Proper object destructuring before update
  - Consistent behavior for both stories and epics

### Technical
- TypeScript strict mode
- Modular structure (clients, migrator, CLI)
- Complete type definitions
- Error handling and logging
- Rate limiting protection

## Usage Examples

### Epic migration
```bash
# Inspect epic
yarn dev inspect EPIC-42

# Create new epic
yarn dev migrate EPIC-42

# Update existing epic (run again)
yarn dev migrate EPIC-42
```

### Story migration with iteration
```bash
# To current iteration
yarn dev migrate STORY-123 --current-iteration

# To specific iteration
yarn dev migrate STORY-123 --iteration 58

# Bulk to current iteration
yarn dev bulk --keys STORY-1 STORY-2 --current-iteration
```

### Re-migration (update)
```bash
# Repeated migration updates existing items
yarn dev migrate EPIC-42    # Update epic
yarn dev migrate STORY-123  # Update story

# Also works for bulk
yarn dev bulk --file keys.txt  # Updates all existing
```

## Migration Behavior

### On first migration:
1. Searches for existing item by external_id
2. When not found → creates new
3. Sets external_id to JIRA key

### On re-migration:
1. Searches for existing item by external_id
2. When found → performs update
3. Updates: name, description, state/workflow, labels, owners, iteration

### What is NOT updated:
- External_id (cannot be changed)
- Created_at (historical data)
- ID (immutable)

## Known Limitations

- Epics cannot be assigned to iterations (API limitation)
- Attachments are not transferred automatically (only links in description)
- Sub-tasks are not yet supported
- Comments are not transferred

## Future Enhancements

- [ ] Support for sub-tasks
- [ ] Comment migration
- [ ] Story links/dependencies migration
- [ ] Automatic attachment upload
- [ ] Custom field mapping
- [ ] Progress reporting for bulk migrations
- [ ] Resume capability for interrupted bulk migrations
