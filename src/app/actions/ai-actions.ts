'use server';

import { chatWithAI, type ChatRequest, type ChatResponse } from '@/ai/simple-ai';
import type { AskAboutTasksInput, AskAboutTasksOutput, InteractiveElement } from '@/lib/ai-types';
import { PatternRecognition } from '@/ai/learning/pattern-recognition';
import { ContextManager } from '@/ai/utils/context-manager';
import { getFinancialContext } from '@/hooks/useFinancialData';

// 🎯 Smart context analysis for interactive elements
function shouldShowCreateTaskButton(userInput: string, aiResponse: string, action: any): boolean {
  const taskRelatedKeywords = [
    // English
    'create task', 'new task', 'add task', 'make task', 'task for',
    'need to do', 'should do', 'work on', 'deadline', 'project',
    'assignment', 'to-do', 'todo', 'remind me',
    // Vietnamese  
    'tạo task', 'tạo công việc', 'thêm task', 'việc cần làm',
    'công việc mới', 'deadline', 'dự án', 'nhiệm vụ',
    'cần làm', 'phải làm', 'nhắc nhở'
  ];

  const contextualPhrases = [
    // English
    'I need to', 'I should', 'I have to', 'I want to',
    'can you help me', 'please create', 'add this to',
    // Vietnamese
    'tôi cần', 'tôi phải', 'tôi muốn', 'giúp tôi',
    'hãy tạo', 'thêm vào'
  ];

  // Check if AI response suggests creating a task
  const aiSuggestsTask = aiResponse.toLowerCase().includes('tạo task') ||
                        aiResponse.toLowerCase().includes('create task') ||
                        aiResponse.toLowerCase().includes('thêm công việc') ||
                        action?.type === 'createTask';

  // Check if user input implies task creation
  const userImpliesTask = taskRelatedKeywords.some(keyword => 
    userInput.toLowerCase().includes(keyword.toLowerCase())
  ) || contextualPhrases.some(phrase =>
    userInput.toLowerCase().includes(phrase.toLowerCase())
  );

  return aiSuggestsTask || userImpliesTask;
}

// 🎯 Generate interactive elements based on AI response content
function generateInteractiveElements(text: string, action: any, userInput: string = ''): InteractiveElement[] {
  const elements: InteractiveElement[] = [];

  // Smart task creation elements
  if (shouldShowCreateTaskButton(userInput, text, action)) {
    elements.push({
      type: 'button',
      label: 'Create New Task',
      action: 'createTask',
      variant: 'default',
      icon: '➕'
    });
  }

  // Quote/estimation elements
  if (text.toLowerCase().includes('quote') || text.toLowerCase().includes('báo giá') || text.toLowerCase().includes('estimate')) {
    elements.push({
      type: 'button',
      label: 'Create Quote',
      action: 'createQuote',
      variant: 'secondary',
      icon: '💰'
    });
  }

  // Calendar/schedule elements
  if (text.toLowerCase().includes('calendar') || text.toLowerCase().includes('schedule') || text.toLowerCase().includes('lịch')) {
    elements.push({
      type: 'button',
      label: 'Open Calendar',
      action: 'openCalendar',
      variant: 'outline',
      icon: '📅'
    });
  }

  // Copyable code/text elements
  const codeBlocks = text.match(/```[\s\S]*?```/g);
  if (codeBlocks) {
    codeBlocks.forEach((block, index) => {
      elements.push({
        type: 'copyable',
        label: `Copy Code ${index + 1}`,
        data: block.replace(/```\w*\n?/g, '').replace(/```$/g, ''),
        icon: '📋'
      });
    });
  }

  return elements;
}

