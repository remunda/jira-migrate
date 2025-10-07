import axios, { type AxiosInstance } from "axios";

export interface ClickUpTask {
	id: string;
	name: string;
	description: string;
	status: {
		status: string;
		type: string;
	};
	assignees: Array<{ id: number; username: string; email: string }>;
	tags: Array<{ name: string; tag_fg: string; tag_bg: string }>;
	url: string;
	list?: {
		id: string;
		name: string;
	};
	custom_fields?: Array<{
		id: string;
		name: string;
		// biome-ignore lint/suspicious/noExplicitAny: any needed for dynamic custom field values
		value: any;
	}>;
	priority?: {
		id: string;
		priority: string;
		color: string;
	};
	attachments?: Array<{
		id: string;
		title: string;
		url: string;
	}>;
}

export interface ClickUpList {
	id: string;
	name: string;
	statuses: Array<{
		status: string;
		type: string;
		orderindex: number;
	}>;
}

export interface ClickUpSpace {
	id: string;
	name: string;
}

export interface ClickUpUser {
	id: number;
	username: string;
	email: string;
}

export interface ClickUpComment {
	id: string;
	comment_text: string;
	user: {
		id: number;
		username: string;
	};
	date: string;
}

export interface CreateTaskPayload {
	name: string;
	description?: string;
	status?: string;
	assignees?: number[];
	tags?: string[];
	priority?: number;
	parent?: string;
	custom_fields?: Array<{
		id: string;
		// biome-ignore lint/suspicious/noExplicitAny: any needed for dynamic custom field values
		value: any;
	}>;
}

export interface UpdateTaskPayload {
	name?: string;
	description?: string;
	status?: string;
	assignees?: {
		add?: number[];
		rem?: number[];
	};
	tags?: string[];
	priority?: number;
	custom_item_id?: number; // Task type
}

export class ClickUpClient {
	private client: AxiosInstance;
	private teamId: string;
	private spaceId: string;
	private listId: string;
	private customFieldIdForExternalId?: string;

	constructor(
		apiToken: string,
		teamId: string,
		spaceId: string,
		listId: string,
		customFieldIdForExternalId?: string,
	) {
		this.client = axios.create({
			baseURL: "https://api.clickup.com/api/v2",
			headers: {
				Authorization: apiToken,
				"Content-Type": "application/json",
			},
		});
		this.teamId = teamId;
		this.spaceId = spaceId;
		this.listId = listId;
		this.customFieldIdForExternalId = customFieldIdForExternalId;
	}

	public getSpaceId(): string {
		return this.spaceId;
	}

	private async retryWithBackoff<T>(
		fn: () => Promise<T>,
		maxRetries: number = 5,
		initialDelayMs: number = 2000,
	): Promise<T> {
		// biome-ignore lint/suspicious/noExplicitAny: any needed for error handling
		let lastError: any;

		for (let attempt = 0; attempt <= maxRetries; attempt++) {
			try {
				return await fn();
				// biome-ignore lint/suspicious/noExplicitAny: any needed for error handling
			} catch (error: any) {
				lastError = error;

				// Check if it's a rate limit error
				const isRateLimit =
					error.response?.status === 429 ||
					error.response?.data?.err === "Rate limit reached" ||
					error.response?.data?.ECODE === "APP_002";

				if (isRateLimit && attempt < maxRetries) {
					const headers = error.response?.headers || {};

					const rateLimitReset = headers["x-ratelimit-reset"];

					let delayMs = initialDelayMs * 2 ** attempt;

					// If we have rate limit headers, use them for precise timing
					if (rateLimitReset) {
						const resetTime = parseInt(rateLimitReset, 10) * 1000; // Convert to milliseconds
						const now = Date.now();
						const waitTimeMs = resetTime - now;

						if (waitTimeMs > 0) {
							const waitTimeMinutes = waitTimeMs / 60000;

							// If wait time is more than 1 minute, exit with error message
							if (waitTimeMinutes > 1) {
								const resetDate = new Date(resetTime);
								const formattedTime = resetDate.toLocaleTimeString();
								const formattedDate = resetDate.toLocaleDateString();

								throw new Error(
									`Rate limit exceeded. Please wait until ${formattedTime} on ${formattedDate} (${Math.ceil(
										waitTimeMinutes,
									)} minutes) before retrying.`,
								);
							}

							// Use the exact wait time from the header
							delayMs = waitTimeMs + 1000; // Add 1 second buffer
							console.warn(
								`⚠️  Rate limit reached. Waiting ${Math.ceil(
									waitTimeMs / 1000,
								)}s until reset at ${new Date(
									resetTime,
								).toLocaleTimeString()}...`,
							);
						}
					} else {
						console.warn(
							`⚠️  Rate limit reached. Waiting ${
								delayMs / 1000
							}s before retry (attempt ${attempt + 1}/${maxRetries})...`,
						);
					}

					await new Promise((resolve) => setTimeout(resolve, delayMs));
					continue;
				}

				// If it's not a rate limit error or we've exhausted retries, throw
				throw error;
			}
		}

		throw lastError;
	}

	async validateConnection(): Promise<boolean> {
		try {
			await this.client.get("/user");
			return true;
		} catch (_error) {
			return false;
		}
	}

