import axios, { AxiosInstance } from 'axios';
import { JiraIssue, MigrationConfig } from './types';

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
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });
  }

  async getIssue(issueKey: string): Promise<JiraIssue> {
    try {
      const response = await this.client.get(`/issue/${issueKey}`, {
        params: {
          expand: 'names,schema',
          fields: [
            'summary',
            'description',
            'issuetype',
            'status',
            'priority',
            'assignee',
            'reporter',
            'created',
            'updated',
            'labels',
            'components',
            'parent',
            'subtasks',
            'attachment'
          ].join(',')
        }
      });
      
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        throw new Error(`JIRA issue ${issueKey} not found`);
      }
      throw new Error(`Failed to fetch JIRA issue ${issueKey}: ${error.message}`);
    }
  }

  async getIssuesByJQL(jql: string, maxResults: number = 50): Promise<JiraIssue[]> {
    try {
      const response = await this.client.post('/search', {
        jql,
        maxResults,
        fields: [
          'summary',
          'description',
          'issuetype',
          'status',
          'priority',
          'assignee',
          'reporter',
          'created',
          'updated',
          'labels',
          'components',
          'parent',
          'subtasks',
          'attachment'
        ]
      });
      
      return response.data.issues;
    } catch (error: any) {
      throw new Error(`Failed to search JIRA issues: ${error.message}`);
    }
  }

  async validateConnection(): Promise<boolean> {
    try {
      await this.client.get('/myself');
      return true;
    } catch (error) {
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
        responseType: 'arraybuffer',
      });
      return Buffer.from(response.data);
    } catch (error: any) {
      throw new Error(`Failed to download attachment from ${url}: ${error.message}`);
    }
  }
}