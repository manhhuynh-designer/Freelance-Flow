import type { Task } from '@/lib/types';

/**
 * Calculate expected time using PERT formula
 * Expected Time = (Optimistic + 4 * Most Likely + Pessimistic) / 6
 * Rounded to 2 decimal places
 */
export function calculateExpectedTime(
  optimistic: number,
  mostLikely: number,
  pessimistic: number
): number {
  const rawExpected = (optimistic + 4 * mostLikely + pessimistic) / 6;
  return Math.round(rawExpected * 100) / 100;
}

/**
 * Calculate variance using PERT formula
 * Variance = ((Pessimistic - Optimistic) / 6)²
 */
export function calculateVariance(
  optimistic: number,
  pessimistic: number
): number {
  const diff = pessimistic - optimistic;
  return Math.pow(diff / 6, 2);
}

/**
 * Calculate standard deviation
 */
export function calculateStandardDeviation(variance: number): number {
  return Math.sqrt(variance);
}

/**
 * Update a task with calculated PERT values
 */
export function updateTaskWithPertCalculations(task: Task): Task {
  if (!task.optimisticTime || !task.mostLikelyTime || !task.pessimisticTime) {
    return task;
  }

  const expectedTime = calculateExpectedTime(
    task.optimisticTime,
    task.mostLikelyTime,
    task.pessimisticTime
  );

  return {
    ...task,
    expectedTime,
    duration: expectedTime, // Also update the general duration field
  };
}

/**
 * Update multiple tasks with PERT calculations
 */
export function updateTasksWithPertCalculations(tasks: Task[]): Task[] {
  return tasks.map(updateTaskWithPertCalculations);
}

/**
 * Get task duration for PERT calculations
 * Priority: expectedTime > duration > (deadline - startDate in days)
 */
export function getTaskDuration(task: Task): number {
  if (task.expectedTime) {
    return task.expectedTime;
  }
  
  if (task.duration) {
    return task.duration;
  }

  // Fallback: calculate from dates
  const startDate = new Date(task.startDate);
  const endDate = new Date(task.deadline);
  const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return Math.max(1, diffDays); // Minimum 1 day
}

/**
 * Validate PERT time estimates
 */
export function validatePertEstimates(
  optimistic: number,
  mostLikely: number,
  pessimistic: number
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (optimistic <= 0) {
    errors.push('Optimistic time must be greater than 0');
  }

  if (mostLikely <= 0) {
    errors.push('Most likely time must be greater than 0');
  }

  if (pessimistic <= 0) {
    errors.push('Pessimistic time must be greater than 0');
  }

  if (optimistic > mostLikely) {
    errors.push('Optimistic time should not be greater than most likely time');
  }

  if (mostLikely > pessimistic) {
    errors.push('Most likely time should not be greater than pessimistic time');
  }

  if (optimistic > pessimistic) {
    errors.push('Optimistic time should not be greater than pessimistic time');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}