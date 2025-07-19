"use client";

import React from 'react';
import { SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Task } from '@/lib/types';
import { CompactTaskCard } from '@/components/eisenhower/CompactTaskCard';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import styles from './UncategorizedTasksCarousel.module.css';

interface UncategorizedTasksCarouselProps {
  tasks: Task[];
  title: string;
  emptyMessage: string;
  onClearQuadrant: (taskId: string) => void;
}

export function UncategorizedTasksCarousel({ 
  tasks, 
  title, 
  emptyMessage, 
  onClearQuadrant 
}: UncategorizedTasksCarouselProps) {
  const scrollAreaRef = React.useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = React.useState(false);
  const [canScrollRight, setCanScrollRight] = React.useState(false);
  const [isScrolling, setIsScrolling] = React.useState(false);

  const checkScrollButtons = React.useCallback(() => {
    const viewport = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]') as HTMLDivElement;
    if (viewport) {
      const { scrollLeft, scrollWidth, clientWidth } = viewport;
      setCanScrollLeft(scrollLeft > 5); // Small threshold for better UX
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 5);
    }
  }, []);

  const scrollLeft = React.useCallback(() => {
    const viewport = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]') as HTMLDivElement;
    if (viewport) {
      const cardWidth = 192 + 12; // w-48 (192px) + gap-3 (12px)
      const scrollAmount = Math.max(cardWidth * 2, viewport.clientWidth * 0.6); // Scroll 2 cards or 60% of viewport
      viewport.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    }
  }, []);

  const scrollRight = React.useCallback(() => {
    const viewport = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]') as HTMLDivElement;
    if (viewport) {
      const cardWidth = 192 + 12; // w-48 (192px) + gap-3 (12px)
      const scrollAmount = Math.max(cardWidth * 2, viewport.clientWidth * 0.6); // Scroll 2 cards or 60% of viewport
      viewport.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  }, []);

  React.useEffect(() => {
    checkScrollButtons();
    const viewport = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]') as HTMLDivElement;
    if (viewport) {
      let scrollTimeout: NodeJS.Timeout;
      
      const handleScroll = () => {
        setIsScrolling(true);
        clearTimeout(scrollTimeout);
        
        requestAnimationFrame(checkScrollButtons);
        
        scrollTimeout = setTimeout(() => {
          setIsScrolling(false);
        }, 150);
      };

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.target === viewport || viewport.contains(e.target as Node)) {
          if (e.key === 'ArrowLeft') {
            e.preventDefault();
            scrollLeft();
          } else if (e.key === 'ArrowRight') {
            e.preventDefault();
            scrollRight();
          }
        }
      };
      
      viewport.addEventListener('scroll', handleScroll, { passive: true });
      viewport.addEventListener('keydown', handleKeyDown);
      viewport.setAttribute('tabindex', '0'); // Make focusable for keyboard nav
      
      return () => {
        viewport.removeEventListener('scroll', handleScroll);
        viewport.removeEventListener('keydown', handleKeyDown);
        clearTimeout(scrollTimeout);
      };
    }
  }, [tasks.length, checkScrollButtons, scrollLeft, scrollRight]);

  const showScrollButtons = tasks.length > 4; // Show when more than 4 cards

  return (
    <div className={`${styles.carouselContainer} carousel-container-constrained`}>
      <Card className="w-full max-w-full overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            {title}
            <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
              {tasks.length}
            </span>
            {showScrollButtons && (
              <span className="text-xs text-muted-foreground ml-auto">
                Vuốt để xem thêm
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {tasks.length === 0 ? (
            <p className="text-muted-foreground text-center py-4 text-sm">{emptyMessage}</p>
          ) : (
            <div className={styles.scrollContainer}>
              <ScrollArea ref={scrollAreaRef} className={`${styles.scrollArea} carousel-scroll-area`}>
                <div className={styles.scrollContent}>
                  <SortableContext items={tasks.map(task => task.id)} strategy={horizontalListSortingStrategy}>
                    {tasks.map(task => (
                      <div key={task.id} className={styles.taskCard}>
                        <CompactTaskCard 
                          task={task} 
                          onClearQuadrant={onClearQuadrant}
                          variant="uncategorized"
                        />
                      </div>
                    ))}
                  </SortableContext>
                </div>
                <ScrollBar orientation="horizontal" className="h-2" />
              </ScrollArea>
            
            {/* Gradient overlays for visual scroll indication */}
            {showScrollButtons && (
              <>
                {canScrollLeft && (
                  <div className="absolute left-0 top-0 bottom-2 w-8 bg-gradient-to-r from-card via-card/80 to-transparent pointer-events-none z-10" />
                )}
                {canScrollRight && (
                  <div className="absolute right-0 top-0 bottom-2 w-8 bg-gradient-to-l from-card via-card/80 to-transparent pointer-events-none z-10" />
                )}
              </>
            )}
            
            {/* Navigation buttons overlay */}
            {showScrollButtons && !isScrolling && (
              <>
                {canScrollLeft && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={scrollLeft}
                    className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0 z-20 bg-background/95 backdrop-blur-sm border shadow-lg opacity-80 hover:opacity-100 transition-opacity"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                )}
                {canScrollRight && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={scrollRight}
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0 z-20 bg-background/95 backdrop-blur-sm border shadow-lg opacity-80 hover:opacity-100 transition-opacity"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                )}
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
    </div>
  );
}