	async createTask(payload: CreateTaskPayload): Promise<ClickUpTask> {
		return this.retryWithBackoff(async () => {
			try {
				console.log(
					"Creating task with payload:",
					JSON.stringify(payload, null, 2),
				);

				const response = await this.client.post(
					`/list/${this.listId}/task`,
					payload,
				);
				return response.data;
				// biome-ignore lint/suspicious/noExplicitAny: any needed for error handling
			} catch (error: any) {
				console.error(
					"ClickUp API Error:",
					error.message,
					error.response?.data,
				);
				console.error("Payload that failed:", JSON.stringify(payload, null, 2));
				throw error;
			}
		});
	}

	async getTask(taskId: string): Promise<ClickUpTask> {
		const response = await this.client.get(`/task/${taskId}`);
		return response.data;
	}

	async validateParentTask(
		parentTaskId: string,
		targetListId?: string,
	): Promise<{ valid: boolean; error?: string; task?: ClickUpTask }> {
		try {
			const task = await this.getTask(parentTaskId);
			const effectiveListId = targetListId || this.listId;

			// Check if parent task is in the same list
			if (task.list?.id !== effectiveListId) {
				return {
					valid: false,
					error: `Parent task (${parentTaskId}) is in list "${task.list?.name}" (${task.list?.id}) but you're creating tasks in list ${effectiveListId}. Parent and child tasks must be in the same list.`,
					task,
				};
			}

			return { valid: true, task };
			// biome-ignore lint/suspicious/noExplicitAny: any needed for error handling
		} catch (error: any) {
			const errorMessage = error.response?.data?.err || error.message;

			return {
				valid: false,
				error: `Failed to validate parent task ${parentTaskId}: ${errorMessage}`,
			};
		}
	}

	async updateTask(
		taskId: string,
		payload: UpdateTaskPayload,
	): Promise<ClickUpTask> {
		return this.retryWithBackoff(async () => {
			const response = await this.client.put(`/task/${taskId}`, payload);
			return response.data;
		});
	}

	async searchTasksByCustomField(externalId: string): Promise<ClickUpTask[]> {
		if (!this.customFieldIdForExternalId) {
			console.log("No custom field ID configured");
			return [];
		}

		try {
			// Try filtering with custom_fields parameter first
			const customFieldsFilter = JSON.stringify([
				{
					field_id: this.customFieldIdForExternalId,
					operator: "=",
					value: externalId,
				},
			]);

			console.log(`Searching with custom_fields filter: ${customFieldsFilter}`);

			const response = await this.client.get(`/list/${this.listId}/task`, {
				params: {
					include_closed: true,
					custom_fields: customFieldsFilter,
					subtasks: true, // Include subtasks in the search
				},
			});

			const tasks: ClickUpTask[] = response.data.tasks || [];
			console.log(`API returned ${tasks.length} task(s) with filter`);

			// Clickup API returns partial matches, so filter exact matches in code
			const exactMatches = tasks.filter((task) =>
				task.custom_fields?.some(
					(field) =>
						field.id === this.customFieldIdForExternalId &&
						field.value === externalId,
				),
			);

			return exactMatches;
			// biome-ignore lint/suspicious/noExplicitAny: any needed for error handling
		} catch (error: any) {
			console.error("Error searching tasks by custom field:", error.message);
			return [];
		}
	}

	async getList(listId: string): Promise<ClickUpList> {
		const response = await this.client.get(`/list/${listId}`);
		return response.data;
	}

	async getSpace(spaceId: string): Promise<ClickUpSpace> {
		const response = await this.client.get(`/space/${spaceId}`);
		return response.data;
	}

	async getCurrentUser(): Promise<ClickUpUser> {
		const response = await this.client.get("/user");
		return response.data.user;
	}

	async getTeamMembers(): Promise<ClickUpUser[]> {
		const response = await this.client.get(`/team/${this.teamId}/user`);
		return response.data.members || [];
	}

	async getTaskComments(taskId: string): Promise<ClickUpComment[]> {
		return this.retryWithBackoff(async () => {
			const response = await this.client.get(`/task/${taskId}/comment`);
			return response.data.comments || [];
		});
	}

	async addTaskComment(taskId: string, comment: string): Promise<void> {
		return this.retryWithBackoff(async () => {
			await this.client.post(`/task/${taskId}/comment`, {
				comment_text: comment,
			});
		});
	}

	async setCustomField(
		taskId: string,
		fieldId: string,
		// biome-ignore lint/suspicious/noExplicitAny: any needed for dynamic custom field values
		value: any,
	): Promise<void> {
		return this.retryWithBackoff(async () => {
			await this.client.post(`/task/${taskId}/field/${fieldId}`, {
				value,
			});
		});
	}

	async uploadAttachment(
		taskId: string,
		fileBuffer: Buffer,
		filename: string,
	): Promise<void> {
		return this.retryWithBackoff(async () => {
			const FormData = require("form-data");
			const formData = new FormData();
			formData.append("attachment", fileBuffer, filename);

			await this.client.post(`/task/${taskId}/attachment`, formData, {
				headers: {
					...formData.getHeaders(),
				},
			});
		});
	}

	getDefaultListId(): string {
		return this.listId;
	}
}
