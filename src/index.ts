#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { RedmineClient } from './redmine-client.js';
import { StateManager } from './state-manager.js';

// Environment configuration
const REDMINE_URL = process.env.REDMINE_URL;
const REDMINE_API_KEY = process.env.REDMINE_API_KEY;

if (!REDMINE_URL || !REDMINE_API_KEY) {
  console.error('Error: REDMINE_URL and REDMINE_API_KEY environment variables are required');
  process.exit(1);
}

// Initialize Redmine client
const redmineClient = new RedmineClient({
  baseUrl: REDMINE_URL,
  apiKey: REDMINE_API_KEY,
});

// Initialize state manager
const stateManager = new StateManager();

// Define MCP tools
const tools: Tool[] = [
  {
    name: 'create_task',
    description: 'Create a new task (issue) in Redmine. Uses current project if not specified.',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: {
          type: ['number', 'string'],
          description: 'Project ID or identifier (uses current project if not specified)',
        },
        subject: {
          type: 'string',
          description: 'Task subject/title',
        },
        description: {
          type: 'string',
          description: 'Detailed description of the task',
        },
        tracker_id: {
          type: 'number',
          description: 'Tracker ID (e.g., 1=Bug, 2=Feature, 3=Support)',
        },
        status_id: {
          type: 'number',
          description: 'Status ID (e.g., 1=New)',
        },
        priority_id: {
          type: 'number',
          description: 'Priority ID (e.g., 2=Normal)',
        },
        assigned_to_id: {
          type: 'number',
          description: 'User ID to assign the task to',
        },
        estimated_hours: {
          type: 'number',
          description: 'Estimated hours for completion',
        },
      },
      required: ['subject'],
    },
  },
  {
    name: 'get_task',
    description: 'Get detailed information about a specific task. Uses current task if not specified.',
    inputSchema: {
      type: 'object',
      properties: {
        issue_id: {
          type: 'number',
          description: 'The ID of the issue/task (uses current task if not specified)',
        },
        include: {
          type: 'array',
          items: { type: 'string' },
          description: 'Additional data to include (e.g., children, attachments, relations, changesets, journals, watchers)',
        },
      },
    },
  },
  {
    name: 'update_task',
    description: 'Update an existing task. Uses current task if not specified.',
    inputSchema: {
      type: 'object',
      properties: {
        issue_id: {
          type: 'number',
          description: 'The ID of the issue/task to update (uses current task if not specified)',
        },
        subject: {
          type: 'string',
          description: 'New subject/title',
        },
        description: {
          type: 'string',
          description: 'New description',
        },
        status_id: {
          type: 'number',
          description: 'New status ID',
        },
        assigned_to_id: {
          type: 'number',
          description: 'New assignee user ID',
        },
        notes: {
          type: 'string',
          description: 'Add a comment/note to the issue',
        },
      },
    },
  },
  {
    name: 'log_time',
    description: 'Log time/hours spent on a task. Uses current task if not specified. IMPORTANT: activity_id is required by Redmine - use list_activities to see available options.',
    inputSchema: {
      type: 'object',
      properties: {
        issue_id: {
          type: 'number',
          description: 'The ID of the issue/task (uses current task if not specified)',
        },
        hours: {
          type: 'number',
          description: 'Number of hours spent',
        },
        comments: {
          type: 'string',
          description: 'Comments about the work done',
        },
        spent_on: {
          type: 'string',
          description: 'Date the time was spent (YYYY-MM-DD format, defaults to today)',
        },
        activity_id: {
          type: 'number',
          description: 'Time entry activity ID (REQUIRED - use list_activities to see available options)',
        },
      },
      required: ['hours', 'activity_id'],
    },
  },
  {
    name: 'list_tasks',
    description: 'List tasks with optional filters. Uses current project if not specified.',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: {
          type: ['number', 'string'],
          description: 'Filter by project ID or identifier (uses current project if not specified)',
        },
        assigned_to_id: {
          type: ['number', 'string'],
          description: 'Filter by assigned user ID (use "me" for current user)',
        },
        status_id: {
          type: 'string',
          description: 'Filter by status ID (use "open" for all open statuses, "closed" for closed, "*" for all)',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of tasks to return (default: 25)',
        },
      },
    },
  },
  {
    name: 'get_time_entries',
    description: 'Get time entries logged for a specific task. Uses current task if not specified.',
    inputSchema: {
      type: 'object',
      properties: {
        issue_id: {
          type: 'number',
          description: 'The ID of the issue/task (uses current task if not specified)',
        },
      },
    },
  },
  {
    name: 'get_today_time_entries',
    description: 'Get all time entries logged today by the current user.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'list_activities',
    description: 'List all available time entry activities',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'list_issue_statuses',
    description: 'List all available issue statuses',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'check_my_issues',
    description: 'Check issues assigned to the current user. If status_id is not provided, will list available statuses for you to choose from.',
    inputSchema: {
      type: 'object',
      properties: {
        status_id: {
          type: 'string',
          description: 'Filter by status ID (use "open" for all open statuses, "closed" for closed, "*" for all, or specific status name)',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of tasks to return (default: 25)',
        },
      },
    },
  },
  {
    name: 'list_projects',
    description: 'List all available projects',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'get_current_user',
    description: 'Get information about the current authenticated user',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'set_current_project',
    description: 'Set the current project context (will be used as default for operations). IMPORTANT: You MUST call list_projects first to fetch available projects and validate that the project exists before calling this tool. Never call this tool without first verifying the project is in the available project list.',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: {
          type: ['number', 'string'],
          description: 'Project ID or identifier to set as current (must be from the list_projects results)',
        },
      },
      required: ['project_id'],
    },
  },
  {
    name: 'get_current_project',
    description: 'Get the current project context',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'set_current_task',
    description: 'Set the current task context (will be used as default for operations)',
    inputSchema: {
      type: 'object',
      properties: {
        issue_id: {
          type: 'number',
          description: 'Task/issue ID to set as current',
        },
      },
      required: ['issue_id'],
    },
  },
  {
    name: 'get_current_task',
    description: 'Get the current task context',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'get_context',
    description: 'Get all current context (project and task)',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'clear_context',
    description: 'Clear all current context (project and task)',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
];

