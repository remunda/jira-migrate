import { JiraClient } from "./jira-client";
import { ShortcutClient } from "./shortcut-client";
import type {
	IssueTypeMapping,
	JiraIssue,
	MigrationConfig,
	MigrationResult,
	ShortcutEpic,
	ShortcutStory,
	StatusMapping,
} from "./types";

export class JiraToShortcutMigrator {
	private jiraClient: JiraClient;
	private shortcutClient: ShortcutClient;

	// Default mappings
	private issueTypeMapping: IssueTypeMapping = {
		Epic: "epic",
		Story: "story",
		Task: "story",
		Bug: "story",
		Feature: "story",
		"User Story": "story",
	};

	private statusMapping: StatusMapping = {
		"To Do": "Unstarted",
		"In Progress": "Started",
		Done: "Done",
		Closed: "Done",
		Open: "Unstarted",
		Resolved: "Done",
	};

	constructor(private config: MigrationConfig) {
		this.jiraClient = new JiraClient(this.config);
		this.shortcutClient = new ShortcutClient(this.config);
	}

	async validateConnections(): Promise<{ jira: boolean; shortcut: boolean }> {
		const [jiraValid, shortcutValid] = await Promise.all([
			this.jiraClient.validateConnection(),
			this.shortcutClient.validateConnection(),
		]);

		return { jira: jiraValid, shortcut: shortcutValid };
	}

	async getCurrentIteration(): Promise<any | null> {
		return await this.shortcutClient.getCurrentIteration();
	}

	async inspectIssue(jiraKey: string): Promise<JiraIssue | null> {
		try {
			return await this.jiraClient.getIssue(jiraKey);
		} catch (error: any) {
			console.error(`Failed to fetch JIRA issue: ${error.message}`);
			return null;
		}
	}

	async migrateIssue(
		jiraKey: string,
		iterationId?: number,
	): Promise<MigrationResult> {
		try {
			const jiraIssue = await this.jiraClient.getIssue(jiraKey);
			const issueType = jiraIssue.fields.issuetype.name;
			const targetType = this.issueTypeMapping[issueType];

			if (!targetType) {
				return {
					success: false,
					jiraKey,
					error: `Unsupported issue type: ${issueType}`,
				};
			}

			if (targetType === "epic") {
				return await this.migrateAsEpic(jiraIssue);
			} else {
				return await this.migrateAsStory(jiraIssue, iterationId);
			}
		} catch (error: any) {
			return {
				success: false,
				jiraKey,
				error: error.message,
			};
		}
	}

	private async migrateAsEpic(jiraIssue: JiraIssue): Promise<MigrationResult> {
		const epic: ShortcutEpic = {
			name: jiraIssue.fields.summary,
			description: this.formatDescription(jiraIssue),
			state: this.mapEpicState(jiraIssue.fields.status.name),
			external_id: jiraIssue.key,
		};

		// Add labels including JIRA issue type
		const labels: Array<{ name: string }> = [];

		// Add JIRA issue type as a tag with format jira:<type>
		const issueTypeTag = `jira:${jiraIssue.fields.issuetype.name.toLowerCase().replace(/\s+/g, "-")}`;
		labels.push({ name: issueTypeTag });

		// Add existing JIRA labels
		if (jiraIssue.fields.labels.length > 0) {
			labels.push(...jiraIssue.fields.labels.map((label) => ({ name: label })));
		}

		if (labels.length > 0) {
			epic.labels = labels;
		}

		// Try to map assignee
		if (jiraIssue.fields.assignee?.emailAddress) {
			const member = await this.shortcutClient.findMemberByEmail(
				jiraIssue.fields.assignee.emailAddress,
			);
			if (member) {
				epic.owner_ids = [member.id];
			}
		}

		// Check if epic already exists
		const existing = await this.shortcutClient.findEpicByExternalId(
			jiraIssue.key,
		);
		let result;

		if (existing) {
			console.log(
				`Updating existing epic ID ${existing.id} for ${jiraIssue.key}`,
			);
			// Update existing epic - remove external_id as it can't be updated
			const { external_id, ...updateData } = epic;
			result = await this.shortcutClient.updateEpic(existing.id, updateData);
		} else {
			console.log(`Creating new epic for ${jiraIssue.key}`);
			// Create new epic
			result = await this.shortcutClient.createEpic(epic);
		}

		return {
			success: true,
			jiraKey: jiraIssue.key,
			shortcutId: result.id,
			shortcutUrl: result.app_url,
		};
	}

