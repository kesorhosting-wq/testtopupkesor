import React from 'react';
import { cn } from '@/lib/utils';
import { useSite } from '@/contexts/SiteContext';

interface KhmerFrameProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'gold' | 'hero';
}

const KhmerFrame: React.FC<KhmerFrameProps> = ({ children, className, variant = 'default' }) => {
  const { settings } = useSite();
  const frameColor = settings.frameColor || '#D4A84B';
  const borderWidth = settings.frameBorderWidth || 4;

  return (
    <div className={cn(
      "relative p-1",
      className
    )}>
      {/* Corner ornaments */}
      <div 
        className="absolute -top-2 -left-2 w-8 h-8 rounded-tl-lg"
        style={{ 
          borderLeft: `${borderWidth}px solid ${frameColor}`,
          borderTop: `${borderWidth}px solid ${frameColor}`
        }}
      />
      <div 
        className="absolute -top-2 -right-2 w-8 h-8 rounded-tr-lg"
        style={{ 
          borderRight: `${borderWidth}px solid ${frameColor}`,
          borderTop: `${borderWidth}px solid ${frameColor}`
        }}
      />
      <div 
        className="absolute -bottom-2 -left-2 w-8 h-8 rounded-bl-lg"
        style={{ 
          borderLeft: `${borderWidth}px solid ${frameColor}`,
          borderBottom: `${borderWidth}px solid ${frameColor}`
        }}
      />
      <div 
        className="absolute -bottom-2 -right-2 w-8 h-8 rounded-br-lg"
        style={{ 
          borderRight: `${borderWidth}px solid ${frameColor}`,
          borderBottom: `${borderWidth}px solid ${frameColor}`
        }}
      />
      
      {/* Inner content */}
      <div 
        className={cn(
          "relative rounded-lg overflow-hidden",
          variant === 'gold' && "bg-gradient-to-br from-gold/20 to-gold/5",
          variant === 'hero' && "bg-gradient-to-b from-gold/30 to-cream-dark"
        )}
        style={{ 
          border: `2px solid ${frameColor}60`
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default KhmerFrame;
