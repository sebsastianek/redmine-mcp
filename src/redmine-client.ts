import axios, { AxiosInstance } from 'axios';

export interface RedmineConfig {
  baseUrl: string;
  apiKey: string;
}

export interface RedmineIssue {
  id?: number;
  project_id?: number | string;
  tracker_id?: number;
  status_id?: number;
  priority_id?: number;
  subject: string;
  description?: string;
  assigned_to_id?: number;
  parent_issue_id?: number;
  estimated_hours?: number;
  custom_fields?: Array<{ id: number; value: string | number }>;
}

export interface TimeEntry {
  issue_id: number;
  spent_on?: string;
  hours: number;
  activity_id?: number;
  comments?: string;
  user_id?: number;
}

export class RedmineClient {
  private client: AxiosInstance;

  constructor(config: RedmineConfig) {
    this.client = axios.create({
      baseURL: config.baseUrl,
      headers: {
        'X-Redmine-API-Key': config.apiKey,
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Create a new issue in Redmine
   */
  async createIssue(issue: RedmineIssue): Promise<any> {
    const response = await this.client.post('/issues.json', {
      issue,
    });
    return response.data;
  }

  /**
   * Get issue details by ID
   */
  async getIssue(issueId: number, include?: string[]): Promise<any> {
    const params = include ? { include: include.join(',') } : {};
    const response = await this.client.get(`/issues/${issueId}.json`, { params });
    return response.data;
  }

  /**
   * Update an existing issue
   */
  async updateIssue(issueId: number, updates: Partial<RedmineIssue>): Promise<any> {
    const response = await this.client.put(`/issues/${issueId}.json`, {
      issue: updates,
    });
    return response.data;
  }

  /**
   * Add a note/comment to an issue
   */
  async addNoteToIssue(issueId: number, notes: string): Promise<any> {
    const response = await this.client.put(`/issues/${issueId}.json`, {
      issue: {
        notes,
      },
    });
    return response.data;
  }

  /**
   * Log time entry for an issue
   */
  async logTime(timeEntry: TimeEntry): Promise<any> {
    const response = await this.client.post('/time_entries.json', {
      time_entry: timeEntry,
    });
    return response.data;
  }

  /**
   * Get time entries for an issue
   */
  async getTimeEntries(issueId: number): Promise<any> {
    const response = await this.client.get('/time_entries.json', {
      params: { issue_id: issueId },
    });
    return response.data;
  }

  /**
   * Get time entries for today (current user)
   */
  async getTodayTimeEntries(): Promise<any> {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    const response = await this.client.get('/time_entries.json', {
      params: {
        spent_on: today,
        user_id: 'me'
      },
    });
    return response.data;
  }

  /**
   * List issues with optional filters
   */
  async listIssues(params?: {
    project_id?: number | string;
    status_id?: string;
    assigned_to_id?: number | string;
    limit?: number;
    offset?: number;
  }): Promise<any> {
    const response = await this.client.get('/issues.json', { params });
    return response.data;
  }

  /**
   * Get project information
   */
  async getProject(projectId: number | string): Promise<any> {
    const response = await this.client.get(`/projects/${projectId}.json`);
    return response.data;
  }

  /**
   * List all projects
   */
  async listProjects(): Promise<any> {
    let allProjects: any[] = [];
    let offset = 0;
    const limit = 100; // Redmine's max limit per request
    let totalCount = 0;

    do {
      const response = await this.client.get('/projects.json', {
        params: { limit, offset }
      });

      allProjects = allProjects.concat(response.data.projects);
      totalCount = response.data.total_count;
      offset += limit;
    } while (allProjects.length < totalCount);

    return {
      projects: allProjects,
      total_count: totalCount,
      limit: allProjects.length,
      offset: 0
    };
  }

  /**
   * Get current user information
   */
  async getCurrentUser(): Promise<any> {
    const response = await this.client.get('/users/current.json');
    return response.data;
  }

  /**
   * List time entry activities
   */
  async listTimeEntryActivities(): Promise<any> {
    const response = await this.client.get('/enumerations/time_entry_activities.json');
    return response.data;
  }

  /**
   * List all issue statuses
   */
  async listIssueStatuses(): Promise<any> {
    const response = await this.client.get('/issue_statuses.json');
    return response.data;
  }
}
