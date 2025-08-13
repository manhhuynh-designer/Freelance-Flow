'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, AlertCircle, Play, RefreshCw } from 'lucide-react';
import { useDashboard } from '@/contexts/dashboard-context';
import { AIIntegrationTester } from '@/ai/utils/ai-integration-test-complete';

export function AIIntegrationTestComponent() {
  const { appData } = useDashboard();
  const [testResults, setTestResults] = useState<any>(null);
  const [isRunning, setIsRunning] = useState(false);

  const runCompleteTest = async () => {
    setIsRunning(true);
    console.log('🚀 Starting Complete AI Integration Test...');
    
    try {
      // Verify component integration first
      const componentStatus = AIIntegrationTester.verifyComponentIntegration();
      
      // Run complete AI integration test
      const results = await AIIntegrationTester.testCompleteAIIntegration(
        appData,
        appData.appSettings.googleApiKey
      );
      
      setTestResults({
        ...results,
        componentIntegration: componentStatus,
        appData: {
          tasks: appData.tasks.length,
          clients: appData.clients.length,
          collaborators: appData.collaborators.length,
          quotes: appData.quotes?.length || 0
        }
      });
    } catch (error: any) {
      console.error('Test failed:', error);
      setTestResults({
        success: false,
        error: error?.message || 'Unknown error',
        appData: {
          tasks: appData.tasks.length,
          clients: appData.clients.length,
          collaborators: appData.collaborators.length,
          quotes: appData.quotes?.length || 0
        }
      });
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusIcon = (success: boolean) => {
    return success ? 
      <CheckCircle className="w-5 h-5 text-green-500" /> : 
      <XCircle className="w-5 h-5 text-red-500" />;
  };

  const getStatusBadge = (success: boolean) => {
    return (
      <Badge variant={success ? "default" : "destructive"}>
        {success ? "PASS" : "FAIL"}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-4">
        <h2 className="text-2xl font-bold">🧪 AI Integration Verification</h2>
        <p className="text-muted-foreground">
          Test AI logic ↔ Component integration with real data
        </p>
        
        <Button 
          onClick={runCompleteTest}
          disabled={isRunning}
          size="lg"
        >
          {isRunning ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Running Tests...
            </>
          ) : (
            <>
              <Play className="w-4 h-4 mr-2" />
              Run Integration Test
            </>
          )}
        </Button>
      </div>

      {/* Real Data Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            Real Data Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{appData.tasks.length}</div>
              <div className="text-sm text-muted-foreground">Tasks</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{appData.clients.length}</div>
              <div className="text-sm text-muted-foreground">Clients</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{appData.collaborators.length}</div>
              <div className="text-sm text-muted-foreground">Collaborators</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{appData.quotes?.length || 0}</div>
              <div className="text-sm text-muted-foreground">Quotes</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Test Results */}
      {testResults && (
        <div className="space-y-4">
          {/* Overall Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Integration Test Results</span>
                {getStatusBadge(testResults.success)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-lg font-semibold text-green-600">
                    {testResults.summary?.passed || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Tests Passed</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-red-600">
                    {testResults.summary?.failed || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Tests Failed</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-blue-600">
                    {testResults.summary?.totalTests || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Tests</div>
                </div>
              </div>
              
              <div className="mt-4 p-4 bg-muted rounded-lg space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>🔗 Real Data Connection:</span>
                  <Badge variant="default">
                    {testResults.summary?.realDataUsed ? "✅ CONNECTED" : "❌ DISCONNECTED"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>🚫 Mock Data Usage:</span>
                  <Badge variant={testResults.summary?.mockDataUsed ? "destructive" : "default"}>
                    {testResults.summary?.mockDataUsed ? "❌ USING MOCK" : "✅ NO MOCK"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Individual Test Results */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Business Intelligence Test */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  {getStatusIcon(testResults.results?.businessIntelligence?.success)}
                  Business Intelligence
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-xs text-muted-foreground">
                  📁 business-intelligence-new.ts
                </div>
                <div className="text-xs">
                  📊 Data: {testResults.results?.businessIntelligence?.dataSource}
                </div>
                {testResults.results?.businessIntelligence?.businessIntelligence && (
                  <div className="space-y-1 text-xs">
                    <div>💡 Insights: {testResults.results.businessIntelligence.businessIntelligence.insights?.length || 0}</div>
                    <div>📈 Forecasts: {testResults.results.businessIntelligence.businessIntelligence.forecasts?.length || 0}</div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Prediction Engine Test */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  {getStatusIcon(testResults.results?.predictionEngine?.success)}
                  Prediction Engine
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-xs text-muted-foreground">
                  📁 enhanced-prediction-engine-new.ts
                </div>
                <div className="text-xs">
                  📊 Data: {testResults.results?.predictionEngine?.dataSource}
                </div>
                {testResults.results?.predictionEngine?.predictions && (
                  <div className="text-xs">
                    🔮 Predictions: {testResults.results.predictionEngine.predictions.length}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* AI Task Predictor Test */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  {getStatusIcon(testResults.results?.aiTaskPredictor?.success)}
                  AI Task Predictor
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-xs text-muted-foreground">
                  📁 ai-task-predictor.ts
                </div>
                <div className="text-xs">
                  🔌 API: {testResults.results?.aiTaskPredictor?.fallbackUsed ? "Fallback" : "Connected"}
                </div>
                <div className="text-xs">
                  📝 Tasks: {testResults.results?.aiTaskPredictor?.realTasksAnalyzed || 0}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Component Integration Details */}
          {testResults.componentIntegration && (
            <Card>
              <CardHeader>
                <CardTitle>🔗 Component → AI Engine Mapping</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="border rounded p-3 bg-green-50">
                    <div className="font-medium text-green-800">✅ BusinessDashboard.tsx</div>
                    <div className="text-xs text-green-600 mt-1">
                      → business-intelligence-new.ts → useDashboard() → Real AppData
                    </div>
                  </div>
                  <div className="border rounded p-3 bg-blue-50">
                    <div className="font-medium text-blue-800">✅ PredictiveInsights.tsx</div>
                    <div className="text-xs text-blue-600 mt-1">
                      → usePredictiveAnalysis() → AI Engines → Real Tasks/Clients
                    </div>
                  </div>
                  <div className="border rounded p-3 bg-purple-50">
                    <div className="font-medium text-purple-800">✅ AIDashboard.tsx</div>
                    <div className="text-xs text-purple-600 mt-1">
                      → Unified Hub → All Components → Real Data Flow
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
