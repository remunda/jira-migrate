import axios, { type AxiosInstance } from "axios";
import type { JiraComment, JiraIssue, MigrationConfig } from "./types";

export class JiraClient {
	private client: AxiosInstance;
	private config: MigrationConfig;

	constructor(config: MigrationConfig) {
		this.config = config;
		this.client = axios.create({
			baseURL: `${config.jiraBaseUrl}/rest/api/3`,
			auth: {
				username: config.jiraEmail,
				password: config.jiraApiToken,
			},
			headers: {
				Accept: "application/json",
				"Content-Type": "application/json",
			},
		});
	}

	async getIssue(
		issueKey: string,
		includeComments: boolean = false,
	): Promise<JiraIssue> {
		try {
			const fields = [
				"summary",
				"description",
				"issuetype",
				"status",
				"priority",
				"assignee",
				"reporter",
				"created",
				"updated",
				"labels",
				"components",
				"parent",
				"subtasks",
				"attachment",
			];

			if (includeComments) {
				fields.push("comment");
			}

			const response = await this.client.get(`/issue/${issueKey}`, {
				params: {
					expand: "names,schema",
					fields: fields.join(","),
				},
			});

			return response.data;
		} catch (error: unknown) {
			if (
				error instanceof Error &&
				(error as { response?: { status?: number } }).response?.status === 404
			) {
				throw new Error(`JIRA issue ${issueKey} not found`);
			}
			const errorMessage =
				error instanceof Error ? error.message : String(error);
			throw new Error(
				`Failed to fetch JIRA issue ${issueKey}: ${errorMessage}`,
			);
		}
	}
	async getIssuesByJQL(
		jql: string,
		maxResults: number = 50,
	): Promise<JiraIssue[]> {
		try {
			const response = await this.client.post("/search", {
				jql,
				maxResults,
				fields: [
					"summary",
					"description",
					"issuetype",
					"status",
					"priority",
					"assignee",
					"reporter",
					"created",
					"updated",
					"labels",
					"components",
					"parent",
					"subtasks",
					"attachment",
				],
			});

			return response.data.issues;
		} catch (error: unknown) {
			const errorMessage =
				error instanceof Error ? error.message : String(error);
			throw new Error(`Failed to search JIRA issues: ${errorMessage}`);
		}
	}
	async validateConnection(): Promise<boolean> {
		try {
			await this.client.get("/myself");
			return true;
		} catch (_error) {
			return false;
		}
	}

	async downloadAttachment(url: string): Promise<Buffer> {
		try {
			const response = await axios.get(url, {
				auth: {
					username: this.config.jiraEmail,
					password: this.config.jiraApiToken,
				},
				responseType: "arraybuffer",
			});
			return Buffer.from(response.data);
		} catch (error: unknown) {
			const errorMessage =
				error instanceof Error ? error.message : String(error);
			throw new Error(
				`Failed to download attachment from ${url}: ${errorMessage}`,
			);
		}
	}

	async getComments(issueKey: string): Promise<JiraComment[]> {
		try {
			const response = await this.client.get(`/issue/${issueKey}/comment`);
			return response.data.comments || [];
		} catch (error: unknown) {
			const errorMessage =
				error instanceof Error ? error.message : String(error);
			throw new Error(
				`Failed to fetch comments for ${issueKey}: ${errorMessage}`,
			);
		}
	}
}
