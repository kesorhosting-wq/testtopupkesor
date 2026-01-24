import React from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Game } from '@/contexts/SiteContext';

interface GameCardProps {
  game: Game;
  cardBgColor?: string;
  cardBorderColor?: string;
  cardFrameImage?: string;
  cardBorderImage?: string;
}

const GameCard: React.FC<GameCardProps> = ({ game, cardBgColor, cardBorderColor, cardFrameImage, cardBorderImage }) => {
  const frameColor = cardBorderColor || 'hsl(43 74% 49%)';
  const bgColor = cardBgColor || 'hsl(43 74% 70% / 0.3)';
  
  return (
    <Link to={`/topup/${game.id}`} className="group block">
      <div className="relative p-2 sm:p-4">
        {/* Animated glow effect (runs only on hover to avoid jank) */}
        <div
          className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-sm pointer-events-none will-change-transform will-change-opacity group-hover:animate-pulse-glow"
          style={{
            background: `linear-gradient(135deg, ${frameColor}, hsl(43 74% 60%))`,
          }}
        />
        
        {/* Outer frame */}
        <div 
          className="absolute inset-0 rounded-lg transition-all duration-300"
          style={{
            background: `linear-gradient(135deg, ${frameColor}, hsl(43 74% 35%))`,
            padding: '2px',
          }}
        >
          <div 
            className="w-full h-full rounded-lg"
            style={{ backgroundColor: bgColor }}
          />
        </div>
        
        {/* Inner frame border */}
        <div 
          className="absolute rounded-md transition-all duration-300"
          style={{
            inset: '6px',
            border: `1.5px solid ${frameColor}`,
            boxShadow: `inset 0 0 8px hsl(43 74% 49% / 0.3)`,
          }}
        />
        
        {/* Corner accents - top left */}
        <div 
          className="absolute w-2 h-2 sm:w-3 sm:h-3 transition-all duration-300 group-hover:w-3 group-hover:h-3 sm:group-hover:w-4 sm:group-hover:h-4"
          style={{
            top: '3px',
            left: '3px',
            backgroundColor: frameColor,
            borderRadius: '1px',
          }}
        />
        {/* Corner accents - top right */}
        <div 
          className="absolute w-2 h-2 sm:w-3 sm:h-3 transition-all duration-300 group-hover:w-3 group-hover:h-3 sm:group-hover:w-4 sm:group-hover:h-4"
          style={{
            top: '3px',
            right: '3px',
            backgroundColor: frameColor,
            borderRadius: '1px',
          }}
        />
        {/* Corner accents - bottom left */}
        <div 
          className="absolute w-2 h-2 sm:w-3 sm:h-3 transition-all duration-300 group-hover:w-3 group-hover:h-3 sm:group-hover:w-4 sm:group-hover:h-4"
          style={{
            bottom: '3px',
            left: '3px',
            backgroundColor: frameColor,
            borderRadius: '1px',
          }}
        />
        {/* Corner accents - bottom right */}
        <div 
          className="absolute w-2 h-2 sm:w-3 sm:h-3 transition-all duration-300 group-hover:w-3 group-hover:h-3 sm:group-hover:w-4 sm:group-hover:h-4"
          style={{
            bottom: '3px',
            right: '3px',
            backgroundColor: frameColor,
            borderRadius: '1px',
          }}
        />
        
        {/* Card content */}
        <div 
          className="relative overflow-hidden rounded-md mx-1 my-1 sm:mx-2 sm:my-2 transition-all duration-300 group-hover:scale-[1.02]"
          style={{
            boxShadow: `0 4px 20px hsl(43 74% 49% / 0.3)`,
          }}
        >
          {/* Image */}
          <div className="aspect-square overflow-hidden">
            <img 
              src={game.image} 
              alt={game.name}
              loading="lazy"
              decoding="async"
              fetchPriority="low"
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
          </div>
          
          {/* Gold shimmer effect */}
          <div className="absolute inset-0 bg-gradient-to-tr from-gold/0 via-gold/20 to-gold/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
        </div>
      </div>
    </Link>
  );
};

export default GameCard;
