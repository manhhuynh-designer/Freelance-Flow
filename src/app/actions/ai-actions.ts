'use server';

import { chatWithAI, type ChatRequest } from '@/ai/simple-ai';
import type { AskAboutTasksInput, AskAboutTasksOutput } from '@/lib/ai-types';
import { z } from 'zod';
import { PouchDBService } from '@/lib/pouchdb-service';
import { buildWorkTimeStats, WorkSession } from '@/lib/helpers/time-analyzer';
import type { AppData } from '@/lib/types';

// --- Placeholders ---
export async function askAboutTasksAction(input: AskAboutTasksInput): Promise<AskAboutTasksOutput> { return { text: "...", action: null}; }
export async function suggestQuoteAction(input: any): Promise<any> { return null; }

// --- AI Writing Assistant Action ---

const WritingAssistantInputSchema = z.object({
  baseText: z.string().min(10, "Base text is too short."),
  prompt: z.string().optional(),
  action: z.enum(['write', 'edit', 'reply', 'summarize', 'translate']),
  tone: z.enum(['formal', 'casual', 'professional', 'friendly']),
  length: z.enum(['short', 'medium', 'long']),
  outputLanguage: z.enum(['en', 'vi']),
  apiKey: z.string().min(1),
  modelName: z.string().min(1),
});

type WritingAssistantInput = z.infer<typeof WritingAssistantInputSchema>;

function buildFinalPrompt(params: WritingAssistantInput): string {
    const { baseText, prompt, tone, length, outputLanguage, action } = params;
    const targetLanguage = outputLanguage === 'vi' ? 'Vietnamese' : 'English';

    let mainTask = `Your main task is to perform the action "${action}" on the "Base Content".`;
    if(prompt) mainTask += `\nFollow these specific instructions: "${prompt}"`;
    
    let finalPrompt = `${mainTask}\n\n--- Base Content ---\n${baseText}\n\n--- AI INSTRUCTIONS ---`;
    finalPrompt += `\n- Tone: ${tone}.`;
    finalPrompt += `\n- Length: ${length}.`;
    finalPrompt += `\n- Language: Respond in ${targetLanguage}.`;
    finalPrompt += `\n- OUTPUT FORMAT: You MUST respond with a single, valid JSON object. Do not add any text before or after it. The JSON object must have two keys: "summaryTitle" (a short, 5-7 word summary of the original user's request in ${targetLanguage}) and "mainContent" (the full text result, formatted in Markdown if appropriate).`;
    
    return finalPrompt;
}

export async function writingAssistantAction(input: WritingAssistantInput): Promise<{ success: boolean; result?: { mainContent: string; summaryTitle: string; }; error?: string }> {
  try {
    const validation = WritingAssistantInputSchema.safeParse(input);
    if (!validation.success) { return { success: false, error: "Invalid input." }; }
    
    const prompt = buildFinalPrompt(validation.data);
    const result = await chatWithAI({
      messages: [{ role: 'user', content: prompt, timestamp: new Date() }],
      modelName: validation.data.modelName, apiKey: validation.data.apiKey,
    });
    
    if (result.success) {
      try {
        // Find and parse the JSON object from the response string
        const jsonString = result.message.content.match(/\{[\s\S]*\}/)?.[0];
        if (!jsonString) throw new Error("No valid JSON object found in AI response.");
        const parsedResult = JSON.parse(jsonString);

        if (typeof parsedResult.mainContent === 'string' && typeof parsedResult.summaryTitle === 'string') {
            return { success: true, result: parsedResult };
        } else {
            throw new Error("JSON response is missing required keys ('mainContent', 'summaryTitle').");
        }
      } catch (e: any) {
        // If parsing fails, return the raw content as a fallback
        return { success: true, result: { mainContent: result.message.content, summaryTitle: "Untitled" } };
      }
    } else {
      return { success: false, error: result.error || 'AI error.' };
    }

  } catch (error: any) {
    return { success: false, error: error.message || 'Server error.' };
  }
}

// --- Analyze Business Action ---

