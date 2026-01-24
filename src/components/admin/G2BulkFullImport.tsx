import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { Download, RefreshCw, Check, AlertTriangle, Percent, Filter, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface G2BulkFullImportProps {
  onImportComplete: () => void;
}

interface ImportResult {
  games_created: number;
  games_skipped: number;
  packages_created: number;
  packages_skipped: number;
  packages_updated: number;
  price_markup_percent: number;
}

interface G2BulkGame {
  code: string;
  name: string;
  image: string;
}

const G2BulkFullImport: React.FC<G2BulkFullImportProps> = ({ onImportComplete }) => {
  const [isImporting, setIsImporting] = useState(false);
  const [isLoadingGames, setIsLoadingGames] = useState(false);
  const [markup, setMarkup] = useState(10);
  const [updateExistingPrices, setUpdateExistingPrices] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [availableGames, setAvailableGames] = useState<G2BulkGame[]>([]);
  const [selectedGames, setSelectedGames] = useState<Set<string>>(new Set());
  const [showGameFilter, setShowGameFilter] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');

  const loadAvailableGames = async () => {
    setIsLoadingGames(true);
    try {
      const { data, error } = await supabase.functions.invoke('g2bulk-api', {
        body: { action: 'get_g2bulk_games_list' },
      });

      if (error) throw error;

      if (data.success && data.data) {
        setAvailableGames(data.data);
      }
    } catch (error) {
      console.error('Error loading games:', error);
      toast({
        title: 'Error Loading Games',
        description: 'Could not fetch available games from G2Bulk',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingGames(false);
    }
  };

  useEffect(() => {
    if (showGameFilter && availableGames.length === 0) {
      loadAvailableGames();
    }
  }, [showGameFilter]);

  const handleFullImport = async () => {
    setIsImporting(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('g2bulk-api', {
        body: { 
          action: 'bulk_import_all',
          price_markup_percent: markup,
          update_existing_prices: updateExistingPrices,
          selected_game_codes: selectedGames.size > 0 ? Array.from(selectedGames) : null,
        },
      });

      if (error) throw error;

      if (data.success && data.data) {
        setResult(data.data);
        const updatedMsg = data.data.packages_updated > 0 
          ? `, updated ${data.data.packages_updated} prices`
          : '';
        toast({
          title: 'Import Complete!',
          description: `Created ${data.data.games_created} games and ${data.data.packages_created} packages${updatedMsg}`,
        });
        onImportComplete();
      } else {
        throw new Error(data.error || 'Import failed');
      }
    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: 'Import Failed',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsImporting(false);
    }
  };

  const toggleGame = (code: string) => {
    const newSelected = new Set(selectedGames);
    if (newSelected.has(code)) {
      newSelected.delete(code);
    } else {
      newSelected.add(code);
    }
    setSelectedGames(newSelected);
  };

  const selectAllGames = () => {
    setSelectedGames(new Set(filteredGames.map(g => g.code)));
  };

  const clearSelection = () => {
    setSelectedGames(new Set());
  };

  const filteredGames = availableGames.filter(g => 
    g.name.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <Card className="border-gold/30 bg-gradient-to-br from-gold/5 to-transparent">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Download className="w-5 h-5 text-gold" />
          <span>Full G2Bulk Import</span>
          <Badge variant="outline" className="ml-2 bg-gold/10 text-gold border-gold/30">
            One-Click
          </Badge>
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Import all games and packages from G2Bulk with automatic price markup
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Settings Row */}
        <div className="flex flex-wrap items-end gap-4">
          {/* Markup Input */}
          <div className="flex-shrink-0">
            <Label htmlFor="markup" className="text-sm flex items-center gap-1 mb-2">
              <Percent className="w-3 h-3" />
              Price Markup
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="markup"
                type="number"
                min="0"
                max="100"
                step="1"
                value={markup}
                onChange={(e) => setMarkup(Number(e.target.value))}
                className="w-20 border-gold/50"
                disabled={isImporting}
              />
              <span className="text-sm text-muted-foreground">%</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              e.g., $10 → ${(10 * (1 + markup / 100)).toFixed(2)}
            </p>
          </div>

          {/* Update Prices Option */}
          <div className="flex-shrink-0">
            <div className="flex items-center space-x-2 h-10">
              <Checkbox
                id="update-prices"
                checked={updateExistingPrices}
                onCheckedChange={(checked) => setUpdateExistingPrices(checked === true)}
                disabled={isImporting}
              />
              <Label 
                htmlFor="update-prices" 
                className="text-sm font-normal cursor-pointer"
              >
                Update existing prices
              </Label>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Recalculate prices for linked packages
            </p>
          </div>

          {/* Import Button */}
          <div className="flex-1 min-w-[200px]">
            <Button
              onClick={handleFullImport}
              disabled={isImporting}
              className="w-full bg-gradient-to-r from-gold to-amber-600 hover:from-gold-dark hover:to-amber-700 text-primary-foreground"
            >
              {isImporting ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  {selectedGames.size > 0 
                    ? `Import ${selectedGames.size} Selected Games` 
                    : 'Import All from G2Bulk'}
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Game Filter Toggle */}
        <div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowGameFilter(!showGameFilter)}
            className="w-full justify-between"
          >
            <span className="flex items-center gap-2">
              <Filter className="w-4 h-4" />
              {selectedGames.size > 0 
                ? `${selectedGames.size} games selected` 
                : 'Filter by specific games'}
            </span>
            {showGameFilter ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </div>

        {/* Game Selection Panel */}
        {showGameFilter && (
          <div className="border rounded-lg p-3 bg-background/50 space-y-3">
            {isLoadingGames ? (
              <div className="flex items-center justify-center py-4">
                <RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">Loading games...</span>
              </div>
            ) : (
              <>
                {/* Search and Actions */}
                <div className="flex gap-2">
                  <Input
                    placeholder="Search games..."
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    className="flex-1"
                  />
                  <Button variant="outline" size="sm" onClick={selectAllGames}>
                    Select All
                  </Button>
                  <Button variant="outline" size="sm" onClick={clearSelection}>
                    Clear
                  </Button>
                </div>

                {/* Games List */}
                <ScrollArea className="h-48">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {filteredGames.map((game) => (
                      <div
                        key={game.code}
                        className={`flex items-center gap-2 p-2 rounded border cursor-pointer transition-colors ${
                          selectedGames.has(game.code) 
                            ? 'bg-gold/10 border-gold/50' 
                            : 'bg-background hover:bg-muted/50 border-border'
                        }`}
                        onClick={() => toggleGame(game.code)}
                      >
                        <Checkbox
                          checked={selectedGames.has(game.code)}
                          onCheckedChange={() => toggleGame(game.code)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        {game.image && (
                          <img 
                            src={game.image} 
                            alt={game.name} 
                            className="w-6 h-6 rounded object-cover"
                          />
                        )}
                        <span className="text-xs truncate flex-1">{game.name}</span>
                      </div>
                    ))}
                  </div>
                  {filteredGames.length === 0 && (
                    <p className="text-center text-sm text-muted-foreground py-4">
                      No games found
                    </p>
                  )}
                </ScrollArea>
                
                <p className="text-xs text-muted-foreground">
                  {availableGames.length} games available • {selectedGames.size} selected
                </p>
              </>
            )}
          </div>
        )}

        {/* Result Display */}
        {result && (
          <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30">
            <div className="flex items-center gap-2 mb-2">
              <Check className="w-4 h-4 text-green-500" />
              <span className="font-medium text-green-600">Import Successful!</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
              <div className="text-center p-2 bg-background/50 rounded">
                <div className="text-lg font-bold text-green-600">{result.games_created}</div>
                <div className="text-xs text-muted-foreground">Games Created</div>
              </div>
              <div className="text-center p-2 bg-background/50 rounded">
                <div className="text-lg font-bold text-muted-foreground">{result.games_skipped}</div>
                <div className="text-xs text-muted-foreground">Games Skipped</div>
              </div>
              <div className="text-center p-2 bg-background/50 rounded">
                <div className="text-lg font-bold text-green-600">{result.packages_created}</div>
                <div className="text-xs text-muted-foreground">Packages Created</div>
              </div>
              <div className="text-center p-2 bg-background/50 rounded">
                <div className="text-lg font-bold text-muted-foreground">{result.packages_skipped}</div>
                <div className="text-xs text-muted-foreground">Packages Skipped</div>
              </div>
              <div className="text-center p-2 bg-background/50 rounded">
                <div className="text-lg font-bold text-blue-600">{result.packages_updated}</div>
                <div className="text-xs text-muted-foreground">Prices Updated</div>
              </div>
            </div>
            <div className="text-xs text-center text-muted-foreground mt-2">
              All prices include {result.price_markup_percent}% markup
            </div>
          </div>
        )}

        {/* Warning */}
        <div className="flex items-start gap-2 p-2 rounded bg-yellow-500/10 border border-yellow-500/20">
          <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-muted-foreground">
            This will create games and packages in your store. Existing items with the same G2Bulk link will be skipped 
            {updateExistingPrices ? ' but their prices will be updated.' : '.'}
            {' '}You can delete unwanted items afterward.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default G2BulkFullImport;
