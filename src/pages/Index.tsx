import React from 'react';
import { Helmet } from 'react-helmet-async';
import Header from '@/components/Header';
import HeroBanner from '@/components/HeroBanner';
import GameCard from '@/components/GameCard';
import Footer from '@/components/Footer';
import { useSite } from '@/contexts/SiteContext';
import { useFavicon } from '@/hooks/useFavicon';
import { Loader2 } from 'lucide-react';

const Index: React.FC = () => {
  const { settings, games, isLoading } = useSite();
  
  // Update favicon dynamically
  useFavicon(settings.siteIcon);

  return (
    <>
      <Helmet>
        <title>{settings.browserTitle || `${settings.siteName} - Game Topup Cambodia`}</title>
        <meta name="description" content="Top up your favorite games instantly. Mobile Legends, Free Fire, PUBG, and more. Fast, secure, and affordable." />
      </Helmet>
      
      <div 
        className="min-h-screen flex flex-col"
        style={{
          backgroundImage: settings.backgroundImage ? `url(${settings.backgroundImage})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed'
        }}
      >
        {settings.backgroundImage && (
          <div className="fixed inset-0 bg-background/80 -z-10" />
        )}
        <Header />
        
        <HeroBanner 
          bannerImage={settings.bannerImage} 
          bannerImages={settings.bannerImages}
          bannerHeight={settings.bannerHeight} 
        />
        
        {/* Games Section */}
        <section className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 flex-1">
          {/* Section Title */}
          <div className="text-center mb-4 sm:mb-8">
            <h2 className="font-khmer text-lg sm:text-2xl md:text-3xl font-bold text-foreground mb-2">
              {settings.heroText}
            </h2>
            <div className="w-32 sm:w-48 h-1 mx-auto bg-gradient-to-r from-transparent via-gold to-transparent" />
          </div>
          
          {/* Games Grid */}
          {isLoading ? (
            <div className="flex justify-center py-8 sm:py-12">
              <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 animate-spin text-gold" />
            </div>
          ) : games.length === 0 ? (
            <div className="text-center py-8 sm:py-12 text-muted-foreground text-sm sm:text-base">
              No games available yet. Add games from the admin panel.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6 max-w-5xl mx-auto">
              {games.map((game) => (
                <GameCard 
                  key={game.id} 
                  game={game}
                  cardBgColor={settings.gameCardBgColor}
                  cardBorderColor={settings.gameCardBorderColor}
                  cardFrameImage={settings.gameCardFrameImage}
                  cardBorderImage={settings.gameCardBorderImage}
                />
              ))}
            </div>
          )}
        </section>
        
        {/* Footer */}
        <Footer 
          backgroundColor={settings.footerBgColor}
          textColor={settings.footerTextColor}
          copyrightText={settings.footerText}
          socialIcons={{
            telegram: settings.footerTelegramIcon,
            tiktok: settings.footerTiktokIcon,
            facebook: settings.footerFacebookIcon
          }}
          socialUrls={{
            telegram: settings.footerTelegramUrl,
            tiktok: settings.footerTiktokUrl,
            facebook: settings.footerFacebookUrl
          }}
          paymentIcons={settings.footerPaymentIcons}
          paymentIconSize={settings.footerPaymentIconSize}
        />
      </div>
    </>
  );
};

export default Index;
