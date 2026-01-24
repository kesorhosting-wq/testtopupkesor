import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { Check, ChevronsUpDown, Link2, Link2Off, RefreshCw, Package, DollarSign, X, ArrowUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

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

interface G2BulkProductSelectorProps {
  value?: string;
  onChange: (productId: string | undefined, typeId: string | undefined) => void;
  gameName?: string;
  g2bulkCategoryId?: string;
}

type SortOption = 'game' | 'price-asc' | 'price-desc' | 'name';

const G2BulkProductSelector: React.FC<G2BulkProductSelectorProps> = ({ 
  value, 
  onChange, 
  gameName,
  g2bulkCategoryId 
}) => {
  const [open, setOpen] = useState(false);
  const [products, setProducts] = useState<G2BulkProduct[]>([]);
  const [allProducts, setAllProducts] = useState<G2BulkProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<G2BulkProduct | null>(null);
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [sortBy, setSortBy] = useState<SortOption>('game');

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('g2bulk_products')
        .select('*')
        .eq('is_active', true)
        .order('game_name', { ascending: true })
        .order('price', { ascending: true })
        // Supabase defaults to 1000 rows; we need the full catalogue for linking
        .range(0, 4999);

      if (error) throw error;

      const all = (data as G2BulkProduct[]) || [];
      setAllProducts(all);

      let filtered = [...all];

      // Only filter if g2bulkCategoryId is provided
      if (g2bulkCategoryId) {
        const normalizedCategoryId = g2bulkCategoryId.trim().toLowerCase();
        filtered = filtered.filter((p) => {
          const normalizedGameName = p.game_name.trim().toLowerCase();
          return (
            normalizedGameName === normalizedCategoryId ||
            normalizedGameName.includes(normalizedCategoryId) ||
            normalizedCategoryId.includes(normalizedGameName)
          );
        });

        // Fallback: if category filter yields nothing, try matching by game name
        if (filtered.length === 0 && gameName) {
          const normalizedGameName = gameName.trim().toLowerCase();
          const matchedByName = all.filter((p) => {
            const productGameName = p.game_name.trim().toLowerCase();
            return (
              productGameName.includes(normalizedGameName) ||
              normalizedGameName.includes(productGameName)
            );
          });
          if (matchedByName.length > 0) filtered = matchedByName;
        }
      }
      // Only filter by gameName if provided and no categoryId
      else if (gameName) {
        const normalizedGameName = gameName.trim().toLowerCase();
        const matchedByName = filtered.filter((p) => {
          const productGameName = p.game_name.trim().toLowerCase();
          return (
            productGameName.includes(normalizedGameName) ||
            normalizedGameName.includes(productGameName)
          );
        });
        if (matchedByName.length > 0) {
          filtered = matchedByName;
        }
      }

      // Safety fallback: never show an empty list if we have any products at all
      if (filtered.length === 0 && all.length > 0) {
        filtered = all;
      }

      setProducts(filtered);
    } catch (error) {
      console.error('Error loading G2Bulk products:', error);
    } finally {
      setLoading(false);
    }
  }, [gameName, g2bulkCategoryId]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    if (value && allProducts.length > 0) {
      const product = allProducts.find((p) => p.g2bulk_product_id === value);
      setSelectedProduct(product || null);
    } else {
      setSelectedProduct(null);
    }
  }, [value, allProducts]);

  // Filter and sort products
  const filteredAndSortedProducts = useMemo(() => {
    let result = [...products];
    const min = parseFloat(minPrice);
    const max = parseFloat(maxPrice);
    
    // Apply price filters
    if (!isNaN(min)) {
      result = result.filter(p => p.price >= min);
    }
    if (!isNaN(max)) {
      result = result.filter(p => p.price <= max);
    }
    
    // Apply sorting
    switch (sortBy) {
      case 'price-asc':
        result.sort((a, b) => a.price - b.price);
        break;
      case 'price-desc':
        result.sort((a, b) => b.price - a.price);
        break;
      case 'name':
        result.sort((a, b) => a.product_name.localeCompare(b.product_name));
        break;
      case 'game':
      default:
        result.sort((a, b) => {
          const gameCompare = a.game_name.localeCompare(b.game_name);
          if (gameCompare !== 0) return gameCompare;
          return a.price - b.price;
        });
        break;
    }
    
    return result;
  }, [products, minPrice, maxPrice, sortBy]);

  // Group filtered products by game name (only when sorting by game)
  const groupedProducts = useMemo(() => {
    if (sortBy !== 'game') {
      return { 'All Products': filteredAndSortedProducts };
    }
    return filteredAndSortedProducts.reduce((acc, product) => {
      if (!acc[product.game_name]) {
        acc[product.game_name] = [];
      }
      acc[product.game_name].push(product);
      return acc;
    }, {} as Record<string, G2BulkProduct[]>);
  }, [filteredAndSortedProducts, sortBy]);

  const handleSelect = (productId: string) => {
    if (productId === 'none') {
      onChange(undefined, undefined);
      setSelectedProduct(null);
    } else {
      const product = allProducts.find(p => p.g2bulk_product_id === productId);
      if (product) {
        onChange(product.g2bulk_product_id, product.g2bulk_type_id);
        setSelectedProduct(product);
      }
    }
    setOpen(false);
  };

  const handleRefresh = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await loadProducts();
  };

  const handleClearFilters = () => {
    setMinPrice('');
    setMaxPrice('');
    setSortBy('game');
  };

  const hasActiveFilters = minPrice !== '' || maxPrice !== '' || sortBy !== 'game';

  if (loading) {
    return (
      <div className="text-xs text-muted-foreground flex items-center gap-1">
        <RefreshCw className="w-3 h-3 animate-spin" />
        Loading G2Bulk products...
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="text-xs text-muted-foreground flex items-center gap-1">
        <Link2Off className="w-3 h-3" />
        No G2Bulk products available. Sync products in API tab first.
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div className="flex gap-1">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-full justify-between text-left font-normal h-8 text-xs"
            >
              {selectedProduct ? (
                <span className="flex items-center gap-2 truncate">
                  <Link2 className="w-3 h-3 text-green-500 shrink-0" />
                  <span className="truncate">{selectedProduct.product_name}</span>
                  <Badge variant="secondary" className="text-[10px] px-1 shrink-0">
                    ${selectedProduct.price}
                  </Badge>
                </span>
              ) : (
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Package className="w-3 h-3" />
                  Link G2Bulk Product
                  <Badge variant="outline" className="text-[10px] ml-1">
                    {products.length} available
                  </Badge>
                </span>
              )}
              <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[420px] p-0 z-50" align="start">
            <Command>
              <CommandInput placeholder="Search products..." className="h-9" />
              {/* Filters Row */}
              <div className="flex flex-col gap-2 px-3 py-2 border-b">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-3 h-3 text-muted-foreground shrink-0" />
                  <Input
                    type="number"
                    placeholder="Min"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                    className="h-7 text-xs w-16"
                  />
                  <span className="text-xs text-muted-foreground">-</span>
                  <Input
                    type="number"
                    placeholder="Max"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    className="h-7 text-xs w-16"
                  />
                  <div className="flex items-center gap-1 ml-auto">
                    <ArrowUpDown className="w-3 h-3 text-muted-foreground" />
                    <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                      <SelectTrigger className="h-7 text-xs w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="game">By Game</SelectItem>
                        <SelectItem value="price-asc">Price ↑</SelectItem>
                        <SelectItem value="price-desc">Price ↓</SelectItem>
                        <SelectItem value="name">By Name</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <Badge variant="secondary" className="text-[10px]">
                    {filteredAndSortedProducts.length} products
                  </Badge>
                  {hasActiveFilters && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleClearFilters}
                      className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-3 h-3 mr-1" />
                      Clear filters
                    </Button>
                  )}
                </div>
              </div>
              <CommandList className="max-h-[300px]">
                <CommandEmpty>No product found.</CommandEmpty>
                <CommandGroup>
                  <CommandItem
                    value="none"
                    onSelect={() => handleSelect('none')}
                    className="flex items-center gap-2 text-xs"
                  >
                    <Check className={cn("h-3 w-3", !value ? "opacity-100" : "opacity-0")} />
                    <Link2Off className="w-3 h-3 text-muted-foreground" />
                    <span>No G2Bulk Link (Manual)</span>
                  </CommandItem>
                </CommandGroup>
                {Object.entries(groupedProducts).map(([groupName, gameProducts]) => (
                  <CommandGroup key={groupName} heading={sortBy === 'game' ? `${groupName} (${gameProducts.length})` : undefined}>
                    {gameProducts.map((product) => (
                      <CommandItem
                        key={product.g2bulk_product_id}
                        value={`${product.product_name} ${product.denomination} ${product.game_name}`}
                        onSelect={() => handleSelect(product.g2bulk_product_id)}
                        className="flex items-center gap-2 text-xs"
                      >
                        <Check className={cn("h-3 w-3", value === product.g2bulk_product_id ? "opacity-100" : "opacity-0")} />
                        <span className="flex-1 truncate">{product.product_name}</span>
                        {sortBy !== 'game' && (
                          <Badge variant="outline" className="text-[10px] bg-muted">
                            {product.game_name.length > 15 ? product.game_name.substring(0, 15) + '...' : product.game_name}
                          </Badge>
                        )}
                        {product.denomination && (
                          <Badge variant="outline" className="text-[10px]">
                            {product.denomination}
                          </Badge>
                        )}
                        <Badge variant="secondary" className="text-[10px]">
                          ${product.price}
                        </Badge>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                ))}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={handleRefresh}
          disabled={loading}
          title="Refresh products"
        >
          <RefreshCw className={cn("w-3 h-3", loading && "animate-spin")} />
        </Button>
      </div>
      {selectedProduct && (
        <p className="text-[10px] text-green-600 flex items-center gap-1">
          <Link2 className="w-3 h-3" />
          Linked: {selectedProduct.product_name} (${selectedProduct.price})
        </p>
      )}
    </div>
  );
};

export default G2BulkProductSelector;