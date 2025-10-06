import axios, { AxiosInstance } from "axios";

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
    customFieldIdForExternalId?: string
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

  async validateConnection(): Promise<boolean> {
    try {
      await this.client.get("/user");
      return true;
    } catch (error) {
      return false;
    }
  }

  async createTask(payload: CreateTaskPayload): Promise<ClickUpTask> {
    try {
      console.log(
        "Creating task with payload:",
        JSON.stringify(payload, null, 2)
      );

      const response = await this.client.post(
        `/list/${this.listId}/task`,
        payload
      );
      return response.data;
    } catch (error: any) {
      console.error(
        "ClickUp API Error:",
        error.response?.data || error.message
      );
      console.error("Payload that failed:", JSON.stringify(payload, null, 2));
      throw error;
    }
  }

  async getTask(taskId: string): Promise<ClickUpTask> {
    const response = await this.client.get(`/task/${taskId}`);
    return response.data;
  }

  async validateParentTask(
    parentTaskId: string,
    targetListId?: string
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
    payload: UpdateTaskPayload
  ): Promise<ClickUpTask> {
    const response = await this.client.put(`/task/${taskId}`, payload);
    return response.data;
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

      let response = await this.client.get(`/list/${this.listId}/task`, {
        params: {
          include_closed: true,
          custom_fields: customFieldsFilter,
          subtasks: true, // Include subtasks in the search
        },
      });

      let tasks: ClickUpTask[] = response.data.tasks || [];
      console.log(`API returned ${tasks.length} task(s) with filter`);

      // If no results with filter, try fetching all and filtering manually
      if (tasks.length === 0) {
        console.log(
          "Filter returned 0 tasks, fetching all tasks and filtering manually..."
        );
        response = await this.client.get(`/list/${this.listId}/task`, {
          params: {
            include_closed: true,
            subtasks: true, // Include subtasks in the search
          },
        });

        const allTasks: ClickUpTask[] = response.data.tasks || [];
        console.log(`Found ${allTasks.length} total tasks in list`);

        // Fetch full details for each task to get custom field values
        const tasksWithDetails = await Promise.all(
          allTasks.map(async (task) => {
            try {
              return await this.getTask(task.id);
            } catch (error) {
              console.error(`Error fetching task ${task.id}:`, error);
              return task; // Return original if fetch fails
            }
          })
        );

        tasks = tasksWithDetails.filter((task) => {
          if (!task.custom_fields) {
            console.log(`Task ${task.id}: no custom_fields`);
            return false;
          }

          const externalIdField = task.custom_fields.find(
            (cf) => cf.id === this.customFieldIdForExternalId
          );

          if (externalIdField) {
            console.log(
              `Task ${
                task.id
              }: external-id field found, full field: ${JSON.stringify(
                externalIdField
              )}`
            );
            // Check all possible locations for the value
            const field = externalIdField as any;
            const fieldValue =
              field.value ??
              field.text_value ??
              field.string_value ??
              field.default_value;
            console.log(
              `Extracted value: ${fieldValue}, checking against: ${externalId}`
            );
            return fieldValue === externalId;
          } else {
            console.log(
              `Task ${
                task.id
              }: external-id field NOT found. Available fields: ${task.custom_fields
                .map((cf) => `${cf.id}:${cf.name}`)
                .join(", ")}`
            );
            return false;
          }
        });

        console.log(`Manual filtering found ${tasks.length} matching task(s)`);
      }

      return tasks;
    } catch (error: any) {
      console.error(
        "Error searching tasks by custom field:",
        error.response?.data || error.message
      );
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

  async addTaskComment(taskId: string, comment: string): Promise<void> {
    await this.client.post(`/task/${taskId}/comment`, {
      comment_text: comment,
    });
  }

  async setCustomField(
    taskId: string,
    fieldId: string,
    value: any
  ): Promise<void> {
    await this.client.post(`/task/${taskId}/field/${fieldId}`, {
      value,
    });
  }

  async uploadAttachment(
    taskId: string,
    fileBuffer: Buffer,
    filename: string
  ): Promise<void> {
    const FormData = require("form-data");
    const formData = new FormData();
    formData.append("attachment", fileBuffer, filename);

    await this.client.post(`/task/${taskId}/attachment`, formData, {
      headers: {
        ...formData.getHeaders(),
      },
    });
  }

  getDefaultListId(): string {
    return this.listId;
  }
}
