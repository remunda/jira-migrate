import { JiraClient } from "../jira-client";
import type { JiraIssue, MigrationConfig } from "../types";
import { ClickUpClient } from "./client";
import { formatIssueDescription, formatJiraComment } from "./formatters";
import {
	formatIssueTypeTag,
	isBugIssueType,
	mapJiraPriorityToClickUp,
	mapJiraStatusToClickUp,
} from "./mappers";
import type {
	ClickUpMigrationResult,
	ClickUpTask,
	CreateTaskPayload,
	UpdateTaskPayload,
} from "./types";

export class JiraToClickUpMigrator {
	private jiraClient: JiraClient;
	private clickupClient: ClickUpClient;
	private config: MigrationConfig;
	private userCache: Map<string, number> = new Map();

	constructor(config: MigrationConfig) {
		this.config = config;
		this.jiraClient = new JiraClient(config);

		if (
			!config.clickupApiToken ||
			!config.clickupTeamId ||
			!config.clickupSpaceId ||
			!config.clickupListId
		) {
			throw new Error("ClickUp configuration is missing");
		}

		this.clickupClient = new ClickUpClient(
			config.clickupApiToken,
			config.clickupTeamId,
			config.clickupSpaceId,
			config.clickupListId,
			config.clickupExternalIdFieldId,
		);
	}

	async validateConnections(): Promise<{ jira: boolean; clickup: boolean }> {
		const jiraValid = await this.jiraClient.validateConnection();
		const clickupValid = await this.clickupClient.validateConnection();

		return {
			jira: jiraValid,
			clickup: clickupValid,
		};
	}

	async inspectIssue(jiraKey: string): Promise<JiraIssue | null> {
		return this.jiraClient.getIssue(jiraKey);
	}

	private async findClickUpUserIdByEmail(
		email: string,
	): Promise<number | undefined> {
		if (this.userCache.has(email)) {
			return this.userCache.get(email);
		}

		try {
			const members = await this.clickupClient.getTeamMembers();
			const user = members.find(
				(m) => m.email.toLowerCase() === email.toLowerCase(),
			);

			if (user) {
				this.userCache.set(email, user.id);
				return user.id;
			}
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : "";
			console.error(
				`Error finding ClickUp user by email ${email}:`,
				errorMessage,
			);
		}

		return undefined;
	}

	async migrateIssue(
		jiraKey: string,
		listId?: string,
		parentTaskId?: string,
		forceUpdate?: boolean,
		syncComments?: boolean,
	): Promise<ClickUpMigrationResult> {
		try {
			// Include comments if sync is enabled or configured (default: true)
			const shouldSyncComments =
				syncComments ?? this.config.clickupSyncComments ?? true;
			const issue = await this.jiraClient.getIssue(jiraKey, shouldSyncComments);

			if (!issue) {
				return {
					success: false,
					jiraKey,
					error: "JIRA issue not found",
				};
			}

			const targetListId = listId || this.config.clickupListId;

			// Validate parent task if specified (only use explicitly provided parentTaskId)
			if (parentTaskId) {
				const validation = await this.clickupClient.validateParentTask(
					parentTaskId,
					targetListId,
				);
				if (!validation.valid) {
					return {
						success: false,
						jiraKey,
						error: `Parent task validation failed: ${validation.error}`,
					};
				}
				console.log(
					`✓ Parent task validated: ${validation.task?.name} (${parentTaskId})`,
				);
			}

			// Check if task already exists (idempotent migration)
			let existingTask: ClickUpTask | undefined;
			if (this.config.clickupExternalIdFieldId) {
				console.log(
					`Searching for task with external-id: ${issue.key} (field: ${this.config.clickupExternalIdFieldId})`,
				);
				const existingTasks = await this.clickupClient.searchTasksByCustomField(
					issue.key,
				);
				console.log(`Search returned ${existingTasks.length} task(s)`);
				if (existingTasks.length > 0) {
					existingTask = existingTasks[0];
					console.log(
						`Found existing task: ${existingTask.id} - ${existingTask.name}`,
					);
					if (existingTasks.length > 1) {
						console.warn(
							`Warning: Multiple tasks found with external-id ${issue.key}, using the first one`,
						);
					}
				} else {
					console.log(`No task found with external-id: ${issue.key}`);

					// If force update is enabled but no existing task found, skip creation
					if (forceUpdate) {
						return {
							success: false,
							jiraKey: issue.key,
							error: "Force update mode: no existing task found to update",
						};
					}
				}
			} else {
				console.log(
					"External ID field not configured - will always create new tasks",
				);
			}

			const description = formatIssueDescription(
				issue,
				this.config.jiraBaseUrl,
			);

			// Find assignee
			let assigneeIds: number[] = [];
			if (issue.fields.assignee?.emailAddress) {
				const userId = await this.findClickUpUserIdByEmail(
					issue.fields.assignee.emailAddress,
				);
				if (userId) {
					assigneeIds = [userId];
				}
			}

			const issueType = issue.fields.issuetype.name;

			if (existingTask) {
				// Update existing task
				return await this.updateExistingTask(
					existingTask,
					issue,
					description,
					assigneeIds,
					issueType,
					shouldSyncComments,
				);
			} else {
				// Create new task
				return await this.createNewTask(
					issue,
					description,
					assigneeIds,
					issueType,
					parentTaskId,
					shouldSyncComments,
				);
			}
		} catch (error: unknown) {
			const errorMessage =
				error instanceof Error ? error.message : String(error);
			return {
				success: false,
				jiraKey,
				error: errorMessage,
			};
		}
	}

