/**
 * @fileoverview A React component to display suggestion chips for the AI chat interface.
 * These chips provide users with quick actions or common questions they can ask the AI.
 */

import React from 'react';
// Assuming a 'Card' component exists in the UI library, as per the plan.
// If not, a styled div can be used instead.
import { Card } from '@/components/ui/card';

interface Suggestion {
  text: string;
  action?: any; // The action payload to be dispatched if the chip is selected.
}

interface SuggestionChipsProps {
  /** An array of suggestion objects to display. */
  suggestions: Suggestion[];
  /** A callback function that is invoked when a suggestion chip is selected. */
  onSelect: (suggestion: Suggestion) => void;
}

/**
 * Renders a list of clickable suggestion chips.
 * This component is designed to be placed in the chat input area to guide the user.
 * @param {SuggestionChipsProps} props The props for the component.
 * @returns A React element representing the list of suggestion chips.
 */
export function SuggestionChips({ suggestions, onSelect }: SuggestionChipsProps) {
  if (!suggestions || suggestions.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2 p-2">
      {suggestions.map((suggestion, index) => (
        <Card
          key={index}
          className="cursor-pointer hover:bg-accent p-2 rounded-lg shadow-sm transition-colors duration-200"
          onClick={() => onSelect(suggestion)}
        >
          <span className="text-sm font-medium text-foreground">
            {suggestion.text}
          </span>
        </Card>
      ))}
    </div>
  );
}