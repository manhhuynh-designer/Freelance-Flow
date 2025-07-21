import type { Collaborator, Task, AppData } from './types';
import { initialCollaborators } from './data';

/**
 * Validation and synchronization utilities for collaborator data
 */

export class CollaboratorDataService {
  /**
   * Validates that all collaborator IDs referenced in tasks exist in the collaborators array
   */
  static validateCollaboratorReferences(collaborators: Collaborator[], tasks: Task[]): {
    isValid: boolean;
    orphanedIds: string[];
    missingCollaborators: string[];
  } {
    const collaboratorIds = new Set(collaborators.map(c => c.id));
    // Lấy tất cả collaboratorIds từ các task (kiểu mảng)
    const usedCollaboratorIds = new Set(
      tasks.flatMap(t => Array.isArray(t.collaboratorIds) ? t.collaboratorIds.filter(Boolean) : []).filter((id): id is string => Boolean(id))
    );

    const orphanedIds = Array.from(usedCollaboratorIds).filter(id => !collaboratorIds.has(id));
    const missingCollaborators = orphanedIds;

    return {
      isValid: orphanedIds.length === 0,
      orphanedIds,
      missingCollaborators
    };
  }

  /**
   * Ensures data integrity by adding missing initial collaborators if needed
   * @param skipInitialRestore - Skip restoring initial collaborators (for intentional clear operations)
   */
  static ensureDataIntegrity(appData: AppData, skipInitialRestore: boolean = false): AppData {
    const { collaborators, tasks } = appData;
    
    // If no collaborators exist and we're not skipping initial restore, use initial data
    if (!collaborators || collaborators.length === 0) {
      if (skipInitialRestore) {
        console.log('Collaborators cleared intentionally, keeping empty');
        return appData;
      }
      console.log('No collaborators found, using initial collaborators');
      return {
        ...appData,
        collaborators: [...initialCollaborators]
      };
    }

    // Check for orphaned collaborator references
    const validation = this.validateCollaboratorReferences(collaborators, tasks);
    
    if (!validation.isValid) {
      console.warn('Found orphaned collaborator references:', validation.orphanedIds);
      
      // Try to restore missing collaborators from initial data
      const restoredCollaborators = [...collaborators];
      let hasRestoredAny = false;

      validation.orphanedIds.forEach(orphanedId => {
        const initialCollab = initialCollaborators.find(ic => ic.id === orphanedId);
        if (initialCollab && !restoredCollaborators.find(rc => rc.id === orphanedId)) {
          restoredCollaborators.push(initialCollab);
          hasRestoredAny = true;
          console.log(`Restored missing collaborator: ${initialCollab.name} (${orphanedId})`);
        }
      });

      if (hasRestoredAny) {
        return {
          ...appData,
          collaborators: restoredCollaborators
        };
      }
    }

    return appData;
  }

  /**
   * Cleans up orphaned collaborator references in tasks
   */
  static cleanupOrphanedReferences(appData: AppData): AppData {
    const { collaborators, tasks } = appData;
    const collaboratorIds = new Set(collaborators.map(c => c.id));
    
    // Loại bỏ các collaboratorIds không tồn tại khỏi từng task
    const cleanedTasks = tasks.map(task => {
      if (Array.isArray(task.collaboratorIds)) {
        const validIds = task.collaboratorIds.filter(id => collaboratorIds.has(id));
        if (validIds.length !== task.collaboratorIds.length) {
          console.warn(`Removing orphaned collaborator references from task ${task.name}`);
        }
        return { ...task, collaboratorIds: validIds };
      }
      return task;
    });

    return {
      ...appData,
      tasks: cleanedTasks
    };
  }

  /**
   * Comprehensive data sync that ensures consistency
   * @param skipInitialRestore - Skip restoring initial collaborators (for intentional clear operations)
   */
  static syncCollaboratorData(appData: AppData, skipInitialRestore: boolean = false): AppData {
    let syncedData = this.ensureDataIntegrity(appData, skipInitialRestore);
    
    // Final validation
    const finalValidation = this.validateCollaboratorReferences(
      syncedData.collaborators, 
      syncedData.tasks
    );

    if (!finalValidation.isValid) {
      console.warn('Still have orphaned references after sync, cleaning up...');
      syncedData = this.cleanupOrphanedReferences(syncedData);
    }

    return syncedData;
  }

  /**
   * Special handling for imported JSON data
   * This method preserves the user's intent - if they exported without collaborators, keep it that way
   */
  static processImportedData(importedData: AppData): AppData {
    // For imported data, we want to preserve exactly what the user exported
    // No automatic fallback to initial collaborators - respect user's data structure
    
    if (!importedData.collaborators || importedData.collaborators.length === 0) {
      console.log('Imported data has no collaborators, keeping empty as intended');
      importedData.collaborators = [];
    } else {
      // If imported data has collaborators, only supplement with missing initial ones 
      // if they are referenced in tasks (to fix orphaned references)
      const usedCollaboratorIds = new Set(
        importedData.tasks?.flatMap(t => Array.isArray(t.collaboratorIds) ? t.collaboratorIds.filter(Boolean) : []).filter(Boolean) || []
      );
      
      const existingIds = new Set(importedData.collaborators.map(c => c.id));
      const missingReferencedCollaborators = initialCollaborators.filter(ic => 
        usedCollaboratorIds.has(ic.id) && !existingIds.has(ic.id)
      );
      
      if (missingReferencedCollaborators.length > 0) {
        console.log('Adding missing referenced collaborators to fix orphaned references:', 
          missingReferencedCollaborators.map(c => c.name));
        importedData.collaborators = [...importedData.collaborators, ...missingReferencedCollaborators];
      }
    }

    // Run standard sync but skip initial restore since we want to preserve import structure
    return this.syncCollaboratorData(importedData, true);
  }
}
