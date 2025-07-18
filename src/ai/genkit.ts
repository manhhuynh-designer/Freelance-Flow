import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import {openAI} from 'genkitx-openai';

// Configure plugins with API keys from environment variables
const googleAIPlugin = googleAI({
  apiKey: process.env.GOOGLE_GENAI_API_KEY,
});

const openAIPlugin = openAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// This is the global, unconfigured instance for defining flows/prompts.
export const ai = genkit({
  plugins: [googleAIPlugin, openAIPlugin],
});

// Re-export the genkit factory function for use inside flows
export {genkit, googleAI, openAI};
