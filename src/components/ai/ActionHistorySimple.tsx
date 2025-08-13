'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  History, 
  Clock, 
  CheckCircle,
  AlertCircle,
  User,
  FileText,
  RefreshCw,
  Filter,
  Plus,
  Edit,
  Trash2,
  RotateCcw
} from 'lucide-react';
import { useDashboard } from '@/contexts/dashboard-context';
import type { ActionBufferEntry } from '@/hooks/useActionBuffer';

interface ActionHistorySimpleProps {
  className?: string;
}

export function ActionHistorySimple({ className }: ActionHistorySimpleProps) {
  const { appData, actionBuffer } = useDashboard();
  const [filter, setFilter] = useState<'all' | 'today' | 'week'>('all');
  const [isLoading, setIsLoading] = useState(false);

  // Get real actions from action buffer
  const realActions = actionBuffer?.getActionHistory() || [];

  const handleRefresh = async () => {
    setIsLoading(true);
    // Just simulate refresh since we're using real data
    await new Promise(resolve => setTimeout(resolve, 500));
    setIsLoading(false);
  };

  const getFilteredActions = () => {
    const now = new Date();
    switch (filter) {
      case 'today':
        return realActions.filter((action: ActionBufferEntry) => {
          const actionDate = new Date(action.timestamp);
          return actionDate.toDateString() === now.toDateString();
        });
      case 'week':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return realActions.filter((action: ActionBufferEntry) => action.timestamp >= weekAgo);
      default:
        return realActions;
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'create': return Plus;
      case 'edit': return Edit;
      case 'delete': return Trash2;
      case 'statusChange': return RotateCcw;
      default: return FileText;
    }
  };

  const getStatusColor = (canUndo: boolean) => {
    return canUndo 
      ? 'bg-green-50 text-green-700 border-green-200'
      : 'bg-gray-50 text-gray-700 border-gray-200';
  };

  const getTypeColor = (action: string) => {
    switch (action) {
      case 'create': return 'text-blue-600';
      case 'edit': return 'text-amber-600';
      case 'delete': return 'text-red-600';
      case 'statusChange': return 'text-purple-600';
      default: return 'text-gray-600';
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    const diff = Date.now() - timestamp.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const filteredActions = getFilteredActions();

  return (
    <div className={`space-y-6 ${className || ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="w-6 h-6 text-gray-500" />
          <div>
            <h2 className="text-xl font-bold">Action History</h2>
            <p className="text-sm text-muted-foreground">
              Track your recent activities and AI interactions
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
          >
            All
          </Button>
          <Button
            variant={filter === 'today' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('today')}
          >
            Today
          </Button>
          <Button
            variant={filter === 'week' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('week')}
          >
            This Week
          </Button>
          <Button
            onClick={handleRefresh}
            disabled={isLoading}
            size="sm"
            className="gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Action Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Total Actions</p>
              <p className="text-2xl font-bold text-gray-600">{filteredActions.length}</p>
            </div>
            <History className="w-6 h-6 text-muted-foreground" />
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Can Undo</p>
              <p className="text-2xl font-bold text-green-600">
                {filteredActions.filter((a: ActionBufferEntry) => a.canUndo).length}
              </p>
            </div>
            <CheckCircle className="w-6 h-6 text-muted-foreground" />
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Today</p>
              <p className="text-2xl font-bold text-orange-600">
                {realActions.filter((a: ActionBufferEntry) => {
                  const actionDate = new Date(a.timestamp);
                  return actionDate.toDateString() === new Date().toDateString();
                }).length}
              </p>
            </div>
            <Clock className="w-6 h-6 text-muted-foreground" />
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Latest</p>
              <p className="text-sm text-muted-foreground">
                {filteredActions.length > 0 ? formatTimestamp(filteredActions[0].timestamp) : 'No activity'}
              </p>
            </div>
            <Clock className="w-6 h-6 text-muted-foreground" />
          </div>
        </Card>
      </div>

      {/* Actions Timeline */}
      <div className="space-y-4">
        {filteredActions.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <History className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                No actions found for the selected time period.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-6 top-0 bottom-0 w-px bg-gray-200" />
            
            <div className="space-y-6">
              {filteredActions.map((action: ActionBufferEntry, index: number) => {
                const IconComponent = getActionIcon(action.action);
                return (
                  <div key={action.id} className="relative flex items-start gap-4">
                    {/* Timeline dot */}
                    <div className={`relative z-10 p-2 rounded-full border-2 bg-white ${getStatusColor(action.canUndo)}`}>
                      <IconComponent className={`w-4 h-4 ${getTypeColor(action.action)}`} />
                    </div>
                    
                    {/* Action card */}
                    <Card className="flex-1">
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-base">{action.description}</CardTitle>
                            <CardDescription>{action.entityType} • {action.action}</CardDescription>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="capitalize">
                              {action.action.replace(/([A-Z])/g, ' $1').trim()}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {formatTimestamp(action.timestamp)}
                            </span>
                          </div>
                        </div>
                      </CardHeader>
                      
                      {/* Action Details */}
                      <CardContent className="pt-0">
                        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <span>Entity:</span>
                            <span className="font-medium">{action.entityType}</span>
                          </span>
                          <span className="flex items-center gap-1">
                            <span>ID:</span>
                            <span className="font-medium">{action.entityId.slice(-8)}</span>
                          </span>
                          {action.canUndo && (
                            <Badge variant="secondary" className="text-xs">
                              Can Undo
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
