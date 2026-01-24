import React from 'react';
import { useSite } from '@/contexts/SiteContext';

interface FooterProps {
  backgroundColor?: string;
  textColor?: string;
  copyrightText?: string;
  socialIcons?: { telegram?: string; tiktok?: string; facebook?: string };
  socialUrls?: { telegram?: string; tiktok?: string; facebook?: string };
  paymentIcons?: string[];
  paymentIconSize?: number;
}

const Footer: React.FC<FooterProps> = ({
  backgroundColor,
  textColor,
  copyrightText,
  socialIcons,
  socialUrls,
  paymentIcons,
  paymentIconSize = 32
}) => {
  const { settings, games } = useSite();
  
  return (
    <footer className="mt-auto">
      {/* Main Footer */}
      <div 
        className="py-6 sm:py-10"
        style={{ 
          backgroundColor: backgroundColor || 'hsl(var(--muted))',
          color: textColor || 'hsl(var(--muted-foreground))'
        }}
      >
        <div className="container mx-auto px-3 sm:px-4">
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4 sm:gap-8">
            {/* Brand Section */}
            <div className="col-span-2 sm:col-span-1 space-y-2 sm:space-y-3">
              <div className="flex items-center gap-2">
                {(settings.footerLogoUrl || settings.logoUrl) && (
                  <img 
                    src={settings.footerLogoUrl || settings.logoUrl} 
                    alt="Logo" 
                    style={{ height: `${settings.footerLogoSize || 32}px` }}
                    className="w-auto object-contain" 
                  />
                )}
                <h3 className="font-bold text-sm sm:text-lg uppercase tracking-wide" style={{ color: textColor }}>
                  {settings.siteName}
                </h3>
              </div>
              <p className="text-xs sm:text-sm opacity-80" style={{ color: textColor }}>
                High-quality products with unique designs.
              </p>
            </div>

            {/* Products Section */}
            <div className="space-y-2 sm:space-y-3">
              <h4 className="font-bold uppercase tracking-wide text-xs sm:text-sm" style={{ color: textColor }}>
                Products
              </h4>
              <ul className="space-y-1 sm:space-y-2">
                {games.slice(0, 5).map(game => (
                  <li key={game.id}>
                    <span className="text-xs sm:text-sm opacity-80 hover:opacity-100 cursor-pointer uppercase" style={{ color: textColor }}>
                      {game.name}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Company Section */}
            <div className="space-y-2 sm:space-y-3">
              <h4 className="font-bold uppercase tracking-wide text-xs sm:text-sm" style={{ color: textColor }}>
                Company
              </h4>
              <ul className="space-y-1 sm:space-y-2">
                <li>
                  <span className="text-xs sm:text-sm opacity-80 hover:opacity-100 cursor-pointer uppercase" style={{ color: textColor }}>
                    About Us
                  </span>
                </li>
              </ul>
            </div>

            {/* Follow Us Section */}
            <div className="space-y-2 sm:space-y-3">
              <h4 className="font-bold uppercase tracking-wide text-xs sm:text-sm" style={{ color: textColor }}>
                Follow Us
              </h4>
              <div className="flex gap-2 sm:gap-3">
                {socialIcons?.telegram && (
                  <a 
                    href={socialUrls?.telegram || '#'} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="w-8 h-8 sm:w-10 sm:h-10 rounded-full overflow-hidden flex items-center justify-center bg-white/10 hover:bg-white/20 transition-colors"
                  >
                    <img src={socialIcons.telegram} alt="Telegram" className="w-full h-full object-cover" />
                  </a>
                )}
                {socialIcons?.tiktok && (
                  <a 
                    href={socialUrls?.tiktok || '#'} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="w-8 h-8 sm:w-10 sm:h-10 rounded-full overflow-hidden flex items-center justify-center bg-white/10 hover:bg-white/20 transition-colors"
                  >
                    <img src={socialIcons.tiktok} alt="TikTok" className="w-full h-full object-cover" />
                  </a>
                )}
                {socialIcons?.facebook && (
                  <a 
                    href={socialUrls?.facebook || '#'} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="w-8 h-8 sm:w-10 sm:h-10 rounded-full overflow-hidden flex items-center justify-center bg-white/10 hover:bg-white/20 transition-colors"
                  >
                    <img src={socialIcons.facebook} alt="Facebook" className="w-full h-full object-cover" />
                  </a>
                )}
                {!socialIcons?.telegram && !socialIcons?.tiktok && !socialIcons?.facebook && (
                  <p className="text-xs sm:text-sm opacity-60" style={{ color: textColor }}>No social icons set</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Copyright Bar */}
      <div 
        className="py-3 sm:py-4 border-t"
        style={{ 
          backgroundColor: backgroundColor ? `color-mix(in srgb, ${backgroundColor} 80%, black)` : 'hsl(var(--muted))',
          borderColor: textColor ? `${textColor}20` : 'hsl(var(--border))'
        }}
      >
        <div className="container mx-auto px-3 sm:px-4 text-center">
          <p className="text-xs sm:text-sm" style={{ color: textColor }}>
            {copyrightText || `© ${new Date().getFullYear()} ${settings.siteName}. Account and Accessories.`}
          </p>
          <div className="mt-2 sm:mt-3 flex items-center justify-center gap-2 sm:gap-3 flex-wrap">
            <p className="text-[10px] sm:text-xs uppercase tracking-wide" style={{ color: textColor }}>
              Accept Payment
            </p>
            {paymentIcons && paymentIcons.length > 0 && paymentIcons.map((icon, index) => (
              <img 
                key={index} 
                src={icon} 
                alt={`Payment method ${index + 1}`} 
                style={{ height: `${Math.min(paymentIconSize, window.innerWidth < 640 ? 24 : paymentIconSize)}px` }}
                className="w-auto object-contain"
              />
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
