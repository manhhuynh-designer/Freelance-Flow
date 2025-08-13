/**
 * Learning Dashboard - Phase 4.2
 * UI component để monitor AI learning progress và pattern insights
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import { Brain, TrendingUp, Target, Clock, Zap, Award, AlertTriangle, CheckCircle, Info, Settings } from 'lucide-react';

import type { PatternInsight } from '@/ai/learning/pattern-analyzer';
import type { UserBehaviorPattern, PerformanceMetrics, UserPreferences } from '@/ai/learning/behavior-tracker';
import type { AdaptivePredictionModel, AdaptivePrediction, FeedbackData } from '@/ai/learning/adaptive-predictor';

export interface LearningDashboardProps {
  patterns: PatternInsight[];
  behaviorPatterns: UserBehaviorPattern[];
  performanceMetrics: PerformanceMetrics;
  userPreferences: UserPreferences;
  predictionModels: AdaptivePredictionModel[];
  recentPredictions: AdaptivePrediction[];
  feedbackHistory: FeedbackData[];
  onUpdatePreferences: (preferences: Partial<UserPreferences>) => void;
  onProvideFeedback: (predictionId: string, feedback: any) => void;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

const LearningDashboard: React.FC<LearningDashboardProps> = ({
  patterns,
  behaviorPatterns,
  performanceMetrics,
  userPreferences,
  predictionModels,
  recentPredictions,
  feedbackHistory,
  onUpdatePreferences,
  onProvideFeedback
}) => {
  const [selectedTimeRange, setSelectedTimeRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [showAllPatterns, setShowAllPatterns] = useState(false);

  // Calculate learning progress metrics
  const learningProgress = calculateLearningProgress(predictionModels, feedbackHistory);
  const improvementTrends = calculateImprovementTrends(predictionModels, selectedTimeRange);
  const patternStrengths = patterns.map(p => ({
    name: p.type.replace('_', ' '),
    strength: p.strength * 100,
    confidence: p.confidence * 100
  }));

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Brain className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">AI Learning Dashboard</h1>
            <p className="text-gray-600">Monitor learning progress và pattern insights</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant={learningProgress.overallScore > 80 ? 'default' : 'secondary'}>
            Learning Score: {learningProgress.overallScore.toFixed(0)}%
          </Badge>
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Target className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-gray-600">Prediction Accuracy</p>
                <p className="text-2xl font-bold text-gray-900">
                  {(predictionModels.reduce((sum, m) => sum + m.accuracy, 0) / predictionModels.length * 100).toFixed(1)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-gray-600">Patterns Detected</p>
                <p className="text-2xl font-bold text-gray-900">{patterns.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Zap className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-sm text-gray-600">AI Trust Level</p>
                <p className="text-2xl font-bold text-gray-900">
                  {(userPreferences.predictionTrust * 100).toFixed(0)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm text-gray-600">Learning Days</p>
                <p className="text-2xl font-bold text-gray-900">{learningProgress.learningDays}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="patterns" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="patterns">Behavior Patterns</TabsTrigger>
          <TabsTrigger value="accuracy">Model Accuracy</TabsTrigger>
          <TabsTrigger value="predictions">Recent Predictions</TabsTrigger>
          <TabsTrigger value="feedback">User Feedback</TabsTrigger>
          <TabsTrigger value="insights">Learning Insights</TabsTrigger>
        </TabsList>

        {/* Behavior Patterns Tab */}
        <TabsContent value="patterns" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pattern Strength Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5" />
                  <span>Pattern Strengths</span>
                </CardTitle>
                <CardDescription>
                  Detected behavioral patterns và confidence levels
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={patternStrengths}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="strength" fill="#8884d8" />
                    <Bar dataKey="confidence" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Pattern Details */}
            <Card>
              <CardHeader>
                <CardTitle>Pattern Details</CardTitle>
                <CardDescription>
                  Click để xem chi tiết từng pattern
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {patterns.slice(0, showAllPatterns ? undefined : 5).map((pattern, index) => (
                  <PatternCard key={index} pattern={pattern} />
                ))}
                {patterns.length > 5 && (
                  <Button 
                    variant="ghost" 
                    onClick={() => setShowAllPatterns(!showAllPatterns)}
                  >
                    {showAllPatterns ? 'Show Less' : `Show ${patterns.length - 5} More`}
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Model Accuracy Tab */}
        <TabsContent value="accuracy" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Accuracy Trends */}
            <Card>
              <CardHeader>
                <CardTitle>Accuracy Trends</CardTitle>
                <CardDescription>
                  Model accuracy improvement over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={improvementTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    {predictionModels.map((model, index) => (
                      <Line
                        key={model.id}
                        type="monotone"
                        dataKey={model.modelType}
                        stroke={COLORS[index % COLORS.length]}
                        strokeWidth={2}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Model Performance */}
            <Card>
              <CardHeader>
                <CardTitle>Model Performance</CardTitle>
                <CardDescription>
                  Current accuracy của từng prediction model
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {predictionModels.map((model) => (
                  <div key={model.id} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">
                        {model.modelType.replace('_', ' ').toUpperCase()}
                      </span>
                      <span className="text-sm text-gray-600">
                        {(model.accuracy * 100).toFixed(1)}%
                      </span>
                    </div>
                    <Progress value={model.accuracy * 100} className="h-2" />
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Training: {model.trainingDataSize} samples</span>
                      <span>Version: {model.version}</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Recent Predictions Tab */}
        <TabsContent value="predictions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent AI Predictions</CardTitle>
              <CardDescription>
                Latest predictions và adaptations based on your patterns
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {recentPredictions.slice(0, 10).map((prediction) => (
                <PredictionCard
                  key={prediction.id}
                  prediction={prediction}
                  onProvideFeedback={onProvideFeedback}
                />
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* User Feedback Tab */}
        <TabsContent value="feedback" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Feedback Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Feedback Summary</CardTitle>
                <CardDescription>
                  Your feedback helps improve AI accuracy
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Total Feedback Given:</span>
                    <Badge>{feedbackHistory.length}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Average Rating:</span>
                    <Badge variant="outline">
                      {feedbackHistory.length > 0 
                        ? (feedbackHistory.reduce((sum, f) => sum + f.userFeedback.rating, 0) / feedbackHistory.length).toFixed(1)
                        : 'N/A'
                      } ⭐
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <span className="text-sm font-medium">Prediction Usefulness:</span>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="text-center">
                        <p className="font-medium text-green-600">
                          {feedbackHistory.filter(f => f.userFeedback.usefulness === 'helpful').length}
                        </p>
                        <p>Helpful</p>
                      </div>
                      <div className="text-center">
                        <p className="font-medium text-gray-600">
                          {feedbackHistory.filter(f => f.userFeedback.usefulness === 'neutral').length}
                        </p>
                        <p>Neutral</p>
                      </div>
                      <div className="text-center">
                        <p className="font-medium text-red-600">
                          {feedbackHistory.filter(f => f.userFeedback.usefulness === 'unhelpful').length}
                        </p>
                        <p>Unhelpful</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Learning Progress */}
            <Card>
              <CardHeader>
                <CardTitle>Learning Progress</CardTitle>
                <CardDescription>
                  AI system learning progress tracking
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">Overall Learning</span>
                      <span className="text-sm text-gray-600">
                        {learningProgress.overallScore.toFixed(0)}%
                      </span>
                    </div>
                    <Progress value={learningProgress.overallScore} className="h-3" />
                  </div>
                  
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">Pattern Recognition</span>
                      <span className="text-sm text-gray-600">
                        {learningProgress.patternRecognition.toFixed(0)}%
                      </span>
                    </div>
                    <Progress value={learningProgress.patternRecognition} className="h-3" />
                  </div>
                  
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">Adaptation Speed</span>
                      <span className="text-sm text-gray-600">
                        {learningProgress.adaptationSpeed.toFixed(0)}%
                      </span>
                    </div>
                    <Progress value={learningProgress.adaptationSpeed} className="h-3" />
                  </div>

                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>Learning Tip</AlertTitle>
                    <AlertDescription>
                      Provide more feedback để help AI learn your preferences faster!
                    </AlertDescription>
                  </Alert>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Learning Insights Tab */}
        <TabsContent value="insights" className="space-y-4">
          <LearningInsights
            patterns={patterns}
            behaviorPatterns={behaviorPatterns}
            performanceMetrics={performanceMetrics}
            userPreferences={userPreferences}
            learningProgress={learningProgress}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Helper Components

const PatternCard: React.FC<{ pattern: PatternInsight }> = ({ pattern }) => {
  const getPatternIcon = (type: string) => {
    switch (type) {
      case 'productivity_cycle': return <Clock className="h-4 w-4" />;
      case 'procrastination': return <AlertTriangle className="h-4 w-4" />;
      case 'workflow_sequence': return <TrendingUp className="h-4 w-4" />;
      default: return <Brain className="h-4 w-4" />;
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'positive': return 'text-green-600 bg-green-50';
      case 'negative': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="border rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {getPatternIcon(pattern.type)}
          <span className="font-medium text-sm">
            {pattern.type.replace('_', ' ').toUpperCase()}
          </span>
        </div>
        <Badge variant="outline" className={getImpactColor(pattern.impact)}>
          {pattern.impact}
        </Badge>
      </div>
      <p className="text-sm text-gray-600">{pattern.description}</p>
      <div className="flex justify-between items-center text-xs">
        <span className="text-gray-500">
          Strength: {(pattern.strength * 100).toFixed(0)}%
        </span>
        <span className="text-gray-500">
          Confidence: {(pattern.confidence * 100).toFixed(0)}%
        </span>
      </div>
      {pattern.recommendations.length > 0 && (
        <div className="mt-2">
          <p className="text-xs font-medium text-gray-700">Recommendations:</p>
          <ul className="text-xs text-gray-600 ml-4">
            {pattern.recommendations.slice(0, 2).map((rec, index) => (
              <li key={index} className="list-disc">{rec}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

const PredictionCard: React.FC<{ 
  prediction: AdaptivePrediction; 
  onProvideFeedback: (predictionId: string, feedback: any) => void;
}> = ({ prediction, onProvideFeedback }) => {
  const [showFeedback, setShowFeedback] = useState(false);

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high': return 'text-red-600 bg-red-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h4 className="font-medium text-gray-900">{prediction.title}</h4>
          <p className="text-sm text-gray-600 mt-1">{prediction.description}</p>
        </div>
        <Badge className={getUrgencyColor(prediction.urgency)}>
          {prediction.urgency}
        </Badge>
      </div>
      
      <div className="flex items-center space-x-4 text-sm text-gray-500">
        <span>Confidence: {(prediction.confidence * 100).toFixed(0)}%</span>
        <span>Learning: {(prediction.learningContribution * 100).toFixed(0)}%</span>
        <span>Model: v{prediction.modelVersion}</span>
      </div>

      {prediction.personalizedFactors.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {prediction.personalizedFactors.map((factor, index) => (
            <Badge key={index} variant="outline" className="text-xs">
              {factor.replace('_', ' ')}
            </Badge>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFeedback(!showFeedback)}
        >
          {showFeedback ? 'Hide' : 'Provide'} Feedback
        </Button>
        <span className="text-xs text-gray-400">
          Timeline: {prediction.timeline}
        </span>
      </div>

      {showFeedback && (
        <FeedbackForm
          predictionId={prediction.id}
          onSubmit={(feedback) => {
            onProvideFeedback(prediction.id, feedback);
            setShowFeedback(false);
          }}
        />
      )}
    </div>
  );
};

const FeedbackForm: React.FC<{
  predictionId: string;
  onSubmit: (feedback: any) => void;
}> = ({ predictionId, onSubmit }) => {
  const [rating, setRating] = useState(5);
  const [accuracy, setAccuracy] = useState<'too_high' | 'accurate' | 'too_low'>('accurate');
  const [usefulness, setUsefulness] = useState<'helpful' | 'neutral' | 'unhelpful'>('helpful');
  const [comments, setComments] = useState('');

  const handleSubmit = () => {
    onSubmit({
      rating,
      accuracy,
      usefulness,
      comments,
      wouldUseAgain: rating >= 4
    });
  };

  return (
    <div className="bg-gray-50 p-3 rounded-md space-y-3">
      <div>
        <label className="text-sm font-medium">Rating (1-5 stars):</label>
        <div className="flex space-x-1 mt-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onClick={() => setRating(star)}
              className={`text-lg ${star <= rating ? 'text-yellow-500' : 'text-gray-300'}`}
            >
              ⭐
            </button>
          ))}
        </div>
      </div>
      
      <div>
        <label className="text-sm font-medium">Accuracy:</label>
        <div className="flex space-x-2 mt-1">
          {['too_high', 'accurate', 'too_low'].map((acc) => (
            <button
              key={acc}
              onClick={() => setAccuracy(acc as any)}
              className={`px-2 py-1 text-xs rounded ${
                accuracy === acc ? 'bg-blue-500 text-white' : 'bg-gray-200'
              }`}
            >
              {acc.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      <Button onClick={handleSubmit} className="w-full" size="sm">
        Submit Feedback
      </Button>
    </div>
  );
};

const LearningInsights: React.FC<{
  patterns: PatternInsight[];
  behaviorPatterns: UserBehaviorPattern[];
  performanceMetrics: PerformanceMetrics;
  userPreferences: UserPreferences;
  learningProgress: any;
}> = ({ patterns, behaviorPatterns, performanceMetrics, userPreferences, learningProgress }) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Award className="h-5 w-5 text-gold-500" />
            <span>Key Insights</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertTitle>Strongest Pattern</AlertTitle>
            <AlertDescription>
              {patterns.length > 0 ? (
                <>Your strongest behavioral pattern is <strong>{patterns[0].type.replace('_', ' ')}</strong> với {(patterns[0].strength * 100).toFixed(0)}% strength.</>
              ) : (
                'Chưa có enough data để detect patterns.'
              )}
            </AlertDescription>
          </Alert>

          <Alert>
            <TrendingUp className="h-4 w-4" />
            <AlertTitle>Learning Progress</AlertTitle>
            <AlertDescription>
              AI đã học được {patterns.length} behavioral patterns và đạt {learningProgress.overallScore.toFixed(0)}% learning score.
            </AlertDescription>
          </Alert>

          <Alert>
            <Brain className="h-4 w-4" />
            <AlertTitle>Prediction Trust</AlertTitle>
            <AlertDescription>
              Your trust in AI predictions: {(userPreferences.predictionTrust * 100).toFixed(0)}%. 
              {userPreferences.predictionTrust < 0.7 && ' Consider providing more feedback để improve accuracy!'}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recommendations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {learningProgress.overallScore < 50 && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>Early Learning Stage:</strong> Keep using the system và provide feedback để improve AI accuracy.
              </AlertDescription>
            </Alert>
          )}

          {patterns.find(p => p.type === 'procrastination' && p.strength > 0.6) && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Procrastination Alert:</strong> Consider setting smaller milestones và using time-blocking techniques.
              </AlertDescription>
            </Alert>
          )}

          {userPreferences.predictionTrust > 0.8 && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>High AI Trust:</strong> Great! You can rely more on AI predictions cho planning decisions.
              </AlertDescription>
            </Alert>
          )}

          <Alert>
            <Brain className="h-4 w-4" />
            <AlertDescription>
              <strong>Next Learning Goal:</strong> AI sẽ focus on improving time estimation accuracy và productivity predictions.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
};

// Helper functions
function calculateLearningProgress(models: AdaptivePredictionModel[], feedback: FeedbackData[]) {
  const overallAccuracy = models.reduce((sum, m) => sum + m.accuracy, 0) / models.length;
  const feedbackQuality = feedback.length > 0 ? 
    feedback.reduce((sum, f) => sum + f.userFeedback.rating, 0) / feedback.length / 5 : 0;
  
  return {
    overallScore: (overallAccuracy * 0.6 + feedbackQuality * 0.4) * 100,
    patternRecognition: Math.min(100, models.length * 20),
    adaptationSpeed: Math.min(100, feedback.length * 5),
    learningDays: Math.ceil((Date.now() - models[0]?.lastUpdated.getTime() || 0) / (1000 * 60 * 60 * 24))
  };
}

function calculateImprovementTrends(models: AdaptivePredictionModel[], timeRange: string) {
  // Generate mock trend data - would use real historical data in production
  const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
  const trends = [];
  
  for (let i = days; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    
    const trend: any = {
      date: date.toLocaleDateString()
    };
    
    models.forEach(model => {
      // Simulate improving accuracy over time
      const baseAccuracy = model.accuracy * 100;
      const improvement = (days - i) / days * 10; // 10% improvement over time range
      trend[model.modelType] = Math.min(95, baseAccuracy - 10 + improvement);
    });
    
    trends.push(trend);
  }
  
  return trends;
}

export default LearningDashboard;
