'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Brain, 
  MessageCircle, 
  Zap, 
  TrendingUp, 
  Database,
  History,
  Link2,
  CheckCircle,
  Clock,
  AlertTriangle,
  Sparkles
} from 'lucide-react';
import { useDashboard } from '@/contexts/dashboard-context';
import { cn } from '@/lib/utils';

interface AIConnection {
  id: string;
  name: string;
  description: string;
  icon: any;
  status: 'connected' | 'partial' | 'disconnected';
  features: string[];
  lastSync?: Date;
  dataPoints?: number;
}

interface AIConnectionsProps {
  className?: string;
  showDetailed?: boolean;
}

export function AIConnections({ className, showDetailed = false }: AIConnectionsProps) {
  const { appData, T } = useDashboard();
  const [connections, setConnections] = useState<AIConnection[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    generateConnections();
  }, [appData]);

  const generateConnections = () => {
    const tasks = appData?.tasks || [];
    const clients = appData?.clients || [];
    const quotes = appData?.quotes || [];

    const aiConnections: AIConnection[] = [
      {
        id: 'chat-ai',
        name: 'Chat AI Assistant',
        description: 'Natural language conversation with task management integration',
        icon: MessageCircle,
        status: 'connected',
        features: [
          'Task creation from chat',
          'Interactive elements',
          'Clickable task links',
          'Context-aware responses',
          'Multi-language support'
        ],
        lastSync: new Date(),
        dataPoints: tasks.length + clients.length
      },
      {
        id: 'predictive-insights',
        name: 'Predictive Intelligence',
        description: 'AI-powered forecasting and risk analysis',
        icon: Zap,
        status: tasks.length > 5 ? 'connected' : 'partial',
        features: [
          'Task completion prediction',
          'Budget overrun alerts',
          'Deadline risk assessment',
          'Resource conflict detection',
          'Performance trending'
        ],
        lastSync: new Date(Date.now() - 300000), // 5 minutes ago
        dataPoints: tasks.length * 3
      },
      {
        id: 'business-intelligence',
        name: 'Business Intelligence',
        description: 'Revenue analytics and performance metrics',
        icon: TrendingUp,
        status: quotes.length > 0 ? 'connected' : 'partial',
        features: [
          'Revenue tracking',
          'Client profitability',
          'Performance metrics',
          'Capacity planning',
          'Growth analysis'
        ],
        lastSync: new Date(Date.now() - 600000), // 10 minutes ago
        dataPoints: quotes.length + clients.length
      },
      {
        id: 'pattern-analysis',
        name: 'Pattern Recognition',
        description: 'Behavioral insights and productivity optimization',
        icon: Brain,
        status: tasks.length > 10 ? 'connected' : 'partial',
        features: [
          T?.workflowPatternsLabel || 'Workflow patterns',
          'Time usage analysis',
          'Productivity insights',
          'Habit recognition',
          'Optimization suggestions'
        ],
        lastSync: new Date(Date.now() - 900000), // 15 minutes ago
        dataPoints: tasks.length * 2
      },
      {
        id: 'context-memory',
        name: 'Smart Context',
        description: 'Intelligent context awareness and memory',
        icon: Database,
        status: 'connected',
        features: [
          'Conversation memory',
          'Context preservation',
          'Smart suggestions',
          'Learning from interactions',
          'Personalized responses'
        ],
        lastSync: new Date(Date.now() - 120000), // 2 minutes ago
        dataPoints: 50 // Mock context entries
      },
      {
        id: 'action-history',
        name: 'Action Tracking',
        description: 'Complete history of AI interactions and actions',
        icon: History,
        status: 'connected',
        features: [
          'Action logging',
          'Undo/redo support',
          'Activity timeline',
          'Performance tracking',
          'Usage analytics'
        ],
        lastSync: new Date(),
        dataPoints: 25 // Mock action entries
      }
    ];

    setConnections(aiConnections);
  };

  const getStatusIcon = (status: AIConnection['status']) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'partial':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'disconnected':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
    }
  };

  const getStatusColor = (status: AIConnection['status']) => {
    switch (status) {
      case 'connected':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'partial':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'disconnected':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    }
  };

  const handleRefreshConnections = async () => {
    setIsLoading(true);
    // Simulate refresh
    await new Promise(resolve => setTimeout(resolve, 1500));
    generateConnections();
    setIsLoading(false);
  };

  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
    return `${Math.floor(minutes / 1440)}d ago`;
  };

  if (showDetailed) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link2 className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold">AI System Connections</h3>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefreshConnections}
            disabled={isLoading}
          >
            <Sparkles className="w-4 h-4 mr-2" />
            {isLoading ? 'Syncing...' : 'Refresh'}
          </Button>
        </div>

        <div className="grid gap-4">
          {connections.map((connection) => (
            <Card key={connection.id} className="relative">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <connection.icon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{connection.name}</CardTitle>
                      <CardDescription className="text-sm">
                        {connection.description}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(connection.status)}
                    <Badge className={getStatusColor(connection.status)}>
                      {connection.status}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Last sync: {formatTimestamp(connection.lastSync!)}</span>
                  <span>{connection.dataPoints} data points</span>
                </div>
                
                <div className="space-y-2">
                  <div className="text-sm font-medium">Connected Features:</div>
                  <div className="grid grid-cols-2 gap-1">
                    {connection.features.map((feature, index) => (
                      <div key={index} className="flex items-center gap-2 text-xs text-muted-foreground">
                        <CheckCircle className="w-3 h-3 text-green-500" />
                        {feature}
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Compact view
  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Link2 className="w-5 h-5 text-primary" />
          <CardTitle className="text-base">AI System Status</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {connections.slice(0, 4).map((connection) => (
            <div key={connection.id} className="flex items-center gap-2">
              <connection.icon className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm truncate">{connection.name}</span>
              {getStatusIcon(connection.status)}
            </div>
          ))}
        </div>
        
        <div className="mt-4 pt-3 border-t">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{connections.filter(c => c.status === 'connected').length} of {connections.length} connected</span>
            <span>Last check: {formatTimestamp(new Date())}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
