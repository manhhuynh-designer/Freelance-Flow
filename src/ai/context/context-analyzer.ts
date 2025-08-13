'use client';

import type { ContextMemoryEntry } from '@/hooks/useContextMemory';

export interface EntityMention {
  type: 'task' | 'client' | 'collaborator' | 'quote' | 'project';
  name: string;
  id?: string;
  confidence: number;
}

export interface TopicExtraction {
  topics: string[];
  primaryTopic: string;
  confidence: number;
}

export interface SentimentAnalysis {
  sentiment: 'positive' | 'neutral' | 'negative';
  confidence: number;
  indicators: string[];
}

export class ContextAnalyzer {
  // Extract entity mentions from text
  static extractEntityMentions(text: string, appData?: any): EntityMention[] {
    const mentions: EntityMention[] = [];
    const textLower = text.toLowerCase();

    // Task keywords
    const taskKeywords = [
      'task', 'tác vụ', 'công việc', 'nhiệm vụ', 'todo', 'assignment',
      'project', 'dự án', 'work', 'job', 'activity'
    ];

    // Client keywords  
    const clientKeywords = [
      'client', 'khách hàng', 'customer', 'khách', 'company', 'công ty',
      'business', 'partner', 'đối tác'
    ];

    // Quote keywords
    const quoteKeywords = [
      'quote', 'báo giá', 'estimate', 'proposal', 'đề xuất', 'tính giá',
      'pricing', 'cost', 'chi phí'
    ];

    // Check for task mentions
    taskKeywords.forEach(keyword => {
      if (textLower.includes(keyword)) {
        mentions.push({
          type: 'task',
          name: keyword,
          confidence: 0.8
        });
      }
    });

    // Check for client mentions
    clientKeywords.forEach(keyword => {
      if (textLower.includes(keyword)) {
        mentions.push({
          type: 'client', 
          name: keyword,
          confidence: 0.8
        });
      }
    });

    // Check for quote mentions
    quoteKeywords.forEach(keyword => {
      if (textLower.includes(keyword)) {
        mentions.push({
          type: 'quote',
          name: keyword, 
          confidence: 0.8
        });
      }
    });

    // If we have appData, try to match specific entities
    if (appData) {
      // Match specific tasks
      appData.tasks?.forEach((task: any) => {
        if (task.title && textLower.includes(task.title.toLowerCase())) {
          mentions.push({
            type: 'task',
            name: task.title,
            id: task.id,
            confidence: 0.95
          });
        }
      });

      // Match specific clients
      appData.clients?.forEach((client: any) => {
        if (client.name && textLower.includes(client.name.toLowerCase())) {
          mentions.push({
            type: 'client',
            name: client.name,
            id: client.id,
            confidence: 0.95
          });
        }
      });
    }

    return mentions;
  }

  // Extract main topics from conversation
  static extractTopics(userQuery: string, aiResponse: string): TopicExtraction {
    const combinedText = `${userQuery} ${aiResponse}`.toLowerCase();
    const topics: string[] = [];

    // Predefined topic categories
    const topicMap: Record<string, string[]> = {
      'task_management': ['task', 'tác vụ', 'công việc', 'todo', 'assignment', 'complete', 'finish', 'hoàn thành'],
      'client_relations': ['client', 'khách hàng', 'customer', 'meeting', 'call', 'email', 'communication'],
      'project_planning': ['project', 'dự án', 'plan', 'kế hoạch', 'timeline', 'deadline', 'schedule'],
      'financial': ['quote', 'báo giá', 'money', 'tiền', 'cost', 'chi phí', 'budget', 'ngân sách', 'payment', 'thanh toán'],
      'collaboration': ['team', 'nhóm', 'collaborate', 'hợp tác', 'share', 'chia sẻ', 'work together'],
      'productivity': ['efficiency', 'hiệu quả', 'optimize', 'tối ưu', 'improve', 'cải thiện', 'workflow'],
      'reporting': ['report', 'báo cáo', 'status', 'trạng thái', 'progress', 'tiến độ', 'overview', 'summary'],
      'scheduling': ['calendar', 'lịch', 'schedule', 'time', 'thời gian', 'appointment', 'meeting', 'cuộc họp']
    };

    // Find matching topics
    Object.entries(topicMap).forEach(([topic, keywords]) => {
      const matches = keywords.filter(keyword => combinedText.includes(keyword));
      if (matches.length > 0) {
        topics.push(topic);
      }
    });

    // Determine primary topic (most matches)
    let primaryTopic = topics[0] || 'general';
    let maxMatches = 0;

    Object.entries(topicMap).forEach(([topic, keywords]) => {
      const matches = keywords.filter(keyword => combinedText.includes(keyword)).length;
      if (matches > maxMatches) {
        maxMatches = matches;
        primaryTopic = topic;
      }
    });

    return {
      topics: topics.length > 0 ? topics : ['general'],
      primaryTopic,
      confidence: topics.length > 0 ? Math.min(0.9, topics.length * 0.3) : 0.3
    };
  }

