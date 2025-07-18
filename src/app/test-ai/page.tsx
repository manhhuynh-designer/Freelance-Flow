'use client';

import { useState } from 'react';
import { testServerAction } from '@/app/actions/test-action';
import { askAboutTasksAction } from '@/app/actions/ai-actions';

export default function TestAI() {
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);

  const testBasicAction = async () => {
    try {
      setLoading(true);
      const response = await testServerAction();
      setResult(`Basic test: ${JSON.stringify(response)}`);
    } catch (error: any) {
      setResult(`Basic test error: ${error.message || error}`);
    } finally {
      setLoading(false);
    }
  };

  const testAIAction = async () => {
    try {
      setLoading(true);
      const response = await askAboutTasksAction({
        userInput: "Hello",
        history: [],
        tasks: [],
        clients: [],
        collaborators: [],
        quoteTemplates: [],
        language: 'en',
        provider: 'google',
        modelName: 'gemini-1.5-flash'
      });
      setResult(`AI test: ${JSON.stringify(response)}`);
    } catch (error: any) {
      setResult(`AI test error: ${error.message || error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">AI Debug Test</h1>
      
      <div className="space-y-4">
        <button 
          onClick={testBasicAction} 
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded"
        >
          Test Basic Server Action
        </button>
        
        <button 
          onClick={testAIAction} 
          disabled={loading}
          className="px-4 py-2 bg-green-500 text-white rounded"
        >
          Test AI Action
        </button>
        
        {loading && <p>Loading...</p>}
        
        <div className="mt-4 p-4 border rounded">
          <h3 className="font-bold">Result:</h3>
          <pre className="whitespace-pre-wrap">{result}</pre>
        </div>
      </div>
    </div>
  );
}
