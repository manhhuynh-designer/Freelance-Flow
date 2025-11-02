"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { useDashboard } from '@/contexts/dashboard-context';
import PertDiagramEditor from '@/components/pert/PertDiagramEditor';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  GitBranch, 
  Plus
} from 'lucide-react';
import type { Task, Client, Category, Collaborator } from '@/lib/types';

interface PertViewProps {
  tasks?: Task[];
  clients?: Client[];
  categories?: Category[];
  collaborators?: Collaborator[];
  projects?: any[]; // Allow projects to be passed as props if needed for server-side or SSR flows
  selectedProject?: string; // Prop for pre-selected project
  onProjectChange?: (project: string) => void;
  onCreateProject?: (data: { name: string; description?: string }) => void;
  T?: any;
}

const PertView: React.FC<PertViewProps> = ({ 
  tasks: propTasks, 
  clients: propClients, 
  categories: propCategories, 
  collaborators: propCollaborators,
  projects: propProjects,
  selectedProject: propSelectedProject,
  onProjectChange: propOnProjectChange,
  onCreateProject: propOnCreateProject,
  T
}) => {
  const { 
    appData, 
    updateTask, 
    deleteTask,
    clients: contextClients,
    categories: contextCategories,
    collaborators: contextCollaborators,
    projects: contextProjects,
    updateProject: contextUpdateProject,
    addProject: contextAddProject,
    addClient: contextAddClient
  } = useDashboard();

  // Use props if provided, otherwise fall back to context
  const allTasks = propTasks || appData?.tasks || [];
  const clients = propClients || contextClients;
  const categories = propCategories || contextCategories;
  const collaborators = propCollaborators || contextCollaborators;
  const projects = propProjects || contextProjects || [];

  // Local state for selected project, allowing external control via prop
  const [localSelectedProject, setLocalSelectedProject] = useState<string | undefined>(propSelectedProject);

  // Sync local selected project with prop, or set default if no prop and projects exist
  useEffect(() => {
    if (propSelectedProject !== undefined) {
      setLocalSelectedProject(propSelectedProject);
    } else if (projects.length > 0 && !localSelectedProject) {
      // If there are projects and nothing is selected, default to 'all' or the first project
      setLocalSelectedProject('all');
    } else if (projects.length === 0 && localSelectedProject && localSelectedProject !== 'none') {
        // If all projects are deleted, reset selection
        setLocalSelectedProject('none');
    }
  }, [propSelectedProject, projects, localSelectedProject]);

  const handleProjectChange = (projectId: string) => {
    setLocalSelectedProject(projectId);
    propOnProjectChange?.(projectId); // Propagate to external handler if provided
  };

  // Memoized effectiveSelectedProject to pass down to PertDiagramEditor
  const effectiveSelectedProject = useMemo(() => {
    if (projects.length === 0) return 'none'; // No projects, no selection
    if (!localSelectedProject || localSelectedProject === 'none') {
        return 'all'; // Default to "All Projects" if nothing specific or "none" is selected
    }
    // Ensure the selected project actually exists
    const found = projects.some(p => p.id === localSelectedProject);
    return found ? localSelectedProject : 'all'; // Fallback to 'all' if selected doesn't exist
  }, [localSelectedProject, projects]);

  const handleTaskDelete = (taskId: string) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      deleteTask(taskId);
    }
  };

  return (
    <div className="h-full w-full">
      {/* Outer frame with border and comfortable padding (no overflow clipping) */}
      <div className="h-full w-full border rounded-lg shadow-sm bg-background p-3 sm:p-4 md:p-6">
        <PertDiagramEditor
          key={`pert-diagram-${effectiveSelectedProject}`} // Use selected project in key to force re-render on project change
          tasks={allTasks}
          clients={clients}
          categories={categories}
          collaborators={collaborators}
          projects={projects}
          selectedProject={effectiveSelectedProject}
          onProjectChange={handleProjectChange}
          onCreateProject={propOnCreateProject || contextAddProject}
          T={T}
          onTaskDelete={handleTaskDelete}
          onTaskPartialUpdate={(partial) => {
            // Persist PERT edits into app data (and PouchDB via context)
            updateTask({
              id: partial.id,
              optimisticTime: partial.optimisticTime,
              mostLikelyTime: partial.mostLikelyTime,
              pessimisticTime: partial.pessimisticTime,
              expectedTime: partial.expectedTime,
              dependencies: partial.dependencies,
            } as any);
          }}
          className="h-full w-full"
        />
      </div>
    </div>
  );
};

export default PertView;