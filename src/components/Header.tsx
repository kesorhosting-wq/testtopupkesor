import React from 'react';
import { Link } from 'react-router-dom';
import { Settings, Receipt, ShoppingCart, User, Menu, LogOut, Home } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { useSite } from '@/contexts/SiteContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const Header: React.FC = () => {
  const isMobile = useIsMobile();
  const { settings } = useSite();
  const { user, isAdmin, signOut } = useAuth();
  const { items } = useCart();

  const cartItemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  const handleSignOut = async () => {
    await signOut();
    toast({ title: 'Signed out successfully' });
  };

  const headerHeight = isMobile 
    ? (settings.headerHeightMobile || 56) 
    : (settings.headerHeightDesktop || 96);

  return (
    <header 
      className="relative px-3 sm:px-4 flex items-center"
      style={{
        height: `${headerHeight}px`,
        backgroundImage: settings.headerImage ? `url(${settings.headerImage})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    >
      {/* Background overlay for readability when image is present */}
      {settings.headerImage && (
        <div className="absolute inset-0 bg-background/70" />
      )}
      {/* Decorative top border */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-gold to-transparent z-10" />
      
      <div className="container mx-auto flex items-center justify-between relative z-10">
        {/* Left section - ornament on desktop */}
        <div className="hidden md:block w-20 h-12">
          <svg viewBox="0 0 80 48" className="w-full h-full text-gold fill-current">
            <path d="M0 24c0-8 5-16 15-20s25-2 35 4c-10-2-25 2-30 8s-8 12-5 18c-10-2-15-6-15-10z" opacity="0.8"/>
            <path d="M20 20c5-8 20-12 35-8s25 12 25 20c-5-8-20-12-35-12s-25 4-25 0z" opacity="0.6"/>
          </svg>
        </div>

        {/* Logo - absolutely centered on both mobile and desktop */}
        <Link 
          to="/" 
          className="flex flex-col items-center group absolute left-1/2 -translate-x-1/2 z-20"
          style={{
            left: isMobile ? `${settings.logoMobilePosition}%` : '50%',
          }}
        >
          {/* Mobile logo */}
          <div className="md:hidden">
            {settings.logoUrl ? (
              <img 
                src={settings.logoUrl} 
                alt={settings.siteName}
                style={{ height: `${settings.logoSize || 64}px` }}
                className="object-contain transition-transform duration-300 group-hover:scale-105"
              />
            ) : (
              <h1 className="font-display text-xl sm:text-3xl font-bold tracking-wider gold-text drop-shadow-lg transition-transform duration-300 group-hover:scale-105">
                {settings.siteName}
              </h1>
            )}
            <div className="mt-1 w-24 sm:w-32 h-0.5 bg-gradient-to-r from-transparent via-gold to-transparent" />
          </div>
          {/* Desktop logo */}
          <div className="hidden md:flex flex-col items-center">
            {settings.logoUrl ? (
              <img 
                src={settings.logoUrl} 
                alt={settings.siteName}
                style={{ height: `${settings.logoSize || 64}px` }}
                className="object-contain transition-transform duration-300 group-hover:scale-105"
              />
            ) : (
              <h1 className="font-display text-3xl md:text-4xl font-bold tracking-wider gold-text drop-shadow-lg transition-transform duration-300 group-hover:scale-105">
                {settings.siteName}
              </h1>
            )}
            <div className="mt-1 w-32 h-0.5 bg-gradient-to-r from-transparent via-gold to-transparent" />
          </div>
        </Link>

        {/* Right section - Navigation */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Desktop ornament */}
          <div className="hidden md:block w-20 h-12 transform scale-x-[-1]">
            <svg viewBox="0 0 80 48" className="w-full h-full text-gold fill-current">
              <path d="M0 24c0-8 5-16 15-20s25-2 35 4c-10-2-25 2-30 8s-8 12-5 18c-10-2-15-6-15-10z" opacity="0.8"/>
              <path d="M20 20c5-8 20-12 35-8s25 12 25 20c-5-8-20-12-35-12s-25 4-25 0z" opacity="0.6"/>
            </svg>
          </div>
          
          {/* Desktop Navigation */}
          <div className="hidden sm:flex items-center gap-2 sm:gap-3">
            {/* Cart Icon */}
            <Link 
              to="/cart" 
              className="relative p-2 rounded-lg border-2 border-gold/50 bg-card hover:bg-gold/20 transition-colors"
              title="កន្ត្រក"
            >
              <ShoppingCart className="w-5 h-5 text-gold" />
              {cartItemCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-destructive text-destructive-foreground text-xs font-bold rounded-full flex items-center justify-center">
                  {cartItemCount > 9 ? '9+' : cartItemCount}
                </span>
              )}
            </Link>

            {/* Order History - only for logged in users */}
            {user && (
              <Link 
                to="/orders" 
                className="p-2 rounded-lg border-2 border-gold/50 bg-card hover:bg-gold/20 transition-colors"
                title="ប្រវត្តិការបញ្ជាទិញ"
              >
                <Receipt className="w-5 h-5 text-gold" />
              </Link>
            )}

            {/* Admin Panel */}
            {user && isAdmin && (
              <Link 
                to="/admin" 
                className="p-2 rounded-lg border-2 border-gold/50 bg-card hover:bg-gold/20 transition-colors"
                title="Admin Panel"
              >
                <Settings className="w-5 h-5 text-gold" />
              </Link>
            )}

            {/* Login link for non-logged in users */}
            {!user && (
              <Link 
                to="/auth" 
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border-2 border-gold/50 bg-card hover:bg-gold/20 transition-colors"
                title="ចូលគណនី"
              >
                <User className="w-5 h-5 text-gold" />
                <span className="text-sm font-medium text-gold">ចូល</span>
              </Link>
            )}

            {/* Sign out button for logged in users */}
            {user && (
              <button 
                onClick={handleSignOut}
                className="p-2 rounded-lg border-2 border-gold/50 bg-card hover:bg-gold/20 transition-colors"
                title="ចេញ"
              >
                <LogOut className="w-5 h-5 text-gold" />
              </button>
            )}
          </div>

          {/* Mobile: Cart + Menu */}
          <div className="flex sm:hidden items-center gap-2">
            {/* Cart Icon */}
            <Link 
              to="/cart" 
              className="relative p-2 rounded-lg border-2 border-gold/50 bg-card hover:bg-gold/20 transition-colors"
              title="កន្ត្រក"
            >
              <ShoppingCart className="w-5 h-5 text-gold" />
              {cartItemCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-destructive text-destructive-foreground text-xs font-bold rounded-full flex items-center justify-center">
                  {cartItemCount > 9 ? '9+' : cartItemCount}
                </span>
              )}
            </Link>

            {/* Mobile Menu Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button 
                  className="p-2 rounded-lg border-2 border-gold/50 bg-card hover:bg-gold/20 transition-colors"
                  title="មឺនុយ"
                >
                  <Menu className="w-5 h-5 text-gold" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-card border-gold/30">
                <DropdownMenuItem asChild>
                  <Link to="/" className="flex items-center gap-2 cursor-pointer">
                    <Home className="w-4 h-4" />
                    <span>ទំព័រដើម</span>
                  </Link>
                </DropdownMenuItem>
                
                {user && (
                  <DropdownMenuItem asChild>
                    <Link to="/orders" className="flex items-center gap-2 cursor-pointer">
                      <Receipt className="w-4 h-4" />
                      <span>ប្រវត្តិការបញ្ជាទិញ</span>
                    </Link>
                  </DropdownMenuItem>
                )}
                
                {user && isAdmin && (
                  <DropdownMenuItem asChild>
                    <Link to="/admin" className="flex items-center gap-2 cursor-pointer">
                      <Settings className="w-4 h-4" />
                      <span>Admin Panel</span>
                    </Link>
                  </DropdownMenuItem>
                )}
                
                <DropdownMenuSeparator className="bg-gold/20" />
                
                {!user ? (
                  <DropdownMenuItem asChild>
                    <Link to="/auth" className="flex items-center gap-2 cursor-pointer">
                      <User className="w-4 h-4" />
                      <span>ចូលគណនី</span>
                    </Link>
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem 
                    onClick={handleSignOut}
                    className="flex items-center gap-2 cursor-pointer text-destructive focus:text-destructive"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>ចេញពីគណនី</span>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
      
      {/* Bottom decorative line */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-gold/50 to-transparent z-10" />
    </header>
  );
};

export default Header;