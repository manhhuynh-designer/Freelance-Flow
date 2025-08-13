/**
 * Gemini AI API utility for prediction insights
 */

interface GeminiAPIResponse {
  insights: string[];
}

export async function callGeminiAPI(prompt: string): Promise<string[]> {
  try {
    // Placeholder implementation - actual API call will be added later
    // For now, return mock insights to allow testing the UI flow
    console.log('🤖 Calling Gemini API with prompt:', prompt.substring(0, 100) + '...');
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Mock response for testing
    const mockInsights = [
      "Consider scheduling high-priority tasks during your peak productivity hours (9-11 AM)",
      "Your completion rate improves by 25% when you take breaks every 90 minutes",
      "Tasks similar to 'Design Review' typically take 20% longer than estimated",
      "Your productivity tends to decline on Fridays - consider lighter workloads",
      "Breaking large tasks into smaller chunks increases your success rate by 30%"
    ];
    
    return mockInsights;
  } catch (error) {
    console.error('Error calling Gemini API:', error);
    return [];
  }
}