export async function askAboutTasksAction(input: AskAboutTasksInput): Promise<AskAboutTasksOutput> {
  try {
    // 🔍 Detect language and intent from user input
    const detectedLanguage = PatternRecognition.detectLanguageFromMessage(input.userInput || '');
    const detectedIntent = PatternRecognition.detectIntent(input.userInput || '');

    console.log('🔄 askAboutTasksAction called with input:', {
      userInput: input.userInput,
      modelName: input.modelName,
      inputLanguage: input.language,
      detectedLanguage,
      detectedIntent,
      tasksCount: input.tasks?.length || 0,
      clientsCount: input.clients?.length || 0,
      collaboratorsCount: input.collaborators?.length || 0
    });
    
    if (!input.userInput?.trim()) {
      return {
        text: input.language === 'vi' ? 'Vui lòng nhập tin nhắn.' : 'Please provide a message.',
        action: null
      };
    }

    // Tạo context từ dữ liệu người dùng
    const contextData = {
      tasks: input.tasks || [],
      clients: input.clients || [],
      collaborators: input.collaborators || [],
      quoteTemplates: input.quoteTemplates || [],
      quotes: input.quotes || []
    };

    // 💰 Add financial context if available
    let financialContext = '';
    if (input.quotes && input.tasks) {
      try {
        const mockFinancialData = {
          totalIncome: 0,
          totalPendingIncome: 0,
          totalExpectedIncome: 0,
          monthlyIncome: [],
          clientIncome: [],
          taskPricing: [],
          averageTaskPrice: 0,
          incomeByStatus: {},
          profitMargins: []
        };

        // Calculate basic financial metrics
        const completedTasks = input.tasks.filter(task => task.status === 'done');
        const totalIncome = completedTasks.reduce((sum, task) => {
          const quote = input.quotes?.find(q => q.id === task.quoteId);
          return sum + (quote?.total || 0);
        }, 0);

        const pendingTasks = input.tasks.filter(task => 
          task.status === 'inprogress' || task.status === 'todo'
        );
        const totalPendingIncome = pendingTasks.reduce((sum, task) => {
          const quote = input.quotes?.find(q => q.id === task.quoteId);
          return sum + (quote?.total || 0);
        }, 0);

        const averageTaskPrice = input.tasks.length > 0 ? 
          input.tasks.reduce((sum, task) => {
            const quote = input.quotes?.find(q => q.id === task.quoteId);
            return sum + (quote?.total || 0);
          }, 0) / input.tasks.length : 0;

        financialContext = `
FINANCIAL DATA AVAILABLE:
- Total Completed Income: $${totalIncome.toLocaleString()}
- Total Pending Income: $${totalPendingIncome.toLocaleString()}
- Total Expected Income: $${(totalIncome + totalPendingIncome).toLocaleString()}
- Average Task Price: $${averageTaskPrice.toLocaleString()}
- Total Tasks: ${input.tasks.length}
- Completed Tasks: ${completedTasks.length}
- Pending Tasks: ${pendingTasks.length}

DETAILED TASK DATA:
${input.tasks.map((task, index) => {
  const quote = input.quotes?.find(q => q.id === task.quoteId);
  const client = input.clients?.find(c => c.id === task.clientId);
  return `
Task ${index + 1}: "${task.name}"
- ID: ${task.id}
- Client: ${client?.name || 'Unknown'}
- Status: ${task.status}
- Quote Value: $${quote?.total?.toLocaleString() || 0}
- Deadline: ${task.deadline}
- Description: ${task.description?.substring(0, 100) || 'No description'}...
- Category: ${task.categoryId}
- Progress: ${task.progress || 0}%`;
}).join('\n')}

CLIENT BREAKDOWN:
${input.clients?.map(client => {
  const clientTasks = input.tasks.filter(t => t.clientId === client.id);
  const clientRevenue = clientTasks.reduce((sum, task) => {
    const quote = input.quotes?.find(q => q.id === task.quoteId);
    return sum + (quote?.total || 0);
  }, 0);
  return `- ${client.name}: ${clientTasks.length} tasks, $${clientRevenue.toLocaleString()} revenue`;
}).join('\n') || 'No client data'}`;

        console.log('💰 Enhanced financial context with task details added');
      } catch (error) {
        console.warn('⚠️ Error calculating financial data:', error);
      }
    }

    // 🚀 Use Context Manager to build proper system prompt
    const systemPrompt = ContextManager.buildSystemPrompt({
      userInput: input.userInput,
      language: detectedLanguage,
      detectedLanguage: detectedLanguage,
      detectedIntent: detectedIntent,
      tasks: input.tasks || [],
      clients: input.clients || [],
      collaborators: input.collaborators || [],
      contextMemory: input.contextMemory || []
    });

    // Enhance system prompt with financial data
    const enhancedSystemPrompt = financialContext ? 
      `${systemPrompt}\n\n${financialContext}` : systemPrompt;

    // Add user question with strong language enforcement
    const finalPrompt = `${enhancedSystemPrompt}

CRITICAL LANGUAGE INSTRUCTION: You MUST respond in ${detectedLanguage === 'vi' ? 'Vietnamese' : 'English'} language. This is mandatory.

CRITICAL OUTPUT INSTRUCTION: Your response must be a single, valid JSON object starting with { and ending with }. Do not wrap it in code blocks, do not add any text before or after the JSON. Just the raw JSON object.

User question: ${input.userInput}`;

    console.log('🔧 Built system prompt with ContextManager:', {
      promptLength: systemPrompt.length,
      finalPromptLength: finalPrompt.length,
      language: detectedLanguage,
      intent: detectedIntent
    });

    const chatRequest: ChatRequest = {
      messages: [{
        role: 'user',
        content: finalPrompt,
        timestamp: new Date()
      }],
      modelName: input.modelName || 'gemini-1.5-flash',
      apiKey: input.apiKey || ''
    };
    
    const result = await chatWithAI(chatRequest);
    
    // 🔍 Try to parse JSON response from AI
    let parsedResponse: AskAboutTasksOutput;
    try {
      // Clean the response text to extract JSON
      let cleanedText = result.message.content.trim();
      
      // Remove markdown code blocks if present
      cleanedText = cleanedText.replace(/```json\s*/g, '').replace(/```\s*/g, '');
      
      // Find JSON object in the response
      const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const jsonStr = jsonMatch[0];
        parsedResponse = JSON.parse(jsonStr);
        
        // Add interactive elements if not present
        if (!parsedResponse.interactiveElements) {
          parsedResponse.interactiveElements = generateInteractiveElements(
            parsedResponse.text || cleanedText, 
            parsedResponse.action,
            input.userInput // Pass user input for context
          );
        }
        
        console.log('✅ Successfully parsed AI JSON response:', {
          hasText: !!parsedResponse.text,
          hasAction: !!parsedResponse.action,
          actionType: parsedResponse.action?.type,
          interactiveElements: parsedResponse.interactiveElements?.length || 0
        });
        
        return parsedResponse;
      } else {
        throw new Error('No valid JSON found in AI response');
      }
    } catch (parseError) {
      console.warn('⚠️ Failed to parse AI JSON response, using raw text:', parseError);
      
      // Fallback to raw text response with generated interactive elements
      const rawResponse = {
        text: result.message.content,
        action: null
      };
      
      return {
        ...rawResponse,
        interactiveElements: generateInteractiveElements(
          rawResponse.text, 
          null, 
          input.userInput // Pass user input for context
        ),
        metadata: {
          responseType: 'info' as const,
          confidence: 0.5
        }
      };
    }
  } catch (error: any) {
    console.error('❌ askAboutTasksAction error:', error.message || error);
    
    // Return a safe error response
    return {
      text: input.language === 'vi' 
        ? `Xin lỗi, đã xảy ra lỗi: ${error.message || 'Lỗi không xác định'}. Vui lòng kiểm tra API key và thử lại.`
        : `Sorry, I encountered an error: ${error.message || 'Unknown error'}. Please check your API key and try again.`,
      action: null,
      interactiveElements: [{
        type: 'button',
        label: input.language === 'vi' ? 'Thử lại' : 'Try Again',
        action: 'retry',
        variant: 'outline',
        icon: '🔄'
      }],
      metadata: {
        responseType: 'error' as const,
        confidence: 0
      }
    };
  }
}

// Temporary stub for suggestQuoteAction to avoid import errors
export async function suggestQuoteAction(input: any): Promise<any> {
  console.log('🔄 suggestQuoteAction called (stub implementation)');
  return null;
}
