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
  static buildSystemPrompt(options: BuildPromptOptions): string {
    const { language, intent, data } = options;
    const currentDate = format(new Date(), 'yyyy-MM-dd');

    let prompt = '';

    // 1. Start with the base assistant persona.
    prompt += systemPrompts.freelanceAssistant[language];

    // 2. Add common context (date, language).
    prompt += contextPrompts.common[language].replace('{currentDate}', currentDate);
    
    // 3. Add a clear instruction about the user's detected intent.
    if (intent !== 'unknown' && intent !== 'query') {
        prompt += `\n\nIMPORTANT: The user's primary intent has been identified as '${intent}'. You should prioritize generating the corresponding action in your response.`;
    }

    // 4. Add action instructions.
    prompt += contextPrompts.actionInstructions[language];

    // 5. Add a few-shot examples to guide the model.
    prompt += `\n\nHere are some examples of how to respond correctly:\n${fewShotExamples[language]}`;

    // 6. Add data context if available.
    prompt += contextPrompts.categoryContext[language];
    
    if (data.clients && data.clients.length > 0) {
      prompt += contextPrompts.clientContext[language].replace('{clients}', JSON.stringify(data.clients));
    }
    if (data.collaborators && data.collaborators.length > 0) {
        prompt += contextPrompts.collaboratorContext[language].replace('{collaborators}', JSON.stringify(data.collaborators));
    }
    if (data.quoteTemplates && data.quoteTemplates.length > 0) {
        prompt += contextPrompts.quoteTemplateContext[language].replace('{quoteTemplates}', JSON.stringify(data.quoteTemplates));
    }
    if (data.tasks && data.tasks.length > 0) {
      prompt += contextPrompts.taskContext[language].replace('{tasks}', JSON.stringify(data.tasks));
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