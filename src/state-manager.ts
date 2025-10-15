/**
 * State manager for tracking current context (project, task, etc.)
 */
export class StateManager {
  private currentProjectId: number | null = null;
  private currentTaskId: number | null = null;

  /**
   * Set the current project context
   * Only accepts numeric project IDs to ensure consistency with Redmine API
   */
  setCurrentProject(projectId: number): void {
    this.currentProjectId = projectId;
  }

  /**
   * Get the current project context
   */
  getCurrentProject(): number | null {
    return this.currentProjectId;
  }

  /**
   * Set the current task context
   */
  setCurrentTask(taskId: number): void {
    this.currentTaskId = taskId;
  }

  /**
   * Get the current task context
   */
  getCurrentTask(): number | null {
    return this.currentTaskId;
  }

  /**
   * Get all current context
   */
  getContext(): { projectId: number | null; taskId: number | null } {
    return {
      projectId: this.currentProjectId,
      taskId: this.currentTaskId,
    };
  }

  /**
   * Clear all context
   */
  clearContext(): void {
    this.currentProjectId = null;
    this.currentTaskId = null;
  }
}
