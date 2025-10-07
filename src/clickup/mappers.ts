/**
 * Map Jira status to ClickUp status
 */
export function mapJiraStatusToClickUp(
	jiraStatus: string,
	customMapping?: { [key: string]: string },
): string {
	const statusLower = jiraStatus.toLowerCase();

	// Use custom mapping if provided (highest priority)
	if (customMapping?.[jiraStatus]) {
		return customMapping[jiraStatus];
	}

	// Default mapping - adjust these based on your ClickUp list statuses
	// Common ClickUp statuses: "Open", "in progress", "Closed"
	if (
		statusLower.includes("done") ||
		statusLower.includes("closed") ||
		statusLower.includes("resolved")
	) {
		return "Closed";
	}
	if (statusLower.includes("progress") || statusLower.includes("review")) {
		return "in progress";
	}
	if (
		statusLower.includes("todo") ||
		statusLower.includes("open") ||
		statusLower.includes("backlog") ||
		statusLower.includes("new")
	) {
		return "Open";
	}

	// Default to Open for unknown statuses
	return "Open";
}

/**
 * Map Jira priority to ClickUp priority
 */
export function mapJiraPriorityToClickUp(
	jiraPriority?: string,
): number | undefined {
	if (!jiraPriority) return undefined;

	const priorityMap: { [key: string]: number } = {
		Highest: 1,
		High: 2,
		Medium: 3,
		Low: 4,
		Lowest: 4,
	};

	return priorityMap[jiraPriority];
}

/**
 * Check if issue type is a bug
 */
export function isBugIssueType(issueType: string): boolean {
	const type = issueType.toLowerCase().replace(/\s+/g, "-");
	return (
		type === "bug" ||
		type === "defect" ||
		type === "error" ||
		type === "fault" ||
		type === "issue"
	);
}

/**
 * Format issue type as tag
 */
export function formatIssueTypeTag(issueType: string): string {
	return `jira:${issueType.toLowerCase().replace(/\s+/g, "-")}`;
}
