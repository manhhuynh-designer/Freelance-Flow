/**
 * AI Explanation Display Component - Simplified Version
 * Shows basic explanations for AI predictions and insights
 */

'use client';

import React, { useState } from 'react';
import { AIBusinessInsight } from '../ai/context/prediction-context-types';

interface AIExplanationDisplayProps {
  insight: AIBusinessInsight;
  onClose?: () => void;
  language?: 'en' | 'vi';
}

export function AIExplanationDisplay({ 
  insight, 
  onClose, 
  language = 'vi'
}: AIExplanationDisplayProps) {
  const [showDetails, setShowDetails] = useState(false);

  const confidencePercent = (insight.impact.confidence * 100).toFixed(0);
  const isHighPriority = insight.priority === 'high' || insight.priority === 'urgent';

  return (
    <div className="bg-white rounded-lg shadow-lg max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 rounded-t-lg">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-xl font-bold mb-2">
              {language === 'vi' ? '🧠 Giải thích AI' : '🧠 AI Explanation'}
            </h2>
            <p className="text-blue-100 text-sm">
              {insight.category.charAt(0).toUpperCase() + insight.category.slice(1)} - {insight.priority}
            </p>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 transition-colors"
            >
              ✕
            </button>
          )}
        </div>
        
        {/* Confidence indicator */}
        <div className="mt-4 bg-white/10 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">
              {language === 'vi' ? 'Độ tin cậy' : 'Confidence'}
            </span>
            <span className="font-bold text-white">
              {confidencePercent}%
            </span>
          </div>
          <div className="w-full bg-white/20 rounded-full h-2">
            <div 
              className={`bg-white rounded-full h-2 transition-all duration-300`}
              style={{width: `${confidencePercent}%`}}
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        {/* Main Insight */}
        <div className="bg-blue-50 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">
            {language === 'vi' ? '📋 Insight chính' : '📋 Main Insight'}
          </h3>
          <p className="text-blue-800">{insight.insight}</p>
        </div>

        {/* Impact Analysis */}
        <div className="bg-green-50 rounded-lg p-4">
          <h3 className="font-semibold text-green-900 mb-3">
            {language === 'vi' ? '� Phân tích tác động' : '� Impact Analysis'}
          </h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded p-3 border border-green-200">
              <div className="text-sm font-medium text-green-900">
                {language === 'vi' ? 'Tài chính' : 'Financial'}
              </div>
              <div className="text-lg font-bold text-green-700">
                {insight.impact.financial > 0 ? '+' : ''}{insight.impact.financial}%
              </div>
            </div>
            <div className="bg-white rounded p-3 border border-green-200">
              <div className="text-sm font-medium text-green-900">
                {language === 'vi' ? 'Thời gian' : 'Time'}
              </div>
              <div className="text-lg font-bold text-green-700">
                {insight.impact.time > 0 ? '+' : ''}{insight.impact.time}%
              </div>
            </div>
            <div className="bg-white rounded p-3 border border-green-200">
              <div className="text-sm font-medium text-green-900">
                {language === 'vi' ? 'Rủi ro' : 'Risk'}
              </div>
              <div className={`text-lg font-bold ${
                insight.impact.risk === 'reduces' ? 'text-green-700' : 
                insight.impact.risk === 'increases' ? 'text-red-700' : 'text-yellow-700'
              }`}>
                {insight.impact.risk}
              </div>
            </div>
          </div>
        </div>

        {/* AI Analysis Details */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-semibold text-gray-900 mb-3">
            {language === 'vi' ? '🔬 Chi tiết phân tích AI' : '🔬 AI Analysis Details'}
          </h3>
          <div className="space-y-3">
            <div>
              <span className="text-sm font-medium text-gray-700">
                {language === 'vi' ? 'Nguồn dữ liệu:' : 'Data Sources:'}
              </span>
              <div className="mt-1 flex flex-wrap gap-2">
                {insight.aiAnalysis.dataPoints.map((dataPoint, index) => (
                  <span key={index} className="bg-white px-3 py-1 rounded border text-sm text-gray-700">
                    {dataPoint}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-700">
                {language === 'vi' ? 'Phương pháp:' : 'Method:'}
              </span>
              <p className="mt-1 text-sm text-gray-600">
                {language === 'vi' ? 'Phân tích AI với pattern recognition và market insights' : 'AI analysis with pattern recognition and market insights'}
              </p>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-700">
                {language === 'vi' ? 'Các yếu tố phân tích:' : 'Analysis factors:'}
              </span>
              <ul className="mt-1 list-disc list-inside text-sm text-gray-600">
                {insight.aiAnalysis.patternRecognition.map((pattern: string, index: number) => (
                  <li key={index}>{pattern}</li>
                ))}
                {insight.aiAnalysis.marketInsights.map((insight_item: string, index: number) => (
                  <li key={`market-${index}`}>{insight_item}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Action Plan */}
        {insight.actionPlan && insight.actionPlan.length > 0 && (
          <div className="bg-indigo-50 rounded-lg p-4">
            <h3 className="font-semibold text-indigo-900 mb-3">
              {language === 'vi' ? '⚡ Kế hoạch hành động' : '⚡ Action Plan'}
            </h3>
            <div className="space-y-3">
              {insight.actionPlan.map((action, index) => (
                <div key={index} className="bg-white rounded p-3 border border-indigo-200">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-medium text-indigo-900">{action.step}</span>
                    <span className="text-sm text-indigo-600 bg-indigo-100 px-2 py-1 rounded">
                      {action.timeline}
                    </span>
                  </div>
                  {action.resources.length > 0 && (
                    <div className="text-sm text-indigo-700">
                      {language === 'vi' ? 'Tài nguyên:' : 'Resources:'} {action.resources.join(', ')}
                    </div>
                  )}
                  {action.successMetrics.length > 0 && (
                    <div className="text-sm text-indigo-600 mt-1">
                      {language === 'vi' ? 'Chỉ số thành công:' : 'Success metrics:'} {action.successMetrics.join(', ')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Priority Notice */}
        {isHighPriority && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <span className="text-red-500 text-xl mr-2">⚠️</span>
              <div>
                <h4 className="font-semibold text-red-900">
                  {language === 'vi' ? 'Cần chú ý' : 'Attention Required'}
                </h4>
                <p className="text-red-700 text-sm">
                  {language === 'vi' 
                    ? 'Insight này có mức độ ưu tiên cao và nên được xem xét ngay.'
                    : 'This insight has high priority and should be reviewed immediately.'
                  }
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Time Context */}
        <div className="bg-yellow-50 rounded-lg p-4">
          <h3 className="font-semibold text-yellow-900 mb-2">
            {language === 'vi' ? '⏰ Bối cảnh thời gian' : '⏰ Time Context'}
          </h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-yellow-900">
                {language === 'vi' ? 'Khung thời gian:' : 'Timeframe:'}
              </span>
              <div className="text-yellow-700">{insight.timeframe}</div>
            </div>
            <div>
              <span className="font-medium text-yellow-900">
                {language === 'vi' ? 'Mức độ ưu tiên:' : 'Priority:'}
              </span>
              <div className={`font-medium ${
                insight.priority === 'urgent' ? 'text-red-600' :
                insight.priority === 'high' ? 'text-orange-600' :
                insight.priority === 'medium' ? 'text-yellow-600' : 'text-green-600'
              }`}>
                {insight.priority}
              </div>
            </div>
          </div>
        </div>

        {/* Toggle Details */}
        <div className="text-center">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            {showDetails 
              ? (language === 'vi' ? '▲ Ẩn chi tiết' : '▲ Hide Details')
              : (language === 'vi' ? '▼ Xem chi tiết' : '▼ Show Details')
            }
          </button>
        </div>

        {/* Extended Details */}
        {showDetails && (
          <div className="space-y-4 border-t pt-4">
            <div className="bg-purple-50 rounded-lg p-4">
              <h4 className="font-semibold text-purple-900 mb-2">
                {language === 'vi' ? '🔍 Thông tin bổ sung' : '🔍 Additional Information'}
              </h4>
              <div className="text-sm text-purple-700 space-y-1">
                <div>
                  <strong>{language === 'vi' ? 'ID:' : 'ID:'}</strong> {insight.id}
                </div>
                <div>
                  <strong>{language === 'vi' ? 'Loại:' : 'Category:'}</strong> {insight.category}
                </div>
                <div>
                  <strong>{language === 'vi' ? 'Độ tin cậy:' : 'Confidence:'}</strong> {confidencePercent}%
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="bg-gray-50 p-4 rounded-b-lg border-t text-center text-sm text-gray-600">
        {language === 'vi' 
          ? '💡 Insight này được tạo bởi AI dựa trên dữ liệu và patterns của bạn'
          : '💡 This insight was generated by AI based on your data and patterns'
        }
      </div>
    </div>
  );
}