	private async updateExistingTask(
		existingTask: ClickUpTask,
		issue: JiraIssue,
		description: string,
		assigneeIds: number[],
		issueType: string,
		shouldSyncComments: boolean,
	): Promise<ClickUpMigrationResult> {
		console.log(
			`Updating existing task ID ${existingTask.id} for ${issue.key}`,
		);

		const updatePayload: UpdateTaskPayload = {
			name: `${issue.fields.summary}`,
			description: description,
			status: mapJiraStatusToClickUp(
				issue.fields.status.name,
				this.config.clickupStatusMapping,
			),
		};

		if (isBugIssueType(issueType)) {
			updatePayload.custom_item_id = 1001; // Assuming 1001 is the ID for "Bug" task type
			console.log("Setting task type to Bug");
		}

		if (issue.fields.priority) {
			updatePayload.priority = mapJiraPriorityToClickUp(
				issue.fields.priority.name,
			);
		}

		if (assigneeIds.length > 0) {
			updatePayload.assignees = { add: assigneeIds };
		}

		const updatedTask = await this.clickupClient.updateTask(
			existingTask.id,
			updatePayload,
		);

		// Upload attachments only if they don't already exist
		await this.syncAttachments(updatedTask.id, issue, updatedTask.attachments);

		// Sync comments if enabled
		if (shouldSyncComments) {
			await this.syncComments(updatedTask.id, issue);
		}

		return {
			success: true,
			jiraKey: issue.key,
			clickupUrl: updatedTask.url,
			clickupId: updatedTask.id,
			wasUpdate: true,
		};
	}

	private async createNewTask(
		issue: JiraIssue,
		description: string,
		assigneeIds: number[],
		issueType: string,
		parentTaskId: string | undefined,
		shouldSyncComments: boolean,
	): Promise<ClickUpMigrationResult> {
		console.log(`Creating new task for ${issue.key}`);

		// Prepare tags: add JIRA issue type tag
		const tags = [];
		const issueTypeTag = formatIssueTypeTag(issueType);
		tags.push(issueTypeTag);
		tags.push(...(issue.fields.labels || []));

		const payload: CreateTaskPayload = {
			name: `${issue.fields.summary}`,
			description: description,
			status: mapJiraStatusToClickUp(
				issue.fields.status.name,
				this.config.clickupStatusMapping,
			),
			tags: tags,
			assignees: assigneeIds,
		};

		if (issue.fields.priority) {
			payload.priority = mapJiraPriorityToClickUp(issue.fields.priority.name);
		}

		// Add parent task only if explicitly specified as parameter
		if (parentTaskId) {
			payload.parent = parentTaskId;
			console.log(`Assigning to parent task: ${parentTaskId}`);
		}

		// Add custom field for external ID if configured
		if (this.config.clickupExternalIdFieldId) {
			payload.custom_fields = [
				{
					id: this.config.clickupExternalIdFieldId,
					value: issue.key,
				},
			];
		}

		const task = await this.clickupClient.createTask(payload);

		// Upload attachments if any
		await this.syncAttachments(task.id, issue);

		// Sync comments if enabled
		if (shouldSyncComments) {
			await this.syncComments(task.id, issue);
		}

		return {
			success: true,
			jiraKey: issue.key,
			clickupUrl: task.url,
			clickupId: task.id,
			wasUpdate: false,
		};
	}

