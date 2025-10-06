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
      return [];
    }

    try {
      // ClickUp doesn't have a direct search by custom field, so we get all tasks and filter
      const response = await this.client.get(`/list/${this.listId}/task`, {
        params: {
          include_closed: true,
          custom_fields: JSON.stringify([
            {
              field_id: this.customFieldIdForExternalId,
              operator: "=",
              value: externalId,
            },
          ]),
        },
      });

      return response.data.tasks || [];
    } catch (error) {
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
