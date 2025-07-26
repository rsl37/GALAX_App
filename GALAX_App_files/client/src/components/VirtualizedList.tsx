/*
 * Copyright (c) 2025 GALAX Civic Networking App
 * 
 * This software is licensed under the PolyForm Shield License 1.0.0.
 * For the full license text, see LICENSE file in the root directory 
 * or visit https://polyformproject.org/licenses/shield/1.0.0
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, AlertCircle } from 'lucide-react';

interface VirtualizedListProps<T> {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  renderItem: (item: T, index: number, isVisible: boolean) => React.ReactNode;
  keyExtractor: (item: T, index: number) => string | number;
  overscan?: number;
  loading?: boolean;
  error?: string;
  onEndReached?: () => void;
  onEndReachedThreshold?: number;
  loadingIndicator?: React.ReactNode;
  emptyComponent?: React.ReactNode;
  headerComponent?: React.ReactNode;
  footerComponent?: React.ReactNode;
  className?: string;
  estimatedItemSize?: number;
  onScroll?: (scrollTop: number) => void;
  maintainVisibleContentPosition?: boolean;
  getItemSize?: (index: number) => number;
}

interface ItemPosition {
  top: number;
  height: number;
}

export function VirtualizedList<T>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  keyExtractor,
  overscan = 3,
  loading = false,
  error,
  onEndReached,
  onEndReachedThreshold = 0.8,
  loadingIndicator,
  emptyComponent,
  headerComponent,
  footerComponent,
  className = '',
  estimatedItemSize,
  onScroll,
  maintainVisibleContentPosition = false,
  getItemSize
}: VirtualizedListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollElementRef = useRef<HTMLDivElement>(null);
  const scrollingTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const lastScrollTop = useRef(0);
  const [itemPositions, setItemPositions] = useState<ItemPosition[]>([]);

  // Calculate item positions for variable height items
  const calculateItemPositions = useCallback(() => {
    if (!getItemSize) return;
    
    const positions: ItemPosition[] = [];
    let currentTop = 0;
    
    for (let i = 0; i < items.length; i++) {
      const height = getItemSize(i);
      positions.push({
        top: currentTop,
        height
      });
      currentTop += height;
    }
    
    setItemPositions(positions);
  }, [items.length, getItemSize]);

  useEffect(() => {
    if (getItemSize) {
      calculateItemPositions();
    }
  }, [calculateItemPositions]);

  // Get total height
  const totalHeight = useMemo(() => {
    if (getItemSize && itemPositions.length > 0) {
      const lastPosition = itemPositions[itemPositions.length - 1];
      return lastPosition.top + lastPosition.height;
    }
    return items.length * itemHeight;
  }, [items.length, itemHeight, itemPositions, getItemSize]);

  // Calculate visible range
  const visibleRange = useMemo(() => {
    if (getItemSize && itemPositions.length > 0) {
      // Binary search for start index
      let startIndex = 0;
      let endIndex = itemPositions.length - 1;
      
      while (startIndex <= endIndex) {
        const mid = Math.floor((startIndex + endIndex) / 2);
        const position = itemPositions[mid];
        
        if (position.top + position.height < scrollTop) {
          startIndex = mid + 1;
        } else {
          endIndex = mid - 1;
        }
      }
      
      const start = Math.max(0, startIndex - overscan);
      
      // Find end index
      let end = start;
      let currentTop = itemPositions[start]?.top || 0;
      
      while (end < itemPositions.length && currentTop < scrollTop + containerHeight + (overscan * itemHeight)) {
        currentTop = itemPositions[end].top + itemPositions[end].height;
        end++;
      }
      
      return {
        start,
        end: Math.min(items.length, end + overscan)
      };
    } else {
      // Fixed height calculation
      const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
      const end = Math.min(
        items.length,
        Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
      );
      
      return { start, end };
    }
  }, [scrollTop, containerHeight, itemHeight, items.length, overscan, itemPositions, getItemSize]);

  // Handle scroll events
  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const element = event.currentTarget;
    const newScrollTop = element.scrollTop;
    
    setScrollTop(newScrollTop);
    setIsScrolling(true);
    
    // Clear existing timeout
    if (scrollingTimeoutRef.current) {
      clearTimeout(scrollingTimeoutRef.current);
    }
    
    // Set scrolling to false after a delay
    scrollingTimeoutRef.current = setTimeout(() => {
      setIsScrolling(false);
    }, 150);
    
    // Call external scroll handler
    onScroll?.(newScrollTop);
    
    // Check if we've reached the end
    if (onEndReached && !loading) {
      const scrollPercentage = (newScrollTop + containerHeight) / totalHeight;
      if (scrollPercentage >= onEndReachedThreshold) {
        onEndReached();
      }
    }
    
    lastScrollTop.current = newScrollTop;
  }, [containerHeight, totalHeight, onEndReached, onEndReachedThreshold, loading, onScroll]);

  // Render visible items
  const visibleItems = useMemo(() => {
    const items_to_render = [];
    
    for (let i = visibleRange.start; i < visibleRange.end; i++) {
      if (i >= items.length) break;
      
      const item = items[i];
      const key = keyExtractor(item, i);
      
      let top: number;
      let height: number;
      
      if (getItemSize && itemPositions[i]) {
        top = itemPositions[i].top;
        height = itemPositions[i].height;
      } else {
        top = i * itemHeight;
        height = itemHeight;
      }
      
      const isVisible = !isScrolling || (i >= visibleRange.start + overscan && i < visibleRange.end - overscan);
      
      items_to_render.push(
        <motion.div
          key={key}
          initial={maintainVisibleContentPosition ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.2, delay: (i - visibleRange.start) * 0.05 }}
          style={{
            position: 'absolute',
            top: top,
            height: height,
            width: '100%',
            pointerEvents: isVisible ? 'auto' : 'none'
          }}
          className={isVisible ? '' : 'opacity-50'}
        >
          {renderItem(item, i, isVisible)}
        </motion.div>
      );
    }
    
    return items_to_render;
  }, [
    visibleRange,
    items,
    keyExtractor,
    renderItem,
    itemHeight,
    isScrolling,
    overscan,
    maintainVisibleContentPosition,
    getItemSize,
    itemPositions
  ]);

  // Cleanup scroll timeout on unmount
  useEffect(() => {
    return () => {
      if (scrollingTimeoutRef.current) {
        clearTimeout(scrollingTimeoutRef.current);
      }
    };
  }, []);

  if (error) {
    return (
      <div className={`flex items-center justify-center h-full ${className}`}>
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (items.length === 0 && !loading) {
    return (
      <div className={`flex items-center justify-center h-full ${className}`}>
        {emptyComponent || (
          <div className="text-center">
            <p className="text-gray-500">No items to display</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {headerComponent && (
        <div className="sticky top-0 z-10 bg-white">
          {headerComponent}
        </div>
      )}
      
      <div
        ref={scrollElementRef}
        className="overflow-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
        style={{ height: containerHeight }}
        onScroll={handleScroll}
        role="list"
        aria-label="Virtualized list"
        tabIndex={0}
      >
        <div
          style={{ height: totalHeight, position: 'relative' }}
          role="presentation"
        >
          <AnimatePresence mode="popLayout">
            {visibleItems}
          </AnimatePresence>
        </div>
        
        {loading && (
          <div className="flex items-center justify-center py-8">
            {loadingIndicator || (
              <div className="flex items-center gap-2 text-gray-600">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Loading more...</span>
              </div>
            )}
          </div>
        )}
      </div>
      
      {footerComponent && (
        <div className="sticky bottom-0 z-10 bg-white">
          {footerComponent}
        </div>
      )}
    </div>
  );
}

// Hook for managing virtualized list state
export const useVirtualizedList = <T,>(
  items: T[],
  options?: {
    initialScrollTop?: number;
    onItemsChange?: (items: T[]) => void;
  }
) => {
  const [scrollTop, setScrollTop] = useState(options?.initialScrollTop || 0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleScroll = useCallback((newScrollTop: number) => {
    setScrollTop(newScrollTop);
  }, []);

  const handleLoadMore = useCallback(async (loadMoreFn: () => Promise<T[]>) => {
    if (isLoading) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const newItems = await loadMoreFn();
      options?.onItemsChange?.(newItems);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load more items');
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, options]);

  const scrollToTop = useCallback(() => {
    setScrollTop(0);
  }, []);

  const scrollToItem = useCallback((index: number, itemHeight: number) => {
    const newScrollTop = index * itemHeight;
    setScrollTop(newScrollTop);
  }, []);

  return {
    scrollTop,
    isLoading,
    error,
    handleScroll,
    handleLoadMore,
    scrollToTop,
    scrollToItem,
    setError
  };
};

export default VirtualizedList;