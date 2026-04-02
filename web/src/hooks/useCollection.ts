'use client';

// ============================================================================
// useCollection — Hook for fetching the user's companion collection.
// Merges API data with static companion definitions for a rich UI.
// ============================================================================

import { useMemo } from 'react';
import { useApi } from './useApi';
import { useCompanions } from './useCompanions';
import { getCompanion, type CompanionData } from '@/lib/companions';
import type { UserCompanion } from '@/lib/types';

export interface CollectionItem {
  companionId: string;
  companionData: CompanionData;
  claimedAt: string;
  isActive: boolean;
  rarity: 'genesis';
  nftMintAddress?: string;
}

interface UseCollectionResult {
  items: CollectionItem[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
  isEmpty: boolean;
}

export function useCollection(): UseCollectionResult {
  const { companions, loading, error, refresh } = useCompanions();

  const items = useMemo(() => {
    if (!companions || companions.length === 0) return [] as CollectionItem[];

    const result: CollectionItem[] = [];
    for (const uc of companions) {
      const companionData = getCompanion(uc.companion.id);
      if (!companionData) continue;
      result.push({
        companionId: uc.companion.id,
        companionData,
        claimedAt: uc.claimedAt,
        isActive: uc.isActive,
        rarity: 'genesis' as const,
        nftMintAddress: uc.nftMintAddress,
      });
    }
    return result;
  }, [companions]);

  return {
    items,
    loading,
    error,
    refresh,
    isEmpty: !loading && items.length === 0,
  };
}
