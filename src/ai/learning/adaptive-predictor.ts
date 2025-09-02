import { UserPattern } from './pattern-learner';

export type Prediction = {
	id?: string;
	action?: string;
	score?: number;
	reason?: string;
};

export function predictNextActions(events: any[] = [], count = 3): Prediction[] {
	// naive predictor: return a small list of canned predictions
	if (!events || events.length === 0) return [];
	return Array.from({ length: count }).map((_, i) => ({ id: `pred-${i}`, action: `suggested-action-${i + 1}`, score: 0.5 - i * 0.1, reason: 'pattern match' }));
}

export function predictFromPatterns(patterns: UserPattern[] = [], count = 3): Prediction[] {
	if (!patterns || patterns.length === 0) return [];
	return patterns.slice(0, count).map((p, i) => ({ id: `pred-p-${i}`, action: p.pattern || p.type || `action-${i}`, score: p.confidence ?? 0.5, reason: 'pattern-based' }));
}
// Minimal stub for adaptive-predictor
export type AdaptivePredictionModel = any;
export type AdaptivePrediction = any;
export type FeedbackData = any;

export function buildAdaptiveModel(_data: any): AdaptivePredictionModel { return {}; }
