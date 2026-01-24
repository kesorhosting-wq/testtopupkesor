import React, { useState, useEffect, useCallback } from 'react';
import { Wallet, RefreshCw, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface BalanceData {
  balance?: string | number;
  currency?: string;
}

const G2BulkBalanceDisplay: React.FC = () => {
  const [balance, setBalance] = useState<BalanceData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEnabled, setIsEnabled] = useState(false);

  const checkConfig = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('api_configurations')
        .select('is_enabled')
        .eq('api_name', 'g2bulk')
        .maybeSingle();
      
      if (data) {
        setIsEnabled(data.is_enabled || false);
      }
    } catch (err) {
      console.error('Error checking G2Bulk config:', err);
    }
  }, []);

  const fetchBalance = useCallback(async () => {
    if (!isEnabled) return;
    
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('g2bulk-api', {
        body: { action: 'get_account_balance' },
      });

      if (fnError) throw fnError;

      if (data?.success && data?.data) {
        const apiData = data.data;
        // Handle different response structures
        const balanceValue = apiData.data?.balance ?? apiData.balance ?? null;
        const currency = apiData.data?.currency ?? apiData.currency ?? 'USD';
        
        if (balanceValue !== null) {
          setBalance({ balance: balanceValue, currency });
        } else {
          setBalance({ balance: 'N/A' });
        }
      } else {
        setError('Failed to fetch');
      }
    } catch (err) {
      console.error('Error fetching G2Bulk balance:', err);
      setError('Error');
    } finally {
      setIsLoading(false);
    }
  }, [isEnabled]);

  useEffect(() => {
    checkConfig();
  }, [checkConfig]);

  useEffect(() => {
    if (isEnabled) {
      fetchBalance();
      // Refresh balance every 5 minutes
      const interval = setInterval(fetchBalance, 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [isEnabled, fetchBalance]);

  if (!isEnabled) {
    return null;
  }

  const formatBalance = (val: string | number | undefined) => {
    if (val === undefined || val === null) return 'N/A';
    if (typeof val === 'number') return val.toFixed(2);
    return val;
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-green-500/10 border-green-500/30">
            <Wallet className="w-4 h-4 text-gold" />
            {isLoading ? (
              <RefreshCw className="w-4 h-4 animate-spin text-muted-foreground" />
            ) : error ? (
              <AlertCircle className="w-4 h-4 text-destructive" />
            ) : (
              <span className="text-sm font-medium">
                {balance?.currency === 'USD' && '$'}
                {formatBalance(balance?.balance)}
                {balance?.currency && balance.currency !== 'USD' && ` ${balance.currency}`}
              </span>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 p-0 hover:bg-transparent"
              onClick={(e) => {
                e.stopPropagation();
                fetchBalance();
              }}
              disabled={isLoading}
            >
              <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>G2Bulk Balance</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default G2BulkBalanceDisplay;