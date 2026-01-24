import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { Download, RefreshCw, Check, Package, Link2, Percent } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface G2BulkProduct {
  id: string;
  g2bulk_product_id: string;
  g2bulk_type_id: string;
  game_name: string;
  product_name: string;
  denomination: string;
  price: number;
  currency: string;
}

interface G2BulkAutoImportProps {
  gameId: string;
  gameName: string;
  g2bulkCategoryId?: string;
  existingProductIds: string[];
  onImport: (products: Array<{
    name: string;
    amount: string;
    price: number;
    g2bulkProductId: string;
    g2bulkTypeId: string;
  }>) => Promise<void>;
}

const G2BulkAutoImport: React.FC<G2BulkAutoImportProps> = ({
  gameId,
  gameName,
  g2bulkCategoryId,
  existingProductIds,
  onImport
}) => {
  const [products, setProducts] = useState<G2BulkProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [markupPercent, setMarkupPercent] = useState<number>(0);

  const applyMarkup = (price: number) => {
    return price * (1 + markupPercent / 100);
  };

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('g2bulk_products')
        .select('*')
        .eq('is_active', true)
        .order('price', { ascending: true });

      if (error) throw error;

      let filtered = data as G2BulkProduct[] || [];

      // Filter by g2bulkCategoryId (which is game_name) if provided
      if (g2bulkCategoryId) {
        filtered = filtered.filter(p => 
          p.game_name === g2bulkCategoryId || 
          p.game_name.toLowerCase() === g2bulkCategoryId.toLowerCase()
        );
      } 
      // Fallback to gameName matching
      else if (gameName) {
        const matchedByName = filtered.filter(p => 
          p.game_name.toLowerCase().includes(gameName.toLowerCase()) ||
          gameName.toLowerCase().includes(p.game_name.toLowerCase())
        );
        if (matchedByName.length > 0) {
          filtered = matchedByName;
        }
      }

      // Filter out already imported products
      filtered = filtered.filter(p => !existingProductIds.includes(p.g2bulk_product_id));

      setProducts(filtered);
    } catch (error) {
      console.error('Error loading G2Bulk products:', error);
    } finally {
      setLoading(false);
    }
  }, [gameName, g2bulkCategoryId, existingProductIds]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const toggleProduct = (productId: string) => {
    setSelectedProducts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });
  };

  const selectAll = () => {
    setSelectedProducts(new Set(products.map(p => p.g2bulk_product_id)));
  };

  const deselectAll = () => {
    setSelectedProducts(new Set());
  };

  const handleImport = async () => {
    if (selectedProducts.size === 0) {
      toast({ title: 'No products selected', variant: 'destructive' });
      return;
    }

    setImporting(true);
    try {
      const productsToImport = products
        .filter(p => selectedProducts.has(p.g2bulk_product_id))
        .map(p => ({
          name: p.product_name,
          amount: p.denomination || p.product_name,
          price: Math.round(applyMarkup(p.price) * 100) / 100,
          g2bulkProductId: p.g2bulk_product_id,
          g2bulkTypeId: p.g2bulk_type_id
        }));

      await onImport(productsToImport);
      
      toast({ 
        title: `Imported ${productsToImport.length} packages!`,
        description: 'Packages are now linked to G2Bulk for auto-fulfillment'
      });

      // Remove imported products from the list
      setProducts(prev => prev.filter(p => !selectedProducts.has(p.g2bulk_product_id)));
      setSelectedProducts(new Set());
    } catch (error) {
      console.error('Import error:', error);
      toast({ title: 'Import failed', variant: 'destructive' });
    } finally {
      setImporting(false);
    }
  };

  if (loading) {
    return (
      <div className="text-xs text-muted-foreground flex items-center gap-1 p-2">
        <RefreshCw className="w-3 h-3 animate-spin" />
        Loading G2Bulk products...
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="text-xs text-muted-foreground flex items-center gap-1 p-2 bg-secondary/50 rounded-lg">
        <Check className="w-3 h-3 text-green-500" />
        All G2Bulk products already imported or no products available for this game.
      </div>
    );
  }

  return (
    <div className="bg-secondary/50 rounded-lg p-3 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Download className="w-4 h-4 text-gold" />
          <span className="text-sm font-medium">Auto-Import from G2Bulk</span>
          <Badge variant="outline" className="text-[10px]">
            {products.length} available
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-card border border-border rounded-md px-2 py-1">
            <Percent className="w-3 h-3 text-muted-foreground" />
            <Input
              type="number"
              min="0"
              max="500"
              value={markupPercent}
              onChange={(e) => setMarkupPercent(Number(e.target.value) || 0)}
              className="w-14 h-5 text-xs p-1 border-0 bg-transparent"
              placeholder="0"
            />
            <span className="text-[10px] text-muted-foreground">markup</span>
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" onClick={selectAll} className="text-xs h-7 px-2">
              Select All
            </Button>
            <Button variant="ghost" size="sm" onClick={deselectAll} className="text-xs h-7 px-2">
              Clear
            </Button>
            <Button variant="ghost" size="sm" onClick={loadProducts} className="h-7 w-7 p-0">
              <RefreshCw className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </div>

      <ScrollArea className="h-[200px] pr-3">
        <div className="space-y-1">
          {products.map((product) => (
            <div
              key={product.g2bulk_product_id}
              className={`flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors ${
                selectedProducts.has(product.g2bulk_product_id) 
                  ? 'bg-gold/20 border border-gold/50' 
                  : 'bg-card border border-border hover:border-gold/30'
              }`}
              onClick={() => toggleProduct(product.g2bulk_product_id)}
            >
              <Checkbox
                checked={selectedProducts.has(product.g2bulk_product_id)}
                onCheckedChange={() => toggleProduct(product.g2bulk_product_id)}
                className="pointer-events-none"
              />
              <Package className="w-4 h-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{product.product_name}</p>
                {product.denomination && (
                  <p className="text-[10px] text-muted-foreground">{product.denomination}</p>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {markupPercent > 0 && (
                  <span className="text-[10px] text-muted-foreground line-through">
                    ${product.price.toFixed(2)}
                  </span>
                )}
                <Badge variant="secondary" className="text-xs">
                  ${applyMarkup(product.price).toFixed(2)}
                </Badge>
              </div>
              <Link2 className="w-3 h-3 text-green-500 shrink-0" />
            </div>
          ))}
        </div>
      </ScrollArea>

      <div className="flex items-center justify-between pt-2 border-t border-border">
        <p className="text-xs text-muted-foreground">
          {selectedProducts.size} selected
        </p>
        <Button 
          size="sm" 
          onClick={handleImport}
          disabled={selectedProducts.size === 0 || importing}
          className="bg-gold hover:bg-gold-dark text-primary-foreground"
        >
          {importing ? (
            <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
          ) : (
            <Download className="w-3 h-3 mr-1" />
          )}
          Import {selectedProducts.size > 0 ? `(${selectedProducts.size})` : ''}
        </Button>
      </div>
    </div>
  );
};

export default G2BulkAutoImport;
