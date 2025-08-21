"use client";

import React, { useState } from 'react';
import { Search, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAppData } from '@/hooks/useAppData';
import { queryTasks } from '@/lib/vector-db/tasks-indexer';

export function SemanticSearchPanel() {
  const { appData } = useAppData();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const hasApiKey = !!(appData?.appSettings?.googleApiKey);
  const indexedCount = (appData?.tasks || []).filter((t: any) => Array.isArray(t.vector) && t.vector.length > 0).length;

  const handleSearch = async () => {
    if (!query.trim() || !hasApiKey) return;
    
    setIsSearching(true);
    try {
      const gKey = appData?.appSettings?.googleApiKey!;
      const gModel = appData?.appSettings?.googleModel;
      
      const searchResults = await queryTasks(query, 5, { apiKey: gKey, model: gModel });
      setResults(searchResults);
    } catch (error) {
      console.warn('Semantic search failed:', error);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  if (!hasApiKey) {
    return (
      <Card className="border-muted">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertCircle className="w-4 h-4" />
            Configure API key to enable semantic search
          </div>
        </CardContent>
      </Card>
    );
  }

  if (indexedCount === 0) {
    return (
      <Card className="border-muted">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertCircle className="w-4 h-4" />
            No indexed tasks available for search
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Search className="w-5 h-5" />
          Semantic Search
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground">
          Search through {indexedCount} indexed tasks using natural language.
        </div>
        
        <div className="flex gap-2">
          <Input
            placeholder="e.g., 'urgent design tasks' or 'client meetings'"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isSearching}
          />
          <Button 
            onClick={handleSearch}
            disabled={isSearching || !query.trim()}
            size="icon"
          >
            <Search className={`w-4 h-4 ${isSearching ? 'animate-pulse' : ''}`} />
          </Button>
        </div>
        
        {results.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-medium">Search Results:</div>
            {results.map((result, index) => {
              const task = appData?.tasks?.find((t: any) => t.id === result.metadata?.taskId);
              if (!task) return null;
              
              return (
                <div key={index} className="p-3 border rounded-lg space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="font-medium text-sm">{task.name || task.title}</div>
                    <Badge variant="secondary" className="text-xs">
                      {Math.round(result.score * 100)}% match
                    </Badge>
                  </div>
                  {task.description && (
                    <div className="text-xs text-muted-foreground line-clamp-2">
                      {task.description}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        
        {results.length === 0 && query && !isSearching && (
          <div className="text-sm text-muted-foreground text-center py-4">
            No matching tasks found. Try different keywords.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
