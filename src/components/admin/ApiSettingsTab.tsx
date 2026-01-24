import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Key, Eye, EyeOff, Save, RefreshCw, Check, X, Wallet, Download, Package } from 'lucide-react';

interface ApiConfig {
  id?: string;
  api_name: string;
  api_uid: string;
  api_secret: string;
  is_enabled: boolean;
  use_sandbox: boolean;
}

interface SyncStats {
  synced: number;
  categories: number;
}

const ApiSettingsTab: React.FC = () => {
  const [g2bulkConfig, setG2bulkConfig] = useState<ApiConfig>({
    api_name: 'g2bulk',
    api_uid: '',
    api_secret: '',
    is_enabled: false,
    use_sandbox: false,
  });
  const [showSecret, setShowSecret] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; balance?: string; message?: string } | null>(null);
  const [syncStats, setSyncStats] = useState<SyncStats | null>(null);
  const [productCount, setProductCount] = useState(0);

  useEffect(() => {
    loadApiConfig();
    loadProductCount();
  }, []);

  const loadApiConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('api_configurations')
        .select('*')
        .eq('api_name', 'g2bulk')
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setG2bulkConfig({
          id: data.id,
          api_name: data.api_name,
          api_uid: data.api_uid || '',
          api_secret: data.api_secret || '',
          is_enabled: data.is_enabled || false,
          use_sandbox: false,
        });
      }
    } catch (error) {
      console.error('Error loading API config:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadProductCount = async () => {
    try {
      const { count } = await supabase
        .from('g2bulk_products')
        .select('*', { count: 'exact', head: true });
      setProductCount(count || 0);
    } catch (error) {
      console.error('Error loading product count:', error);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payload = {
        api_name: 'g2bulk',
        api_uid: g2bulkConfig.api_uid,
        api_secret: g2bulkConfig.api_secret,
        is_enabled: g2bulkConfig.is_enabled,
        use_sandbox: false,
      };

      const { error } = await supabase
        .from('api_configurations')
        .upsert(payload, { onConflict: 'api_name' });

      if (error) throw error;

      toast({ title: 'G2Bulk API configuration saved!' });
      setTestResult(null);
    } catch (error) {
      console.error('Error saving API config:', error);
      toast({ title: 'Failed to save configuration', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('g2bulk-api', {
        body: { action: 'get_account_balance' },
      });

      if (error) throw error;

      if (data?.success && data?.data) {
        const apiData = data.data;
        const balance = apiData.balance || 'Connected';
        setTestResult({ 
          success: true, 
          balance: String(balance),
          message: `Connected as ${apiData.username || 'user'}!` 
        });
        toast({ title: 'API connection successful!' });
      } else {
        setTestResult({ success: false, message: data?.error || 'Connection failed' });
        toast({ title: 'Connection failed', description: data?.error, variant: 'destructive' });
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Connection test failed';
      setTestResult({ success: false, message: errorMessage });
      toast({ title: 'Connection test failed', variant: 'destructive' });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSyncProducts = async () => {
    setIsSyncing(true);
    setSyncStats(null);
    try {
      toast({ title: 'Syncing products...', description: 'This may take a few minutes.' });
      
      const { data, error } = await supabase.functions.invoke('g2bulk-api', {
        body: { action: 'sync_products' },
      });

      if (error) throw error;

      if (data?.success && data?.data) {
        setSyncStats(data.data);
        setProductCount(data.data.synced);
        toast({ 
          title: 'Products synced successfully!', 
          description: `${data.data.synced} products from ${data.data.categories} categories` 
        });
      } else {
        toast({ title: 'Sync failed', description: data?.error, variant: 'destructive' });
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Sync failed';
      toast({ title: 'Sync failed', description: errorMessage, variant: 'destructive' });
    } finally {
      setIsSyncing(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="border-gold/30">
        <CardContent className="p-8 text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-gold" />
          <p className="mt-4 text-muted-foreground">Loading API settings...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* G2Bulk API Configuration */}
      <Card className="border-gold/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="w-5 h-5 text-gold" />
            G2Bulk API Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-secondary/50 p-4 rounded-lg border border-border">
            <h4 className="font-semibold mb-2">About G2Bulk API</h4>
            <p className="text-sm text-muted-foreground">
              G2Bulk API enables real game top-up functionality. Get your API key from{' '}
              <a href="https://t.me/G2BULKBOT" target="_blank" rel="noopener noreferrer" className="text-gold hover:underline">
                @G2BULKBOT on Telegram
              </a>
            </p>
          </div>

          <div className="flex items-center justify-between p-4 bg-card rounded-lg border border-border">
            <div>
              <h4 className="font-semibold">Enable G2Bulk API</h4>
              <p className="text-sm text-muted-foreground">Turn on for real top-up functionality</p>
            </div>
            <Switch
              checked={g2bulkConfig.is_enabled}
              onCheckedChange={(checked) => setG2bulkConfig({ ...g2bulkConfig, is_enabled: checked })}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">API Key</label>
            <div className="relative">
              <Input
                type={showSecret ? 'text' : 'password'}
                placeholder="Enter your G2Bulk API Key"
                value={g2bulkConfig.api_secret}
                onChange={(e) => setG2bulkConfig({ ...g2bulkConfig, api_secret: e.target.value })}
                className="border-gold/50 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowSecret(!showSecret)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {testResult && (
            <div className={`p-4 rounded-lg border ${testResult.success ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
              <div className="flex items-center gap-2">
                {testResult.success ? <Check className="w-5 h-5 text-green-500" /> : <X className="w-5 h-5 text-red-500" />}
                <span className={testResult.success ? 'text-green-500' : 'text-red-500'}>{testResult.message}</span>
              </div>
              {testResult.success && testResult.balance && (
                <div className="mt-2 flex items-center gap-2 text-sm">
                  <Wallet className="w-4 h-4" />
                  <span>Account Balance: ${testResult.balance}</span>
                </div>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <Button onClick={handleSave} disabled={isSaving} className="bg-gold hover:bg-gold/90 text-primary-foreground">
              {isSaving ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />Saving...</> : <><Save className="w-4 h-4 mr-2" />Save Configuration</>}
            </Button>

            <Button variant="outline" onClick={handleTestConnection} disabled={isTesting || !g2bulkConfig.api_secret}>
              {isTesting ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />Testing...</> : <><RefreshCw className="w-4 h-4 mr-2" />Test Connection</>}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Product Sync */}
      <Card className="border-gold/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-gold" />
            Product Catalog
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg">
            <div>
              <h4 className="font-semibold">Synced Products</h4>
              <p className="text-sm text-muted-foreground">{productCount} products in database</p>
            </div>
            <Button 
              onClick={handleSyncProducts} 
              disabled={isSyncing || !g2bulkConfig.is_enabled}
              variant="outline"
            >
              {isSyncing ? (
                <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />Syncing...</>
              ) : (
                <><Download className="w-4 h-4 mr-2" />Sync Products</>
              )}
            </Button>
          </div>

          {syncStats && (
            <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
              <p className="text-green-600">
                ✓ Successfully synced {syncStats.synced} products from {syncStats.categories} categories
              </p>
            </div>
          )}

          <p className="text-sm text-muted-foreground">
            Sync products from G2Bulk to use their catalog. Products will be available for linking to your games.
          </p>
        </CardContent>
      </Card>

      {/* Webhook Info */}
      <Card className="border-gold/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">📡 Webhook URL</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-2">
            G2Bulk will automatically send order status updates to this URL:
          </p>
          <code className="block p-3 bg-secondary rounded-lg text-sm break-all">
            {`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/g2bulk-webhook`}
          </code>
        </CardContent>
      </Card>
    </div>
  );
};

export default ApiSettingsTab;