  // Analyze sentiment of the conversation
  static analyzeSentiment(userQuery: string, aiResponse: string): SentimentAnalysis {
    const combinedText = `${userQuery} ${aiResponse}`.toLowerCase();
    
    const positiveIndicators = [
      'great', 'good', 'excellent', 'perfect', 'awesome', 'fantastic', 'wonderful',
      'tuyệt vời', 'tốt', 'hoàn hảo', 'xuất sắc', 'thanks', 'thank you', 'cảm ơn',
      'success', 'thành công', 'complete', 'hoàn thành', 'done', 'xong'
    ];

    const negativeIndicators = [
      'bad', 'terrible', 'awful', 'wrong', 'error', 'problem', 'issue',
      'tệ', 'sai', 'lỗi', 'vấn đề', 'khó khăn', 'trouble', 'difficult',
      'fail', 'thất bại', 'cannot', 'không thể', 'impossible', 'bất khả thi'
    ];

    const neutralIndicators = [
      'okay', 'ok', 'fine', 'normal', 'regular', 'standard', 'average',
      'được', 'bình thường', 'thông thường', 'maybe', 'perhaps', 'có thể'
    ];

    let positiveCount = 0;
    let negativeCount = 0;
    let neutralCount = 0;

    const foundIndicators: string[] = [];

    positiveIndicators.forEach(indicator => {
      if (combinedText.includes(indicator)) {
        positiveCount++;
        foundIndicators.push(indicator);
      }
    });

    negativeIndicators.forEach(indicator => {
      if (combinedText.includes(indicator)) {
        negativeCount++;
        foundIndicators.push(indicator);
      }
    });

    neutralIndicators.forEach(indicator => {
      if (combinedText.includes(indicator)) {
        neutralCount++;
        foundIndicators.push(indicator);
      }
    });

    let sentiment: 'positive' | 'neutral' | 'negative' = 'neutral';
    let confidence = 0.5;

    if (positiveCount > negativeCount && positiveCount > neutralCount) {
      sentiment = 'positive';
      confidence = Math.min(0.9, 0.5 + (positiveCount * 0.2));
    } else if (negativeCount > positiveCount && negativeCount > neutralCount) {
      sentiment = 'negative';
      confidence = Math.min(0.9, 0.5 + (negativeCount * 0.2));
    } else {
      sentiment = 'neutral';
      confidence = Math.max(0.3, 0.7 - Math.abs(positiveCount - negativeCount) * 0.1);
    }

    return {
      sentiment,
      confidence,
      indicators: foundIndicators
    };
  }

  // Calculate importance score for a conversation
  static calculateImportance(
    userQuery: string,
    aiResponse: string,
    entityMentions: EntityMention[],
    actionsTaken: string[] = []
  ): number {
    let importance = 5; // Base importance

    // Boost for entity mentions
    importance += entityMentions.length * 0.5;

    // Boost for high-confidence entity mentions
    const highConfidenceEntities = entityMentions.filter(e => e.confidence > 0.9);
    importance += highConfidenceEntities.length;

    // Boost for actions taken
    importance += actionsTaken.length * 2;

    // Boost for longer conversations (more detail)
    const totalLength = userQuery.length + aiResponse.length;
    if (totalLength > 200) importance += 1;
    if (totalLength > 500) importance += 1;

    // Boost for specific important keywords
    const importantKeywords = [
      'urgent', 'khẩn cấp', 'important', 'quan trọng', 'critical', 'deadline', 
      'error', 'lỗi', 'problem', 'vấn đề', 'help', 'giúp'
    ];
    
    const combinedText = `${userQuery} ${aiResponse}`.toLowerCase();
    importantKeywords.forEach(keyword => {
      if (combinedText.includes(keyword)) {
        importance += 1.5;
      }
    });

    // Cap importance at 10
    return Math.min(10, Math.max(1, importance));
  }

  // Create a complete context memory entry from conversation
  static createMemoryEntry(
    userQuery: string,
    aiResponse: string,
    sessionId: string,
    actionsTaken: string[] = [],
    appData?: any
  ): Omit<ContextMemoryEntry, 'id' | 'timestamp'> {
    const entityMentions = this.extractEntityMentions(`${userQuery} ${aiResponse}`, appData);
    const topicExtraction = this.extractTopics(userQuery, aiResponse);
    const sentimentAnalysis = this.analyzeSentiment(userQuery, aiResponse);
    const importance = this.calculateImportance(userQuery, aiResponse, entityMentions, actionsTaken);

    return {
      sessionId,
      userQuery,
      aiResponse,
      entityMentions: entityMentions.map(em => em.name),
      topics: topicExtraction.topics,
      sentiment: sentimentAnalysis.sentiment,
      importance,
      actionsTaken
    };
  }
}
