import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import {openAI} from 'genkitx-openai';

// This is the global, unconfigured instance for defining flows/prompts.
export const ai = genkit();

// Re-export the genkit factory function for use inside flows
export {genkit, googleAI, openAI};
