import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownRendererProps {
  content: string;
  className?: string;
  onTaskClick?: (taskId: string) => void;
  onEventClick?: (eventId: string) => void;
  tasks?: any[]; // Add tasks array to enable task name recognition
  events?: any[]; // Add events array for event name recognition
}

/**
 * MarkdownRenderer - Enhanced component for AI responses with proper Markdown formatting
 * Supports: bold, italic, lists, code blocks, tables, emojis, quotes, task links
 */
const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ 
  content, 
  className = "", 
  onTaskClick, 
  onEventClick, 
  tasks = [], 
  events = [] 
}) => {
  // Function to process content and create task links
  const processTaskLinks = (text: string) => {
    // Pattern to match task references like "Task #123" or "task #456"
    const taskPattern = /\b(task|Task)\s*#(\d+)\b/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = taskPattern.exec(text)) !== null) {
      // Add text before the match
      if (match.index > lastIndex) {
        parts.push(text.slice(lastIndex, match.index));
      }
      
      // Add the clickable task link
      const taskId = match[2];
      parts.push(
        <button
          key={`task-${taskId}-${match.index}`}
          onClick={() => onTaskClick?.(taskId)}
          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline font-medium mx-1 cursor-pointer transition-colors duration-200"
          type="button"
          title={`Open Task #${taskId}`}
        >
          {match[0]}
        </button>
      );
      
      lastIndex = taskPattern.lastIndex;
    }
    
    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex));
    }
    
    return parts.length > 1 ? parts : text;
  };

  // Function to process event links
  const processEventLinks = (content: any) => {
    if (typeof content === 'string') {
      // Pattern to match event references like "Event #123" or "event #456"
      const eventPattern = /\b(event|Event)\s*#(\d+)\b/g;
      const parts = [];
      let lastIndex = 0;
      let match;

      while ((match = eventPattern.exec(content)) !== null) {
        if (match.index > lastIndex) {
          parts.push(content.slice(lastIndex, match.index));
        }
        
        const eventId = match[2];
        parts.push(
          <button
            key={`event-${eventId}-${match.index}`}
            onClick={() => onEventClick?.(eventId)}
            className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 underline font-medium mx-1 cursor-pointer transition-colors duration-200"
            type="button"
            title={`Open Event #${eventId}`}
          >
            {match[0]}
          </button>
        );
        
        lastIndex = eventPattern.lastIndex;
      }
      
      if (lastIndex < content.length) {
        parts.push(content.slice(lastIndex));
      }
      
      return parts.length > 1 ? parts : content;
    }
    return content;
  };

  // Function to process task name links (not just Task #123)
  const processTaskNameLinks = (text: string) => {
    if (!tasks.length) return text;
    
    const parts = [];
    let lastIndex = 0;
    
    // Sort tasks by name length (longest first) to avoid partial matches
    const sortedTasks = [...tasks].sort((a, b) => (b.name || '').length - (a.name || '').length);
    
    // Create pattern for all task names
    const taskNames = sortedTasks
      .filter(task => task.name && task.name.length > 2) // Only tasks with meaningful names
      .map(task => task.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')); // Escape regex chars
    
    if (taskNames.length === 0) return text;
    
    const taskNamePattern = new RegExp(`\\b(${taskNames.join('|')})\\b`, 'gi');
    let match: RegExpExecArray | null;

    // Debug logging
    console.log('Processing text for task names:', text);
    console.log('Available task names:', taskNames);
    
    while ((match = taskNamePattern.exec(text)) !== null) {
      // Find the task that matches this text
      const matchingTask = tasks.find(task => 
        task.name && task.name.toLowerCase() === match![0].toLowerCase()
      );
      
      if (matchingTask) {
        console.log('Found matching task:', matchingTask.name, 'ID:', matchingTask.id);
        
        // Add text before the match
        if (match.index > lastIndex) {
          parts.push(text.slice(lastIndex, match.index));
        }
        
        // Add the clickable task name link
        parts.push(
          <button
            key={`task-name-${matchingTask.id}-${match.index}`}
            onClick={() => onTaskClick?.(matchingTask.id)}
            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline font-medium cursor-pointer transition-colors duration-200 bg-blue-50 dark:bg-blue-900/20 px-1 py-0.5 rounded"
            type="button"
            title={`Open task: ${matchingTask.name} (ID: ${matchingTask.id})`}
          >
            {match![0]}
          </button>
        );
        
        lastIndex = taskNamePattern.lastIndex;
      }
    }
    
    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex));
    }

    console.log('Task name processing result:', parts.length > 1 ? 'Links created' : 'No links');
    return parts.length > 1 ? parts : text;
  };

  // Function to process event name links
  const processEventNameLinks = (content: any) => {
    if (typeof content === 'string' && events.length > 0) {
      const parts = [];
      let lastIndex = 0;
      
      // Sort events by name length (longest first)
      const sortedEvents = [...events].sort((a, b) => (b.name || '').length - (a.name || '').length);
      
      const eventNames = sortedEvents
        .filter(event => event.name && event.name.length > 2)
        .map(event => event.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
      
      if (eventNames.length === 0) return content;
      
      const eventNamePattern = new RegExp(`\\b(${eventNames.join('|')})\\b`, 'gi');
      let match: RegExpExecArray | null;
      
      while ((match = eventNamePattern.exec(content)) !== null) {
        const matchingEvent = events.find(event => 
          event.name && event.name.toLowerCase() === match![0].toLowerCase()
        );
        
        if (matchingEvent) {
          if (match.index > lastIndex) {
            parts.push(content.slice(lastIndex, match.index));
          }
          
          parts.push(
            <button
              key={`event-name-${matchingEvent.id}-${match.index}`}
              onClick={() => onEventClick?.(matchingEvent.id)}
              className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 underline font-medium cursor-pointer transition-colors duration-200 bg-green-50 dark:bg-green-900/20 px-1 py-0.5 rounded"
              type="button"
              title={`Open event: ${matchingEvent.name} (ID: ${matchingEvent.id})`}
            >
              {match![0]}
            </button>
          );
          
          lastIndex = eventNamePattern.lastIndex;
        }
      }
      
      if (lastIndex < content.length) {
        parts.push(content.slice(lastIndex));
      }
      
      return parts.length > 1 ? parts : content;
    }
    return content;
  };

  return (
    <div className={`markdown-content ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Enhanced styling for better AI response display
          p: ({ children, ...props }) => {
            // Helper function to recursively flatten and process nested arrays
            const flattenAndProcess = (items: any[]): any[] => {
              const result: any[] = [];
              for (const item of items) {
                if (Array.isArray(item)) {
                  result.push(...flattenAndProcess(item));
                } else {
                  result.push(item);
                }
              }
              return result;
            };

            // Helper function to process a single text string through all link types
            const processAllLinks = (text: string): any => {
              // Process Task #ID patterns first
              let processed: any = processTaskLinks(text);
              
              // If it's an array, process each string part for task names and events
              if (Array.isArray(processed)) {
                processed = processed.map((part) => {
                  if (typeof part === 'string') {
                    // Process task names
                    let taskNameProcessed = processTaskNameLinks(part);
                    if (Array.isArray(taskNameProcessed)) {
                      // Process each part for event links
                      return taskNameProcessed.map(namePart => 
                        typeof namePart === 'string' ? processEventLinks(namePart) : namePart
                      );
                    } else if (typeof taskNameProcessed === 'string') {
                      return processEventLinks(taskNameProcessed);
                    }
                    return taskNameProcessed;
                  }
                  return part;
                });
                // Flatten nested arrays
                return flattenAndProcess(processed);
              } else if (typeof processed === 'string') {
                // Process task names
                let taskNameProcessed = processTaskNameLinks(processed);
                if (Array.isArray(taskNameProcessed)) {
                  // Process each part for event links
                  taskNameProcessed = taskNameProcessed.map(part => 
                    typeof part === 'string' ? processEventLinks(part) : part
                  );
                  return flattenAndProcess(taskNameProcessed);
                } else if (typeof taskNameProcessed === 'string') {
                  return processEventLinks(taskNameProcessed);
                }
                return taskNameProcessed;
              }
              
              return processed;
            };

            // Process children to handle all types of links: Task #123, task names, event names
            const processedChildren = React.Children.map(children, (child) => {
              if (typeof child === 'string') {
                const result = processAllLinks(child);
                return Array.isArray(result) ? result : [result];
              }
              return child;
            });

            // Flatten the final result
            const flattenedChildren = processedChildren ? flattenAndProcess(processedChildren) : [];
            
            return <p {...props} className="mb-3 text-gray-700 dark:text-gray-300 leading-relaxed">{flattenedChildren}</p>;
          },
          strong: ({ children, ...props }) => <strong {...props} className="font-semibold text-gray-900 dark:text-gray-100">{children}</strong>,
          em: ({ children, ...props }) => <em {...props} className="italic text-gray-800 dark:text-gray-200">{children}</em>,
          ul: ({ children, ...props }) => <ul {...props} className="list-disc list-inside mb-3 space-y-1">{children}</ul>,
          ol: ({ children, ...props }) => <ol {...props} className="list-decimal list-inside mb-3 space-y-1">{children}</ol>,
          li: ({ children, node, ...props }) => {
            // Helper function to recursively flatten and process nested arrays  
            const flattenAndProcess = (items: any[]): any[] => {
              const result: any[] = [];
              for (const item of items) {
                if (Array.isArray(item)) {
                  result.push(...flattenAndProcess(item));
                } else {
                  result.push(item);
                }
              }
              return result;
            };

            // Helper function to process a single text string through all link types
            const processAllLinks = (text: string): any => {
              // Process Task #ID patterns first
              let processed: any = processTaskLinks(text);
              
              // If it's an array, process each string part for task names and events
              if (Array.isArray(processed)) {
                processed = processed.map((part) => {
                  if (typeof part === 'string') {
                    // Process task names
                    let taskNameProcessed = processTaskNameLinks(part);
                    if (Array.isArray(taskNameProcessed)) {
                      // Process each part for event links
                      return taskNameProcessed.map(namePart => 
                        typeof namePart === 'string' ? processEventLinks(namePart) : namePart
                      );
                    } else if (typeof taskNameProcessed === 'string') {
                      return processEventLinks(taskNameProcessed);
                    }
                    return taskNameProcessed;
                  }
                  return part;
                });
                // Flatten nested arrays
                return flattenAndProcess(processed);
              } else if (typeof processed === 'string') {
                // Process task names
                let taskNameProcessed = processTaskNameLinks(processed);
                if (Array.isArray(taskNameProcessed)) {
                  // Process each part for event links
                  taskNameProcessed = taskNameProcessed.map(part => 
                    typeof part === 'string' ? processEventLinks(part) : part
                  );
                  return flattenAndProcess(taskNameProcessed);
                } else if (typeof taskNameProcessed === 'string') {
                  return processEventLinks(taskNameProcessed);
                }
                return taskNameProcessed;
              }
              
              return processed;
            };

            // Process children for task/event links
            const processedChildren = React.Children.map(children, (child) => {
              if (typeof child === 'string') {
                const result = processAllLinks(child);
                return Array.isArray(result) ? result : [result];
              }
              return child;
            });

            // Flatten the final result
            const flattenedChildren = processedChildren ? flattenAndProcess(processedChildren) : [];

            return (
              <li {...props} key={node?.position?.start?.offset || Math.random()} className="text-gray-700 dark:text-gray-300">
                {flattenedChildren}
              </li>
            );
          },
          code: ({ children, className }) => {
            const isInline = !className;
            if (isInline) {
              return (
                <code className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-sm font-mono text-gray-800 dark:text-gray-200">
                  {children}
                </code>
              );
            }
            return (
              <code className="block bg-gray-100 dark:bg-gray-800 p-3 rounded-md text-sm font-mono text-gray-800 dark:text-gray-200 overflow-x-auto">
                {children}
              </code>
            );
          },
          pre: ({ children }) => <pre className="mb-3">{children}</pre>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-blue-500 pl-4 mb-3 text-gray-600 dark:text-gray-400 italic">
              {children}
            </blockquote>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto mb-3">
              <table className="min-w-full border-collapse border border-gray-300 dark:border-gray-600 text-sm">
                {children}
              </table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 px-3 py-2 text-left font-semibold">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border border-gray-300 dark:border-gray-600 px-3 py-2">
              {children}
            </td>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownRenderer;