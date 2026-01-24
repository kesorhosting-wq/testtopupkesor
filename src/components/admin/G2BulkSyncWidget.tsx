import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { RefreshCw, CheckCircle2, Package, Clock, Database } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface G2BulkSyncWidgetProps {
  onSyncComplete?: () => void;
}

const G2BulkSyncWidget: React.FC<G2BulkSyncWidgetProps> = ({ onSyncComplete }) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [productCount, setProductCount] = useState(0);
  const [categoryCount, setCategoryCount] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      // Get product count
      const { count: totalProducts } = await supabase
        .from('g2bulk_products')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      setProductCount(totalProducts || 0);

      // Get unique game count (categories)
      const { data: games } = await supabase
        .from('g2bulk_products')
        .select('game_name')
        .eq('is_active', true);

      if (games) {
        const uniqueGames = new Set(games.map(g => g.game_name));
        setCategoryCount(uniqueGames.size);
      }

      // Get last update time from most recent product
      const { data: lastProduct } = await supabase
        .from('g2bulk_products')
        .select('updated_at')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (lastProduct?.updated_at) {
        setLastSyncTime(new Date(lastProduct.updated_at));
      }
    } catch (error) {
      console.error('Error loading G2Bulk stats:', error);
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      toast({ title: 'Syncing G2Bulk products...', description: 'This may take a minute.' });

      const { data, error } = await supabase.functions.invoke('g2bulk-api', {
        body: { action: 'sync_products' },
      });

      if (error) throw error;

      if (data?.success && data?.data) {
        setProductCount(data.data.synced);
        setCategoryCount(data.data.categories);
        setLastSyncTime(new Date());

        toast({
          title: 'Sync complete!',
          description: `${data.data.synced} products from ${data.data.categories} games`,
        });

        onSyncComplete?.();
      } else {
        throw new Error(data?.error || 'Sync failed');
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Sync failed';
      toast({ title: 'Sync failed', description: errorMessage, variant: 'destructive' });
    } finally {
      setIsSyncing(false);
    }
  };

  const formatLastSync = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  return (
    <Card className="border-gold/30 bg-gradient-to-br from-gold/5 to-transparent">
      <CardContent className="p-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* Sync Button */}
          <Button
            onClick={handleSync}
            disabled={isSyncing}
            className="bg-gold hover:bg-gold-dark text-primary-foreground"
          >
            {isSyncing ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            {isSyncing ? 'Syncing...' : 'Sync Now'}
          </Button>

          {/* Stats */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <Package className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">{productCount.toLocaleString()}</span>
              <span className="text-xs text-muted-foreground">products</span>
            </div>

            <div className="flex items-center gap-1.5">
              <Database className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">{categoryCount}</span>
              <span className="text-xs text-muted-foreground">games</span>
            </div>

            {lastSyncTime && (
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  Last sync: {formatLastSync(lastSyncTime)}
                </span>
              </div>
            )}
          </div>

          {productCount > 0 && (
            <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Synced
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default G2BulkSyncWidget;
