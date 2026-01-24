import React, { useEffect, useState, useCallback } from 'react';
import KhmerFrame from './KhmerFrame';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from '@/components/ui/carousel';
import Autoplay from 'embla-carousel-autoplay';

interface HeroBannerProps {
  bannerImage?: string;
  bannerImages?: string[];
  bannerHeight?: number;
  autoplayDelay?: number;
}

const HeroBanner: React.FC<HeroBannerProps> = ({ 
  bannerImage, 
  bannerImages = [],
  bannerHeight = 256,
  autoplayDelay = 4000
}) => {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);

  // Combine single bannerImage with bannerImages array for backwards compatibility
  const allImages = React.useMemo(() => {
    const images: string[] = [];
    if (bannerImages && bannerImages.length > 0) {
      images.push(...bannerImages);
    } else if (bannerImage) {
      images.push(bannerImage);
    }
    return images;
  }, [bannerImage, bannerImages]);

  useEffect(() => {
    if (!api) return;

    setCurrent(api.selectedScrollSnap());

    api.on('select', () => {
      setCurrent(api.selectedScrollSnap());
    });
  }, [api]);

  const hasImages = allImages.length > 0;
  const hasMultipleImages = allImages.length > 1;

  return (
    <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
      <KhmerFrame variant="hero" className="max-w-4xl mx-auto">
        <div 
          className="relative overflow-hidden"
          style={{
            height: `${Math.min(bannerHeight, window.innerWidth < 640 ? 180 : bannerHeight)}px`,
          }}
        >
          {hasImages ? (
            <Carousel
              setApi={setApi}
              opts={{
                loop: true,
                align: 'start',
              }}
              plugins={hasMultipleImages ? [
                Autoplay({
                  delay: autoplayDelay,
                  stopOnInteraction: false,
                  stopOnMouseEnter: true,
                }),
              ] : []}
              className="w-full h-full"
            >
              <CarouselContent className="h-full -ml-0">
                {allImages.map((image, index) => (
                  <CarouselItem key={index} className="h-full pl-0">
                    <div 
                      className="w-full h-full"
                      style={{
                        backgroundImage: `url(${image})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        height: `${Math.min(bannerHeight, window.innerWidth < 640 ? 180 : bannerHeight)}px`,
                      }}
                    />
                  </CarouselItem>
                ))}
              </CarouselContent>

              {/* Dots indicator */}
              {hasMultipleImages && (
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                  {allImages.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => api?.scrollTo(index)}
                      className={`w-2 h-2 rounded-full transition-all ${
                        current === index 
                          ? 'bg-gold w-4' 
                          : 'bg-white/50 hover:bg-white/80'
                      }`}
                      aria-label={`Go to slide ${index + 1}`}
                    />
                  ))}
                </div>
              )}
            </Carousel>
          ) : (
            <>
              {/* Background pattern (only show when no image) */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute inset-0" style={{
                  backgroundImage: `repeating-linear-gradient(
                    45deg,
                    hsl(43 74% 49%) 0px,
                    hsl(43 74% 49%) 1px,
                    transparent 1px,
                    transparent 15px
                  )`
                }} />
              </div>
              
              {/* Animated sparkles - smaller on mobile */}
              <div className="absolute top-2 sm:top-4 left-4 sm:left-8 w-1.5 sm:w-2 h-1.5 sm:h-2 bg-gold rounded-full animate-pulse" />
              <div className="absolute top-6 sm:top-12 right-6 sm:right-12 w-2 sm:w-3 h-2 sm:h-3 bg-gold-light rounded-full animate-pulse delay-300" />
              <div className="absolute bottom-4 sm:bottom-8 left-8 sm:left-16 w-1.5 sm:w-2 h-1.5 sm:h-2 bg-gold rounded-full animate-pulse delay-700" />
            </>
          )}
        </div>
      </KhmerFrame>
    </div>
  );
};

export default HeroBanner;