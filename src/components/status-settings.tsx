
"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { X, Plus } from "lucide-react"
import type { AppSettings, StatusSetting } from "@/lib/types"
import { i18n } from "@/lib/i18n"
import { useDashboard } from "@/contexts/dashboard-context"

type StatusSettingsProps = {
  settings: AppSettings
  onSettingsChange: React.Dispatch<React.SetStateAction<AppSettings>>
}

const SUB_STATUS_LIMIT = 5;

export function StatusSettings({ settings, onSettingsChange }: StatusSettingsProps) {
  const T = i18n[settings.language]
  const [newSubStatusInputs, setNewSubStatusInputs] = React.useState<Record<string, string>>({})
  
  // Get action buffer for tracking changes
  const dashboardContext = useDashboard();
  const actionBuffer = dashboardContext?.actionBuffer;

  const handleLabelChange = (statusId: StatusSetting['id'], newLabel: string) => {
    const oldLabel = (settings.statusSettings || []).find(s => s.id === statusId)?.label;
    
    onSettingsChange(prev => ({
      ...prev,
      statusSettings: (prev.statusSettings || []).map(s =>
        s.id === statusId ? { ...s, label: newLabel } : s
      ),
    }))
    
    // Track the change
    if (actionBuffer && oldLabel !== newLabel) {
      actionBuffer.pushAction({
        action: 'settings',
        entityType: 'settings',
        entityId: `status-${statusId}`,
        description: `Changed status "${oldLabel}" label to "${newLabel}"`,
        canUndo: true
      });
    }
  }
  
  const handleSubStatusLabelChange = (statusId: StatusSetting['id'], subStatusId: string, newLabel: string) => {
    const status = (settings.statusSettings || []).find(s => s.id === statusId);
    const oldLabel = status?.subStatuses.find(ss => ss.id === subStatusId)?.label;
    
    onSettingsChange(prev => ({
      ...prev,
      statusSettings: (prev.statusSettings || []).map(s =>
        s.id === statusId
          ? {
              ...s,
              subStatuses: s.subStatuses.map(ss =>
                ss.id === subStatusId ? { ...ss, label: newLabel } : ss
              ),
            }
          : s
      ),
    }))
    
    // Track the change
    if (actionBuffer && oldLabel !== newLabel) {
      actionBuffer.pushAction({
        action: 'settings',
        entityType: 'settings',
        entityId: `substatus-${subStatusId}`,
        description: `Changed sub-status "${oldLabel}" to "${newLabel}" in ${status?.label}`,
        canUndo: true
      });
    }
  }

  const handleNewSubStatusInputChange = (statusId: StatusSetting['id'], value: string) => {
      setNewSubStatusInputs(prev => ({...prev, [statusId]: value}));
  }


  const handleAddSubStatus = (statusId: StatusSetting['id']) => {
    const subStatusLabel = newSubStatusInputs[statusId]?.trim()
    if (!subStatusLabel) return

    const status = (settings.statusSettings || []).find(s => s.id === statusId);
    
    onSettingsChange(prev => ({
      ...prev,
      statusSettings: (prev.statusSettings || []).map(s => {
        if (s.id === statusId && s.subStatuses.length < SUB_STATUS_LIMIT) {
          return {
            ...s,
            subStatuses: [...s.subStatuses, { id: `sub-${Date.now()}`, label: subStatusLabel }],
          }
        }
        return s;
      }),
    }))
    
    setNewSubStatusInputs(prev => ({ ...prev, [statusId]: "" }))
    
    // Track the addition
    if (actionBuffer) {
      actionBuffer.pushAction({
        action: 'create',
        entityType: 'settings',
        entityId: `substatus-new`,
        description: `Added sub-status "${subStatusLabel}" to ${status?.label}`,
        canUndo: true
      });
    }
  }

  const handleDeleteSubStatus = (statusId: StatusSetting['id'], subStatusId: string) => {
    const status = (settings.statusSettings || []).find(s => s.id === statusId);
    const subStatus = status?.subStatuses.find(ss => ss.id === subStatusId);
    
    onSettingsChange(prev => ({
      ...prev,
      statusSettings: (prev.statusSettings || []).map(s =>
        s.id === statusId
          ? { ...s, subStatuses: s.subStatuses.filter(sub => sub.id !== subStatusId) }
          : s
      ),
    }))
    
    // Track the deletion
    if (actionBuffer && subStatus) {
      actionBuffer.pushAction({
        action: 'delete',
        entityType: 'settings',
        entityId: `substatus-${subStatusId}`,
        description: `Deleted sub-status "${subStatus.label}" from ${status?.label}`,
        canUndo: true
      });
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(settings.statusSettings || []).map((status) => (
          <div key={status.id} className="space-y-4 rounded-md p-4 bg-muted/50">
            {/* Main status row */}
            <div className="flex items-center gap-3">
              <span 
                className="h-4 w-4 rounded-full flex-shrink-0"
                style={{ backgroundColor: settings.statusColors[status.id] }} 
                title={T.statuses[status.id]}
              />
              <Input
                value={status.label}
                onChange={(e) => handleLabelChange(status.id, e.target.value)}
                className="font-semibold text-base h-9 bg-background"
              />
            </div>
            
            {/* Sub-status section (indented) */}
            <div className="pl-4 border-l-2 ml-2 space-y-2">
                <p className="text-xs font-medium text-muted-foreground">{T.subStatuses}</p>
              {status.subStatuses.map((sub) => (
                <div key={sub.id} className="flex items-center gap-2">
                  <Input
                    value={sub.label}
                    onChange={(e) => handleSubStatusLabelChange(status.id, sub.id, e.target.value)}
                    className="h-8 text-sm bg-background"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 flex-shrink-0"
                    onClick={() => handleDeleteSubStatus(status.id, sub.id)}
                    aria-label="Delete sub-status"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              
              {status.subStatuses.length < SUB_STATUS_LIMIT ? (
                <div className="flex items-center gap-2">
                   <Input
                      placeholder={T.newSubStatusPlaceholder}
                      value={newSubStatusInputs[status.id] || ""}
                      onChange={e => handleNewSubStatusInputChange(status.id, e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddSubStatus(status.id); } }}
                      className="h-8 text-sm bg-background"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-8"
                      onClick={() => handleAddSubStatus(status.id)}
                      disabled={!newSubStatusInputs[status.id]?.trim()}
                      aria-label="Add sub-status"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic px-2 pt-1">{T.subStatusLimitReached.replace('{limit}', String(SUB_STATUS_LIMIT))}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
