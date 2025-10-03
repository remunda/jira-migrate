import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { MigrationConfig } from './types';

export function loadConfig(): MigrationConfig {
  // Try to load from .env file
  const envPath = path.join(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    dotenv.config();
  }

  const config: MigrationConfig = {
    jiraBaseUrl: process.env.JIRA_BASE_URL || '',
    jiraEmail: process.env.JIRA_EMAIL || '',
    jiraApiToken: process.env.JIRA_API_TOKEN || '',
    shortcutApiToken: process.env.SHORTCUT_API_TOKEN || '',
    clickupApiToken: process.env.CLICKUP_API_TOKEN || '',
    clickupTeamId: process.env.CLICKUP_TEAM_ID || '',
    clickupSpaceId: process.env.CLICKUP_SPACE_ID || '',
    clickupListId: process.env.CLICKUP_LIST_ID || '',
    clickupExternalIdFieldId: process.env.CLICKUP_EXTERNAL_ID_FIELD_ID || '',
    targetPlatform: (process.env.TARGET_PLATFORM as 'shortcut' | 'clickup') || 'shortcut',
    defaultTeamId: process.env.DEFAULT_SHORTCUT_TEAM_ID,
    defaultProjectId: process.env.DEFAULT_SHORTCUT_PROJECT_ID,
  };

  return config;
}

export function validateConfig(config: MigrationConfig): string[] {
  const errors: string[] = [];

  if (!config.jiraBaseUrl) {
    errors.push('JIRA_BASE_URL is required');
  }
  if (!config.jiraEmail) {
    errors.push('JIRA_EMAIL is required');
  }
  if (!config.jiraApiToken) {
    errors.push('JIRA_API_TOKEN is required');
  }
  
  const targetPlatform = config.targetPlatform || 'shortcut';
  
  if (targetPlatform === 'shortcut') {
    if (!config.shortcutApiToken) {
      errors.push('SHORTCUT_API_TOKEN is required for Shortcut platform');
    }
  } else if (targetPlatform === 'clickup') {
    if (!config.clickupApiToken) {
      errors.push('CLICKUP_API_TOKEN is required for ClickUp platform');
    }
    if (!config.clickupTeamId) {
      errors.push('CLICKUP_TEAM_ID is required for ClickUp platform');
    }
    if (!config.clickupSpaceId) {
      errors.push('CLICKUP_SPACE_ID is required for ClickUp platform');
    }
    if (!config.clickupListId) {
      errors.push('CLICKUP_LIST_ID is required for ClickUp platform');
    }
  }

  return errors;
}

export function createEnvFile(): void {
  const envPath = path.join(process.cwd(), '.env');
  const examplePath = path.join(process.cwd(), '.env.example');
  
  if (fs.existsSync(examplePath) && !fs.existsSync(envPath)) {
    fs.copyFileSync(examplePath, envPath);
    console.log('Created .env file from .env.example');
    console.log('Please edit .env file with your actual credentials');
  }
}