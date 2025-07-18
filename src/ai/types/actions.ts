/**
 * @fileoverview Defines the types for AI-driven actions within the application.
 * This provides a structured way for the AI to suggest and execute commands.
 */

/**
 * Defines the structure for an action suggested by the AI.
 * These actions are intended to be performed by the client application
 * after user confirmation if required.
 */
export interface EnhancedAIAction {
  /**
   * The specific type of action to be performed.
   * This determines the expected structure of the payload.
   */
  type:
    | 'createTask'
    | 'editTask' // Renamed from updateTask
    | 'deleteTask'
    | 'generateQuote'
    | 'scheduleReminder'
    | 'analyzeProject'
    | 'suggestPricing'
    | 'exportReport'
    | 'createClient'
    | 'editClient'
    | 'deleteClient'
    | 'createCollaborator'
    | 'editCollaborator'
    | 'deleteCollaborator'
    | 'createCategory'
    | 'editCategory'
| 'exportContentToTask'
    | 'deleteCategory';

  /**
   * The data required to perform the action.
   * The structure of the payload is dependent on the action type.
   * Example: For 'updateTask', payload might be { taskId: 'abc', status: 'completed' }.
   */
  payload: any;

  /**
   * A confidence score (0-1) from the AI about the correctness of the suggested action.
   * A low confidence score might require user confirmation.
   */
  confidence: number;

  /**
   * If true, this action requires explicit confirmation from the user
   * before it can be executed. This is crucial for destructive actions like 'deleteTask'.
   */
  confirmationRequired: boolean;
}