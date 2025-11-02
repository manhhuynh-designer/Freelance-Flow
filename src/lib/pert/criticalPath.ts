import type { Task } from '@/lib/types';
import { getTaskDuration } from './calculator';

export interface CriticalPathResult {
  criticalPath: string[]; // Array of task IDs
  projectDuration: number;
  tasksWithTimes: Task[];
}

/**
 * Perform forward pass to calculate early start and early finish times
 */
function forwardPass(tasks: Task[]): Map<string, { earlyStart: number; earlyFinish: number }> {
  const times = new Map<string, { earlyStart: number; earlyFinish: number }>();
  const processed = new Set<string>();
  
  // Helper function to process a task
  const processTask = (task: Task): void => {
    if (processed.has(task.id)) return;

    let earlyStart = 0;

    // Calculate early start based on dependencies
    if (task.dependencies && task.dependencies.length > 0) {
      for (const depId of task.dependencies) {
        const depTimes = times.get(depId);
        if (depTimes) {
          earlyStart = Math.max(earlyStart, depTimes.earlyFinish);
        }
      }
    }

    const duration = getTaskDuration(task);
    const earlyFinish = earlyStart + duration;

    times.set(task.id, { earlyStart, earlyFinish });
    processed.add(task.id);
  };

  // Process tasks in dependency order (topological sort)
  const taskMap = new Map(tasks.map(t => [t.id, t]));
  const visited = new Set<string>();
  const visiting = new Set<string>();
  const sortedTasks: Task[] = [];

  const dfs = (taskId: string): void => {
    if (visiting.has(taskId)) {
      throw new Error(`Circular dependency detected involving task ${taskId}`);
    }
    if (visited.has(taskId)) return;

    visiting.add(taskId);
    
    const task = taskMap.get(taskId);
    if (task?.dependencies) {
      for (const depId of task.dependencies) {
        if (taskMap.has(depId)) {
          dfs(depId);
        }
      }
    }
    
    visiting.delete(taskId);
    visited.add(taskId);
    
    if (task) {
      sortedTasks.push(task);
    }
  };

  // Start DFS from all tasks
  for (const task of tasks) {
    if (!visited.has(task.id)) {
      dfs(task.id);
    }
  }

  // Process tasks in sorted order
  for (const task of sortedTasks) {
    processTask(task);
  }

  return times;
}

/**
 * Perform backward pass to calculate late start and late finish times
 */
function backwardPass(
  tasks: Task[],
  forwardTimes: Map<string, { earlyStart: number; earlyFinish: number }>,
  projectDuration: number
): Map<string, { lateStart: number; lateFinish: number }> {
  const times = new Map<string, { lateStart: number; lateFinish: number }>();
  const taskMap = new Map(tasks.map(t => [t.id, t]));

  // Find tasks with no successors (end tasks)
  const successors = new Map<string, string[]>();
  for (const task of tasks) {
    if (task.dependencies) {
      for (const depId of task.dependencies) {
        if (!successors.has(depId)) {
          successors.set(depId, []);
        }
        successors.get(depId)!.push(task.id);
      }
    }
  }

  // Initialize end tasks
  for (const task of tasks) {
    if (!successors.has(task.id) || successors.get(task.id)!.length === 0) {
      const forwardTime = forwardTimes.get(task.id);
      if (forwardTime) {
        times.set(task.id, {
          lateFinish: forwardTime.earlyFinish,
          lateStart: forwardTime.earlyFinish - getTaskDuration(task),
        });
      }
    }
  }

  // Process tasks in reverse order
  const processed = new Set<string>();
  const processTask = (task: Task): void => {
    if (processed.has(task.id)) return;

    let lateFinish = projectDuration;
    
    // Calculate late finish based on successors
    const taskSuccessors = successors.get(task.id) || [];
    if (taskSuccessors.length > 0) {
      lateFinish = Math.min(
        ...taskSuccessors
          .map(succId => times.get(succId)?.lateStart)
          .filter(Boolean) as number[]
      );
    }

    const duration = getTaskDuration(task);
    const lateStart = lateFinish - duration;

    times.set(task.id, { lateStart, lateFinish });
    processed.add(task.id);
  };

  // Process all tasks
  let changed = true;
  while (changed) {
    changed = false;
    for (const task of tasks) {
      if (!processed.has(task.id)) {
        const taskSuccessors = successors.get(task.id) || [];
        const allSuccessorsProcessed = taskSuccessors.every(succId => processed.has(succId));
        
        if (allSuccessorsProcessed) {
          processTask(task);
          changed = true;
        }
      }
    }
  }

  return times;
}

/**
 * Calculate slack time for each task
 */
function calculateSlack(
  tasks: Task[],
  forwardTimes: Map<string, { earlyStart: number; earlyFinish: number }>,
  backwardTimes: Map<string, { lateStart: number; lateFinish: number }>
): Map<string, number> {
  const slack = new Map<string, number>();

  for (const task of tasks) {
    const forward = forwardTimes.get(task.id);
    const backward = backwardTimes.get(task.id);

    if (forward && backward) {
      const taskSlack = backward.lateStart - forward.earlyStart;
      slack.set(task.id, taskSlack);
    }
  }

  return slack;
}

/**
 * Find the critical path in a project
 */
export function findCriticalPath(tasks: Task[]): CriticalPathResult {
  if (tasks.length === 0) {
    return {
      criticalPath: [],
      projectDuration: 0,
      tasksWithTimes: [],
    };
  }

  try {
    // Forward pass
    const forwardTimes = forwardPass(tasks);
    
    // Calculate project duration
    const projectDuration = Math.max(
      ...Array.from(forwardTimes.values()).map(t => t.earlyFinish)
    );

    // Backward pass
    const backwardTimes = backwardPass(tasks, forwardTimes, projectDuration);

    // Calculate slack
    const slackTimes = calculateSlack(tasks, forwardTimes, backwardTimes);

    // Update tasks with calculated times
    const tasksWithTimes = tasks.map(task => {
      const forward = forwardTimes.get(task.id);
      const backward = backwardTimes.get(task.id);
      const slack = slackTimes.get(task.id);

      return {
        ...task,
        earlyStart: forward?.earlyStart,
        earlyFinish: forward?.earlyFinish,
        lateStart: backward?.lateStart,
        lateFinish: backward?.lateFinish,
        slack,
        isCritical: slack === 0,
      };
    });

    // Find critical path (tasks with zero slack)
    const criticalPath = tasksWithTimes
      .filter(task => task.slack === 0)
      .map(task => task.id);

    return {
      criticalPath,
      projectDuration,
      tasksWithTimes,
    };
  } catch (error) {
    console.error('Error calculating critical path:', error);
    return {
      criticalPath: [],
      projectDuration: 0,
      tasksWithTimes: tasks,
    };
  }
}

/**
 * Validate dependencies for circular references
 */
export function validateDependencies(tasks: Task[]): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  const taskMap = new Map(tasks.map(t => [t.id, t]));

  try {
    // Try to perform forward pass - this will throw if there are circular dependencies
    forwardPass(tasks);
    
    // Check for invalid dependencies (references to non-existent tasks)
    for (const task of tasks) {
      if (task.dependencies) {
        for (const depId of task.dependencies) {
          if (!taskMap.has(depId)) {
            errors.push(`Task "${task.name}" depends on non-existent task ID: ${depId}`);
          }
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  } catch (error) {
    errors.push(error instanceof Error ? error.message : 'Unknown dependency error');
    return {
      isValid: false,
      errors,
    };
  }
}