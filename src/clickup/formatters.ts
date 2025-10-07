import type { JiraComment, JiraIssue } from "../types";

/**
 * Parse Atlassian Document Format (ADF) description to markdown
 */
// biome-ignore lint/suspicious/noExplicitAny: type is dynamic
export function parseAdfDescription(description: any): string {
	if (!description) return "";

	if (typeof description === "string") {
		return description;
	}

	// Parse Atlassian Document Format (ADF)
	if (description.type === "doc" && description.content) {
		return parseAdfNodes(description.content);
	}

	return JSON.stringify(description);
}

/**
 * Parse ADF nodes recursively
 */
// biome-ignore lint/suspicious/noExplicitAny: no type definition available
function parseAdfNodes(nodes: any[]): string {
	let text = "";

	for (const node of nodes) {
		if (node.type === "paragraph") {
			text += `${parseAdfContent(node.content || [])}\n\n`;
		} else if (node.type === "heading") {
			const level = node.attrs?.level || 1;
			const prefix = "#".repeat(level);
			text += `${prefix} ${parseAdfContent(node.content || [])}\n\n`;
		} else if (node.type === "bulletList" || node.type === "orderedList") {
			text += `${parseAdfList(node.content || [], node.type === "orderedList")}\n`;
		} else if (node.type === "codeBlock") {
			const code = parseAdfContent(node.content || []);
			text += `\`\`\`\n${code}\n\`\`\`\n\n`;
		} else if (node.type === "blockquote") {
			const quote = parseAdfContent(node.content || []);
			text += `> ${quote}\n\n`;
		}
	}

	return text.trim();
}

/**
 * Parse ADF content items (text, marks, etc.)
 */
// biome-ignore lint/suspicious/noExplicitAny: no type definition available
function parseAdfContent(content: any[]): string {
	let text = "";

	for (const item of content) {
		if (item.type === "text") {
			let itemText = item.text || "";

			if (item.marks) {
				for (const mark of item.marks) {
					if (mark.type === "strong") {
						itemText = `**${itemText}**`;
					} else if (mark.type === "em") {
						itemText = `*${itemText}*`;
					} else if (mark.type === "code") {
						itemText = `\`${itemText}\``;
					} else if (mark.type === "link") {
						itemText = `[${itemText}](${mark.attrs?.href || ""})`;
					}
				}
			}

			text += itemText;
		} else if (item.type === "hardBreak") {
			text += "\n";
		} else if (item.content) {
			text += parseAdfContent(item.content);
		}
	}

	return text;
}

/**
 * Parse ADF lists (ordered/unordered)
 */
// biome-ignore lint/suspicious/noExplicitAny: no type definition available
function parseAdfList(items: any[], ordered = false): string {
	let text = "";

	items.forEach((item, index) => {
		if (item.type === "listItem") {
			const prefix = ordered ? `${index + 1}.` : "-";
			const content = parseAdfNodes(item.content || []);
			text += `${prefix} ${content}\n`;
		}
	});

	return text;
}

/**
 * Format a Jira comment for ClickUp with deduplication marker
 */
export function formatJiraComment(comment: JiraComment): string {
	const author = comment.author.displayName;
	const date = new Date(comment.created).toLocaleString();
	const body = parseAdfDescription(comment.body);

	// Add a unique identifier to track synced comments
	return `**${author}** (${date}):\n${body}\n\n---\n*[Jira Comment ID: ${comment.id}]*`;
}

/**
 * Format a complete issue description with metadata
 */
export function formatIssueDescription(
	issue: JiraIssue,
	jiraBaseUrl: string,
): string {
	let description = `**Original JIRA Issue:** [${issue.key}](${jiraBaseUrl}/browse/${issue.key})\n\n`;
	description += "---\n\n";

	// Parse ADF description
	const parsedDescription = parseAdfDescription(issue.fields.description);
	if (parsedDescription) {
		description += `${parsedDescription}\n\n---\n\n`;
	}

	// Add metadata
	description += "### JIRA Details\n\n";
	description += `- **Type:** ${issue.fields.issuetype.name}\n`;
	description += `- **Status:** ${issue.fields.status.name}\n`;

	if (issue.fields.priority) {
		description += `- **Priority:** ${issue.fields.priority.name}\n`;
	}

	if (issue.fields.reporter) {
		description += `- **Reporter:** ${issue.fields.reporter.displayName}\n`;
	}

	description += `- **Created:** ${new Date(
		issue.fields.created,
	).toLocaleString()}\n`;
	description += `- **Updated:** ${new Date(
		issue.fields.updated,
	).toLocaleString()}\n`;

	// Add components
	if (issue.fields.components && issue.fields.components.length > 0) {
		const components = issue.fields.components.map((c) => c.name).join(", ");
		description += `- **Components:** ${components}\n`;
	}

	// Add attachments info
	if (issue.fields.attachment && issue.fields.attachment.length > 0) {
		description += "\n### Attachments\n\n";
		for (const attachment of issue.fields.attachment) {
			const sizeKB = Math.round(attachment.size / 1024);
			description += `- [${attachment.filename}](${attachment.content}) (${sizeKB} KB)\n`;
		}
	}

	return description;
}
