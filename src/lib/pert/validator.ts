import type { Task } from '@/lib/types';

/**
 * Validate task dependencies for circular references
 */
export function validateTaskDependencies(tasks: Task[]): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  const taskMap = new Map(tasks.map(t => [t.id, t]));

  // Check for non-existent dependencies
  for (const task of tasks) {
    if (task.dependencies) {
      for (const depId of task.dependencies) {
        if (!taskMap.has(depId)) {
          errors.push(`Task "${task.name}" depends on non-existent task ID: ${depId}`);
        }
      }
    }
  }

  // Check for circular dependencies using DFS
  const visited = new Set<string>();
  const visiting = new Set<string>();

  const hasCycle = (taskId: string, path: string[] = []): boolean => {
    if (visiting.has(taskId)) {
      const cycleStart = path.indexOf(taskId);
      const cycle = path.slice(cycleStart).concat(taskId);
      const taskNames = cycle.map(id => taskMap.get(id)?.name || id);
      errors.push(`Circular dependency detected: ${taskNames.join(' → ')}`);
      return true;
    }

    if (visited.has(taskId)) {
      return false;
    }

    visiting.add(taskId);
    const task = taskMap.get(taskId);
    
    if (task?.dependencies) {
      for (const depId of task.dependencies) {
        if (hasCycle(depId, [...path, taskId])) {
          return true;
        }
      }
    }

    visiting.delete(taskId);
    visited.add(taskId);
    return false;
  };

  // Check all tasks for cycles
  for (const task of tasks) {
    if (!visited.has(task.id)) {
      hasCycle(task.id);
    }
  }

  // Check for self-dependencies
  for (const task of tasks) {
    if (task.dependencies?.includes(task.id)) {
      errors.push(`Task "${task.name}" cannot depend on itself`);
    }
  }

  // Check for orphaned tasks (tasks that depend on nothing and nothing depends on them)
  const dependedUpon = new Set<string>();
  let tasksWithDependencies = 0;

  for (const task of tasks) {
    if (task.dependencies && task.dependencies.length > 0) {
      tasksWithDependencies++;
      task.dependencies.forEach(depId => dependedUpon.add(depId));
    }
  }

  const orphanedTasks = tasks.filter(
    task => !task.dependencies?.length && !dependedUpon.has(task.id)
  );

  if (orphanedTasks.length > 0 && tasks.length > 1) {
    const orphanNames = orphanedTasks.map(t => t.name).join(', ');
    warnings.push(`Tasks with no dependencies or dependents: ${orphanNames}`);
  }

  // Check for missing PERT time estimates
  const tasksWithoutEstimates = tasks.filter(
    task => !task.optimisticTime || !task.mostLikelyTime || !task.pessimisticTime
  );

  if (tasksWithoutEstimates.length > 0) {
    const taskNames = tasksWithoutEstimates.map(t => t.name).join(', ');
    warnings.push(`Tasks missing PERT time estimates: ${taskNames}`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Suggest automatic dependency fixes
 */
export function suggestDependencyFixes(tasks: Task[]): {
  suggestions: Array<{
    type: 'remove_circular' | 'add_missing' | 'remove_invalid';
    taskId: string;
    taskName: string;
    description: string;
    action: () => Task[];
  }>;
} {
  const suggestions: Array<{
    type: 'remove_circular' | 'add_missing' | 'remove_invalid';
    taskId: string;
    taskName: string;
    description: string;
    action: () => Task[];
  }> = [];

  const taskMap = new Map(tasks.map(t => [t.id, t]));

  // Find and suggest fixes for invalid dependencies
  for (const task of tasks) {
    if (task.dependencies) {
      const invalidDeps = task.dependencies.filter(depId => !taskMap.has(depId));
      
      if (invalidDeps.length > 0) {
        suggestions.push({
          type: 'remove_invalid',
          taskId: task.id,
          taskName: task.name,
          description: `Remove invalid dependencies: ${invalidDeps.join(', ')}`,
          action: () => tasks.map(t => 
            t.id === task.id 
              ? { ...t, dependencies: t.dependencies?.filter(depId => taskMap.has(depId)) }
              : t
          ),
        });
      }
    }
  }

  // Suggest dependencies based on dates
  for (const task of tasks) {
    if (!task.dependencies || task.dependencies.length === 0) {
      const potentialDeps = tasks.filter(otherTask => {
        if (otherTask.id === task.id) return false;
        
        const otherEnd = new Date(otherTask.deadline);
        const thisStart = new Date(task.startDate);
        
        // If another task ends before this one starts, it could be a dependency
        return otherEnd <= thisStart;
      });

      if (potentialDeps.length > 0 && potentialDeps.length <= 3) {
        suggestions.push({
          type: 'add_missing',
          taskId: task.id,
          taskName: task.name,
          description: `Add potential dependencies: ${potentialDeps.map(t => t.name).join(', ')}`,
          action: () => tasks.map(t => 
            t.id === task.id 
              ? { ...t, dependencies: [...(t.dependencies || []), ...potentialDeps.map(dep => dep.id)] }
              : t
          ),
        });
      }
    }
  }

  return { suggestions };
}

/**
 * Validate PERT diagram consistency
 */
export function validatePertConsistency(tasks: Task[]): {
  isValid: boolean;
  issues: Array<{
    severity: 'error' | 'warning';
    taskId: string;
    taskName: string;
    message: string;
  }>;
} {
  const issues: Array<{
    severity: 'error' | 'warning';
    taskId: string;
    taskName: string;
    message: string;
  }> = [];

  for (const task of tasks) {
    // Check time estimate consistency
    if (task.optimisticTime && task.mostLikelyTime && task.pessimisticTime) {
      if (task.optimisticTime > task.mostLikelyTime) {
        issues.push({
          severity: 'error',
          taskId: task.id,
          taskName: task.name,
          message: 'Optimistic time is greater than most likely time',
        });
      }

      if (task.mostLikelyTime > task.pessimisticTime) {
        issues.push({
          severity: 'error',
          taskId: task.id,
          taskName: task.name,
          message: 'Most likely time is greater than pessimistic time',
        });
      }

      const range = task.pessimisticTime - task.optimisticTime;
      if (range > task.mostLikelyTime * 3) {
        issues.push({
          severity: 'warning',
          taskId: task.id,
          taskName: task.name,
          message: 'Very large time estimate range - consider reviewing estimates',
        });
      }
    }

    // Check date consistency with dependencies
    if (task.dependencies && task.dependencies.length > 0) {
      const taskStart = new Date(task.startDate);
      
      for (const depId of task.dependencies) {
        const depTask = tasks.find(t => t.id === depId);
        if (depTask) {
          const depEnd = new Date(depTask.deadline);
          if (taskStart < depEnd) {
            issues.push({
              severity: 'warning',
              taskId: task.id,
              taskName: task.name,
              message: `Start date conflicts with dependency "${depTask.name}" end date`,
            });
          }
        }
      }
    }

    // Check for unrealistic durations
    if (task.expectedTime && task.expectedTime > 365) {
      issues.push({
        severity: 'warning',
        taskId: task.id,
        taskName: task.name,
        message: 'Task duration exceeds one year - please verify',
      });
    }

    if (task.expectedTime && task.expectedTime < 0.1) {
      issues.push({
        severity: 'warning',
        taskId: task.id,
        taskName: task.name,
        message: 'Task duration is very short - please verify',
      });
    }
  }

  return {
    isValid: issues.filter(i => i.severity === 'error').length === 0,
    issues,
  };
}