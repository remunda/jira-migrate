import { JiraClient } from './jira-client';
import { JiraIssue, MigrationConfig } from './types';
import { ClickUpClient, CreateTaskPayload, UpdateTaskPayload, ClickUpTask } from './clickup-client';

export interface ClickUpMigrationResult {
  success: boolean;
  jiraKey: string;
  clickupUrl?: string;
  clickupId?: string;
  error?: string;
  wasUpdate?: boolean;
}

export class JiraToClickUpMigrator {
  private jiraClient: JiraClient;
  private clickupClient: ClickUpClient;
  private config: MigrationConfig;
  private userCache: Map<string, number> = new Map();

  constructor(config: MigrationConfig) {
    this.config = config;
    this.jiraClient = new JiraClient(config);
    
    if (!config.clickupApiToken || !config.clickupTeamId || !config.clickupSpaceId || !config.clickupListId) {
      throw new Error('ClickUp configuration is missing');
    }

    this.clickupClient = new ClickUpClient(
      config.clickupApiToken,
      config.clickupTeamId,
      config.clickupSpaceId,
      config.clickupListId,
      config.clickupExternalIdFieldId
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

  private mapJiraStatusToClickUp(jiraStatus: string): string {
    const statusLower = jiraStatus.toLowerCase();
    
    // Use custom mapping if provided (highest priority)
    const customMapping = this.config.clickupStatusMapping;
    if (customMapping && customMapping[jiraStatus]) {
      return customMapping[jiraStatus];
    }
    
    // Default mapping - adjust these based on your ClickUp list statuses
    // Common ClickUp statuses: "Open", "in progress", "Closed"
    if (statusLower.includes('done') || statusLower.includes('closed') || statusLower.includes('resolved')) {
      return 'Closed';
    }
    if (statusLower.includes('progress') || statusLower.includes('review')) {
      return 'in progress';
    }
    if (statusLower.includes('todo') || statusLower.includes('open') || statusLower.includes('backlog') || statusLower.includes('new')) {
      return 'Open';
    }
    
    // Default to Open for unknown statuses
    return 'Open';
  }

  private mapJiraPriorityToClickUp(jiraPriority?: string): number | undefined {
    if (!jiraPriority) return undefined;

    const priorityMap: { [key: string]: number } = {
      'Highest': 1,
      'High': 2,
      'Medium': 3,
      'Low': 4,
      'Lowest': 4,
    };

    return priorityMap[jiraPriority];
  }

  private async findClickUpUserIdByEmail(email: string): Promise<number | undefined> {
    if (this.userCache.has(email)) {
      return this.userCache.get(email);
    }

    try {
      const members = await this.clickupClient.getTeamMembers();
      const user = members.find(m => m.email.toLowerCase() === email.toLowerCase());
      
      if (user) {
        this.userCache.set(email, user.id);
        return user.id;
      }
    } catch (error) {
      console.error(`Error finding ClickUp user by email ${email}:`, error);
    }
    
    return undefined;
  }

  private parseAdfDescription(description: any): string {
    if (!description) return '';
    
    if (typeof description === 'string') {
      return description;
    }

    // Parse Atlassian Document Format (ADF)
    if (description.type === 'doc' && description.content) {
      return this.parseAdfNodes(description.content);
    }

    return JSON.stringify(description);
  }

  private parseAdfNodes(nodes: any[]): string {
    let text = '';
    
    for (const node of nodes) {
      if (node.type === 'paragraph') {
        text += this.parseAdfContent(node.content || []) + '\n\n';
      } else if (node.type === 'heading') {
        const level = node.attrs?.level || 1;
        const prefix = '#'.repeat(level);
        text += `${prefix} ${this.parseAdfContent(node.content || [])}\n\n`;
      } else if (node.type === 'bulletList' || node.type === 'orderedList') {
        text += this.parseAdfList(node.content || [], node.type === 'orderedList') + '\n';
      } else if (node.type === 'codeBlock') {
        const code = this.parseAdfContent(node.content || []);
        text += `\`\`\`\n${code}\n\`\`\`\n\n`;
      } else if (node.type === 'blockquote') {
        const quote = this.parseAdfContent(node.content || []);
        text += `> ${quote}\n\n`;
      }
    }
    
    return text.trim();
  }

  private parseAdfContent(content: any[]): string {
    let text = '';
    
    for (const item of content) {
      if (item.type === 'text') {
        let itemText = item.text || '';
        
        if (item.marks) {
          for (const mark of item.marks) {
            if (mark.type === 'strong') {
              itemText = `**${itemText}**`;
            } else if (mark.type === 'em') {
              itemText = `*${itemText}*`;
            } else if (mark.type === 'code') {
              itemText = `\`${itemText}\``;
            } else if (mark.type === 'link') {
              itemText = `[${itemText}](${mark.attrs?.href || ''})`;
            }
          }
        }
        
        text += itemText;
      } else if (item.type === 'hardBreak') {
        text += '\n';
      } else if (item.content) {
        text += this.parseAdfContent(item.content);
      }
    }
    
    return text;
  }

  private parseAdfList(items: any[], ordered: boolean = false): string {
    let text = '';
    
    items.forEach((item, index) => {
      if (item.type === 'listItem') {
        const prefix = ordered ? `${index + 1}.` : '-';
        const content = this.parseAdfNodes(item.content || []);
        text += `${prefix} ${content}\n`;
      }
    });
    
    return text;
  }

  private async formatDescription(issue: JiraIssue): Promise<string> {
    let description = `**Original JIRA Issue:** [${issue.key}](${this.config.jiraBaseUrl}/browse/${issue.key})\n\n`;
    description += '---\n\n';
    
    // Parse ADF description
    const parsedDescription = this.parseAdfDescription(issue.fields.description);
    if (parsedDescription) {
      description += parsedDescription + '\n\n---\n\n';
    }

    // Add metadata
    description += '### JIRA Details\n\n';
    description += `- **Type:** ${issue.fields.issuetype.name}\n`;
    description += `- **Status:** ${issue.fields.status.name}\n`;
    
    if (issue.fields.priority) {
      description += `- **Priority:** ${issue.fields.priority.name}\n`;
    }
    
    if (issue.fields.reporter) {
      description += `- **Reporter:** ${issue.fields.reporter.displayName}\n`;
    }
    
    description += `- **Created:** ${new Date(issue.fields.created).toLocaleString()}\n`;
    description += `- **Updated:** ${new Date(issue.fields.updated).toLocaleString()}\n`;

    // Add components
    if (issue.fields.components && issue.fields.components.length > 0) {
      const components = issue.fields.components.map((c: any) => c.name).join(', ');
      description += `- **Components:** ${components}\n`;
    }

    // Add attachments info
    if (issue.fields.attachment && issue.fields.attachment.length > 0) {
      description += '\n### Attachments\n\n';
      for (const attachment of issue.fields.attachment) {
        const sizeKB = Math.round(attachment.size / 1024);
        description += `- [${attachment.filename}](${attachment.content}) (${sizeKB} KB)\n`;
      }
    }

    return description;
  }

  async migrateIssue(
    jiraKey: string,
    listId?: string
  ): Promise<ClickUpMigrationResult> {
    try {
      const issue = await this.jiraClient.getIssue(jiraKey);
      
      if (!issue) {
        return {
          success: false,
          jiraKey,
          error: 'JIRA issue not found',
        };
      }

      const targetListId = listId || this.config.clickupListId!;

      // Check if task already exists (idempotent migration)
      let existingTask: ClickUpTask | undefined;
      if (this.config.clickupExternalIdFieldId) {
        console.log(`Searching for task with external-id: ${issue.key}`);
        const existingTasks = await this.clickupClient.searchTasksByCustomField(issue.key);
        if (existingTasks.length > 0) {
          existingTask = existingTasks[0];
          console.log(`Found existing task: ${existingTask.id} - ${existingTask.name}`);
        } else {
          console.log(`No task found with external-id: ${issue.key}`);
        }
      }

      const description = await this.formatDescription(issue);

      // Find assignee
      let assigneeIds: number[] = [];
      if (issue.fields.assignee?.emailAddress) {
        const userId = await this.findClickUpUserIdByEmail(issue.fields.assignee.emailAddress);
        if (userId) {
          assigneeIds = [userId];
        }
      }

      if (existingTask) {
        // Update existing task
        console.log(`Updating existing task ID ${existingTask.id} for ${issue.key}`);
        
        const updatePayload: UpdateTaskPayload = {
          name: `[${issue.key}] ${issue.fields.summary}`,
          description: description,
          status: this.mapJiraStatusToClickUp(issue.fields.status.name),
          tags: issue.fields.labels || [],
        };

        if (issue.fields.priority) {
          updatePayload.priority = this.mapJiraPriorityToClickUp(issue.fields.priority.name);
        }

        if (assigneeIds.length > 0) {
          updatePayload.assignees = { add: assigneeIds };
        }

        const updatedTask = await this.clickupClient.updateTask(existingTask.id, updatePayload);

        // Upload attachments if any (in case they were added after initial migration)
        if (issue.fields.attachment && issue.fields.attachment.length > 0) {
          console.log(`Uploading ${issue.fields.attachment.length} attachment(s)...`);
          for (const attachment of issue.fields.attachment) {
            try {
              console.log(`  - Downloading ${attachment.filename}...`);
              const fileBuffer = await this.jiraClient.downloadAttachment(attachment.content);
              console.log(`  - Uploading ${attachment.filename} to ClickUp...`);
              await this.clickupClient.uploadAttachment(updatedTask.id, fileBuffer, attachment.filename);
              console.log(`  ✓ ${attachment.filename} uploaded`);
            } catch (error: any) {
              console.error(`  ✗ Failed to upload ${attachment.filename}: ${error.message}`);
            }
          }
        }

        return {
          success: true,
          jiraKey: issue.key,
          clickupUrl: updatedTask.url,
          clickupId: updatedTask.id,
          wasUpdate: true,
        };
      } else {
        // Create new task
        console.log(`Creating new task for ${issue.key}`);
        
        const payload: CreateTaskPayload = {
          name: `[${issue.key}] ${issue.fields.summary}`,
          description: description,
          status: this.mapJiraStatusToClickUp(issue.fields.status.name),
          tags: issue.fields.labels || [],
          assignees: assigneeIds,
        };

        if (issue.fields.priority) {
          payload.priority = this.mapJiraPriorityToClickUp(issue.fields.priority.name);
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
        if (issue.fields.attachment && issue.fields.attachment.length > 0) {
          console.log(`Uploading ${issue.fields.attachment.length} attachment(s)...`);
          for (const attachment of issue.fields.attachment) {
            try {
              console.log(`  - Downloading ${attachment.filename}...`);
              const fileBuffer = await this.jiraClient.downloadAttachment(attachment.content);
              console.log(`  - Uploading ${attachment.filename} to ClickUp...`);
              await this.clickupClient.uploadAttachment(task.id, fileBuffer, attachment.filename);
              console.log(`  ✓ ${attachment.filename} uploaded`);
            } catch (error: any) {
              console.error(`  ✗ Failed to upload ${attachment.filename}: ${error.message}`);
            }
          }
        }

        return {
          success: true,
          jiraKey: issue.key,
          clickupUrl: task.url,
          clickupId: task.id,
          wasUpdate: false,
        };
      }
    } catch (error: any) {
      return {
        success: false,
        jiraKey,
        error: error.message,
      };
    }
  }

  async migrateBulk(
    jiraKeys: string[],
    listId?: string
  ): Promise<ClickUpMigrationResult[]> {
    const results: ClickUpMigrationResult[] = [];

    for (const jiraKey of jiraKeys) {
      const result = await this.migrateIssue(jiraKey, listId);
      results.push(result);
      
      // Add a small delay to avoid rate limiting (ClickUp has 100 requests/minute limit)
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return results;
  }

  async getCurrentList() {
    return this.clickupClient.getList(this.clickupClient.getDefaultListId());
  }
}