const AnalyzeBusinessInputSchema = z.object({
  apiKey: z.string().optional(),
  modelName: z.string().optional(),
  rangeDays: z.number().int().positive().optional(),
  includeDetails: z.boolean().optional(),
  // Optional client-side snapshot fallback if server cannot access PouchDB
  appDataSnapshot: z.any().optional(),
});

type AnalyzeBusinessInput = z.infer<typeof AnalyzeBusinessInputSchema>;

export async function analyzeBusinessAction(input: AnalyzeBusinessInput): Promise<{ success: boolean; insights?: any[]; raw?: string; error?: string }> {
  try {
    const parsed = AnalyzeBusinessInputSchema.safeParse(input);
    if (!parsed.success) return { success: false, error: 'Invalid input.' };
    const { apiKey, modelName, rangeDays = 30, includeDetails = false, appDataSnapshot } = parsed.data;

    // Try to load appData from PouchDB (best-effort). If not available (server env), use snapshot.
    let appData: AppData | null = null;
    try {
      appData = await PouchDBService.loadAppData();
    } catch (e) {
      // Fallback to provided snapshot
      if (appDataSnapshot) {
        appData = appDataSnapshot as AppData;
      } else {
        return { success: false, error: 'Unable to load app data from PouchDB and no snapshot provided.' };
      }
    }

    // Aggregate minimal KPIs (KISS): revenue, costs, netProfit, margin, topClients, costStructure, cashTrend
    // Heuristics: revenue from quotes with status 'paid' OR quotes.total; costs from expenses + fixedCosts
    const now = new Date();
    const fromDate = new Date(now.getTime() - rangeDays * 24 * 60 * 60 * 1000);

    const quotes = Array.isArray((appData as any).quotes) ? (appData as any).quotes : [];
    const expenses = Array.isArray((appData as any).expenses) ? (appData as any).expenses : [];
    const fixedCosts = Array.isArray((appData as any).fixedCosts) ? (appData as any).fixedCosts : [];
    const tasks = Array.isArray((appData as any).tasks) ? (appData as any).tasks : [];
    const clients = Array.isArray((appData as any).clients) ? (appData as any).clients : [];

    // Revenue: sum of quotes.total where createdAt within range OR status paid and date within range
    let revenue = 0;
    for (const q of quotes) {
      const date = q?.createdAt ? new Date(q.createdAt) : null;
      const inRange = !date || date >= fromDate;
      const amount = Number(q?.total || 0) || 0;
      if (inRange) revenue += amount;
    }

    const costSum = (expenses.reduce((s:any,e:any)=> s + (Number(e.amount)||0), 0) + fixedCosts.reduce((s:any,f:any)=> s + (Number(f.amount)||0), 0));
    const netProfit = revenue - costSum;
    const marginPercent = revenue > 0 ? Math.round((netProfit / revenue) * 10000) / 100 : 0;

    // Top clients by revenue (match quotes.clientId)
    const clientMap = new Map<string, number>();
    for (const q of quotes) {
      const cid = q?.clientId || 'unknown';
      const amt = Number(q?.total || 0) || 0;
      clientMap.set(cid, (clientMap.get(cid) || 0) + amt);
    }
  const topClients = Array.from(clientMap.entries()).map(([id, amt]) => ({ id, amt, name: ((clients as any[]).find((c:any)=>c.id===id)?.name || id) }));
    topClients.sort((a,b)=> b.amt - a.amt);
    const totalRevenue = revenue || 1;
    const topClientsPct = topClients.slice(0,3).map(c => ({ ...c, pct: Math.round((c.amt / totalRevenue) * 10000)/100 }));

    // Cost structure by category (from expenses)
    const costMap = new Map<string, number>();
    for (const e of expenses) {
      const cat = e?.category || 'Other';
      costMap.set(cat, (costMap.get(cat)||0) + (Number(e.amount)||0));
    }
    for (const f of fixedCosts) {
      const cat = f?.type || 'Fixed';
      costMap.set(cat, (costMap.get(cat)||0) + (Number(f.amount)||0));
    }
    const costStructure = Array.from(costMap.entries()).map(([k,v]) => ({ category: k, amount: v, pct: Math.round((v / (costSum||1)) * 10000)/100 }));

    // Cash trend: naive compare revenue last period vs this period
    const prevFrom = new Date(fromDate.getTime() - rangeDays * 24 * 60 * 60 * 1000);
    const prevRevenue = quotes.reduce((s:any,q:any)=> s + ((q?.createdAt && new Date(q.createdAt) >= prevFrom && new Date(q.createdAt) < fromDate) ? (Number(q.total)||0) : 0), 0);
    const cashTrendSign = revenue > prevRevenue ? 'up' : revenue < prevRevenue ? 'down' : 'flat';

    // Pareto detection
    const top1 = topClients[0];
    const top1Pct = top1 ? Math.round((top1.amt / totalRevenue) * 10000)/100 : 0;
    const top3Total = topClients.slice(0,3).reduce((s,a)=> s + (a.amt||0), 0);
    const top3Pct = Math.round((top3Total / totalRevenue) * 10000)/100;
    const alerts: any[] = [];
    if (top1Pct >= 50) alerts.push({ id: 'pareto-top1', type: 'pareto', severity: 'high', message: `${top1Pct}% revenue from ${top1?.name || 'a single client'}` });
    else if (top3Pct >= 80) alerts.push({ id: 'pareto-top3', type: 'pareto', severity: 'medium', message: `Top 3 clients contribute ${top3Pct}% of revenue` });

    // Build a compact context JSON to send to AI (keep minimal)
    const context = {
      periodDays: rangeDays,
      revenue: Math.round(revenue*100)/100,
      costs: Math.round(costSum*100)/100,
      netProfit: Math.round(netProfit*100)/100,
      marginPercent,
      topClients: topClientsPct.map(c=> ({ name: c.name, pct: c.pct, amount: Math.round(c.amt*100)/100 })),
      costStructure: costStructure.slice(0,6),
      alerts,
      cashTrendSign,
    };

    // Build AI prompt with strict JSON array output requirement (3 insights)
    const prompt = `You are a senior freelance business analyst. Given the JSON CONTEXT below, produce an array of 1-3 actionable insights for a freelancer. Each insight must be a JSON object with keys: category (one of ['Risk','Opportunity','Optimization']), severity ('low'|'medium'|'high'), insight (short sentence), suggestion (imperative, one clear action), and justification (one-line numeric justification). Respond ONLY with a JSON array. Do not include any extra text.\n\nCONTEXT=${JSON.stringify(context)}`;

    // Determine API key and model
    let finalApiKey = apiKey;
    let finalModel = modelName || (appData?.appSettings?.googleModel || 'gemini-1.0');
    if (!finalApiKey) finalApiKey = appData?.appSettings?.googleApiKey || '';
    if (!finalApiKey) return { success: false, error: 'No API key provided or configured in app settings.' };

    const response = await chatWithAI({ messages: [{ role: 'user', content: prompt, timestamp: new Date() }], apiKey: finalApiKey, modelName: finalModel });

    if (!response.success) return { success: false, error: response.error || 'AI call failed', raw: response.message.content };

    // Parse JSON array from response
    let insights: any[] = [];
    try {
      const cleaned = (response.message.content || '').replace(/```/g, '').trim();
      const firstBracket = cleaned.indexOf('[');
      const lastBracket = cleaned.lastIndexOf(']');
      const jsonText = firstBracket !== -1 && lastBracket !== -1 ? cleaned.substring(firstBracket, lastBracket + 1) : cleaned;
      const parsedJson = JSON.parse(jsonText);
      if (Array.isArray(parsedJson)) insights = parsedJson;
      else return { success: false, error: 'AI response not an array', raw: response.message.content };
    } catch (e:any) {
      return { success: false, error: 'Failed to parse AI response', raw: response.message.content };
    }

    return { success: true, insights, raw: response.message.content };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Server error' };
  }
}
