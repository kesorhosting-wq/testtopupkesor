import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface G2BulkProductStatus {
  productId: string;
  isActive: boolean;
  gameName: string;
  productName: string;
}

interface UseG2BulkProductStatusReturn {
  productStatuses: Map<string, G2BulkProductStatus>;
  isLoading: boolean;
  checkProductStatus: (productId: string) => G2BulkProductStatus | undefined;
  getInactiveProducts: () => G2BulkProductStatus[];
}

export const useG2BulkProductStatus = (): UseG2BulkProductStatusReturn => {
  const [productStatuses, setProductStatuses] = useState<Map<string, G2BulkProductStatus>>(new Map());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadProductStatuses();
  }, []);

  const loadProductStatuses = async () => {
    try {
      const { data, error } = await supabase
        .from('g2bulk_products')
        .select('g2bulk_product_id, is_active, game_name, product_name')
        .range(0, 4999);

      if (error) throw error;

      const statusMap = new Map<string, G2BulkProductStatus>();
      (data || []).forEach(product => {
        statusMap.set(product.g2bulk_product_id, {
          productId: product.g2bulk_product_id,
          isActive: product.is_active ?? true,
          gameName: product.game_name,
          productName: product.product_name,
        });
      });

      setProductStatuses(statusMap);
    } catch (error) {
      console.error('Failed to load G2Bulk product statuses:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const checkProductStatus = (productId: string): G2BulkProductStatus | undefined => {
    return productStatuses.get(productId);
  };

  const getInactiveProducts = (): G2BulkProductStatus[] => {
    return Array.from(productStatuses.values()).filter(p => !p.isActive);
  };

  return {
    productStatuses,
    isLoading,
    checkProductStatus,
    getInactiveProducts,
  };
};
