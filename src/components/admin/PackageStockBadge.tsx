import React from 'react';
import { AlertTriangle, Check, Unlink } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface PackageStockBadgeProps {
  g2bulkProductId?: string;
  productStatus?: { isActive: boolean; productName: string };
  className?: string;
}

const PackageStockBadge: React.FC<PackageStockBadgeProps> = ({
  g2bulkProductId,
  productStatus,
  className,
}) => {
  // Not linked to G2Bulk
  if (!g2bulkProductId) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className={cn(
              "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs",
              "bg-muted text-muted-foreground",
              className
            )}>
              <Unlink className="w-3 h-3" />
              <span className="hidden sm:inline">Not linked</span>
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <p>Not linked to G2Bulk product</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Linked but product not found in sync data
  if (!productStatus) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className={cn(
              "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs",
              "bg-orange-500/10 text-orange-500",
              className
            )}>
              <AlertTriangle className="w-3 h-3" />
              <span className="hidden sm:inline">Unknown</span>
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <p>Product not found in G2Bulk sync. Please sync products.</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Product is inactive/unavailable
  if (!productStatus.isActive) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className={cn(
              "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs",
              "bg-destructive/10 text-destructive",
              className
            )}>
              <AlertTriangle className="w-3 h-3" />
              <span className="hidden sm:inline">Unavailable</span>
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <p className="font-medium">Product Unavailable</p>
            <p className="text-xs text-muted-foreground">{productStatus.productName}</p>
            <p className="text-xs mt-1">This G2Bulk product is currently unavailable or out of stock.</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Product is active and available
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn(
            "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs",
            "bg-green-500/10 text-green-600",
            className
          )}>
            <Check className="w-3 h-3" />
            <span className="hidden sm:inline">Linked</span>
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p className="font-medium">G2Bulk Linked</p>
          <p className="text-xs text-muted-foreground">{productStatus.productName}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default PackageStockBadge;
