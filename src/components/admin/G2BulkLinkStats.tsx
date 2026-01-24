import React, { useMemo } from 'react';
import { AlertTriangle, Link, Unlink } from 'lucide-react';
import { Game } from '@/contexts/SiteContext';
import { cn } from '@/lib/utils';

interface G2BulkLinkStatsProps {
  game: Game;
  productStatuses?: Map<string, { isActive: boolean; productName: string }>;
  compact?: boolean;
}

const G2BulkLinkStats: React.FC<G2BulkLinkStatsProps> = ({ 
  game, 
  productStatuses,
  compact = false 
}) => {
  const stats = useMemo(() => {
    const allPackages = [...game.packages, ...game.specialPackages];
    const total = allPackages.length;
    const linked = allPackages.filter(p => p.g2bulkProductId).length;
    const unlinked = total - linked;
    const percentage = total > 0 ? Math.round((linked / total) * 100) : 0;
    
    // Check for inactive/unavailable products
    const unavailable = allPackages.filter(p => {
      if (!p.g2bulkProductId || !productStatuses) return false;
      const status = productStatuses.get(p.g2bulkProductId);
      return status && !status.isActive;
    }).length;

    return { total, linked, unlinked, percentage, unavailable };
  }, [game, productStatuses]);

  if (stats.total === 0) {
    return (
      <span className="text-xs text-muted-foreground">No packages</span>
    );
  }

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        {/* Percentage bar */}
        <div className="flex items-center gap-1.5">
          <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
            <div 
              className={cn(
                "h-full rounded-full transition-all duration-300",
                stats.percentage === 100 ? "bg-green-500" :
                stats.percentage >= 50 ? "bg-gold" : "bg-orange-500"
              )}
              style={{ width: `${stats.percentage}%` }}
            />
          </div>
          <span className={cn(
            "text-xs font-medium min-w-[32px]",
            stats.percentage === 100 ? "text-green-500" :
            stats.percentage >= 50 ? "text-gold" : "text-orange-500"
          )}>
            {stats.percentage}%
          </span>
        </div>
        
        {/* Unavailable warning */}
        {stats.unavailable > 0 && (
          <span className="flex items-center gap-0.5 text-xs text-destructive">
            <AlertTriangle className="w-3 h-3" />
            {stats.unavailable}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 text-xs">
      {/* Link stats */}
      <div className="flex items-center gap-1.5">
        <div className="flex items-center gap-1 text-green-600">
          <Link className="w-3 h-3" />
          <span>{stats.linked}</span>
        </div>
        <span className="text-muted-foreground">/</span>
        <div className="flex items-center gap-1 text-muted-foreground">
          <Unlink className="w-3 h-3" />
          <span>{stats.unlinked}</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="flex items-center gap-1.5 flex-1 max-w-[100px]">
        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className={cn(
              "h-full rounded-full transition-all duration-300",
              stats.percentage === 100 ? "bg-green-500" :
              stats.percentage >= 50 ? "bg-gold" : "bg-orange-500"
            )}
            style={{ width: `${stats.percentage}%` }}
          />
        </div>
        <span className={cn(
          "font-semibold min-w-[36px] text-right",
          stats.percentage === 100 ? "text-green-500" :
          stats.percentage >= 50 ? "text-gold" : "text-orange-500"
        )}>
          {stats.percentage}%
        </span>
      </div>

      {/* Unavailable warning */}
      {stats.unavailable > 0 && (
        <div className="flex items-center gap-1 px-1.5 py-0.5 bg-destructive/10 text-destructive rounded">
          <AlertTriangle className="w-3 h-3" />
          <span>{stats.unavailable} unavailable</span>
        </div>
      )}
    </div>
  );
};

export default G2BulkLinkStats;
