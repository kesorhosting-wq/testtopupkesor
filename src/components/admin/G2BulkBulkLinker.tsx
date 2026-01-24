import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { 
  Link2, Wand2, CheckCircle2, XCircle, RefreshCw, 
  ChevronDown, ChevronUp, Sparkles, AlertTriangle 
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Game, Package } from '@/contexts/SiteContext';

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

interface MatchSuggestion {
  package: Package;
  gameId: string;
  gameName: string;
  suggestedProduct: G2BulkProduct | null;
  matchType: 'exact' | 'amount' | 'name' | 'price' | 'none';
  confidence: number;
  isSpecialPackage?: boolean;
}

interface G2BulkBulkLinkerProps {
  games: Game[];
  onLinkComplete: () => void;
}

const G2BulkBulkLinker: React.FC<G2BulkBulkLinkerProps> = ({ games, onLinkComplete }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [products, setProducts] = useState<G2BulkProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<MatchSuggestion[]>([]);
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<string>>(new Set());
  const [isApplying, setIsApplying] = useState(false);
  const [isQuickLinking, setIsQuickLinking] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadProductsAndGenerateSuggestions();
    }
  }, [isOpen, games]);

  const loadProductsAndGenerateSuggestions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('g2bulk_products')
        .select('*')
        .eq('is_active', true)
        .order('game_name')
        .order('price')
        .range(0, 4999);

      if (error) throw error;
      setProducts(data as G2BulkProduct[] || []);
      
      // Generate suggestions
      const allSuggestions: MatchSuggestion[] = [];
      
      for (const game of games) {
        // Get products that might match this game
        const gameProducts = (data as G2BulkProduct[])?.filter(p => {
          const gameName = game.name.toLowerCase();
          const categoryId = game.g2bulkCategoryId?.toLowerCase() || '';
          const productGameName = p.game_name.toLowerCase();
          
          return productGameName.includes(gameName) || 
                 gameName.includes(productGameName) ||
                 productGameName.includes(categoryId) ||
                 categoryId.includes(productGameName);
        }) || [];

        // Process regular packages
        for (const pkg of game.packages) {
          if (pkg.g2bulkProductId) continue; // Already linked
          
          const match = findBestMatch(pkg, gameProducts);
          allSuggestions.push({
            package: pkg,
            gameId: game.id,
            gameName: game.name,
            ...match,
            isSpecialPackage: false,
          });
        }

        // Process special packages
        for (const pkg of game.specialPackages || []) {
          if (pkg.g2bulkProductId) continue; // Already linked
          
          const match = findBestMatch(pkg, gameProducts);
          allSuggestions.push({
            package: pkg,
            gameId: game.id,
            gameName: game.name,
            ...match,
            isSpecialPackage: true,
          });
        }
      }

      // Sort by confidence (highest first), then by match type
      allSuggestions.sort((a, b) => b.confidence - a.confidence);
      setSuggestions(allSuggestions);

      // Auto-select high confidence matches
      const autoSelected = new Set<string>();
      allSuggestions.forEach(s => {
        if (s.confidence >= 80 && s.suggestedProduct) {
          autoSelected.add(s.package.id);
        }
      });
      setSelectedSuggestions(autoSelected);

    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };

  const findBestMatch = (pkg: Package, products: G2BulkProduct[]): { suggestedProduct: G2BulkProduct | null; matchType: 'exact' | 'amount' | 'name' | 'price' | 'none'; confidence: number } => {
    if (products.length === 0) {
      return { suggestedProduct: null, matchType: 'none', confidence: 0 };
    }

    const pkgAmount = pkg.amount.replace(/[^\d.]/g, '');
    const pkgName = pkg.name.toLowerCase();

    // Try exact amount match first
    for (const product of products) {
      const prodDenom = product.denomination.replace(/[^\d.]/g, '');
      if (pkgAmount && prodDenom && pkgAmount === prodDenom) {
        return { suggestedProduct: product, matchType: 'exact', confidence: 95 };
      }
    }

    // Try amount contains match
    for (const product of products) {
      const prodDenom = product.denomination.replace(/[^\d.]/g, '');
      const prodName = product.product_name.replace(/[^\d.]/g, '');
      if (pkgAmount && (prodDenom.includes(pkgAmount) || prodName.includes(pkgAmount))) {
        return { suggestedProduct: product, matchType: 'amount', confidence: 85 };
      }
    }

    // Try name similarity match
    for (const product of products) {
      const prodName = product.product_name.toLowerCase();
      if (pkgName.includes(prodName) || prodName.includes(pkgName)) {
        return { suggestedProduct: product, matchType: 'name', confidence: 70 };
      }
    }

    // Try price match (within 10%)
    for (const product of products) {
      const priceDiff = Math.abs(product.price - pkg.price) / pkg.price;
      if (priceDiff <= 0.1) {
        return { suggestedProduct: product, matchType: 'price', confidence: 50 };
      }
    }

    // Return first product as fallback with low confidence
    return { suggestedProduct: products[0], matchType: 'none', confidence: 20 };
  };

  const toggleSelection = (packageId: string) => {
    const newSelection = new Set(selectedSuggestions);
    if (newSelection.has(packageId)) {
      newSelection.delete(packageId);
    } else {
      newSelection.add(packageId);
    }
    setSelectedSuggestions(newSelection);
  };

  const selectAll = () => {
    const withMatches = suggestions.filter(s => s.suggestedProduct).map(s => s.package.id);
    setSelectedSuggestions(new Set(withMatches));
  };

  const selectNone = () => {
    setSelectedSuggestions(new Set());
  };

  const selectHighConfidence = () => {
    const highConf = suggestions.filter(s => s.confidence >= 80 && s.suggestedProduct).map(s => s.package.id);
    setSelectedSuggestions(new Set(highConf));
  };

  const applySelectedLinks = async () => {
    const toApply = suggestions.filter(s => 
      selectedSuggestions.has(s.package.id) && s.suggestedProduct
    );

    if (toApply.length === 0) {
      toast({ title: 'No matches selected', variant: 'destructive' });
      return;
    }

    setIsApplying(true);
    try {
      let successCount = 0;
      let errorCount = 0;

      for (const match of toApply) {
        const tableName = match.isSpecialPackage ? 'special_packages' : 'packages';
        const { error } = await supabase
          .from(tableName)
          .update({
            g2bulk_product_id: match.suggestedProduct!.g2bulk_product_id,
            g2bulk_type_id: match.suggestedProduct!.g2bulk_type_id,
          })
          .eq('id', match.package.id);

        if (error) {
          console.error(`Error linking package ${match.package.id}:`, error);
          errorCount++;
        } else {
          successCount++;
        }
      }

      toast({
        title: 'Bulk link complete!',
        description: `${successCount} packages linked${errorCount > 0 ? `, ${errorCount} failed` : ''}`,
      });

      onLinkComplete();
      setIsOpen(false);
    } catch (error) {
      console.error('Error applying links:', error);
      toast({ title: 'Error applying links', variant: 'destructive' });
    } finally {
      setIsApplying(false);
    }
  };

  // Quick auto-link: One-click action that links all high-confidence matches without review
  const quickAutoLink = async () => {
    setIsQuickLinking(true);
    try {
      // Load products if not already loaded
      let productData = products;
      if (productData.length === 0) {
        const { data, error } = await supabase
          .from('g2bulk_products')
          .select('*')
          .eq('is_active', true)
          .order('game_name')
          .order('price')
          .range(0, 4999);

        if (error) throw error;
        productData = data as G2BulkProduct[] || [];
      }

      // Generate suggestions on the fly
      const allMatches: { packageId: string; productId: string; typeId: string; tableName: string; confidence: number }[] = [];
      
      for (const game of games) {
        // Get products that might match this game
        const gameProducts = productData.filter(p => {
          const gameName = game.name.toLowerCase();
          const categoryId = game.g2bulkCategoryId?.toLowerCase() || '';
          const productGameName = p.game_name.toLowerCase();
          
          return productGameName.includes(gameName) || 
                 gameName.includes(productGameName) ||
                 productGameName.includes(categoryId) ||
                 categoryId.includes(productGameName);
        });

        // Process regular packages
        for (const pkg of game.packages) {
          if (pkg.g2bulkProductId) continue; // Already linked
          
          const match = findBestMatch(pkg, gameProducts);
          if (match.suggestedProduct && match.confidence >= 80) {
            allMatches.push({
              packageId: pkg.id,
              productId: match.suggestedProduct.g2bulk_product_id,
              typeId: match.suggestedProduct.g2bulk_type_id,
              tableName: 'packages',
              confidence: match.confidence,
            });
          }
        }

        // Process special packages
        for (const pkg of game.specialPackages || []) {
          if (pkg.g2bulkProductId) continue; // Already linked
          
          const match = findBestMatch(pkg, gameProducts);
          if (match.suggestedProduct && match.confidence >= 80) {
            allMatches.push({
              packageId: pkg.id,
              productId: match.suggestedProduct.g2bulk_product_id,
              typeId: match.suggestedProduct.g2bulk_type_id,
              tableName: 'special_packages',
              confidence: match.confidence,
            });
          }
        }
      }

      if (allMatches.length === 0) {
        toast({ 
          title: 'No high-confidence matches found',
          description: 'Try using the detailed review to link packages with lower confidence matches.',
        });
        return;
      }

      // Apply all matches
      let successCount = 0;
      let errorCount = 0;

      for (const match of allMatches) {
        const { error } = await supabase
          .from(match.tableName as 'packages' | 'special_packages')
          .update({
            g2bulk_product_id: match.productId,
            g2bulk_type_id: match.typeId,
          })
          .eq('id', match.packageId);

        if (error) {
          console.error(`Error linking package ${match.packageId}:`, error);
          errorCount++;
        } else {
          successCount++;
        }
      }

      toast({
        title: 'Auto-link complete!',
        description: `${successCount} packages linked automatically${errorCount > 0 ? `, ${errorCount} failed` : ''}`,
      });

      onLinkComplete();
    } catch (error) {
      console.error('Error in quick auto-link:', error);
      toast({ title: 'Error during auto-link', variant: 'destructive' });
    } finally {
      setIsQuickLinking(false);
    }
  };

  const getMatchBadge = (matchType: string, confidence: number) => {
    if (confidence >= 90) {
      return <Badge className="bg-green-500/20 text-green-600 border-green-500/30">Exact Match</Badge>;
    }
    if (confidence >= 70) {
      return <Badge className="bg-blue-500/20 text-blue-600 border-blue-500/30">Good Match</Badge>;
    }
    if (confidence >= 50) {
      return <Badge className="bg-yellow-500/20 text-yellow-600 border-yellow-500/30">Possible</Badge>;
    }
    return <Badge className="bg-muted text-muted-foreground">Low Match</Badge>;
  };

  // Calculate unlinked count from games directly (without needing to open the panel)
  const unlinkedFromGames = useMemo(() => {
    let count = 0;
    for (const game of games) {
      count += game.packages.filter(p => !p.g2bulkProductId).length;
      count += (game.specialPackages || []).filter(p => !p.g2bulkProductId).length;
    }
    return count;
  }, [games]);

  const unlinkedCount = suggestions.length > 0 
    ? suggestions.filter(s => !s.package.g2bulkProductId).length 
    : unlinkedFromGames;
  const matchedCount = suggestions.filter(s => s.suggestedProduct && s.confidence >= 50).length;

  return (
    <Card className="border-gold/30">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <div 
            className="flex items-center gap-2 cursor-pointer hover:text-gold transition-colors flex-1"
            onClick={() => setIsOpen(!isOpen)}
          >
            <Wand2 className="w-5 h-5 text-gold" />
            <span>Auto-Match & Bulk Link</span>
            {unlinkedCount > 0 && (
              <Badge variant="outline" className="ml-2">
                {unlinkedCount} unlinked
              </Badge>
            )}
            {isOpen ? <ChevronUp className="w-4 h-4 ml-2" /> : <ChevronDown className="w-4 h-4 ml-2" />}
          </div>
          
          {/* Quick Auto-Link Button - always visible */}
          {unlinkedCount > 0 && (
            <Button
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                quickAutoLink();
              }}
              disabled={isQuickLinking}
              className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white"
            >
              {isQuickLinking ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4 mr-2" />
              )}
              Quick Auto-Link
            </Button>
          )}
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          Auto-link matches packages to G2Bulk products by amount, name, and price similarity
        </p>
      </CardHeader>

      {isOpen && (
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin text-gold" />
              <span className="ml-2 text-muted-foreground">Analyzing packages...</span>
            </div>
          ) : suggestions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-500" />
              <p>All packages are already linked!</p>
            </div>
          ) : (
            <>
              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" variant="outline" onClick={selectAll}>
                  Select All ({suggestions.filter(s => s.suggestedProduct).length})
                </Button>
                <Button size="sm" variant="outline" onClick={selectHighConfidence}>
                  <Sparkles className="w-3 h-3 mr-1" />
                  High Confidence ({suggestions.filter(s => s.confidence >= 80 && s.suggestedProduct).length})
                </Button>
                <Button size="sm" variant="ghost" onClick={selectNone}>
                  Clear
                </Button>
                <div className="flex-1" />
                <Button
                  onClick={applySelectedLinks}
                  disabled={selectedSuggestions.size === 0 || isApplying}
                  className="bg-gold hover:bg-gold-dark text-primary-foreground"
                >
                  {isApplying ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Link2 className="w-4 h-4 mr-2" />
                  )}
                  Apply {selectedSuggestions.size} Links
                </Button>
              </div>

              {/* Match Summary */}
              <div className="flex gap-4 text-sm">
                <span className="text-muted-foreground">
                  Found {matchedCount} potential matches for {unlinkedCount} unlinked packages
                </span>
              </div>

              {/* Suggestions List */}
              <ScrollArea className="h-[400px] border rounded-lg">
                <div className="p-2 space-y-2">
                  {suggestions.map((suggestion) => (
                    <div
                      key={suggestion.package.id}
                      className={`p-3 rounded-lg border transition-colors ${
                        selectedSuggestions.has(suggestion.package.id)
                          ? 'bg-gold/10 border-gold/50'
                          : 'bg-card border-border hover:border-gold/30'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={selectedSuggestions.has(suggestion.package.id)}
                          onCheckedChange={() => toggleSelection(suggestion.package.id)}
                          disabled={!suggestion.suggestedProduct}
                          className="mt-1"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm">{suggestion.package.name}</span>
                            <Badge variant="outline" className="text-xs">
                              {suggestion.gameName}
                            </Badge>
                            {suggestion.isSpecialPackage && (
                              <Badge className="bg-orange-500/20 text-orange-600 text-xs">Special</Badge>
                            )}
                            <span className="text-xs text-muted-foreground">
                              ${suggestion.package.price} • {suggestion.package.amount}
                            </span>
                          </div>

                          {suggestion.suggestedProduct ? (
                            <div className="mt-2 flex items-center gap-2 flex-wrap">
                              <span className="text-xs text-muted-foreground">→</span>
                              <span className="text-sm text-green-600">
                                {suggestion.suggestedProduct.product_name}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                (${suggestion.suggestedProduct.price})
                              </span>
                              {getMatchBadge(suggestion.matchType, suggestion.confidence)}
                            </div>
                          ) : (
                            <div className="mt-2 flex items-center gap-2">
                              <AlertTriangle className="w-4 h-4 text-yellow-500" />
                              <span className="text-xs text-muted-foreground">
                                No matching G2Bulk product found
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </>
          )}
        </CardContent>
      )}
    </Card>
  );
};

export default G2BulkBulkLinker;
