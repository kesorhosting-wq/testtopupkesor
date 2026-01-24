import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { 
  RefreshCw, 
  TrendingUp, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Activity,
  Calendar,
  Zap
} from 'lucide-react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';

interface DailyStats {
  date: string;
  completed: number;
  failed: number;
  pending: number;
  processing: number;
  total: number;
}

interface ProcessingStats {
  avgProcessingTimeMinutes: number;
  fastestOrderMinutes: number;
  slowestOrderMinutes: number;
  ordersWithG2Bulk: number;
}

const G2BulkStatsDashboard: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [todayStats, setTodayStats] = useState<DailyStats | null>(null);
  const [weekStats, setWeekStats] = useState<DailyStats | null>(null);
  const [processingStats, setProcessingStats] = useState<ProcessingStats | null>(null);

  const loadStats = useCallback(async () => {
    setIsLoading(true);
    try {
      const now = new Date();
      const sevenDaysAgo = subDays(now, 7);

      // Fetch orders from last 7 days
      const { data: orders, error } = await supabase
        .from('topup_orders')
        .select('id, status, created_at, updated_at, g2bulk_order_id')
        .gte('created_at', sevenDaysAgo.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Calculate daily stats
      const dailyMap = new Map<string, DailyStats>();
      
      // Initialize last 7 days
      for (let i = 0; i < 7; i++) {
        const date = format(subDays(now, i), 'yyyy-MM-dd');
        dailyMap.set(date, {
          date,
          completed: 0,
          failed: 0,
          pending: 0,
          processing: 0,
          total: 0
        });
      }

      // Count orders by day and status
      orders?.forEach(order => {
        const date = format(new Date(order.created_at), 'yyyy-MM-dd');
        const stats = dailyMap.get(date);
        if (stats) {
          stats.total++;
          switch (order.status) {
            case 'completed':
              stats.completed++;
              break;
            case 'failed':
              stats.failed++;
              break;
            case 'processing':
              stats.processing++;
              break;
            default:
              stats.pending++;
          }
        }
      });

      const dailyArray = Array.from(dailyMap.values()).reverse();
      setDailyStats(dailyArray);

      // Today's stats
      const todayDate = format(now, 'yyyy-MM-dd');
      setTodayStats(dailyMap.get(todayDate) || null);

      // Week totals
      const weekTotals: DailyStats = {
        date: 'week',
        completed: 0,
        failed: 0,
        pending: 0,
        processing: 0,
        total: 0
      };
      dailyArray.forEach(day => {
        weekTotals.completed += day.completed;
        weekTotals.failed += day.failed;
        weekTotals.pending += day.pending;
        weekTotals.processing += day.processing;
        weekTotals.total += day.total;
      });
      setWeekStats(weekTotals);

      // Calculate processing times for completed orders with G2Bulk
      const completedWithG2Bulk = orders?.filter(
        o => o.status === 'completed' && o.g2bulk_order_id
      ) || [];

      if (completedWithG2Bulk.length > 0) {
        const processingTimes = completedWithG2Bulk.map(o => {
          const created = new Date(o.created_at).getTime();
          const updated = new Date(o.updated_at).getTime();
          return (updated - created) / 1000 / 60; // minutes
        });

        const avgTime = processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length;
        const minTime = Math.min(...processingTimes);
        const maxTime = Math.max(...processingTimes);

        setProcessingStats({
          avgProcessingTimeMinutes: Math.round(avgTime * 10) / 10,
          fastestOrderMinutes: Math.round(minTime * 10) / 10,
          slowestOrderMinutes: Math.round(maxTime * 10) / 10,
          ordersWithG2Bulk: completedWithG2Bulk.length
        });
      } else {
        setProcessingStats(null);
      }

    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const formatTime = (minutes: number) => {
    if (minutes < 1) return `${Math.round(minutes * 60)}s`;
    if (minutes < 60) return `${Math.round(minutes)}m`;
    return `${Math.round(minutes / 60 * 10) / 10}h`;
  };

  const successRate = weekStats && weekStats.total > 0
    ? Math.round((weekStats.completed / weekStats.total) * 100)
    : 0;

  if (isLoading) {
    return (
      <Card className="border-gold/30">
        <CardContent className="p-8 text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-gold" />
          <p className="mt-4 text-muted-foreground">Loading statistics...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Activity className="w-5 h-5 text-gold" />
          G2Bulk Order Statistics
        </h3>
        <Button variant="outline" size="sm" onClick={loadStats} disabled={isLoading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Today's Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-gold/30 bg-gradient-to-br from-gold/5 to-transparent">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Today's Orders</p>
                <p className="text-2xl font-bold">{todayStats?.total || 0}</p>
              </div>
              <Calendar className="w-8 h-8 text-gold opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-500/30 bg-gradient-to-br from-green-500/5 to-transparent">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completed Today</p>
                <p className="text-2xl font-bold text-green-500">{todayStats?.completed || 0}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-red-500/30 bg-gradient-to-br from-red-500/5 to-transparent">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Failed Today</p>
                <p className="text-2xl font-bold text-red-500">{todayStats?.failed || 0}</p>
              </div>
              <XCircle className="w-8 h-8 text-red-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-500/30 bg-gradient-to-br from-blue-500/5 to-transparent">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Processing</p>
                <p className="text-2xl font-bold text-blue-500">
                  {(todayStats?.processing || 0) + (todayStats?.pending || 0)}
                </p>
              </div>
              <Clock className="w-8 h-8 text-blue-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Stats & Processing Time */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Weekly Summary */}
        <Card className="border-gold/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-gold" />
              7-Day Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Total Orders</span>
                <span className="font-bold">{weekStats?.total || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Completed</span>
                <span className="font-bold text-green-500">{weekStats?.completed || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Failed</span>
                <span className="font-bold text-red-500">{weekStats?.failed || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Success Rate</span>
                <span className={`font-bold ${successRate >= 80 ? 'text-green-500' : successRate >= 50 ? 'text-yellow-500' : 'text-red-500'}`}>
                  {successRate}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Processing Time Stats */}
        <Card className="border-gold/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Zap className="w-4 h-4 text-gold" />
              G2Bulk Processing Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            {processingStats ? (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Average Time</span>
                  <span className="font-bold">{formatTime(processingStats.avgProcessingTimeMinutes)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Fastest</span>
                  <span className="font-bold text-green-500">{formatTime(processingStats.fastestOrderMinutes)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Slowest</span>
                  <span className="font-bold text-yellow-500">{formatTime(processingStats.slowestOrderMinutes)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">G2Bulk Orders</span>
                  <span className="font-bold">{processingStats.ordersWithG2Bulk}</span>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm py-4 text-center">
                No completed G2Bulk orders in the last 7 days
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Daily Chart */}
      <Card className="border-gold/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Daily Orders (Last 7 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-2 h-32">
            {dailyStats.map((day, index) => {
              const maxTotal = Math.max(...dailyStats.map(d => d.total), 1);
              const height = day.total > 0 ? (day.total / maxTotal) * 100 : 5;
              const isToday = index === dailyStats.length - 1;
              
              return (
                <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex flex-col items-center justify-end h-24">
                    <span className="text-xs text-muted-foreground mb-1">{day.total}</span>
                    <div 
                      className={`w-full rounded-t transition-all ${isToday ? 'bg-gold' : 'bg-gold/50'}`}
                      style={{ height: `${height}%`, minHeight: '4px' }}
                    >
                      {day.completed > 0 && (
                        <div 
                          className="w-full bg-green-500 rounded-t"
                          style={{ height: `${(day.completed / day.total) * 100}%` }}
                        />
                      )}
                    </div>
                  </div>
                  <span className={`text-xs ${isToday ? 'font-bold text-gold' : 'text-muted-foreground'}`}>
                    {format(new Date(day.date), 'EEE')}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="flex justify-center gap-4 mt-4 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-green-500 rounded" />
              <span className="text-muted-foreground">Completed</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-gold/50 rounded" />
              <span className="text-muted-foreground">Other</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default G2BulkStatsDashboard;
