import React, { useState, useEffect } from 'react';
import { Save, QrCode, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import ImageUpload from '@/components/ImageUpload';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface IKhodeSettings {
  id?: string;
  qr_code_image: string;
  account_name: string;
  account_number: string;
  bank_name: string;
  instructions: string;
  is_enabled: boolean;
}

const defaultSettings: IKhodeSettings = {
  qr_code_image: '',
  account_name: '',
  account_number: '',
  bank_name: 'Bakong KHQR',
  instructions: 'ស្កេន QR កូដនេះជាមួយកម្មវិធី Bakong ឬកម្មវិធីធនាគារណាមួយ',
  is_enabled: true
};

const PaymentQRSettingsTab: React.FC = () => {
  const [settings, setSettings] = useState<IKhodeSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      // Get the single IKhode payment setting (we only use one)
      const { data, error } = await supabase
        .from('payment_qr_settings')
        .select('*')
        .eq('payment_method', 'IKhode')
        .single();
      
      if (error && error.code !== 'PGRST116') {
        // PGRST116 = no rows returned, which is fine for first setup
        throw error;
      }

      if (data) {
        setSettings({
          id: data.id,
          qr_code_image: data.qr_code_image || '',
          account_name: data.account_name || '',
          account_number: data.account_number || '',
          bank_name: data.bank_name || '',
          instructions: data.instructions || '',
          is_enabled: data.is_enabled ?? true
        });
      }
    } catch (error) {
      console.error('Error fetching IKhode settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (settings.id) {
        // Update existing
        const { error } = await supabase
          .from('payment_qr_settings')
          .update({
            qr_code_image: settings.qr_code_image || null,
            account_name: settings.account_name || null,
            account_number: settings.account_number || null,
            bank_name: settings.bank_name || null,
            instructions: settings.instructions || null,
            is_enabled: settings.is_enabled,
            updated_at: new Date().toISOString()
          })
          .eq('id', settings.id);

        if (error) throw error;
      } else {
        // Create new IKhode setting
        const { data, error } = await supabase
          .from('payment_qr_settings')
          .insert({
            payment_method: 'IKhode',
            qr_code_image: settings.qr_code_image || null,
            account_name: settings.account_name || null,
            account_number: settings.account_number || null,
            bank_name: settings.bank_name || null,
            instructions: settings.instructions || null,
            is_enabled: settings.is_enabled
          })
          .select()
          .single();

        if (error) throw error;
        if (data) {
          setSettings(prev => ({ ...prev, id: data.id }));
        }
      }
      
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

  return (
    <Card className="border-gold/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <QrCode className="w-5 h-5 text-gold" />
          IKhode Payment Settings
        </CardTitle>
        <CardDescription>
          Configure your single KHQR payment code. All payment buttons (ABA, Wing, KHQR) on the topup page will use this same QR code.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* QR Code Upload - Most Important */}
        <div className="space-y-3">
          <Label className="text-base font-semibold">QR Code Image</Label>
          <div className="flex flex-col md:flex-row gap-6 items-start">
            <div className="flex-shrink-0">
              {settings.qr_code_image ? (
                <img
                  src={settings.qr_code_image}
                  alt="IKhode QR"
                  className="w-48 h-48 object-contain rounded-xl border-2 border-gold/30 bg-white p-2"
                />
              ) : (
                <div className="w-48 h-48 rounded-xl border-2 border-dashed border-gold/30 flex flex-col items-center justify-center bg-secondary/30">
                  <QrCode className="w-12 h-12 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">No QR uploaded</p>
                </div>
              )}
            </div>
            <div className="flex-1 space-y-3">
              <ImageUpload
                value={settings.qr_code_image}
                onChange={(url) => setSettings({ ...settings, qr_code_image: url })}
                folder="payment-qr"
                placeholder="Upload your KHQR code image"
              />
              <p className="text-xs text-muted-foreground">
                Upload your Bakong KHQR code. This QR will be shown when customers checkout with any payment method (ABA, Wing, KHQR).
              </p>
            </div>
          </div>
        </div>

        {/* Account Details */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Account Name</Label>
            <Input
              value={settings.account_name}
              onChange={(e) => setSettings({ ...settings, account_name: e.target.value })}
              placeholder="e.g., KESOR TOPUP"
              className="border-gold/50"
            />
          </div>
          <div className="space-y-2">
            <Label>Account Number</Label>
            <Input
              value={settings.account_number}
              onChange={(e) => setSettings({ ...settings, account_number: e.target.value })}
              placeholder="e.g., 123456789"
              className="border-gold/50"
            />
          </div>
          <div className="space-y-2">
            <Label>Bank Name</Label>
            <Input
              value={settings.bank_name}
              onChange={(e) => setSettings({ ...settings, bank_name: e.target.value })}
              placeholder="e.g., Bakong KHQR"
              className="border-gold/50"
            />
          </div>
          <div className="flex items-center space-x-3 pt-6">
            <Switch
              checked={settings.is_enabled}
              onCheckedChange={(checked) => setSettings({ ...settings, is_enabled: checked })}
            />
            <Label>Enable Payment</Label>
          </div>
        </div>

        {/* Instructions */}
        <div className="space-y-2">
          <Label>Payment Instructions (shown to customers)</Label>
          <Textarea
            value={settings.instructions}
            onChange={(e) => setSettings({ ...settings, instructions: e.target.value })}
            placeholder="e.g., ស្កេន QR កូដនេះជាមួយកម្មវិធី Bakong"
            className="border-gold/50"
            rows={3}
          />
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
              Save IKhode Settings
            </>
          )}
        </Button>

        {/* Info Box */}
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
          <h4 className="font-semibold text-blue-600 dark:text-blue-400 mb-2">💡 How it works</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Customers see 3 payment buttons: ABA Bank, Wing Bank, KHQR</li>
            <li>• All buttons show the SAME QR code (the one you upload here)</li>
            <li>• This is IKhode style - one QR for all banks</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default PaymentQRSettingsTab;
