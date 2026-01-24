import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RefreshCw, Bug, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface LogEntry {
  id: string;
  timestamp: string;
  action: string;
  request?: any;
  response?: any;
  success: boolean;
  duration?: number;
}

const G2BulkDebugLogs: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());
  const [isVisible, setIsVisible] = useState(false);

  const fetchRecentOrders = async () => {
    setIsLoading(true);
    try {
      // Fetch recent orders with G2Bulk activity
      const { data: orders, error } = await supabase
        .from('topup_orders')
        .select('id, created_at, updated_at, game_name, package_name, player_id, g2bulk_product_id, g2bulk_order_id, status, status_message')
        .not('g2bulk_product_id', 'is', null)
        .order('updated_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      // Convert orders to log format
      const logEntries: LogEntry[] = (orders || []).map(order => ({
        id: order.id,
        timestamp: order.updated_at,
        action: order.g2bulk_order_id ? 'order_created' : 'order_pending',
        request: {
          game: order.game_name,
          package: order.package_name,
          player_id: order.player_id,
          g2bulk_product_id: order.g2bulk_product_id,
        },
        response: {
          g2bulk_order_id: order.g2bulk_order_id,
          status: order.status,
          message: order.status_message,
        },
        success: order.status === 'completed' || order.status === 'processing',
      }));

      setLogs(logEntries);
    } catch (error) {
      console.error('Error fetching logs:', error);
      toast({ title: 'Failed to fetch logs', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const testG2BulkConnection = async () => {
    setIsLoading(true);
    try {
      const startTime = Date.now();
      const { data, error } = await supabase.functions.invoke('g2bulk-api', {
        body: { action: 'get_account_balance' }
      });
      const duration = Date.now() - startTime;

      const newLog: LogEntry = {
        id: `test-${Date.now()}`,
        timestamp: new Date().toISOString(),
        action: 'get_account_balance',
        request: { action: 'get_account_balance' },
        response: error ? { error: error.message } : data,
        success: !error && data?.success,
        duration,
      };

      setLogs(prev => [newLog, ...prev]);
      
      if (data?.success) {
        toast({ title: 'API Connection OK', description: `Balance: $${data.data?.balance || 0}` });
      } else {
        toast({ title: 'API Connection Failed', variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Connection error', description: err.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const testGetGames = async () => {
    setIsLoading(true);
    try {
      const startTime = Date.now();
      const { data, error } = await supabase.functions.invoke('g2bulk-api', {
        body: { action: 'get_games' }
      });
      const duration = Date.now() - startTime;

      const newLog: LogEntry = {
        id: `games-${Date.now()}`,
        timestamp: new Date().toISOString(),
        action: 'get_games',
        request: { action: 'get_games' },
        response: error ? { error: error.message } : { 
          success: data?.success,
          games_count: data?.data?.games?.length || 0,
          sample: data?.data?.games?.slice(0, 3)
        },
        success: !error && data?.success,
        duration,
      };

      setLogs(prev => [newLog, ...prev]);
      
      if (data?.success) {
        toast({ title: 'Games fetched', description: `Found ${data.data?.games?.length || 0} games` });
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedLogs(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const clearLogs = () => {
    setLogs([]);
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  useEffect(() => {
    if (isVisible) {
      fetchRecentOrders();
    }
  }, [isVisible]);

  return (
    <Card className="border-purple-500/30 bg-gradient-to-br from-purple-500/5 to-pink-500/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle 
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => setIsVisible(!isVisible)}
          >
            <Bug className="w-5 h-5 text-purple-400" />
            G2Bulk API Debug Logs
            {isVisible ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </CardTitle>
          {isVisible && (
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={testG2BulkConnection} disabled={isLoading}>
                Test Connection
              </Button>
              <Button size="sm" variant="outline" onClick={testGetGames} disabled={isLoading}>
                Test Games
              </Button>
              <Button size="sm" variant="outline" onClick={fetchRecentOrders} disabled={isLoading}>
                <RefreshCw className={`w-4 h-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button size="sm" variant="ghost" onClick={clearLogs}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      
      {isVisible && (
        <CardContent>
          {logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No API logs yet. Test the connection or wait for orders.</p>
            </div>
          ) : (
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-2">
                {logs.map(log => (
                  <div 
                    key={log.id}
                    className={`p-3 rounded-lg border ${
                      log.success 
                        ? 'border-green-500/30 bg-green-500/5' 
                        : 'border-red-500/30 bg-red-500/5'
                    }`}
                  >
                    <div 
                      className="flex items-center justify-between cursor-pointer"
                      onClick={() => toggleExpand(log.id)}
                    >
                      <div className="flex items-center gap-2">
                        <Badge variant={log.success ? 'default' : 'destructive'} className="text-xs">
                          {log.success ? 'OK' : 'FAIL'}
                        </Badge>
                        <span className="font-mono text-sm">{log.action}</span>
                        {log.duration && (
                          <span className="text-xs text-muted-foreground">
                            {log.duration}ms
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {formatTime(log.timestamp)}
                        </span>
                        {expandedLogs.has(log.id) ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </div>
                    </div>
                    
                    {expandedLogs.has(log.id) && (
                      <div className="mt-3 space-y-2">
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">Request:</p>
                          <pre className="text-xs bg-background/50 p-2 rounded overflow-x-auto">
                            {JSON.stringify(log.request, null, 2)}
                          </pre>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">Response:</p>
                          <pre className="text-xs bg-background/50 p-2 rounded overflow-x-auto">
                            {JSON.stringify(log.response, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      )}
    </Card>
  );
};

export default G2BulkDebugLogs;