	private async syncAttachments(
		taskId: string,
		issue: JiraIssue,
		existingAttachments?: Array<{ title: string }>,
	): Promise<void> {
		if (!issue.fields.attachment || issue.fields.attachment.length === 0) {
			return;
		}

		const existingAttachmentNames = new Set(
			(existingAttachments || []).map((a) => a.title),
		);

		const newAttachments = issue.fields.attachment.filter(
			(att) => !existingAttachmentNames.has(att.filename),
		);

		if (newAttachments.length === 0) {
			if (existingAttachments && existingAttachments.length > 0) {
				console.log(
					`All ${existingAttachments.length} attachment(s) already exist, skipping upload`,
				);
			}
			return;
		}

		console.log(
			`Uploading ${newAttachments.length} new attachment(s) (${existingAttachments?.length || 0} already exist)...`,
		);

		for (const attachment of newAttachments) {
			try {
				console.log(`  - Downloading ${attachment.filename}...`);
				const fileBuffer = await this.jiraClient.downloadAttachment(
					attachment.content,
				);
				console.log(`  - Uploading ${attachment.filename} to ClickUp...`);
				await this.clickupClient.uploadAttachment(
					taskId,
					fileBuffer,
					attachment.filename,
				);
				console.log(`  ✓ ${attachment.filename} uploaded`);
			} catch (error: unknown) {
				const errorMessage =
					error instanceof Error ? error.message : String(error);
				console.error(
					`  ✗ Failed to upload ${attachment.filename}: ${errorMessage}`,
				);
			}
		}
	}

	private async syncComments(taskId: string, issue: JiraIssue): Promise<void> {
		const comments = issue.fields.comment?.comments;
		if (!comments || comments.length === 0) {
			return;
		}

		console.log(`Syncing ${comments.length} comment(s)...`);

		// Get existing ClickUp comments to avoid duplication
		const existingClickUpComments =
			await this.clickupClient.getTaskComments(taskId);

		// Extract Jira comment IDs from existing ClickUp comments
		const syncedJiraCommentIds = new Set<string>();
		for (const clickupComment of existingClickUpComments) {
			const match = clickupComment.comment_text.match(
				/\[Jira Comment ID: ([^\]]+)\]/,
			);
			if (match) {
				syncedJiraCommentIds.add(match[1]);
			}
		}

		// Only sync comments that haven't been synced yet
		let syncedCount = 0;
		let skippedCount = 0;

		for (const comment of comments) {
			if (syncedJiraCommentIds.has(comment.id)) {
				skippedCount++;
				continue;
			}

			try {
				const formattedComment = formatJiraComment(comment);
				await this.clickupClient.addTaskComment(taskId, formattedComment);
				syncedCount++;
				console.log(`  ✓ Synced comment from ${comment.author.displayName}`);
			} catch (error: unknown) {
				const errorMessage =
					error instanceof Error ? error.message : String(error);
				console.error(`  ✗ Failed to sync comment: ${errorMessage}`);
			}
		}

		if (skippedCount > 0) {
			console.log(`  ℹ Skipped ${skippedCount} already synced comment(s)`);
		}
		console.log(`  ✓ Synced ${syncedCount} new comment(s)`);
	}

	async migrateBulk(
		jiraKeys: string[],
		listId?: string,
		parentTaskId?: string,
		forceUpdate?: boolean,
		syncComments?: boolean,
	): Promise<ClickUpMigrationResult[]> {
		const results: ClickUpMigrationResult[] = [];

		for (const jiraKey of jiraKeys) {
			const result = await this.migrateIssue(
				jiraKey,
				listId,
				parentTaskId,
				forceUpdate,
				syncComments,
			);
			results.push(result);

			// Add a small delay to avoid rate limiting (ClickUp has 100 requests/minute limit)
			await new Promise((resolve) => setTimeout(resolve, 1000));
		}

		return results;
	}

	async getCurrentList() {
		return this.clickupClient.getList(this.clickupClient.getDefaultListId());
	}
}
