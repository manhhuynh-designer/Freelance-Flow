import { describe, it, expect } from 'vitest';
import { ContextManager } from './context-manager';

describe('ContextManager', () => {
  describe('buildSystemPrompt', () => {
    it('should build a basic prompt in English', () => {
      const prompt = ContextManager.buildSystemPrompt({
        language: 'en',
        intent: 'query',
        data: {},
      });
      expect(prompt).toContain('You are a professional freelance project management assistant');
      expect(prompt).toContain('respond in the following language: en');
    });

    it('should build a basic prompt in Vietnamese', () => {
      const prompt = ContextManager.buildSystemPrompt({
        language: 'vi',
        intent: 'query',
        data: {},
      });
      expect(prompt).toContain('Bạn là một trợ lý chuyên nghiệp quản lý dự án freelance');
      expect(prompt).toContain('trả lời bằng ngôn ngữ sau đây: vi');
    });

    it('should include client data when provided', () => {
      const prompt = ContextManager.buildSystemPrompt({
        language: 'en',
        intent: 'query',
        data: { clients: [{ id: '1', name: 'Test Client' }] },
      });
      expect(prompt).toContain('User\'s Clients');
      expect(prompt).toContain('Test Client');
    });

    it('should include task data when provided', () => {
      const prompt = ContextManager.buildSystemPrompt({
        language: 'en',
        intent: 'query',
        data: { tasks: [{ id: '1', name: 'Test Task' }] },
      });
      expect(prompt).toContain('User\'s Tasks');
      expect(prompt).toContain('Test Task');
    });

    it('should include all data contexts when provided', () => {
        const prompt = ContextManager.buildSystemPrompt({
            language: 'en',
            intent: 'query',
            data: {
                clients: [{ id: '1', name: 'Test Client' }],
                tasks: [{ id: '1', name: 'Test Task' }],
                collaborators: [{ id: '1', name: 'Test Collaborator' }],
                quoteTemplates: [{ id: '1', name: 'Test Template' }],
            },
        });
        expect(prompt).toContain('User\'s Clients');
        expect(prompt).toContain('User\'s Tasks');
        expect(prompt).toContain('User\'s Collaborators');
        expect(prompt).toContain('User\'s Quote Templates');
    });

    it('should include create task intent instruction', () => {
        const prompt = ContextManager.buildSystemPrompt({
            language: 'en',
            intent: 'createTask',
            data: {},
        });
        expect(prompt).toContain("primary intent has been identified as 'createTask'");
    });

    it('should include edit task intent instruction', () => {
        const prompt = ContextManager.buildSystemPrompt({
            language: 'en',
            intent: 'editTask',
            data: {},
        });
        expect(prompt).toContain("primary intent has been identified as 'editTask'");
    });
  });
});