// src/lib/i18n/en/pert.ts
// English translations for PERT Diagram

export const en_pert = {
  // PERT Diagram Header
  pertDiagram: 'PERT Diagram',
  pertDiagramTitle: 'PERT Diagram',
  
  // Project nodes
  projectStart: 'Project Start',
  projectEnd: 'Project End',
  
  // Toolbar buttons
  calculateCriticalPath: 'Calculate Critical Path',
  autoLayout: 'Auto Layout',
  resetDiagram: 'Reset Diagram',
  addExistingTasks: 'Add existing tasks',
  createTask: 'Create new task',
  createProject: 'New Project',
  manageProjectTasks: 'Project details and tasks',
  projectDetails: 'Project Details',
  
  // Stats labels
  totalDuration: 'Total Duration',
  criticalPathLength: 'Critical Path',
  totalTasks: 'Total Tasks',
  completedTasks: 'Completed',
  
  // Project card
  tasks: 'Tasks',
  
  // Time estimates
  optimistic: 'Optimistic (O)',
  mostLikely: 'Most Likely (M)',
  pessimistic: 'Pessimistic (P)',
  expected: 'Expected',
  
  // Dependency types
  finishToStart: 'Finish to Start (FS)',
  startToStart: 'Start to Start (SS)',
  finishToFinish: 'Finish to Finish (FF)',
  startToFinish: 'Start to Finish (SF)',
  
  // Edge labels
  fs: 'FS',
  ss: 'SS',
  ff: 'FF',
  sf: 'SF',
  
  // Edge tooltips
  dependency: 'Dependency',
  criticalPath: 'Critical Path',
  lagTime: 'Lag Time',
  duration: 'Duration',
  days: 'days',
  
  // Dependency type descriptions
  fsDescription: 'Finish-to-Start: Task A must finish before Task B can start.',
  ssDescription: 'Start-to-Start: Task A must start before Task B can start.',
  ffDescription: 'Finish-to-Finish: Task A must finish before Task B can finish.',
  sfDescription: 'Start-to-Finish: Task A must start before Task B can finish.',
  doubleClickToEdit: 'Double-click to edit',
  
  // Messages
  noTasksWithPertEstimates: 'No tasks with PERT estimates found',
  pertCalculationError: 'Error calculating PERT',
  
  // Tooltips
  criticalPathTooltip: 'Calculate critical path - the longest path through the diagram',
  autoLayoutTooltip: 'Automatically arrange nodes in logical order',
  resetDiagramTooltip: 'Reset node positions and layout',
  
  // Dialog
  editTaskEstimates: 'Edit Task Estimates',
  enterPertTimesInDays: 'Enter optimistic, most likely, and pessimistic durations (days).',
  editDependency: 'Edit Dependency',
  dependencyType: 'Dependency Type',
  save: 'Save',
  cancel: 'Cancel',
  
  // Node menu
  editPert: 'Edit PERT',
  editTask: 'Edit Task',
  removeFromProject: 'Remove from project',
  
  // Validation
  optimisticMustBeLessThanMostLikely: 'Optimistic time must be less than most likely',
  mostLikelyMustBeLessThanPessimistic: 'Most likely time must be less than pessimistic',
  allTimesMustBePositive: 'All times must be positive',
  
  // Empty states
  noProjectsAvailable: 'No projects available',
  createYourFirstProject: 'Create your first project',
  noTasksInProject: 'No tasks in this project',
  addTasksToGetStarted: 'Add tasks to get started',
  
  // Project Details Dialog
  manageProjectTasksTitle: 'Project',
  projectName: 'Project name',
  description: 'Description',
  startDate: 'Start date',
  endDate: 'End date',
  status: 'Status',
  planning: 'Planning',
  active: 'Active',
  completed: 'Completed',
  onHold: 'On Hold',
  archived: 'Archived',
  client: 'Client',
  selectClient: 'Select client',
  noClient: 'No client',
  projectLinks: 'Project links',
  addLink: 'Add link',
  tasksInProject: 'Tasks in this project',
  taskRemoved: 'Task removed',
  removedFromProject: 'removed from project',
  error: 'Error',
  failedToRemoveTask: 'Failed to remove task',
  close: 'Close',
  projectUpdated: 'Project updated',
  projectUpdatedDesc: 'saved.',
  failedToSaveProject: 'Failed to save project',
  saveChanges: 'Save changes',
  
  // Eisenhower Priority
  eisenhowerPriority: 'Priority',
  quadrant_do: 'Do',
  quadrant_decide: 'Decide',
  quadrant_delegate: 'Delegate',
  quadrant_delete: 'Delete',
  clearLabel: 'Clear',
  
  // Time Estimates
  timeEstimates: 'Time Estimates',
  pertAnalysis: 'PERT Analysis',
};
