/**
 * @fileoverview A module for recognizing patterns and intents in user input.
 * This helps in guiding the AI model by pre-processing the user's text
 * to identify key actions and entities.
 */

type Intent = 'createTask' | 'editTask' | 'updateStatus' | 'query' | 'unknown';

export class PatternRecognition {
  /**
   * Detects the primary intent from the user's message.
   * @param message The user's input string.
   * @returns The detected intent.
   */
  static detectIntent(message: string): Intent {
    const lowerCaseMessage = message.toLowerCase();

    // Keywords for creating tasks (expanded and more specific)
    const createKeywords = [
      'create', 'add', 'new task', 'make a task', 'schedule', 'set up', 
      'tạo', 'thêm', 'tạo công việc', 'tạo task', 'làm task mới', 'tạo việc'
    ];
    const createPatterns = [
      /create.*task/i,
      /add.*task/i,
      /new.*task/i,
      /make.*task/i,
      /tạo.*task/i,
      /tạo.*công việc/i,
      /làm.*task/i
    ];
    
    const hasCreateKeyword = createKeywords.some(kw => lowerCaseMessage.includes(kw));
    const hasCreatePattern = createPatterns.some(pattern => pattern.test(message));
    const hasCreateMarker = message.includes('#Task') || message.includes('/Task');
    
    if (hasCreateKeyword || hasCreatePattern || hasCreateMarker) {
      return 'createTask';
    }

    // Keywords for editing tasks
    const editKeywords = ['edit', 'update', 'change', 'modify', 'sửa', 'cập nhật', 'thay đổi'];
    if (editKeywords.some(kw => lowerCaseMessage.includes(kw)) || message.includes('#Edit')) {
      return 'editTask';
    }
    
    // Keywords for updating status
    const statusKeywords = ['status to', 'change status', 'mark as', 'move to', 'đổi trạng thái', 'chuyển sang'];
    if (statusKeywords.some(kw => lowerCaseMessage.includes(kw))) {
        return 'updateStatus';
    }

    // Default to query if no other intent is detected
    return 'query';
  }

  /**
   * A simple language detection based on character sets or keywords.
   * @param message The user's input string.
   * @returns The detected language ('vi' or 'en').
   */
  static detectLanguageFromMessage(message: string): 'vi' | 'en' {
    // Vietnamese characters regex
    const vietnameseRegex = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/;
    if (vietnameseRegex.test(message)) {
      return 'vi';
    }
    return 'en';
  }
}