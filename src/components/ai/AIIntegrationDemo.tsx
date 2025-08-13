'use client';

import { useState } from 'react';
import { useDashboard } from '@/contexts/dashboard-context';
import { testAIIntegration, validateUserAPIKey, shouldUseAI } from '@/ai/utils/ai-integration-test';
import { AIConfigManager } from '@/ai/utils/ai-config-manager';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Brain, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

export function AIIntegrationDemo() {
  const { appData } = useDashboard();
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  const apiKeyValidation = validateUserAPIKey(appData.appSettings);
  const aiAvailable = shouldUseAI(appData.appSettings);
  const aiStatus = AIConfigManager.getAIStatus(appData.appSettings);

  const handleTestAI = async () => {
    setTesting(true);
    setTestResult(null);

    try {
      const result = await testAIIntegration({
        appSettings: appData.appSettings,
        tasks: appData.tasks || [],
        clients: appData.clients || [],
        userPatterns: [],
        memoryEntries: []
      });

      setTestResult(result);
    } catch (error) {
      setTestResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setTesting(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'configured':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'missing_key':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'invalid_key':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default:
        return <XCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'configured': return 'green';
      case 'missing_key': return 'red';
      case 'invalid_key': return 'yellow';
      default: return 'gray';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI Integration Status
          </CardTitle>
          <CardDescription>
            Test tích hợp AI thực tế với khóa API từ cài đặt người dùng
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* API Key Status */}
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-3">
              {getStatusIcon(aiStatus.status)}
              <div>
                <div className="font-medium">API Key Status</div>
                <div className="text-sm text-muted-foreground">
                  {apiKeyValidation.message}
                </div>
              </div>
            </div>
            <Badge variant={getStatusColor(aiStatus.status) as any}>
              {aiStatus.status}
            </Badge>
          </div>

          {/* AI Configuration */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Provider:</span> {aiStatus.provider}
            </div>
            <div>
              <span className="font-medium">Model:</span> {aiStatus.model}
            </div>
          </div>

          {/* Test Button */}
          <Button 
            onClick={handleTestAI}
            disabled={!aiAvailable || testing}
            className="w-full"
          >
            {testing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Đang test AI...
              </>
            ) : (
              <>
                <Brain className="mr-2 h-4 w-4" />
                Test AI Integration
              </>
            )}
          </Button>

          {/* Test Results */}
          {testResult && (
            <div className="space-y-3">
              <Alert variant={testResult.success ? "default" : "destructive"}>
                <AlertDescription>
                  {testResult.success ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="font-medium">AI Test thành công!</span>
                      </div>
                      {testResult.insights && (
                        <div className="text-sm">
                          Đã tạo {testResult.insights.length} insights từ AI thực tế
                        </div>
                      )}
                      {testResult.fallbackUsed && (
                        <div className="text-sm text-yellow-600">
                          Sử dụng fallback analysis
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <XCircle className="h-4 w-4 text-red-500" />
                        <span className="font-medium">AI Test thất bại</span>
                      </div>
                      <div className="text-sm">
                        {testResult.error || 'Unknown error'}
                      </div>
                    </div>
                  )}
                </AlertDescription>
              </Alert>

              {/* AI Insights Preview */}
              {testResult.success && testResult.insights && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">AI Insights Preview</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {testResult.insights.slice(0, 3).map((insight: any, index: number) => (
                        <div key={index} className="text-sm p-2 border rounded">
                          <div className="font-medium">{insight.category}</div>
                          <div className="text-muted-foreground">
                            {insight.insight}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Confidence: {(insight.confidence * 100).toFixed(0)}%
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Configuration Tips */}
          {!apiKeyValidation.isValid && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <div className="font-medium">Cần cấu hình API key:</div>
                  <ol className="list-decimal list-inside text-sm space-y-1">
                    <li>Truy cập <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Google Cloud Console</a></li>
                    <li>Tạo hoặc chọn project</li>
                    <li>Enable Generative AI API</li>
                    <li>Tạo API key mới</li>
                    <li>Nhập API key trong Settings → AI Configuration</li>
                  </ol>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Data Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Data Available for AI Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>Tasks: {appData.tasks?.length || 0}</div>
            <div>Clients: {appData.clients?.length || 0}</div>
            <div>Categories: {appData.categories?.length || 0}</div>
            <div>Collaborators: {appData.collaborators?.length || 0}</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
