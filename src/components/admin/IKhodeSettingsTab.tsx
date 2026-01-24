import React, { useState, useEffect } from 'react';
import { Save, Server, Wifi, Key, Link, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface IKhodeConfig {
  node_api_url: string;
  websocket_url: string;
  webhook_secret: string;
  custom_webhook_url: string;
}

interface GatewayData {
  id: string;
  slug: string;
  name: string;
  enabled: boolean;
  config: IKhodeConfig;
}

const defaultConfig: IKhodeConfig = {
  node_api_url: '',
  websocket_url: '',
  webhook_secret: '',
  custom_webhook_url: ''
};

const IKhodeSettingsTab: React.FC = () => {
  const [gateway, setGateway] = useState<GatewayData | null>(null);
  const [config, setConfig] = useState<IKhodeConfig>(defaultConfig);
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('payment_gateways')
        .select('*')
        .eq('slug', 'ikhode-bakong')
        .maybeSingle();
      
      if (error) throw error;

      if (data) {
        const configData = (data.config as unknown as IKhodeConfig) || defaultConfig;
        setGateway({
          id: data.id,
          slug: data.slug,
          name: data.name,
          enabled: data.enabled || false,
          config: configData
        });
        setConfig(configData);
        setEnabled(data.enabled || false);
      }
    } catch (error) {
      console.error('Error fetching IKhode settings:', error);
      toast({ title: 'Error loading settings', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!gateway) return;
    
    setSaving(true);
    try {
      const configJson = JSON.parse(JSON.stringify(config));
      const { error } = await supabase
        .from('payment_gateways')
        .update({
          enabled,
          config: configJson,
          updated_at: new Date().toISOString()
        })
        .eq('id', gateway.id);

      if (error) throw error;
      
      toast({ title: '✓ រក្សាទុកបានជោគជ័យ!' });
    } catch (error) {
      console.error('Error saving IKhode settings:', error);
      toast({ title: 'រក្សាទុកបរាជ័យ', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card className="border-gold/30">
        <CardContent className="py-8 text-center">
          <div className="animate-spin w-8 h-8 border-2 border-gold border-t-transparent rounded-full mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  if (!gateway) {
    return (
      <Card className="border-red-500/30">
        <CardContent className="py-8 text-center">
          <p className="text-red-500">Kesor gateway not found in database</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-gold/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Server className="w-5 h-5 text-gold" />
          Kesor KHQR Settings
        </CardTitle>
        <CardDescription>
          Configure your Kesor Node.js API server for dynamic KHQR generation
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Enable Toggle */}
        <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg border border-gold/20">
          <div>
            <Label className="text-base font-semibold">Enable Kesor Payment</Label>
            <p className="text-sm text-muted-foreground">Turn on/off Kesor KHQR payments</p>
          </div>
          <Switch
            checked={enabled}
            onCheckedChange={setEnabled}
          />
        </div>

        {/* Node.js API URL */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Server className="w-4 h-4" />
            Node.js API URL
          </Label>
          <Input
            value={config.node_api_url}
            onChange={(e) => setConfig({ ...config, node_api_url: e.target.value })}
            placeholder="https://your-kesor-api.com"
            className="border-gold/50"
          />
          <p className="text-xs text-muted-foreground">
            The URL of your Kesor Node.js server (e.g., https://api.example.com)
          </p>
        </div>

        {/* WebSocket URL */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Wifi className="w-4 h-4" />
            WebSocket URL
          </Label>
          <Input
            value={config.websocket_url}
            onChange={(e) => setConfig({ ...config, websocket_url: e.target.value })}
            placeholder="wss://your-kesor-api.com/ws"
            className="border-gold/50"
          />
          <p className="text-xs text-muted-foreground">
            Real-time payment notifications WebSocket URL (optional)
          </p>
        </div>

        {/* Webhook Secret */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Key className="w-4 h-4" />
            Webhook Secret
          </Label>
          <Input
            type="password"
            value={config.webhook_secret}
            onChange={(e) => setConfig({ ...config, webhook_secret: e.target.value })}
            placeholder="your-secret-key"
            className="border-gold/50"
          />
          <p className="text-xs text-muted-foreground">
            Secret key to verify webhook callbacks from your Node.js server
          </p>
        </div>

        {/* Custom Webhook URL */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Link className="w-4 h-4" />
            Custom Webhook URL (Optional)
          </Label>
          <Input
            value={config.custom_webhook_url}
            onChange={(e) => setConfig({ ...config, custom_webhook_url: e.target.value })}
            placeholder="https://your-domain.com/webhook/{order_id}"
            className="border-gold/50"
          />
          <p className="text-xs text-muted-foreground">
            Override default webhook. Use {'{order_id}'} as placeholder.
          </p>
        </div>

        {/* Save Button */}
        <Button 
          onClick={handleSave} 
          disabled={saving}
          className="w-full bg-gold hover:bg-gold/90 text-primary-foreground"
          size="lg"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Kesor Settings
            </>
          )}
        </Button>

        {/* Info Box */}
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
          <h4 className="font-semibold text-blue-600 dark:text-blue-400 mb-2">💡 How Kesor KHQR Works</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Your Node.js server generates dynamic KHQR codes</li>
            <li>• Customers scan QR and pay via any Bakong-linked bank</li>
            <li>• Webhook confirms payment automatically</li>
            <li>• Order status updates in real-time</li>
          </ul>
        </div>

        {/* Webhook URL Info */}
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
          <h4 className="font-semibold text-green-600 dark:text-green-400 mb-2">🔗 Your Webhook URL</h4>
          <code className="text-xs bg-secondary p-2 rounded block break-all">
            {`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ikhode-webhook/{order_id}`}
          </code>
          <p className="text-xs text-muted-foreground mt-2">
            Configure this URL in your Kesor Node.js server as the callback
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default IKhodeSettingsTab;