// Create MCP server
const server = new Server(
  {
    name: 'redmine-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Register tool list handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

// Register tool call handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (!args) {
    return {
      content: [{ type: 'text', text: 'No arguments provided' }],
      isError: true,
    };
  }

  try {
    switch (name) {
      case 'create_task': {
        const projectId = (args as any).project_id || stateManager.getCurrentProject();
        if (!projectId) {
          return {
            content: [
              {
                type: 'text',
                text: 'Error: project_id is required. Either provide it or set a current project using set_current_project.',
              },
            ],
            isError: true,
          };
        }

        // If no assignee specified, assign to current user
        let assignedToId = (args as any).assigned_to_id;
        if (!assignedToId) {
          const user = await redmineClient.getCurrentUser();
          assignedToId = user.user.id;
        }

        const issue = await redmineClient.createIssue({
          project_id: projectId,
          subject: (args as any).subject,
          description: (args as any).description,
          tracker_id: (args as any).tracker_id,
          status_id: (args as any).status_id,
          priority_id: (args as any).priority_id,
          assigned_to_id: assignedToId,
          estimated_hours: (args as any).estimated_hours,
        });
        return {
          content: [
            {
              type: 'text',
              text: `Task created successfully!\n\nID: ${issue.issue.id}\nSubject: ${issue.issue.subject}\nStatus: ${issue.issue.status.name}\n\nView at: ${REDMINE_URL}/issues/${issue.issue.id}`,
            },
          ],
        };
      }

      case 'get_task': {
        const issueId = (args as any).issue_id || stateManager.getCurrentTask();
        if (!issueId) {
          return {
            content: [
              {
                type: 'text',
                text: 'Error: issue_id is required. Either provide it or set a current task using set_current_task.',
              },
            ],
            isError: true,
          };
        }

        const issue = await redmineClient.getIssue(issueId, (args as any).include);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(issue, null, 2),
            },
          ],
        };
      }

      case 'update_task': {
        const issueId = (args as any).issue_id || stateManager.getCurrentTask();
        if (!issueId) {
          return {
            content: [
              {
                type: 'text',
                text: 'Error: issue_id is required. Either provide it or set a current task using set_current_task.',
              },
            ],
            isError: true,
          };
        }

        const updates: any = {};
        if ((args as any).subject) updates.subject = (args as any).subject;
        if ((args as any).description) updates.description = (args as any).description;
        if ((args as any).status_id) updates.status_id = (args as any).status_id;
        if ((args as any).assigned_to_id) updates.assigned_to_id = (args as any).assigned_to_id;
        if ((args as any).notes) updates.notes = (args as any).notes;

        await redmineClient.updateIssue(issueId, updates);
        return {
          content: [
            {
              type: 'text',
              text: `Task #${issueId} updated successfully!\n\nView at: ${REDMINE_URL}/issues/${issueId}`,
            },
          ],
        };
      }

      case 'log_time': {
        const issueId = (args as any).issue_id || stateManager.getCurrentTask();
        if (!issueId) {
          return {
            content: [
              {
                type: 'text',
                text: 'Error: issue_id is required. Either provide it or set a current task using set_current_task.',
              },
            ],
            isError: true,
          };
        }

        if (!(args as any).activity_id) {
          return {
            content: [
              {
                type: 'text',
                text: 'Error: activity_id is required for logging time. Use list_activities to see available activity options and their IDs.',
              },
            ],
            isError: true,
          };
        }

        const timeEntry = await redmineClient.logTime({
          issue_id: issueId,
          hours: (args as any).hours,
          comments: (args as any).comments,
          spent_on: (args as any).spent_on,
          activity_id: (args as any).activity_id,
        });
        return {
          content: [
            {
              type: 'text',
              text: `Time logged successfully!\n\nHours: ${timeEntry.time_entry.hours}\nIssue: #${issueId}\nActivity: ${timeEntry.time_entry.activity.name}\nComments: ${timeEntry.time_entry.comments || 'N/A'}`,
            },
          ],
        };
      }

      case 'list_tasks': {
        const projectId = (args as any).project_id || stateManager.getCurrentProject();

        const issues = await redmineClient.listIssues({
          project_id: projectId,
          assigned_to_id: (args as any).assigned_to_id,
          status_id: (args as any).status_id,
          limit: (args as any).limit || 25,
        });

        const taskList = issues.issues.map((issue: any) =>
          `#${issue.id}: ${issue.subject} [${issue.status.name}]`
        ).join('\n');

        const contextInfo = projectId ? ` (Project: ${projectId})` : '';
        return {
          content: [
            {
              type: 'text',
              text: `Found ${issues.total_count} tasks${contextInfo} (showing ${issues.issues.length}):\n\n${taskList}`,
            },
          ],
        };
      }

      case 'get_time_entries': {
        const issueId = (args as any).issue_id || stateManager.getCurrentTask();
        if (!issueId) {
          return {
            content: [
              {
                type: 'text',
                text: 'Error: issue_id is required. Either provide it or set a current task using set_current_task.',
              },
            ],
            isError: true,
          };
        }

        const timeEntries = await redmineClient.getTimeEntries(issueId);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(timeEntries, null, 2),
            },
          ],
        };
      }

      case 'get_today_time_entries': {
        const timeEntries = await redmineClient.getTodayTimeEntries();

        if (timeEntries.time_entries.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: 'No time entries logged today.',
              },
            ],
          };
        }

        const today = new Date().toISOString().split('T')[0];
        let totalHours = 0;
        const entriesByIssue: { [key: number]: any[] } = {};

        // Group entries by issue and calculate total
        timeEntries.time_entries.forEach((entry: any) => {
          totalHours += entry.hours;
          const issueId = entry.issue.id;
          if (!entriesByIssue[issueId]) {
            entriesByIssue[issueId] = [];
          }
          entriesByIssue[issueId].push(entry);
        });

        // Format output
        let output = `Time entries for ${today}:\n\n`;

        Object.keys(entriesByIssue).forEach((issueId) => {
          const entries = entriesByIssue[parseInt(issueId)];
          const issueHours = entries.reduce((sum, e) => sum + e.hours, 0);
          const issueSubject = entries[0].issue.id;

          output += `Issue #${issueId}: ${issueHours}h\n`;
          entries.forEach((entry: any) => {
            output += `  - ${entry.hours}h (${entry.activity.name})${entry.comments ? `: ${entry.comments}` : ''}\n`;
          });
          output += '\n';
        });

        output += `Total hours today: ${totalHours}h`;

        return {
          content: [
            {
              type: 'text',
              text: output,
            },
          ],
        };
      }

      case 'list_activities': {
        const activities = await redmineClient.listTimeEntryActivities();
        const activityList = activities.time_entry_activities.map((activity: any) =>
          `${activity.id}: ${activity.name}${activity.is_default ? ' (default)' : ''}`
        ).join('\n');

        return {
          content: [
            {
              type: 'text',
              text: `Available time entry activities:\n\n${activityList}`,
            },
          ],
        };
      }

      case 'list_issue_statuses': {
        const statuses = await redmineClient.listIssueStatuses();
        const statusList = statuses.issue_statuses.map((status: any) =>
          `${status.id}: ${status.name}${status.is_default ? ' (default)' : ''}${status.is_closed ? ' [Closed]' : ' [Open]'}`
        ).join('\n');

        return {
          content: [
            {
              type: 'text',
              text: `Available issue statuses:\n\n${statusList}\n\nYou can also use:\n- "open" for all open statuses\n- "closed" for all closed statuses\n- "*" for all statuses`,
            },
          ],
        };
      }

      case 'check_my_issues': {
        // Get current user
        const user = await redmineClient.getCurrentUser();
        const userId = user.user.id;

        // If status_id is not provided, list available statuses and prompt
        if (!(args as any).status_id) {
          const statuses = await redmineClient.listIssueStatuses();
          const statusList = statuses.issue_statuses.map((status: any) =>
            `${status.id}: ${status.name}${status.is_default ? ' (default)' : ''}${status.is_closed ? ' [Closed]' : ' [Open]'}`
          ).join('\n');

          return {
            content: [
              {
                type: 'text',
                text: `Please specify a status_id to filter your issues.\n\nAvailable issue statuses:\n\n${statusList}\n\nYou can also use:\n- "open" for all open statuses\n- "closed" for all closed statuses
- "*" for all statuses\n\nExample: Use check_my_issues with status_id parameter set to "open" to see all your open issues.`,
              },
            ],
          };
        }

        // Fetch issues for current user with specified status
        const issues = await redmineClient.listIssues({
          assigned_to_id: userId,
          status_id: (args as any).status_id,
          limit: (args as any).limit || 25,
        });

        const taskList = issues.issues.map((issue: any) =>
          `#${issue.id}: ${issue.subject} [${issue.status.name}]`
        ).join('\n');

        return {
          content: [
            {
              type: 'text',
              text: `Found ${issues.total_count} issues assigned to ${user.user.login} (showing ${issues.issues.length}):\n\n${taskList}`,
            },
          ],
        };
      }

      case 'list_projects': {
        const projects = await redmineClient.listProjects();
        const projectList = projects.projects.map((project: any) =>
          `${project.id}: ${project.name} (${project.identifier})`
        ).join('\n');

        return {
          content: [
            {
              type: 'text',
              text: `Available projects (${projects.projects.length} of ${projects.total_count}):\n\n${projectList}`,
            },
          ],
        };
      }

      case 'get_current_user': {
        const user = await redmineClient.getCurrentUser();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(user, null, 2),
            },
          ],
        };
      }

      case 'set_current_project': {
        try {
          // Fetch project details to confirm it exists and get the numeric ID
          const project = await redmineClient.getProject((args as any).project_id);
          // Always store the numeric ID, not the slug
          stateManager.setCurrentProject(project.project.id);
          return {
            content: [
              {
                type: 'text',
                text: `Current project set to: ${project.project.name} (ID: ${project.project.id})`,
              },
            ],
          };
        } catch (error: any) {
          // If project not found, provide helpful error message
          if (error.response?.status === 404) {
            return {
              content: [
                {
                  type: 'text',
                  text: `Error: Project '${(args as any).project_id}' not found.\n\nREMINDER: You should call list_projects first to see available projects and ensure the project exists before calling set_current_project.`,
                },
              ],
              isError: true,
            };
          }
          throw error; // Re-throw other errors to be handled by outer catch
        }
      }

      case 'get_current_project': {
        const projectId = stateManager.getCurrentProject();
        if (!projectId) {
          return {
            content: [
              {
                type: 'text',
                text: 'No current project set. Use set_current_project to set one.',
              },
            ],
          };
        }
        const project = await redmineClient.getProject(projectId);
        return {
          content: [
            {
              type: 'text',
              text: `Current project: ${project.project.name} (ID: ${project.project.id})`,
            },
          ],
        };
      }

      case 'set_current_task': {
        stateManager.setCurrentTask((args as any).issue_id);
        // Fetch task details to confirm it exists
        const issue = await redmineClient.getIssue((args as any).issue_id);
        return {
          content: [
            {
              type: 'text',
              text: `Current task set to: #${issue.issue.id} - ${issue.issue.subject}`,
            },
          ],
        };
      }

      case 'get_current_task': {
        const taskId = stateManager.getCurrentTask();
        if (!taskId) {
          return {
            content: [
              {
                type: 'text',
                text: 'No current task set. Use set_current_task to set one.',
              },
            ],
          };
        }
        const issue = await redmineClient.getIssue(taskId);
        return {
          content: [
            {
              type: 'text',
              text: `Current task: #${issue.issue.id} - ${issue.issue.subject}`,
            },
          ],
        };
      }

      case 'get_context': {
        const context = stateManager.getContext();
        let contextText = 'Current context:\n\n';

        if (context.projectId) {
          const project = await redmineClient.getProject(context.projectId);
          contextText += `Project: ${project.project.name} (ID: ${project.project.id})\n`;
        } else {
          contextText += 'Project: Not set\n';
        }

        if (context.taskId) {
          const issue = await redmineClient.getIssue(context.taskId);
          contextText += `Task: #${issue.issue.id} - ${issue.issue.subject}\n`;
        } else {
          contextText += 'Task: Not set\n';
        }

        return {
          content: [
            {
              type: 'text',
              text: contextText,
            },
          ],
        };
      }

      case 'clear_context': {
        stateManager.clearContext();
        return {
          content: [
            {
              type: 'text',
              text: 'All context cleared (project and task).',
            },
          ],
        };
      }

      default:
        return {
          content: [
            {
              type: 'text',
              text: `Unknown tool: ${name}`,
            },
          ],
          isError: true,
        };
    }
  } catch (error: any) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error.message}\n\nDetails: ${JSON.stringify(error.response?.data || error, null, 2)}`,
        },
      ],
      isError: true,
    };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Redmine MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
