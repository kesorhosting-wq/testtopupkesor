import React, { useState, useEffect } from 'react';
import { Save, Server, Key, Link, Loader2, TestTube, Globe, Wifi } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface IkhodeConfig {
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
  config: IkhodeConfig;
}

const defaultConfig: IkhodeConfig = {
  node_api_url: '',
  websocket_url: '',
  webhook_secret: '',
  custom_webhook_url: ''
};

const KesorSettingsTab: React.FC = () => {
  const [gateway, setGateway] = useState<GatewayData | null>(null);
  const [config, setConfig] = useState<IkhodeConfig>(defaultConfig);
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showSecret, setShowSecret] = useState(false);

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
        const configData = (data.config as unknown as IkhodeConfig) || defaultConfig;
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
      console.error('Error fetching Ikhode settings:', error);
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
      
      toast({ title: '✓ KHQR Gateway settings saved!' });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({ title: 'Failed to save', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    if (!config.node_api_url) {
      toast({ title: 'Please enter Node API URL first', variant: 'destructive' });
      return;
    }

    setTesting(true);
    try {
      // Test via edge function to avoid CORS issues
      const { data, error } = await supabase.functions.invoke('ikhode-payment', {
        body: { action: 'test-connection' }
      });

      if (error) throw error;

      if (data?.success) {
        toast({ title: '✓ Connection successful!', description: data.message });
      } else {
        toast({ title: 'Connection failed', description: data?.error || 'Unknown error', variant: 'destructive' });
      }
    } catch (error: any) {
      console.error('Test connection error:', error);
      toast({ title: 'Connection failed', description: error.message || 'Could not reach Node.js API', variant: 'destructive' });
    } finally {
      setTesting(false);
    }
  };

  const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ikhode-webhook`;

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
          <p className="text-red-500">KHQR Gateway (ikhode-bakong) not found in database</p>
          <p className="text-sm text-muted-foreground mt-2">
            Please add a payment gateway with slug "ikhode-bakong" first.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-gold/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Server className="w-5 h-5 text-gold" />
          KHQR Payment Gateway Settings (Ikhode)
        </CardTitle>
        <CardDescription>
          Configure your KHQR payment gateway for Bakong payments
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Enable Toggle */}
        <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg border border-gold/20">
          <div>
            <Label className="text-base font-semibold">Enable KHQR Payment</Label>
            <p className="text-sm text-muted-foreground">Turn on/off KHQR Bakong payments</p>
          </div>
          <Switch
            checked={enabled}
            onCheckedChange={setEnabled}
          />
        </div>

        {/* Node API URL */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Globe className="w-4 h-4" />
            Node.js API URL
          </Label>
          <Input
            value={config.node_api_url}
            onChange={(e) => setConfig({ ...config, node_api_url: e.target.value })}
            placeholder="https://your-khqr-api.example.com"
            className="border-gold/50"
          />
          <p className="text-xs text-muted-foreground">
            The base URL of your Node.js KHQR API server (endpoint: /generate-khqr)
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
            placeholder="wss://your-khqr-api.example.com"
            className="border-gold/50"
          />
          <p className="text-xs text-muted-foreground">
            WebSocket URL for real-time payment status updates
          </p>
        </div>

        {/* Webhook Secret */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Key className="w-4 h-4" />
            Webhook Secret
          </Label>
          <div className="relative">
            <Input
              type={showSecret ? "text" : "password"}
              value={config.webhook_secret}
              onChange={(e) => setConfig({ ...config, webhook_secret: e.target.value })}
              placeholder="Secret key for webhook verification"
              className="border-gold/50 pr-20"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 text-xs"
              onClick={() => setShowSecret(!showSecret)}
            >
              {showSecret ? 'Hide' : 'Show'}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Secret key shared with Node.js API for secure webhook verification (Bearer token)
          </p>
        </div>

        {/* Custom Webhook URL (Optional) */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Link className="w-4 h-4" />
            Custom Webhook URL (Optional)
          </Label>
          <Input
            value={config.custom_webhook_url}
            onChange={(e) => setConfig({ ...config, custom_webhook_url: e.target.value })}
            placeholder="Leave empty to use default"
            className="border-gold/50"
          />
          <p className="text-xs text-muted-foreground">
            Override the default webhook callback URL (optional)
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button 
            onClick={handleTestConnection} 
            disabled={testing || !config.node_api_url}
            variant="outline"
            className="flex-1 border-gold/50"
          >
            {testing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Testing...
              </>
            ) : (
              <>
                <TestTube className="w-4 h-4 mr-2" />
                Test Connection
              </>
            )}
          </Button>
          
          <Button 
            onClick={handleSave} 
            disabled={saving}
            className="flex-1 bg-gold hover:bg-gold/90 text-primary-foreground"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Settings
              </>
            )}
          </Button>
        </div>

        {/* Info Box */}
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
          <h4 className="font-semibold text-blue-600 dark:text-blue-400 mb-2">💡 How KHQR Gateway Works</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Node.js API generates dynamic KHQR codes for each payment</li>
            <li>• Customers scan QR and pay via any Bakong-linked bank</li>
            <li>• WebSocket provides real-time payment status updates</li>
            <li>• Webhook confirms payment and updates order automatically</li>
          </ul>
        </div>

        {/* Webhook URL Info */}
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
          <h4 className="font-semibold text-green-600 dark:text-green-400 mb-2">🔗 Your Webhook URL</h4>
          <code className="text-xs bg-secondary p-2 rounded block break-all">
            {webhookUrl}/{'{order_id}'}
          </code>
          <p className="text-xs text-muted-foreground mt-2">
            Configure this URL pattern in your Node.js KHQR API as the payment callback.
            The order_id will be appended to the path.
          </p>
        </div>

        {/* API Flow */}
        <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
          <h4 className="font-semibold text-purple-600 dark:text-purple-400 mb-2">📋 API Payload Format</h4>
          <pre className="text-xs bg-secondary p-2 rounded overflow-x-auto">
{`POST /generate-khqr
{
  "amount": 10.00,
  "transactionId": "ORD-abc12345-123456",
  "email": "user@example.com",
  "username": "Customer Name",
  "callbackUrl": "${webhookUrl}/{order_id}",
  "secret": "your_webhook_secret"
}`}
          </pre>
        </div>
      </CardContent>
    </Card>
  );
};

export default KesorSettingsTab;
