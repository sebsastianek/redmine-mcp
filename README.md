# Redmine MCP Server

> **For Developers**: A Model Context Protocol (MCP) server that connects Claude AI to Redmine for seamless task management during development workflows.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![MCP](https://img.shields.io/badge/MCP-1.0-green.svg)](https://modelcontextprotocol.io/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

## 🎯 Purpose

This MCP server is designed for **software developers** who want to integrate Redmine task management into their AI-assisted development workflow. It's **not** a tool for general Redmine administration or project management - instead, it focuses on common developer tasks like:

- Creating and updating issues while coding
- Logging time spent on tasks
- Querying your assigned tasks
- Managing development context (current project/task)

Perfect for developers using Claude Code, Claude Desktop, or other MCP-compatible AI assistants.

## ✨ Features

### Core Functionality
- 📝 **Task Management**: Create, read, update tasks with full field support
- ⏱️ **Time Tracking**: Log hours with detailed comments and activity types
- 🔍 **Smart Queries**: Filter tasks by project, assignee, status
- 👤 **User Info**: Fetch current user and project details

### Developer Experience
- 🎯 **Context Awareness**: Set current project/task to avoid repetitive ID specifications
- 💬 **Natural Language**: Interact with Redmine using conversational commands
- 🚀 **Fast Workflow**: Seamlessly integrate task management into coding sessions
- 🔄 **Real-time Updates**: All changes reflect immediately in Redmine

### Use Cases
- Create tasks while reviewing code
- Log time as you work on features
- Check your task list during daily standups
- Update task status as you progress through development

## 📦 Installation

### 1. Clone and Build

```bash
git clone https://github.com/sebsastianek/redmine-mcp.git
cd redmine-mcp
npm install
npm run build
```

### 2. Get Your Redmine API Key

1. Log into your Redmine instance
2. Navigate to **My account** (top-right corner)
3. Look for **API access key** section on the right
4. Click **Show** to reveal your key
5. Copy the API key for the next step

### 3. Configure with Claude Code (Recommended)

**Global Configuration** (available in all projects):

```bash
claude mcp add --transport stdio -g redmine \
  --env REDMINE_URL=https://your-redmine-instance.com \
  --env REDMINE_API_KEY=your_api_key_here \
  -- node /absolute/path/to/redmine-mcp/build/index.js
```

**Local Configuration** (project-specific):

```bash
cd /path/to/your/project
claude mcp add --transport stdio redmine \
  --env REDMINE_URL=https://your-redmine-instance.com \
  --env REDMINE_API_KEY=your_api_key_here \
  -- node /absolute/path/to/redmine-mcp/build/index.js
```

**Verify Installation:**

```bash
claude mcp list
# Should show: redmine: ✓ Connected
```

## 🎯 Keep Context

Instead of:
```
❌ "Log 2 hours on task #1234"
❌ "Add comment to task #1234"
❌ "Update task #1234 status"
```

Do this:
```
✅ "Set task #1234 as current"
✅ "Log 2 hours"
✅ "Add comment with note"
✅ "Update status to 3"
```

### Developer Workflow Example

```bash
# Morning standup
You: "What are my open tasks?"
Claude: Shows your assigned tasks

# Start working
You: "Set task #1234 as current"
You: "Set project 'mobile-app' as current"

# During development
You: "Log 1.5 hours with activity 9 for implementing OAuth"
You: "Update status to In Progress"

# Check context
You: "What's my current context?"
Claude: "Project: mobile-app (ID: 5), Task: #1234 - Implement OAuth"

# Switch tasks
You: "Set task #1235 as current"
```

### Available Context Commands

| Command | Purpose |
|---------|---------|
| `set_current_project` | Set active project for new tasks |
| `get_current_project` | View current project context |
| `set_current_task` | Set active task for updates/time logging |
| `get_current_task` | View current task context |
| `get_context` | View both project and task context |
| `clear_context` | Reset all context |

## 🛠️ Available Tools

All tools support both explicit IDs and context-based operations.

### create_task
Create a new task (issue) in Redmine.

**Parameters**:
- `project_id`: Project ID or identifier (uses current project if not specified)
- `subject` (required): Task title
- `description`: Detailed description
- `tracker_id`: Tracker type (e.g., 1=Bug, 2=Feature)
- `status_id`: Initial status
- `priority_id`: Priority level
- `assigned_to_id`: Assign to user ID
- `estimated_hours`: Estimated time for completion

### get_task
Get detailed information about a specific task.

**Parameters**:
- `issue_id`: The task ID (uses current task if not specified)
- `include`: Array of additional data to include (children, attachments, relations, journals, etc.)

### update_task
Update an existing task.

**Parameters**:
- `issue_id`: The task ID to update (uses current task if not specified)
- `subject`: New title
- `description`: New description
- `status_id`: New status
- `assigned_to_id`: New assignee
- `notes`: Add a comment/note

### log_time
Log hours spent on a task.

**Parameters**:
- `issue_id`: The task ID (uses current task if not specified)
- `hours` (required): Hours spent
- `activity_id` (required): Activity type ID (use `list_activities` to see available options)
- `comments`: Description of work done
- `spent_on`: Date (YYYY-MM-DD, defaults to today)

### list_activities
List all available time entry activities.

**Parameters**: None

**Returns**: List of activities with their IDs and names, marking the default activity.

**Example output**:
```
Available time entry activities:

9: Development
10: Design
11: Testing (default)
```

### list_tasks
List tasks with optional filters.

**Parameters**:
- `project_id`: Filter by project (uses current project if not specified)
- `assigned_to_id`: Filter by assignee (use "me" for current user)
- `status_id`: Filter by status ("open", "closed", "*" for all)
- `limit`: Maximum results (default: 25)

### get_time_entries
Get all time entries for a specific task.

**Parameters**:
- `issue_id`: The task ID (uses current task if not specified)

### list_projects
List all available projects (no parameters required).

### get_current_user
Get information about the authenticated user (no parameters required).

### set_current_project
Set the current project context for subsequent operations.

**Parameters**:
- `project_id` (required): Project ID or identifier to set as current

### get_current_project
Get the current project context (no parameters required).

### set_current_task
Set the current task context for subsequent operations.

**Parameters**:
- `issue_id` (required): Task/issue ID to set as current

### get_current_task
Get the current task context (no parameters required).

### get_context
Get all current context information - both project and task (no parameters required).

### clear_context
Clear all current context - both project and task (no parameters required).