	private async migrateAsStory(
		jiraIssue: JiraIssue,
		iterationId?: number,
	): Promise<MigrationResult> {
		const story: ShortcutStory = {
			name: jiraIssue.fields.summary,
			description: this.formatDescription(jiraIssue),
			story_type: this.mapStoryType(jiraIssue.fields.issuetype.name),
			external_id: jiraIssue.key,
		};

		// Add iteration if specified
		if (iterationId) {
			story.iteration_id = iterationId;
		}

		// Add labels including JIRA issue type
		const labels: Array<{ name: string }> = [];

		// Add JIRA issue type as a tag with format jira:<type>
		const issueTypeTag = `jira:${jiraIssue.fields.issuetype.name.toLowerCase().replace(/\s+/g, "-")}`;
		labels.push({ name: issueTypeTag });

		// Add existing JIRA labels
		if (jiraIssue.fields.labels.length > 0) {
			labels.push(...jiraIssue.fields.labels.map((label) => ({ name: label })));
		}

		if (labels.length > 0) {
			story.labels = labels;
		}

		// Try to map workflow state
		const mappedStateName =
			this.statusMapping[jiraIssue.fields.status.name] || "Unstarted";
		let workflowState =
			await this.shortcutClient.findWorkflowStateByName(mappedStateName);

		// If not found, try to get the first available workflow state
		if (!workflowState) {
			const allStates = await this.shortcutClient.getWorkflowStates();
			if (allStates.length > 0) {
				workflowState = allStates[0];
			}
		}

		if (workflowState) {
			story.workflow_state_id = workflowState.id;
		}

		// Try to map assignee
		if (jiraIssue.fields.assignee?.emailAddress) {
			const member = await this.shortcutClient.findMemberByEmail(
				jiraIssue.fields.assignee.emailAddress,
			);
			if (member) {
				story.owner_ids = [member.id];
			}
		}

		// Check if story already exists
		const existing = await this.shortcutClient.findStoryByExternalId(
			jiraIssue.key,
		);
		let result: ShortcutStoryResponse | null;

		if (existing) {
			console.log(
				`Updating existing story ID ${existing.id} for ${jiraIssue.key}`,
			);
			// Update existing story - remove external_id as it can't be updated
			const { external_id, ...updateData } = story;
			result = await this.shortcutClient.updateStory(existing.id, updateData);
		} else {
			console.log(`Creating new story for ${jiraIssue.key}`);
			// Create new story
			result = await this.shortcutClient.createStory(story);
		}

		return {
			success: true,
			jiraKey: jiraIssue.key,
			shortcutId: result.id,
			shortcutUrl: result.app_url,
		};
	}

	private convertADFToText(adf: any): string {
		if (!adf) return "";

		// If it's already a string, return it
		if (typeof adf === "string") return adf;

		// Handle ADF (Atlassian Document Format)
		if (adf.type === "doc" && adf.content) {
			return this.processADFContent(adf.content);
		}

		return "";
	}

