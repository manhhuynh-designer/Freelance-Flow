/**
 * @fileoverview Manages the contextual data and prompt construction for AI flows.
 * This class is responsible for assembling the final system prompt sent to the AI model,
 * incorporating user data, preferences, and relevant instructions.
 */

import { format } from 'date-fns';
import { systemPrompts, contextPrompts } from '../context/prompt-templates';
import { fewShotExamples } from '../context/few-shot-examples';
import { Message } from '../types/message';

type Language = 'en' | 'vi';
type Intent = 'createTask' | 'editTask' | 'updateStatus' | 'query' | 'unknown';

interface UserData {
  tasks?: any[];
  clients?: any[];
  collaborators?: any[];
  quoteTemplates?: any[];
}

interface BuildPromptOptions {
  language: Language;
  intent: Intent;
  data: UserData;
}

export class ContextManager {
  /**
   * Builds the complete system prompt for the AI model.
   * @param options - The options for building the prompt.
   * @returns The fully constructed system prompt string.
   */
  static buildSystemPrompt(input: {
    userInput: string;
    tasks: any[];
    clients: any[];
    collaborators: any[];
    language: string;
    contextMemory?: any[];
    detectedLanguage?: string;
    detectedIntent?: string;
  }): string {
    const lang = input.language as 'en' | 'vi';
    const currentDate = format(new Date(), 'yyyy-MM-dd');

    let prompt = '';

    // 1. Base assistant persona
    prompt += systemPrompts.freelanceAssistant[lang];

    // 2. Common context with date
    prompt += contextPrompts.common[lang].replace('{currentDate}', currentDate);
    
    // 3. Intent context if detected
    if (input.detectedIntent && input.detectedIntent !== 'unknown' && input.detectedIntent !== 'query') {
        prompt += `\n\nIMPORTANT: The user's primary intent has been identified as '${input.detectedIntent}'. You should prioritize generating the corresponding action in your response.`;
    }

    // 4. Action instructions
    prompt += contextPrompts.actionInstructions[lang];

    // 5. Few-shot examples
    prompt += `\n\nHere are some examples of how to respond correctly:\n${fewShotExamples[lang]}`;

    // 6. Category context
    prompt += contextPrompts.categoryContext[lang];

    // 7. Context memory if available
    if (input.contextMemory && input.contextMemory.length > 0) {
      const memoryContext = input.contextMemory.map((entry: any, index: number) => 
        `${index + 1}. Previous: "${entry.userQuery}" → "${entry.aiResponse}" (Topics: ${entry.topics?.join(', ') || 'N/A'})`
      ).join('\n');
      
      prompt += lang === 'vi' 
        ? `\n\nBối cảnh từ các cuộc trò chuyện trước:\n${memoryContext}`
        : `\n\nContext from previous conversations:\n${memoryContext}`;
    }
    
    // 8. Data contexts
    if (input.clients && input.clients.length > 0) {
      prompt += contextPrompts.clientContext[lang].replace('{clients}', JSON.stringify(input.clients));
    }
    if (input.collaborators && input.collaborators.length > 0) {
        prompt += contextPrompts.collaboratorContext[lang].replace('{collaborators}', JSON.stringify(input.collaborators));
    }
    if (input.tasks && input.tasks.length > 0) {
      prompt += contextPrompts.taskContext[lang].replace('{tasks}', JSON.stringify(input.tasks));
    }

    return prompt;
  }

  /**
   * Optimizes conversation history by summarizing older messages to stay within token limits.
   * @param history The array of message objects representing the conversation history.
   * @param maxTokens The maximum number of tokens allowed for the history.
   * @returns An optimized array of messages.
   */
  static optimizeHistory(history: Message[], maxTokens: number): Message[] {
    const estimateTokens = (text: string) => Math.ceil(text.length / 4);

    let currentTokens = history.reduce((sum, msg) => sum + estimateTokens(msg.content[0]?.text || ''), 0);
    const optimizedHistory: Message[] = [];

    for (let i = history.length - 1; i >= 0; i--) {
      const message = history[i];
      const messageTokens = estimateTokens(message.content[0]?.text || '');

      if (currentTokens + messageTokens <= maxTokens) {
        optimizedHistory.unshift(message);
        currentTokens += messageTokens;
      } else {
        const summaryText = `... (summary of older conversation)`;
        const summaryMessage: Message = {
          role: 'system',
          content: [{ text: summaryText }],
        };
        optimizedHistory.unshift(summaryMessage);
        break;
      }
    }

    return optimizedHistory;
  }
}