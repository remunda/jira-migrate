export interface JiraIssue {
  id: string;
  key: string;
  fields: {
    summary: string;
    description?: any; // Can be string or ADF object
    attachment?: Array<{
      id: string;
      filename: string;
      size: number;
      mimeType: string;
      content: string;
    }>;
    issuetype: {
      name: string;
      id: string;
    };
    status: {
      name: string;
      id: string;
    };
    priority?: {
      name: string;
      id: string;
    };
    assignee?: {
      displayName: string;
      emailAddress: string;
    };
    reporter?: {
      displayName: string;
      emailAddress: string;
    };
    created: string;
    updated: string;
    labels: string[];
    components: Array<{
      name: string;
      id: string;
    }>;
    parent?: {
      key: string;
      id: string;
      fields: {
        summary: string;
        issuetype: {
          name: string;
        };
      };
    };
    subtasks?: Array<{
      key: string;
      id: string;
      fields: {
        summary: string;
        issuetype: {
          name: string;
        };
      };
    }>;
  };
}

export interface ShortcutStory {
  name: string;
  description?: string;
  story_type: 'feature' | 'bug' | 'chore';
  workflow_state_id?: number;
  iteration_id?: number;
  requested_by_id?: string;
  owner_ids?: string[];
  labels?: Array<{
    name: string;
  }>;
  external_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ShortcutEpic {
  name: string;
  description?: string;
  state: 'to do' | 'in progress' | 'done';
  requested_by_id?: string;
  owner_ids?: string[];
  labels?: Array<{
    name: string;
  }>;
  external_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface MigrationConfig {
  jiraBaseUrl: string;
  jiraEmail: string;
  jiraApiToken: string;
  shortcutApiToken?: string;
  clickupApiToken?: string;
  clickupTeamId?: string;
  clickupSpaceId?: string;
  clickupListId?: string;
  clickupExternalIdFieldId?: string;
  clickupStatusMapping?: { [key: string]: string };
  targetPlatform?: 'shortcut' | 'clickup';
  defaultTeamId?: string;
  defaultProjectId?: string;
}

export interface MigrationResult {
  success: boolean;
  jiraKey: string;
  shortcutId?: number;
  shortcutUrl?: string;
  error?: string;
}

export type IssueTypeMapping = {
  [jiraIssueType: string]: 'epic' | 'story';
};

export type StatusMapping = {
  [jiraStatus: string]: string; // Shortcut workflow state or epic state
};