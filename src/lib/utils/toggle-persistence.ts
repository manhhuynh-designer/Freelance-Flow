/**
 * Utility functions for persisting toggle states in localStorage
 */
import { useState, useEffect } from 'react';
import { browserLocal } from '@/lib/browser';

const STORAGE_PREFIX = 'freelance-flow-toggle';

export interface ToggleState {
  [key: string]: boolean;
}

/**
 * Save a toggle state to localStorage
 */
export function saveToggleState(key: string, value: boolean): void {
  try {
    const storageKey = `${STORAGE_PREFIX}-${key}`;
    browserLocal.setItem(storageKey, JSON.stringify(value));
  } catch (error) {
    console.warn('Failed to save toggle state:', error);
  }
}

/**
 * Load a toggle state from localStorage
 */
export function loadToggleState(key: string, defaultValue: boolean = false): boolean {
  try {
    const storageKey = `${STORAGE_PREFIX}-${key}`;
    const stored = browserLocal.getItem(storageKey);
    if (stored !== null) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.warn('Failed to load toggle state:', error);
  }
  return defaultValue;
}

/**
 * Hook for persisted toggle state
 */
export function usePersistedToggle(key: string, defaultValue: boolean = false) {
  const [value, setValue] = useState(defaultValue);

  // Load initial value from localStorage
  useEffect(() => {
    const savedValue = loadToggleState(key, defaultValue);
    console.log(`[Toggle Persistence] Loading state for ${key}:`, savedValue);
    setValue(savedValue);
  }, [key, defaultValue]);

  // Function to update value and persist it
  const setPersistedValue = (newValue: boolean | ((prev: boolean) => boolean)) => {
    const finalValue = typeof newValue === 'function' ? newValue(value) : newValue;
    console.log(`[Toggle Persistence] Saving state for ${key}:`, finalValue);
    setValue(finalValue);
    saveToggleState(key, finalValue);
  };

  return [value, setPersistedValue] as const;
}

/**
 * Predefined keys for consistent toggle state management
 */
export const TOGGLE_KEYS = {
  BUSINESS_AI_PANEL: 'business-ai-panel',
  PREDICTION_AI_PANEL: 'prediction-ai-panel',
  // Add more toggle keys as needed
} as const;