// Minimal stub for ai-business-insights used across the codebase.
// Purpose: provide named export AIBusinessInsightGenerator so imports resolve during typecheck.
export class AIBusinessInsightGenerator {
  constructor(options?: any) {
    // no-op
  }

  async generateInsights(_data?: any): Promise<any[]> {
    // Return an empty array as a safe default for typechecking.
    return [];
  }

  // Static compatibility method used in some call sites
  static async generateBusinessInsights(_data?: any): Promise<{ success: boolean; insights: any[]; fallbackUsed?: boolean; error?: any }> {
    return { success: true, insights: [], fallbackUsed: false };
  }
}

export default AIBusinessInsightGenerator;
