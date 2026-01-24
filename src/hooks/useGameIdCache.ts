import { useState, useEffect, useCallback } from 'react';

interface CachedGameId {
  userId: string;
  serverId?: string;
  timestamp: number;
}

interface GameIdCache {
  [gameId: string]: CachedGameId;
}

const CACHE_KEY = 'game_id_cache';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

export const useGameIdCache = (gameId: string | undefined) => {
  const [cachedData, setCachedData] = useState<CachedGameId | null>(null);

  // Load cached data on mount
  useEffect(() => {
    if (!gameId) return;

    try {
      const cacheJson = localStorage.getItem(CACHE_KEY);
      if (!cacheJson) return;

      const cache: GameIdCache = JSON.parse(cacheJson);
      const gameCache = cache[gameId];

      if (gameCache) {
        const now = Date.now();
        const isExpired = now - gameCache.timestamp > CACHE_DURATION;

        if (isExpired) {
          // Remove expired cache for this game
          delete cache[gameId];
          localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
        } else {
          setCachedData(gameCache);
        }
      }
    } catch (error) {
      console.error('Error loading game ID cache:', error);
    }
  }, [gameId]);

  // Save to cache
  const saveToCache = useCallback((userId: string, serverId?: string) => {
    if (!gameId || !userId.trim()) return;

    try {
      const cacheJson = localStorage.getItem(CACHE_KEY);
      const cache: GameIdCache = cacheJson ? JSON.parse(cacheJson) : {};

      // Clean up expired entries
      const now = Date.now();
      Object.keys(cache).forEach(key => {
        if (now - cache[key].timestamp > CACHE_DURATION) {
          delete cache[key];
        }
      });

      // Save new data
      cache[gameId] = {
        userId: userId.trim(),
        serverId: serverId?.trim() || undefined,
        timestamp: now,
      };

      localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    } catch (error) {
      console.error('Error saving game ID cache:', error);
    }
  }, [gameId]);

  // Clear cache for this game
  const clearCache = useCallback(() => {
    if (!gameId) return;

    try {
      const cacheJson = localStorage.getItem(CACHE_KEY);
      if (!cacheJson) return;

      const cache: GameIdCache = JSON.parse(cacheJson);
      delete cache[gameId];
      localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
      setCachedData(null);
    } catch (error) {
      console.error('Error clearing game ID cache:', error);
    }
  }, [gameId]);

  return {
    cachedUserId: cachedData?.userId || '',
    cachedServerId: cachedData?.serverId || '',
    saveToCache,
    clearCache,
    hasCachedData: !!cachedData,
  };
};
