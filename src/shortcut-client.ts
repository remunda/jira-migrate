import axios, { AxiosInstance } from 'axios';
import { ShortcutStory, ShortcutEpic, MigrationConfig } from './types';

export class ShortcutClient {
  private client: AxiosInstance;
  private config: MigrationConfig;

  constructor(config: MigrationConfig) {
    this.config = config;
    this.client = axios.create({
      baseURL: 'https://api.app.shortcut.com/api/v3',
      headers: {
        'Shortcut-Token': config.shortcutApiToken,
        'Content-Type': 'application/json',
      },
    });
  }

  async createStory(story: ShortcutStory): Promise<any> {
    try {
      const response = await this.client.post('/stories', story);
      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to create Shortcut story: ${error.response?.data?.message || error.message}`);
    }
  }

  async createEpic(epic: ShortcutEpic): Promise<any> {
    try {
      const response = await this.client.post('/epics', epic);
      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to create Shortcut epic: ${error.response?.data?.message || error.message}`);
    }
  }

  async getWorkflowStates(): Promise<any[]> {
    try {
      const response = await this.client.get('/workflows');
      return response.data.flatMap((workflow: any) => workflow.states);
    } catch (error: any) {
      throw new Error(`Failed to get workflow states: ${error.message}`);
    }
  }

  async getMembers(): Promise<any[]> {
    try {
      const response = await this.client.get('/members');
      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to get members: ${error.message}`);
    }
  }

  async getLabels(): Promise<any[]> {
    try {
      const response = await this.client.get('/labels');
      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to get labels: ${error.message}`);
    }
  }

  async validateConnection(): Promise<boolean> {
    try {
      await this.client.get('/member');
      return true;
    } catch (error) {
      return false;
    }
  }

  async findMemberByEmail(email: string): Promise<any | null> {
    try {
      const members = await this.getMembers();
      return members.find(member => member.profile?.email_address === email) || null;
    } catch (error) {
      return null;
    }
  }

  async findWorkflowStateByName(stateName: string): Promise<any | null> {
    try {
      const states = await this.getWorkflowStates();
      return states.find(state => 
        state.name.toLowerCase() === stateName.toLowerCase()
      ) || null;
    } catch (error) {
      return null;
    }
  }

  async findStoryByExternalId(externalId: string): Promise<any | null> {
    try {
      // Use Shortcut's search API with external-id operator (note: hyphen, not underscore)
      console.log(`Searching for story with external-id: ${externalId}`);
      const response = await this.client.get('/search/stories', {
        params: {
          query: `external-id:${externalId}`,
          page_size: 25
        }
      });
      
      // Check if we got results
      if (response.data?.data && response.data.data.length > 0) {
        const story = response.data.data[0];
        console.log(`Found existing story: ${story.id} - ${story.name}`);
        return story;
      }
      
      console.log(`No story found with external-id: ${externalId}`);
      return null;
    } catch (error: any) {
      console.error(`Error searching for story: ${error.message}`);
      return null;
    }
  }

  async findEpicByExternalId(externalId: string): Promise<any | null> {
    try {
      // Use Shortcut's search API with external-id operator for epics
      console.log(`Searching for epic with external-id: ${externalId}`);
      const response = await this.client.get('/search/epics', {
        params: {
          query: `external-id:${externalId}`,
          page_size: 25
        }
      });
      
      // Check if we got results
      if (response.data?.data && response.data.data.length > 0) {
        const epic = response.data.data[0];
        console.log(`Found existing epic: ${epic.id} - ${epic.name}`);
        return epic;
      }
      
      console.log(`No epic found with external-id: ${externalId}`);
      return null;
    } catch (error: any) {
      console.error(`Error searching for epic: ${error.message}`);
      return null;
    }
  }

  async updateStory(storyId: number, story: Partial<ShortcutStory>): Promise<any> {
    try {
      const response = await this.client.put(`/stories/${storyId}`, story);
      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to update Shortcut story: ${error.response?.data?.message || error.message}`);
    }
  }

  async updateEpic(epicId: number, epic: Partial<ShortcutEpic>): Promise<any> {
    try {
      const response = await this.client.put(`/epics/${epicId}`, epic);
      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to update Shortcut epic: ${error.response?.data?.message || error.message}`);
    }
  }

  async getIterations(): Promise<any[]> {
    try {
      const response = await this.client.get('/iterations');
      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to get iterations: ${error.response?.data?.message || error.message}`);
    }
  }

  async getCurrentIteration(): Promise<any | null> {
    try {
      const iterations = await this.getIterations();
      const now = new Date();
      
      // Find iteration that is currently active (start_date <= now <= end_date)
      const current = iterations.find(iter => {
        const start = new Date(iter.start_date);
        const end = new Date(iter.end_date);
        return start <= now && now <= end;
      });
      
      return current || null;
    } catch (error: any) {
      console.error(`Error getting current iteration: ${error.message}`);
      return null;
    }
  }
}