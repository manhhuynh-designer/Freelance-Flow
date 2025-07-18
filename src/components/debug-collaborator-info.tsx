"use client";

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import type { Collaborator, Task } from '../lib/types';

type DebugCollaboratorInfoProps = {
  collaborators: Collaborator[];
  tasks: Task[];
};

export function DebugCollaboratorInfo({ collaborators, tasks }: DebugCollaboratorInfoProps) {
  const collaboratorUsage = useMemo(() => {
    const usage = new Map<string, number>();
    
    tasks.forEach(task => {
      if (task.collaboratorIds && task.collaboratorIds.length > 0) {
        task.collaboratorIds.forEach(id => {
          usage.set(id, (usage.get(id) || 0) + 1);
        });
      }
    });
    
    return usage;
  }, [tasks]);

  const orphanedCollaboratorIds = useMemo(() => {
    const allCollaboratorIds = new Set(collaborators.map(c => c.id));
    const usedCollaboratorIds = new Set<string>();
    
    tasks.forEach(task => {
      if (task.collaboratorIds && task.collaboratorIds.length > 0) {
        task.collaboratorIds.forEach(id => {
          if (id) usedCollaboratorIds.add(id);
        });
      }
    });
    
    return Array.from(usedCollaboratorIds).filter(id => !allCollaboratorIds.has(id));
  }, [collaborators, tasks]);

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="text-sm">🐛 Debug: Collaborator Info</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="text-xs">
          <div className="font-medium">Total Collaborators: {collaborators.length}</div>
          <div className="space-y-1 mt-2">
            {collaborators.map(collab => (
              <div key={collab.id} className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {collab.id}
                </Badge>
                <span>{collab.name}</span>
                <Badge variant="secondary" className="text-xs">
                  Used in {collaboratorUsage.get(collab.id) || 0} tasks
                </Badge>
              </div>
            ))}
          </div>
          
          {orphanedCollaboratorIds.length > 0 && (
            <div className="mt-3 p-2 bg-red-50 rounded border">
              <div className="font-medium text-red-800">⚠️ Orphaned Collaborator IDs:</div>
              <div className="text-red-600 text-xs">
                {orphanedCollaboratorIds.map(id => (
                  <Badge key={id} variant="destructive" className="text-xs mr-1">
                    {id}
                  </Badge>
                ))}
              </div>
              <div className="text-red-600 text-xs mt-1">
                These collaborator IDs are used in tasks but don't exist in the collaborators list.
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
