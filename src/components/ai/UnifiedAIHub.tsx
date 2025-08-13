'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Brain, 
  MessageCircle, 
  Zap, 
  Briefcase,
  History,
  Pencil
} from 'lucide-react';
import { useDashboard } from '@/contexts/dashboard-context';
import { i18n } from '@/lib/i18n';
import ChatView from '@/components/ChatView';
import { PredictionDashboard } from '@/components/ai/prediction/PredictionDashboard';
import { BusinessDashboard } from '@/components/ai/BusinessDashboard';
import { AIWritingSupport } from '@/components/ai/AIWritingSupport';
import { ActionHistorySimple } from '@/components/ai/ActionHistorySimple';
import { AIModelStatus } from '@/components/ai/AIModelStatus';
import { ActiveAIModelDisplay } from '@/components/ai/ActiveAIModelDisplay';

export default function UnifiedAIHub() {
  const [activeTab, setActiveTab] = useState('chat'); // Default to chat
  const router = useRouter();
  const { appData } = useDashboard();

  // 🔧 FIX: Handle loading state and missing data
  if (!appData) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-muted-foreground">Loading AI Hub...</p>
        </div>
      </div>
    );
  }

  // Get translation object
  const T = i18n[appData?.appSettings?.language || 'en'];
  
  // 🔧 DEBUG: Log data status
  console.log('📊 UnifiedAIHub data status:', {
    hasAppData: !!appData,
    tasksCount: appData?.tasks?.length || 0,
    clientsCount: appData?.clients?.length || 0,
    collaboratorsCount: appData?.collaborators?.length || 0,
    language: appData?.appSettings?.language
  });

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-background via-background to-muted/20">
      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          {/* Tab Navigation */}
          <div className="bg-card/30 border-b px-6 py-3">
            {/* AI Model Status - Only when API key missing OR Active display when configured */}
            <div className="mb-2">
              <AIModelStatus appSettings={appData?.appSettings} compact={true} />
              <ActiveAIModelDisplay appSettings={appData?.appSettings} showSettings={true} />
            </div>
            
            <TabsList className="grid w-full grid-cols-5 bg-muted/50">
              <TabsTrigger
                value="chat"
                className="text-foreground data-[state=inactive]:text-foreground data-[state=inactive]:bg-transparent hover:bg-muted data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                {T.aiChat}
              </TabsTrigger>
              <TabsTrigger value="writing" className="flex items-center gap-2 data-[state=active]:bg-sky-500 data-[state=active]:text-white">
                <Pencil className="w-4 h-4" />
                <span className="hidden sm:inline">{T.aiWritingSupport || 'AI Writing'}</span>
              </TabsTrigger>
              <TabsTrigger value="predictions" className="flex items-center gap-2 data-[state=active]:bg-purple-500 data-[state=active]:text-white">
                <Zap className="w-4 h-4" />
                <span className="hidden sm:inline">{T.predictions}</span>
              </TabsTrigger>
              <TabsTrigger value="business" className="flex items-center gap-2 data-[state=active]:bg-emerald-500 data-[state=active]:text-white">
                <Briefcase className="w-4 h-4" />
                <span className="hidden sm:inline">{T.business}</span>
              </TabsTrigger>
              <TabsTrigger value="history" className="flex items-center gap-2 data-[state=active]:bg-gray-500 data-[state=active]:text-white">
                <History className="w-4 h-4" />
                <span className="hidden sm:inline">{T.history}</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-hidden">
            {/* AI Chat Tab - Default and Primary */}
            <TabsContent value="chat" className="h-full m-0">
              <div className="h-full">
                <ChatView showHistoryPanel={true} />
              </div>
            </TabsContent>

            {/* AI Writing Support Tab */}
            <TabsContent value="writing" className="h-full overflow-y-auto m-0 p-6">
              <div className="max-w-5xl mx-auto space-y-4">
                <AIWritingSupport />
              </div>
            </TabsContent>

            {/* AI Prediction Tab */}
            <TabsContent value="predictions" className="h-full overflow-y-auto m-0 p-6">
              <div className="max-w-7xl mx-auto">
                {/* Real-time Prediction Dashboard */}
                <PredictionDashboard />
              </div>
            </TabsContent>

            {/* Business Dashboard Tab */}
            <TabsContent value="business" className="h-full overflow-y-auto m-0 p-6">
              <div className="max-w-7xl mx-auto">
                <BusinessDashboard />
              </div>
            </TabsContent>

            {/* Action History Tab */}
            <TabsContent value="history" className="h-full overflow-y-auto m-0 p-6">
              <div className="max-w-7xl mx-auto">
                <ActionHistorySimple />
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
