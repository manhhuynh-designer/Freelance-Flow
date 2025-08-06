"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { askAboutTasksAction } from '@/app/actions/ai-actions';

export default function AITestPage() {
  const [input, setInput] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);

  const testAI = async () => {
    if (!input.trim()) return;
    
    setLoading(true);
    try {
      const result = await askAboutTasksAction({
        userInput: input,
        history: [],
        tasks: [],
        clients: [],
        collaborators: [],
        quoteTemplates: [],
        language: 'vi',
        modelName: 'gemini-1.5-flash',
        apiKey: 'test' // This will show error message about API key needed
      });
      
      setResponse(result.text);
    } catch (error: any) {
      setResponse('Error: ' + error.message);
    }
    setLoading(false);
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Test AI Chat</h1>
      
      <div className="space-y-4">
        <div className="flex gap-2">
          <Input 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Nhập tin nhắn test..."
            className="flex-1"
          />
          <Button onClick={testAI} disabled={loading}>
            {loading ? 'Testing...' : 'Test AI'}
          </Button>
        </div>
        
        {response && (
          <div className="p-4 border rounded-lg bg-muted">
            <h3 className="font-semibold mb-2">Response:</h3>
            <p className="whitespace-pre-wrap">{response}</p>
          </div>
        )}
      </div>
    </div>
  );
}
