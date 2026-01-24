import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Activity, CheckCircle2, XCircle, Clock, Loader2, RefreshCw, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';

interface OrderStatus {
  id: string;
  game_name: string;
  package_name: string;
  player_id: string;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
  updated_at: string;
}

const RealtimeOrderStatusWidget: React.FC = () => {
  const [orders, setOrders] = useState<OrderStatus[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchRecentOrders = async () => {
    const { data, error } = await supabase
      .from('topup_orders')
      .select('id, game_name, package_name, player_id, amount, currency, status, created_at, updated_at')
      .order('created_at', { ascending: false })
      .limit(10);

    if (!error && data) {
      setOrders(data);
      setLastUpdate(new Date());
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchRecentOrders();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('admin-orders-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'topup_orders'
        },
        (payload) => {
          console.log('[Realtime] Order change:', payload);
          setLastUpdate(new Date());

          if (payload.eventType === 'INSERT') {
            const newOrder = payload.new as OrderStatus;
            setOrders(prev => [newOrder, ...prev.slice(0, 9)]);
          } else if (payload.eventType === 'UPDATE') {
            const updatedOrder = payload.new as OrderStatus;
            setOrders(prev => 
              prev.map(order => 
                order.id === updatedOrder.id ? updatedOrder : order
              )
            );
          } else if (payload.eventType === 'DELETE') {
            const deletedId = (payload.old as { id: string }).id;
            setOrders(prev => prev.filter(order => order.id !== deletedId));
          }
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'processing':
        return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'paid':
        return <Zap className="w-4 h-4 text-yellow-500" />;
      default:
        return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { className: string; label: string }> = {
      completed: { className: 'bg-green-500/20 text-green-500 border-green-500/30', label: 'Completed' },
      failed: { className: 'bg-red-500/20 text-red-500 border-red-500/30', label: 'Failed' },
      processing: { className: 'bg-blue-500/20 text-blue-500 border-blue-500/30', label: 'Processing' },
      paid: { className: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30', label: 'Paid' },
      pending: { className: 'bg-muted text-muted-foreground border-border', label: 'Pending' }
    };

    const variant = variants[status] || variants.pending;
    return (
      <Badge variant="outline" className={variant.className}>
        {variant.label}
      </Badge>
    );
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const statusCounts = orders.reduce((acc, order) => {
    acc[order.status] = (acc[order.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <Card className="border-gold/30">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="w-5 h-5 text-gold" />
            Real-time Order Status
          </CardTitle>
          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-1.5 text-xs ${isConnected ? 'text-green-500' : 'text-muted-foreground'}`}>
              <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-muted-foreground'}`} />
              {isConnected ? 'Live' : 'Connecting...'}
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={fetchRecentOrders}>
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
        
        {/* Status summary */}
        <div className="flex flex-wrap gap-2 mt-3">
          {statusCounts.pending !== undefined && (
            <div className="flex items-center gap-1 text-xs bg-muted/50 px-2 py-1 rounded">
              <Clock className="w-3 h-3" />
              <span>{statusCounts.pending || 0} Pending</span>
            </div>
          )}
          {statusCounts.paid !== undefined && (
            <div className="flex items-center gap-1 text-xs bg-yellow-500/10 text-yellow-500 px-2 py-1 rounded">
              <Zap className="w-3 h-3" />
              <span>{statusCounts.paid || 0} Paid</span>
            </div>
          )}
          {statusCounts.processing !== undefined && (
            <div className="flex items-center gap-1 text-xs bg-blue-500/10 text-blue-500 px-2 py-1 rounded">
              <Loader2 className="w-3 h-3" />
              <span>{statusCounts.processing || 0} Processing</span>
            </div>
          )}
          {statusCounts.completed !== undefined && (
            <div className="flex items-center gap-1 text-xs bg-green-500/10 text-green-500 px-2 py-1 rounded">
              <CheckCircle2 className="w-3 h-3" />
              <span>{statusCounts.completed || 0} Completed</span>
            </div>
          )}
          {statusCounts.failed !== undefined && (
            <div className="flex items-center gap-1 text-xs bg-red-500/10 text-red-500 px-2 py-1 rounded">
              <XCircle className="w-3 h-3" />
              <span>{statusCounts.failed || 0} Failed</span>
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <ScrollArea className="h-[280px] pr-3">
          {orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <Activity className="w-8 h-8 mb-2 opacity-50" />
              <p className="text-sm">No recent orders</p>
            </div>
          ) : (
            <div className="space-y-2">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border/50 hover:border-gold/30 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {getStatusIcon(order.status)}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">
                          {order.game_name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          #{order.id.slice(0, 8)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{order.package_name}</span>
                        <span>•</span>
                        <span>ID: {order.player_id}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <div className="font-medium text-sm">
                        ${order.amount.toFixed(2)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatTime(order.updated_at)}
                      </div>
                    </div>
                    {getStatusBadge(order.status)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
        
        {lastUpdate && (
          <div className="text-xs text-muted-foreground text-center mt-3 pt-3 border-t border-border/50">
            Last updated: {lastUpdate.toLocaleTimeString()}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RealtimeOrderStatusWidget;
