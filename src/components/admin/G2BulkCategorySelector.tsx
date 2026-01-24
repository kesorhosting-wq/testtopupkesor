import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Check, ChevronsUpDown, Link2, Link2Off, RefreshCw, Gamepad2, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';

interface G2BulkCategory {
  id: string;
  name: string;
  productCount?: number;
}

interface G2BulkCategorySelectorProps {
  value?: string;
  onChange: (categoryId: string | undefined, categoryName: string | undefined) => void;
  placeholder?: string;
}

const G2BulkCategorySelector: React.FC<G2BulkCategorySelectorProps> = ({ 
  value, 
  onChange, 
  placeholder = "Select G2Bulk Category" 
}) => {
  const [open, setOpen] = useState(false);
  const [categories, setCategories] = useState<G2BulkCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<G2BulkCategory | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Load categories from local g2bulk_products table (unique game names)
  const loadCategoriesFromProducts = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('g2bulk_products')
        .select('game_name')
        .eq('is_active', true)
        // Supabase defaults to 1000 rows; categories need the full dataset
        .range(0, 4999);
      
      if (!error && data) {
        // Get unique game names and count products
        const gameMap = new Map<string, number>();
        data.forEach(p => {
          gameMap.set(p.game_name, (gameMap.get(p.game_name) || 0) + 1);
        });
        
        const uniqueCategories: G2BulkCategory[] = Array.from(gameMap.entries()).map(([name, count]) => ({
          id: name,
          name: name,
          productCount: count
        })).sort((a, b) => a.name.localeCompare(b.name));
        
        setCategories(uniqueCategories);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch games directly from G2Bulk API and sync to database
  const fetchFromG2Bulk = useCallback(async () => {
    setFetching(true);
    try {
      const { data: syncData, error: syncError } = await supabase.functions.invoke('g2bulk-api', {
        body: { action: 'sync_products' }
      });

      if (syncError) {
        console.error('Error syncing from G2Bulk:', syncError);
      } else {
        console.log('G2Bulk sync result:', syncData);
      }

      await loadCategoriesFromProducts();
    } catch (error) {
      console.error('Error fetching from G2Bulk:', error);
    } finally {
      setFetching(false);
    }
  }, [loadCategoriesFromProducts]);

  useEffect(() => {
    loadCategoriesFromProducts();
  }, [loadCategoriesFromProducts]);

  useEffect(() => {
    if (value && categories.length > 0) {
      const cat = categories.find(c => c.id === value || c.name === value);
      setSelectedCategory(cat || null);
    } else {
      setSelectedCategory(null);
    }
  }, [value, categories]);

  // Filter categories based on search query
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return categories;
    const query = searchQuery.toLowerCase();
    return categories.filter(cat => 
      cat.name.toLowerCase().includes(query)
    );
  }, [categories, searchQuery]);

  // Group categories by first letter for better navigation
  const groupedCategories = useMemo(() => {
    const groups: Record<string, G2BulkCategory[]> = {};
    
    filteredCategories.forEach(cat => {
      const firstChar = cat.name.charAt(0).toUpperCase();
      const groupKey = /[A-Z]/.test(firstChar) ? firstChar : '#';
      if (!groups[groupKey]) groups[groupKey] = [];
      groups[groupKey].push(cat);
    });
    
    return Object.entries(groups).sort(([a], [b]) => {
      if (a === '#') return 1;
      if (b === '#') return -1;
      return a.localeCompare(b);
    });
  }, [filteredCategories]);

  const handleSelect = (categoryId: string) => {
    if (categoryId === 'none') {
      onChange(undefined, undefined);
      setSelectedCategory(null);
    } else {
      const cat = categories.find(c => c.id === categoryId);
      if (cat) {
        onChange(cat.id, cat.name);
        setSelectedCategory(cat);
      }
    }
    setOpen(false);
    setSearchQuery('');
  };

  const clearSearch = () => {
    setSearchQuery('');
  };

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (!isOpen) setSearchQuery('');
      }}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between text-left font-normal h-10"
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center gap-2 text-muted-foreground">
                <RefreshCw className="w-4 h-4 animate-spin" />
                Loading...
              </span>
            ) : selectedCategory ? (
              <span className="flex items-center gap-2">
                <Link2 className="w-4 h-4 text-green-500" />
                <span className="truncate">{selectedCategory.name}</span>
                {selectedCategory.productCount && (
                  <Badge variant="secondary" className="text-xs">
                    {selectedCategory.productCount} products
                  </Badge>
                )}
              </span>
            ) : (
              <span className="flex items-center gap-2 text-muted-foreground">
                <Gamepad2 className="w-4 h-4" />
                {placeholder}
              </span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0 z-50 bg-popover border shadow-lg" align="start">
          <div className="flex flex-col">
            {/* Search Input */}
            <div className="p-3 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search games..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-8 h-9"
                  autoFocus
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
                    onClick={clearSearch}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                )}
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-muted-foreground">
                  {filteredCategories.length} of {categories.length} games
                </span>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={fetchFromG2Bulk}
                  disabled={fetching}
                  className="text-xs h-7"
                >
                  {fetching ? <RefreshCw className="w-3 h-3 mr-1 animate-spin" /> : <RefreshCw className="w-3 h-3 mr-1" />}
                  Sync from G2Bulk
                </Button>
              </div>
            </div>

            {/* Category List */}
            <ScrollArea className="h-[350px]">
              <div className="p-2">
                {/* Unlink Option - only show when a category is selected */}
                {value && (
                  <div
                    onClick={() => handleSelect('none')}
                    className="flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer hover:bg-destructive/10 text-destructive transition-colors mb-2 border-b pb-3"
                  >
                    <Link2Off className="w-4 h-4" />
                    <span className="text-sm font-medium">Unlink from G2Bulk</span>
                  </div>
                )}

                {/* Empty State */}
                {filteredCategories.length === 0 && searchQuery && (
                  <div className="py-8 text-center text-muted-foreground">
                    <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No games found for "{searchQuery}"</p>
                    <Button variant="link" size="sm" onClick={clearSearch} className="mt-1">
                      Clear search
                    </Button>
                  </div>
                )}

                {/* Empty State - No Products Synced */}
                {categories.length === 0 && !loading && (
                  <div className="py-8 text-center text-muted-foreground">
                    <Gamepad2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No G2Bulk products synced yet</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={fetchFromG2Bulk}
                      disabled={fetching}
                      className="mt-2"
                    >
                      {fetching ? <RefreshCw className="w-3 h-3 mr-1 animate-spin" /> : <RefreshCw className="w-3 h-3 mr-1" />}
                      Sync Products from G2Bulk
                    </Button>
                  </div>
                )}

                {/* Grouped Categories */}
                {groupedCategories.map(([letter, cats]) => (
                  <div key={letter} className="mt-3 first:mt-0">
                    <div className="px-3 py-1 text-xs font-semibold text-muted-foreground sticky top-0 bg-popover">
                      {letter}
                    </div>
                    {cats.map((category) => (
                      <div
                        key={category.id}
                        onClick={() => handleSelect(category.id)}
                        className={cn(
                          "flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer hover:bg-accent transition-colors",
                          value === category.id && "bg-accent"
                        )}
                      >
                        <Check className={cn("h-4 w-4 shrink-0", value === category.id ? "opacity-100" : "opacity-0")} />
                        <span className="flex-1 truncate text-sm">{category.name}</span>
                        {category.productCount && (
                          <span className="text-[10px] text-muted-foreground shrink-0 bg-secondary px-1.5 py-0.5 rounded">
                            {category.productCount}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </PopoverContent>
      </Popover>
      {selectedCategory && (
        <p className="text-xs text-green-600 flex items-center gap-1">
          <Link2 className="w-3 h-3" />
          Linked to G2Bulk: {selectedCategory.name}
        </p>
      )}
    </div>
  );
};

export default G2BulkCategorySelector;
