import axios, { type AxiosInstance } from "axios";
import type {
	MigrationConfig,
	ShortcutEpic,
	ShortcutEpicResponse,
	ShortcutIteration,
	ShortcutLabel,
	ShortcutMember,
	ShortcutStory,
	ShortcutStoryResponse,
	ShortcutWorkflow,
	ShortcutWorkflowState,
} from "./types";

export class ShortcutClient {
	private client: AxiosInstance;

	constructor(private config: MigrationConfig) {
		this.client = axios.create({
			baseURL: "https://api.app.shortcut.com/api/v3",
			headers: {
				"Shortcut-Token": this.config.shortcutApiToken,
				"Content-Type": "application/json",
			},
		});
	}

	async createStory(story: ShortcutStory): Promise<ShortcutStoryResponse> {
		try {
			const response = await this.client.post("/stories", story);
			return response.data;
		} catch (error: unknown) {
			const errorMessage =
				(error instanceof Error &&
					(error as { response?: { data?: { message?: string } } }).response
						?.data?.message) ||
				(error instanceof Error ? error.message : String(error));
			throw new Error(`Failed to create Shortcut story: ${errorMessage}`);
		}
	}

	async createEpic(epic: ShortcutEpic): Promise<ShortcutEpicResponse> {
		try {
			const response = await this.client.post("/epics", epic);
			return response.data;
		} catch (error: unknown) {
			const errorMessage =
				(error instanceof Error &&
					(error as { response?: { data?: { message?: string } } }).response
						?.data?.message) ||
				(error instanceof Error ? error.message : String(error));
			throw new Error(`Failed to create Shortcut epic: ${errorMessage}`);
		}
	}

	async getWorkflowStates(): Promise<ShortcutWorkflowState[]> {
		try {
			const response = await this.client.get("/workflows");
			return response.data.flatMap(
				(workflow: ShortcutWorkflow) => workflow.states,
			);
		} catch (error: unknown) {
			const errorMessage =
				error instanceof Error ? error.message : String(error);
			throw new Error(`Failed to get workflow states: ${errorMessage}`);
		}
	}

	async getMembers(): Promise<ShortcutMember[]> {
		try {
			const response = await this.client.get("/members");
			return response.data;
		} catch (error: unknown) {
			const errorMessage =
				error instanceof Error ? error.message : String(error);
			throw new Error(`Failed to get members: ${errorMessage}`);
		}
	}

	async getLabels(): Promise<ShortcutLabel[]> {
		try {
			const response = await this.client.get("/labels");
			return response.data;
		} catch (error: unknown) {
			const errorMessage =
				error instanceof Error ? error.message : String(error);
			throw new Error(`Failed to get labels: ${errorMessage}`);
		}
	}

	async validateConnection(): Promise<boolean> {
		try {
			await this.client.get("/member");
			return true;
		} catch (_error) {
			return false;
		}
	}

	async findMemberByEmail(email: string): Promise<ShortcutMember | null> {
		try {
			const members = await this.getMembers();
			return (
				members.find((member) => member.profile?.email_address === email) ||
				null
			);
		} catch (_error) {
			return null;
		}
	}

	async findWorkflowStateByName(
		stateName: string,
	): Promise<ShortcutWorkflowState | null> {
		try {
			const states = await this.getWorkflowStates();
			return (
				states.find(
					(state) => state.name.toLowerCase() === stateName.toLowerCase(),
				) || null
			);
		} catch (_error) {
			return null;
		}
	}

	async findStoryByExternalId(
		externalId: string,
	): Promise<ShortcutStoryResponse | null> {
		try {
			// Use Shortcut's search API with external-id operator (note: hyphen, not underscore)
			console.log(`Searching for story with external-id: ${externalId}`);
			const response = await this.client.get("/search/stories", {
				params: {
					query: `external-id:${externalId}`,
					page_size: 25,
				},
			});

			// Check if we got results
			if (response.data?.data && response.data.data.length > 0) {
				const story = response.data.data[0];
				console.log(`Found existing story: ${story.id} - ${story.name}`);
				return story;
			}

			console.log(`No story found with external-id: ${externalId}`);
			return null;
		} catch (error: unknown) {
			const errorMessage =
				error instanceof Error ? error.message : String(error);
			console.error(`Error searching for story: ${errorMessage}`);
			return null;
		}
	}

	async findEpicByExternalId(
		externalId: string,
	): Promise<ShortcutEpicResponse | null> {
		try {
			// Use Shortcut's search API with external-id operator for epics
			console.log(`Searching for epic with external-id: ${externalId}`);
			const response = await this.client.get("/search/epics", {
				params: {
					query: `external-id:${externalId}`,
					page_size: 25,
				},
			});

			// Check if we got results
			if (response.data?.data && response.data.data.length > 0) {
				const epic = response.data.data[0];
				console.log(`Found existing epic: ${epic.id} - ${epic.name}`);
				return epic;
			}

			console.log(`No epic found with external-id: ${externalId}`);
			return null;
		} catch (error: unknown) {
			const errorMessage =
				error instanceof Error ? error.message : String(error);
			console.error(`Error searching for epic: ${errorMessage}`);
			return null;
		}
	}

	async updateStory(
		storyId: number,
		story: Partial<ShortcutStory>,
	): Promise<ShortcutStoryResponse> {
		try {
			const response = await this.client.put(`/stories/${storyId}`, story);
			return response.data;
		} catch (error: unknown) {
			const errorMessage =
				(error instanceof Error &&
					(error as { response?: { data?: { message?: string } } }).response
						?.data?.message) ||
				(error instanceof Error ? error.message : String(error));
			throw new Error(`Failed to update Shortcut story: ${errorMessage}`);
		}
	}

	async updateEpic(
		epicId: number,
		epic: Partial<ShortcutEpic>,
	): Promise<ShortcutEpicResponse> {
		try {
			const response = await this.client.put(`/epics/${epicId}`, epic);
			return response.data;
		} catch (error: unknown) {
			const errorMessage =
				(error instanceof Error &&
					(error as { response?: { data?: { message?: string } } }).response
						?.data?.message) ||
				(error instanceof Error ? error.message : String(error));
			throw new Error(`Failed to update Shortcut epic: ${errorMessage}`);
		}
	}

	async getIterations(): Promise<ShortcutIteration[]> {
		try {
			const response = await this.client.get("/iterations");
			return response.data;
		} catch (error: unknown) {
			const errorMessage =
				(error instanceof Error &&
					(error as { response?: { data?: { message?: string } } }).response
						?.data?.message) ||
				(error instanceof Error ? error.message : String(error));
			throw new Error(`Failed to get iterations: ${errorMessage}`);
		}
	}

	async getCurrentIteration(): Promise<ShortcutIteration | null> {
		try {
			const iterations = await this.getIterations();
			const now = new Date();

			// Find iteration that is currently active (start_date <= now <= end_date)
			const current = iterations.find((iter) => {
				const start = new Date(iter.start_date);
				const end = new Date(iter.end_date);
				return start <= now && now <= end;
			});

			return current || null;
		} catch (error: unknown) {
			const errorMessage =
				error instanceof Error ? error.message : String(error);
			console.error(`Error getting current iteration: ${errorMessage}`);
			return null;
		}
	}
}