	private processADFContent(content: any[]): string {
		let text = "";

		for (const node of content) {
			if (node.type === "paragraph") {
				if (node.content) {
					text += `${this.processADFContent(node.content)}\n\n`;
				} else {
					text += "\n";
				}
			} else if (node.type === "text") {
				let nodeText = node.text || "";

				// Apply marks (bold, italic, etc.)
				if (node.marks) {
					for (const mark of node.marks) {
						if (mark.type === "strong") {
							nodeText = `**${nodeText}**`;
						} else if (mark.type === "em") {
							nodeText = `*${nodeText}*`;
						} else if (mark.type === "code") {
							nodeText = `\`${nodeText}\``;
						} else if (mark.type === "link") {
							nodeText = `[${nodeText}](${mark.attrs?.href || ""})`;
						}
					}
				}

				text += nodeText;
			} else if (node.type === "heading") {
				const level = node.attrs?.level || 1;
				const prefix = "#".repeat(level);
				text += `${prefix} ${this.processADFContent(node.content || [])}\n\n`;
			} else if (node.type === "bulletList" || node.type === "orderedList") {
				text += `${this.processListContent(
					node.content || [],
					node.type === "orderedList",
				)}\n`;
			} else if (node.type === "listItem") {
				text += this.processADFContent(node.content || []);
			} else if (node.type === "codeBlock") {
				const code = this.processADFContent(node.content || []);
				text += `\`\`\`\n${code}\`\`\`\n\n`;
			} else if (node.type === "blockquote") {
				const content = this.processADFContent(node.content || []);
				text += `${content
					.split("\n")
					.map((line) => `> ${line}`)
					.join("\n")}\n\n`;
			} else if (node.type === "hardBreak") {
				text += "\n";
			}
		}

		return text;
	}

	private processListContent(items: any[], ordered: boolean): string {
		let text = "";
		items.forEach((item, index) => {
			const prefix = ordered ? `${index + 1}. ` : "- ";
			const content = this.processADFContent(item.content || []).trim();
			text += `${prefix}${content}\n`;
		});
		return text;
	}

	private formatDescription(jiraIssue: JiraIssue): string {
		let description = `**Migrated from JIRA: ${jiraIssue.key}**\n\n`;

		if (jiraIssue.fields.description) {
			const descText = this.convertADFToText(jiraIssue.fields.description);
			if (descText.trim()) {
				description += `${descText}\n\n`;
			}
		}

		description += `**Original Details:**\n`;
		description += `- Type: ${jiraIssue.fields.issuetype.name}\n`;
		description += `- Status: ${jiraIssue.fields.status.name}\n`;

		if (jiraIssue.fields.priority) {
			description += `- Priority: ${jiraIssue.fields.priority.name}\n`;
		}

		if (jiraIssue.fields.reporter) {
			description += `- Reporter: ${jiraIssue.fields.reporter.displayName}\n`;
		}

		description += `- Created: ${new Date(jiraIssue.fields.created).toLocaleDateString()}\n`;
		description += `- Updated: ${new Date(jiraIssue.fields.updated).toLocaleDateString()}\n`;

		if (jiraIssue.fields.components.length > 0) {
			description += `- Components: ${jiraIssue.fields.components.map((c) => c.name).join(", ")}\n`;
		}

		// Add attachments information
		if (jiraIssue.fields.attachment && jiraIssue.fields.attachment.length > 0) {
			description += `\n**Attachments (${jiraIssue.fields.attachment.length}):**\n`;
			for (const att of jiraIssue.fields.attachment) {
				const sizeKB = (att.size / 1024).toFixed(2);
				description += `- [${att.filename}](${att.content}) (${sizeKB} KB)\n`;
			}
		}

		return description;
	}

	private mapEpicState(jiraStatus: string): "to do" | "in progress" | "done" {
		const status = jiraStatus.toLowerCase();
		if (
			status.includes("done") ||
			status.includes("closed") ||
			status.includes("resolved")
		) {
			return "done";
		}
		if (status.includes("progress") || status.includes("review")) {
			return "in progress";
		}
		return "to do";
	}

	private mapStoryType(jiraIssueType: string): "feature" | "bug" | "chore" {
		const type = jiraIssueType.toLowerCase();
		if (type.includes("bug") || type.includes("defect")) {
			return "bug";
		}
		if (type.includes("task") || type.includes("chore")) {
			return "chore";
		}
		return "feature";
	}

	async migrateBulk(
		jiraKeys: string[],
		iterationId?: number,
	): Promise<MigrationResult[]> {
		const results: MigrationResult[] = [];

		for (const key of jiraKeys) {
			const result = await this.migrateIssue(key, iterationId);
			results.push(result);

			// Add small delay to avoid rate limiting
			await new Promise<void>((resolve) => setTimeout(resolve, 100));
		}

		return results;
	}
}
