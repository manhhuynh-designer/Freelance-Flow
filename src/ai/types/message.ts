import { z } from 'genkit';

export const MessageSchema = z.object({
  role: z.enum(['user', 'model', 'system', 'tool']), // Expanded roles for Genkit compatibility
  content: z.array(z.object({ text: z.string() })),
});

export type Message = z.infer<typeof MessageSchema>;