// Site context for global state management
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { handleApiError } from '@/lib/errorHandler';

export interface Game {
  id: string;
  name: string;
  image: string;
  packages: Package[];
  specialPackages: Package[];
  g2bulkCategoryId?: string;
}

export interface Package {
  id: string;
  name: string;
  amount: string;
  price: number;
  currency: string;
  icon?: string;
  label?: string;
  labelBgColor?: string;
  labelTextColor?: string;
  labelIcon?: string;
  g2bulkProductId?: string;
  g2bulkTypeId?: string;
}

export interface PaymentMethod {
  id: string;
  name: string;
  icon: string;
}

export interface IKhodePayment {
  id?: string;
  qrCodeImage?: string;
  bankName?: string;
  accountName?: string;
  accountNumber?: string;
  instructions?: string;
  isEnabled: boolean;
  // IKhode API config (public fields only - secrets handled server-side)
  websocketUrl?: string;
  // Note: webhook_secret removed - never expose secrets to frontend
}

export interface SiteSettings {
  siteName: string;
  logoUrl: string;
  logoSize: number;
  logoMobilePosition: number;
  headerHeightDesktop: number;
  headerHeightMobile: number;
  footerLogoUrl: string;
  footerLogoSize: number;
  heroText: string;
  primaryColor: string;
  accentColor: string;
  backgroundColor: string;
  // Browser settings
  siteIcon: string;
  browserTitle: string;
  // Home Edit settings
  backgroundImage: string;
  headerImage: string;
  bannerImage: string;
  bannerImages: string[];
  bannerHeight: number;
  gameCardBgColor: string;
  gameCardBorderColor: string;
  gameCardFrameImage: string;
  gameCardBorderImage: string;
  footerText: string;
  footerBgColor: string;
  footerTextColor: string;
  footerTelegramIcon: string;
  footerTiktokIcon: string;
  footerFacebookIcon: string;
  footerTelegramUrl: string;
  footerTiktokUrl: string;
  footerFacebookUrl: string;
  footerPaymentIcons: string[];
  footerPaymentIconSize: number;
  // Topup page settings
  topupBackgroundImage: string;
  topupBackgroundColor: string;
  topupBannerImage: string;
  topupBannerColor: string;
  // Package styling settings
  packageBgColor: string;
  packageBgImage: string;
  packageTextColor: string;
  packagePriceColor: string;
  packageIconUrl: string;
  packageCurrency: string;
  packageCurrencySymbol: string;
  packageHeight: number;
  packageIconWidth: number;
  packageIconHeight: number;
  packageIconSizeDesktop: number;
  packageIconSizeMobile: number;
  packageTextSize: number;
  packagePriceSize: number;
  packageTextWeight: number;
  packagePriceWeight: number;
  packageBorderWidth: number;
  packageBorderColor: string;
  // Frame styling settings
  frameColor: string;
  frameBorderWidth: number;
  // ID section settings
  idSectionBgColor: string;
  idSectionBgImage: string;
  idSectionTextColor: string;
  // Payment section settings
  paymentSectionBgColor: string;
  paymentSectionBgImage: string;
  paymentSectionTextColor: string;
}

interface SiteContextType {
  settings: SiteSettings;
  games: Game[];
  paymentMethods: PaymentMethod[];
  ikhodePayment: IKhodePayment | null;
  isLoading: boolean;
  refreshGames: () => Promise<void>;
  updateSettings: (settings: Partial<SiteSettings>) => void;
  addGame: (game: Omit<Game, 'id' | 'packages' | 'specialPackages'>) => Promise<void>;
  updateGame: (id: string, game: Partial<Game>) => Promise<void>;
  deleteGame: (id: string) => Promise<void>;
  moveGame: (id: string, direction: 'up' | 'down') => Promise<void>;
  addPaymentMethod: (method: Omit<PaymentMethod, 'id'>) => void;
  updatePaymentMethod: (id: string, method: Partial<PaymentMethod>) => void;
  deletePaymentMethod: (id: string) => void;
  addPackage: (gameId: string, pkg: Omit<Package, 'id'>) => Promise<void>;
  updatePackage: (gameId: string, packageId: string, pkg: Partial<Package>) => Promise<void>;
  deletePackage: (gameId: string, packageId: string) => Promise<void>;
  movePackage: (gameId: string, packageId: string, direction: 'up' | 'down') => Promise<void>;
  addSpecialPackage: (gameId: string, pkg: Omit<Package, 'id'>) => Promise<void>;
  updateSpecialPackage: (gameId: string, packageId: string, pkg: Partial<Package>) => Promise<void>;
  deleteSpecialPackage: (gameId: string, packageId: string) => Promise<void>;
  moveSpecialPackage: (gameId: string, packageId: string, direction: 'up' | 'down') => Promise<void>;
}

const defaultSettings: SiteSettings = {
  siteName: 'KESOR TOPUP',
  logoUrl: '',
  logoSize: 64,
  logoMobilePosition: 50,
  headerHeightDesktop: 96,
  headerHeightMobile: 56,
  footerLogoUrl: '',
  footerLogoSize: 32,
  heroText: 'ជ្រើសរើសទំនិញ',
  primaryColor: '#D4A84B',
  accentColor: '#8B4513',
  backgroundColor: '#F5F0E6',
  // Browser settings
  siteIcon: '',
  browserTitle: 'KESOR TOPUP - Game Topup Cambodia',
  // Home Edit defaults
  backgroundImage: '',
  headerImage: '',
  bannerImage: '',
  bannerImages: [],
  bannerHeight: 256,
  gameCardBgColor: '',
  gameCardBorderColor: '',
  gameCardFrameImage: '',
  gameCardBorderImage: '',
  footerText: '',
  footerBgColor: '',
  footerTextColor: '',
  footerTelegramIcon: '',
  footerTiktokIcon: '',
  footerFacebookIcon: '',
  footerTelegramUrl: '',
  footerTiktokUrl: '',
  footerFacebookUrl: '',
  footerPaymentIcons: [],
  footerPaymentIconSize: 32,
  // Topup page defaults
  topupBackgroundImage: '',
  topupBackgroundColor: '',
  topupBannerImage: '',
  topupBannerColor: '',
  // Package styling defaults
  packageBgColor: '',
  packageBgImage: '',
  packageTextColor: '',
  packagePriceColor: '',
  packageIconUrl: '',
  packageCurrency: 'USD',
  packageCurrencySymbol: '$',
  packageHeight: 36,
  packageIconWidth: 24,
  packageIconHeight: 24,
  packageIconSizeDesktop: 32,
  packageIconSizeMobile: 50,
  packageTextSize: 14,
  packagePriceSize: 14,
  packageTextWeight: 700,
  packagePriceWeight: 700,
  packageBorderWidth: 0,
  packageBorderColor: '#D4A84B',
  // Frame styling defaults
  frameColor: '#D4A84B',
  frameBorderWidth: 4,
  // ID section defaults
  idSectionBgColor: '',
  idSectionBgImage: '',
  idSectionTextColor: '',
  // Payment section defaults
  paymentSectionBgColor: '',
  paymentSectionBgImage: '',
  paymentSectionTextColor: '',
};

const defaultPaymentMethods: PaymentMethod[] = [
  { id: 'khqr', name: 'KHQR', icon: '📱' },
];

const SiteContext = createContext<SiteContextType | undefined>(undefined);

export const SiteProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<SiteSettings>(defaultSettings);
  const [games, setGames] = useState<Game[]>([]);
  const [paymentMethods] = useState<PaymentMethod[]>(defaultPaymentMethods);
  const [ikhodePayment, setIkhodePayment] = useState<IKhodePayment | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load data from database on mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async (gamesOnly = false) => {
    try {
      // Load all data in parallel for faster loading
      const [settingsResult, gamesResult, packagesResult, specialPackagesResult, ikhodeGatewayResult] = await Promise.all([
        supabase.from('site_settings').select('*'),
        supabase.from('games').select('*').order('sort_order', { ascending: true }),
        supabase.from('packages').select('*').order('sort_order', { ascending: true }),
        supabase.from('special_packages').select('*').order('sort_order', { ascending: true }),
        // Public-safe gateway config via backend function (bypasses RLS on payment_gateways)
        supabase.functions.invoke('get-ikhode-public-config'),
      ]);
      
      const settingsData = settingsResult.data;
      const gamesData = gamesResult.data;
      const packagesData = packagesResult.data;
      const specialPackagesData = specialPackagesResult.data;
      const ikhodeGateway = (ikhodeGatewayResult as any)?.data;

      // Load IKhode payment gateway config (public view only exposes websocket_url, not secrets)
      if (ikhodeGateway?.success && ikhodeGateway?.enabled) {
        setIkhodePayment({
          id: ikhodeGateway.id || undefined,
          isEnabled: true,
          websocketUrl: ikhodeGateway.websocket_url || undefined,
        });
      } else {
        setIkhodePayment({ isEnabled: false });
      }

      if (settingsData && settingsData.length > 0) {
        const loadedSettings: Partial<SiteSettings> = {};
        settingsData.forEach(row => {
          if (row.key === 'siteName') loadedSettings.siteName = row.value as string;
          if (row.key === 'logoUrl') loadedSettings.logoUrl = row.value as string;
          if (row.key === 'logoSize') loadedSettings.logoSize = row.value as number;
          if (row.key === 'logoMobilePosition') loadedSettings.logoMobilePosition = typeof row.value === 'number' ? row.value : 50;
          if (row.key === 'footerLogoUrl') loadedSettings.footerLogoUrl = row.value as string;
          if (row.key === 'footerLogoSize') loadedSettings.footerLogoSize = row.value as number;
          if (row.key === 'heroText') loadedSettings.heroText = row.value as string;
          if (row.key === 'primaryColor') loadedSettings.primaryColor = row.value as string;
          if (row.key === 'accentColor') loadedSettings.accentColor = row.value as string;
          if (row.key === 'backgroundColor') loadedSettings.backgroundColor = row.value as string;
          if (row.key === 'backgroundImage') loadedSettings.backgroundImage = row.value as string;
          if (row.key === 'headerImage') loadedSettings.headerImage = row.value as string;
          if (row.key === 'bannerImage') loadedSettings.bannerImage = row.value as string;
          if (row.key === 'bannerImages') loadedSettings.bannerImages = row.value as string[];
          if (row.key === 'bannerHeight') loadedSettings.bannerHeight = row.value as number;
          if (row.key === 'gameCardBgColor') loadedSettings.gameCardBgColor = row.value as string;
          if (row.key === 'gameCardBorderColor') loadedSettings.gameCardBorderColor = row.value as string;
          if (row.key === 'gameCardFrameImage') loadedSettings.gameCardFrameImage = row.value as string;
          if (row.key === 'gameCardBorderImage') loadedSettings.gameCardBorderImage = row.value as string;
          if (row.key === 'footerText') loadedSettings.footerText = row.value as string;
          if (row.key === 'footerBgColor') loadedSettings.footerBgColor = row.value as string;
          if (row.key === 'footerTextColor') loadedSettings.footerTextColor = row.value as string;
          if (row.key === 'footerTelegramIcon') loadedSettings.footerTelegramIcon = row.value as string;
          if (row.key === 'footerTiktokIcon') loadedSettings.footerTiktokIcon = row.value as string;
          if (row.key === 'footerFacebookIcon') loadedSettings.footerFacebookIcon = row.value as string;
          if (row.key === 'footerTelegramUrl') loadedSettings.footerTelegramUrl = row.value as string;
          if (row.key === 'footerTiktokUrl') loadedSettings.footerTiktokUrl = row.value as string;
          if (row.key === 'footerFacebookUrl') loadedSettings.footerFacebookUrl = row.value as string;
          if (row.key === 'footerPaymentIcons') loadedSettings.footerPaymentIcons = row.value as string[];
          if (row.key === 'footerPaymentIconSize') loadedSettings.footerPaymentIconSize = row.value as number;
          if (row.key === 'topupBackgroundImage') loadedSettings.topupBackgroundImage = row.value as string;
          if (row.key === 'topupBackgroundColor') loadedSettings.topupBackgroundColor = row.value as string;
          if (row.key === 'topupBannerImage') loadedSettings.topupBannerImage = row.value as string;
          if (row.key === 'topupBannerColor') loadedSettings.topupBannerColor = row.value as string;
          if (row.key === 'packageBgColor') loadedSettings.packageBgColor = row.value as string;
          if (row.key === 'packageBgImage') loadedSettings.packageBgImage = row.value as string;
          if (row.key === 'packageTextColor') loadedSettings.packageTextColor = row.value as string;
          if (row.key === 'packagePriceColor') loadedSettings.packagePriceColor = row.value as string;
          if (row.key === 'packageIconUrl') loadedSettings.packageIconUrl = row.value as string;
          if (row.key === 'packageCurrency') loadedSettings.packageCurrency = row.value as string;
          if (row.key === 'packageCurrencySymbol') loadedSettings.packageCurrencySymbol = row.value as string;
          if (row.key === 'packageHeight') loadedSettings.packageHeight = row.value as number;
          if (row.key === 'packageIconWidth') loadedSettings.packageIconWidth = row.value as number;
          if (row.key === 'packageIconHeight') loadedSettings.packageIconHeight = row.value as number;
          if (row.key === 'packageIconSizeDesktop') loadedSettings.packageIconSizeDesktop = row.value as number;
          if (row.key === 'packageIconSizeMobile') loadedSettings.packageIconSizeMobile = row.value as number;
          if (row.key === 'packageTextSize') loadedSettings.packageTextSize = row.value as number;
          if (row.key === 'packagePriceSize') loadedSettings.packagePriceSize = row.value as number;
          if (row.key === 'packageTextWeight') loadedSettings.packageTextWeight = row.value as number;
          if (row.key === 'packagePriceWeight') loadedSettings.packagePriceWeight = row.value as number;
          if (row.key === 'packageBorderWidth') loadedSettings.packageBorderWidth = row.value as number;
          if (row.key === 'packageBorderColor') loadedSettings.packageBorderColor = row.value as string;
          if (row.key === 'frameColor') loadedSettings.frameColor = row.value as string;
          if (row.key === 'frameBorderWidth') loadedSettings.frameBorderWidth = row.value as number;
          if (row.key === 'idSectionBgColor') loadedSettings.idSectionBgColor = row.value as string;
          if (row.key === 'idSectionBgImage') loadedSettings.idSectionBgImage = row.value as string;
          if (row.key === 'idSectionTextColor') loadedSettings.idSectionTextColor = row.value as string;
          if (row.key === 'paymentSectionBgColor') loadedSettings.paymentSectionBgColor = row.value as string;
          if (row.key === 'paymentSectionBgImage') loadedSettings.paymentSectionBgImage = row.value as string;
          if (row.key === 'paymentSectionTextColor') loadedSettings.paymentSectionTextColor = row.value as string;
          // Payment methods are now static (ABA, Wing, KHQR), skip loading from site_settings
          if (row.key === 'siteIcon') loadedSettings.siteIcon = row.value as string;
          if (row.key === 'browserTitle') loadedSettings.browserTitle = row.value as string;
        });
        setSettings(prev => ({ ...prev, ...loadedSettings }));
      }

      if (gamesData) {
        const gamesWithPackages: Game[] = gamesData.map(game => ({
          id: game.id,
          name: game.name,
          image: game.image || '',
          g2bulkCategoryId: (game as any).g2bulk_category_id || undefined,
          packages: (packagesData || [])
            .filter(pkg => pkg.game_id === game.id)
            .map(pkg => ({
              id: pkg.id,
              name: pkg.name,
              amount: pkg.amount,
              price: parseFloat(String(pkg.price)),
              currency: 'USD',
              icon: pkg.icon || undefined,
              label: (pkg as any).label || undefined,
              labelBgColor: (pkg as any).label_bg_color || undefined,
              labelTextColor: (pkg as any).label_text_color || undefined,
              labelIcon: (pkg as any).label_icon || undefined,
              g2bulkProductId: (pkg as any).g2bulk_product_id || undefined,
              g2bulkTypeId: (pkg as any).g2bulk_type_id || undefined
            })),
          specialPackages: (specialPackagesData || [])
            .filter(pkg => pkg.game_id === game.id)
            .map(pkg => ({
              id: pkg.id,
              name: pkg.name,
              amount: pkg.amount,
              price: parseFloat(String(pkg.price)),
              currency: 'USD',
              icon: pkg.icon || undefined,
              label: (pkg as any).label || undefined,
              labelBgColor: (pkg as any).label_bg_color || undefined,
              labelTextColor: (pkg as any).label_text_color || undefined,
              labelIcon: (pkg as any).label_icon || undefined,
              g2bulkProductId: (pkg as any).g2bulk_product_id || undefined,
              g2bulkTypeId: (pkg as any).g2bulk_type_id || undefined
            }))
        }));
        setGames(gamesWithPackages);
      }
    } catch (error) {
      handleApiError(error, 'SiteContext.loadData');
    } finally {
      setIsLoading(false);
    }
  };

  // Refresh games data from database (useful after bulk operations)
  const refreshGames = async () => {
    try {
      const [gamesResult, packagesResult, specialPackagesResult] = await Promise.all([
        supabase.from('games').select('*').order('sort_order', { ascending: true }),
        supabase.from('packages').select('*').order('sort_order', { ascending: true }),
        supabase.from('special_packages').select('*').order('sort_order', { ascending: true }),
      ]);

      const gamesData = gamesResult.data;
      const packagesData = packagesResult.data;
      const specialPackagesData = specialPackagesResult.data;

      if (gamesData) {
        const gamesWithPackages: Game[] = gamesData.map(game => ({
          id: game.id,
          name: game.name,
          image: game.image || '',
          g2bulkCategoryId: (game as any).g2bulk_category_id || undefined,
          packages: (packagesData || [])
            .filter(pkg => pkg.game_id === game.id)
            .map(pkg => ({
              id: pkg.id,
              name: pkg.name,
              amount: pkg.amount,
              price: parseFloat(String(pkg.price)),
              currency: 'USD',
              icon: pkg.icon || undefined,
              label: (pkg as any).label || undefined,
              labelBgColor: (pkg as any).label_bg_color || undefined,
              labelTextColor: (pkg as any).label_text_color || undefined,
              labelIcon: (pkg as any).label_icon || undefined,
              g2bulkProductId: (pkg as any).g2bulk_product_id || undefined,
              g2bulkTypeId: (pkg as any).g2bulk_type_id || undefined
            })),
          specialPackages: (specialPackagesData || [])
            .filter(pkg => pkg.game_id === game.id)
            .map(pkg => ({
              id: pkg.id,
              name: pkg.name,
              amount: pkg.amount,
              price: parseFloat(String(pkg.price)),
              currency: 'USD',
              icon: pkg.icon || undefined,
              label: (pkg as any).label || undefined,
              labelBgColor: (pkg as any).label_bg_color || undefined,
              labelTextColor: (pkg as any).label_text_color || undefined,
              labelIcon: (pkg as any).label_icon || undefined,
              g2bulkProductId: (pkg as any).g2bulk_product_id || undefined,
              g2bulkTypeId: (pkg as any).g2bulk_type_id || undefined
            }))
        }));
        setGames(gamesWithPackages);
      }
    } catch (error) {
      handleApiError(error, 'SiteContext.refreshGames');
    }
  };

  const saveSetting = async (key: string, value: any) => {
    try {
      const { error } = await supabase
        .from('site_settings')
        .upsert({ key, value }, { onConflict: 'key' });
      if (error) handleApiError(error, 'SiteContext.saveSetting');
    } catch (error) {
      handleApiError(error, 'SiteContext.saveSetting');
    }
  };

  const updateSettings = (newSettings: Partial<SiteSettings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...newSettings };
      // Save each changed setting
      Object.entries(newSettings).forEach(([key, value]) => {
        saveSetting(key, value);
      });
      return updated;
    });
  };

  const addGame = async (game: Omit<Game, 'id' | 'packages' | 'specialPackages'>) => {
    try {
      const { data, error } = await supabase
        .from('games')
        .insert({ 
          name: game.name, 
          image: game.image,
          g2bulk_category_id: game.g2bulkCategoryId || null
        })
        .select()
        .single();
      
      if (error) throw error;
      if (data) {
        setGames(prev => [...prev, { 
          ...data, 
          id: data.id, 
          g2bulkCategoryId: (data as any).g2bulk_category_id || undefined,
          packages: [], 
          specialPackages: [] 
        }]);
      }
    } catch (error) {
      handleApiError(error, 'SiteContext.addGame');
    }
  };

  const updateGame = async (id: string, updatedGame: Partial<Game>) => {
    try {
      const updateData: any = {};
      if (updatedGame.name !== undefined) updateData.name = updatedGame.name;
      if (updatedGame.image !== undefined) updateData.image = updatedGame.image;
      if (updatedGame.g2bulkCategoryId !== undefined) updateData.g2bulk_category_id = updatedGame.g2bulkCategoryId || null;

      const { error } = await supabase
        .from('games')
        .update(updateData)
        .eq('id', id);
      
      if (error) throw error;
      setGames(prev => prev.map(g => g.id === id ? { ...g, ...updatedGame } : g));
    } catch (error) {
      handleApiError(error, 'SiteContext.updateGame');
    }
  };

  const deleteGame = async (id: string) => {
    try {
      const { error } = await supabase
        .from('games')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      setGames(prev => prev.filter(g => g.id !== id));
    } catch (error) {
      handleApiError(error, 'SiteContext.deleteGame');
    }
  };

  const moveGame = async (id: string, direction: 'up' | 'down') => {
    const currentIndex = games.findIndex(g => g.id === id);
    if (currentIndex === -1) return;
    
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= games.length) return;
    
    const newGames = [...games];
    [newGames[currentIndex], newGames[targetIndex]] = [newGames[targetIndex], newGames[currentIndex]];
    
    try {
      // Update sort_order for both games
      await Promise.all([
        supabase.from('games').update({ sort_order: targetIndex }).eq('id', games[currentIndex].id),
        supabase.from('games').update({ sort_order: currentIndex }).eq('id', games[targetIndex].id),
      ]);
      setGames(newGames);
    } catch (error) {
      handleApiError(error, 'SiteContext.moveGame');
    }
  };

  // Payment methods are now static - these functions are no-ops for backwards compatibility
  const addPaymentMethod = () => {
    console.log('Payment methods are now managed via IKhode settings');
  };

  const updatePaymentMethod = () => {
    console.log('Payment methods are now managed via IKhode settings');
  };

  const deletePaymentMethod = () => {
    console.log('Payment methods are now managed via IKhode settings');
  };

  const addPackage = async (gameId: string, pkg: Omit<Package, 'id'>) => {
    try {
      const { data, error } = await supabase
        .from('packages')
        .insert({ 
          game_id: gameId, 
          name: pkg.name, 
          amount: String(pkg.amount), 
          price: pkg.price,
          icon: pkg.icon || null,
          label: pkg.label || null,
          label_bg_color: pkg.labelBgColor || null,
          label_text_color: pkg.labelTextColor || null,
          label_icon: pkg.labelIcon || null,
          g2bulk_product_id: pkg.g2bulkProductId || null,
          g2bulk_type_id: pkg.g2bulkTypeId || null
        })
        .select()
        .single();
      
      if (error) throw error;
      if (data) {
        setGames(prev => prev.map(g => 
          g.id === gameId 
            ? { ...g, packages: [...g.packages, { 
                id: data.id, 
                name: data.name, 
                amount: data.amount, 
                price: parseFloat(String(data.price)), 
                currency: 'USD',
                icon: data.icon || undefined,
                label: (data as any).label || undefined,
                labelBgColor: (data as any).label_bg_color || undefined,
                labelTextColor: (data as any).label_text_color || undefined,
                labelIcon: (data as any).label_icon || undefined,
                g2bulkProductId: (data as any).g2bulk_product_id || undefined,
                g2bulkTypeId: (data as any).g2bulk_type_id || undefined
              }] }
            : g
        ));
      }
    } catch (error) {
      handleApiError(error, 'SiteContext.addPackage');
    }
  };

  const updatePackage = async (gameId: string, packageId: string, updatedPkg: Partial<Package>) => {
    try {
      const updateData: any = {};
      if (updatedPkg.name !== undefined) updateData.name = updatedPkg.name;
      if (updatedPkg.amount !== undefined) updateData.amount = String(updatedPkg.amount);
      if (updatedPkg.price !== undefined) updateData.price = updatedPkg.price;
      if (updatedPkg.icon !== undefined) updateData.icon = updatedPkg.icon || null;
      if (updatedPkg.label !== undefined) updateData.label = updatedPkg.label || null;
      if (updatedPkg.labelBgColor !== undefined) updateData.label_bg_color = updatedPkg.labelBgColor || null;
      if (updatedPkg.labelTextColor !== undefined) updateData.label_text_color = updatedPkg.labelTextColor || null;
      if (updatedPkg.labelIcon !== undefined) updateData.label_icon = updatedPkg.labelIcon || null;
      if (updatedPkg.g2bulkProductId !== undefined) updateData.g2bulk_product_id = updatedPkg.g2bulkProductId || null;
      if (updatedPkg.g2bulkTypeId !== undefined) updateData.g2bulk_type_id = updatedPkg.g2bulkTypeId || null;

      const { error } = await supabase
        .from('packages')
        .update(updateData)
        .eq('id', packageId);
      
      if (error) throw error;
      setGames(prev => prev.map(g => 
        g.id === gameId 
          ? { ...g, packages: g.packages.map(p => p.id === packageId ? { ...p, ...updatedPkg } : p) }
          : g
      ));
    } catch (error) {
      handleApiError(error, 'SiteContext.updatePackage');
    }
  };

  const deletePackage = async (gameId: string, packageId: string) => {
    try {
      const { error } = await supabase
        .from('packages')
        .delete()
        .eq('id', packageId);
      
      if (error) throw error;
      setGames(prev => prev.map(g => 
        g.id === gameId 
          ? { ...g, packages: g.packages.filter(p => p.id !== packageId) }
          : g
      ));
    } catch (error) {
      handleApiError(error, 'SiteContext.deletePackage');
    }
  };

  const movePackage = async (gameId: string, packageId: string, direction: 'up' | 'down') => {
    const game = games.find(g => g.id === gameId);
    if (!game) return;
    
    const currentIndex = game.packages.findIndex(p => p.id === packageId);
    if (currentIndex === -1) return;
    
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= game.packages.length) return;
    
    const newPackages = [...game.packages];
    [newPackages[currentIndex], newPackages[targetIndex]] = [newPackages[targetIndex], newPackages[currentIndex]];
    
    try {
      // Update sort_order for both packages
      await Promise.all([
        supabase.from('packages').update({ sort_order: targetIndex }).eq('id', game.packages[currentIndex].id),
        supabase.from('packages').update({ sort_order: currentIndex }).eq('id', game.packages[targetIndex].id),
      ]);
      setGames(prev => prev.map(g => 
        g.id === gameId ? { ...g, packages: newPackages } : g
      ));
    } catch (error) {
      handleApiError(error, 'SiteContext.movePackage');
    }
  };

  // Special Package functions
  const addSpecialPackage = async (gameId: string, pkg: Omit<Package, 'id'>) => {
    try {
      const { data, error } = await supabase
        .from('special_packages')
        .insert({ 
          game_id: gameId, 
          name: pkg.name, 
          amount: String(pkg.amount), 
          price: pkg.price,
          icon: pkg.icon || null,
          label: pkg.label || null,
          label_bg_color: pkg.labelBgColor || null,
          label_text_color: pkg.labelTextColor || null,
          label_icon: pkg.labelIcon || null,
          g2bulk_product_id: pkg.g2bulkProductId || null,
          g2bulk_type_id: pkg.g2bulkTypeId || null
        })
        .select()
        .single();
      
      if (error) throw error;
      if (data) {
        setGames(prev => prev.map(g => 
          g.id === gameId 
            ? { ...g, specialPackages: [...g.specialPackages, { 
                id: data.id, 
                name: data.name, 
                amount: data.amount, 
                price: parseFloat(String(data.price)), 
                currency: 'USD',
                icon: data.icon || undefined,
                label: (data as any).label || undefined,
                labelBgColor: (data as any).label_bg_color || undefined,
                labelTextColor: (data as any).label_text_color || undefined,
                labelIcon: (data as any).label_icon || undefined,
                g2bulkProductId: (data as any).g2bulk_product_id || undefined,
                g2bulkTypeId: (data as any).g2bulk_type_id || undefined
              }] }
            : g
        ));
      }
    } catch (error) {
      handleApiError(error, 'SiteContext.addSpecialPackage');
    }
  };

  const updateSpecialPackage = async (gameId: string, packageId: string, updatedPkg: Partial<Package>) => {
    try {
      const updateData: any = {};
      if (updatedPkg.name !== undefined) updateData.name = updatedPkg.name;
      if (updatedPkg.amount !== undefined) updateData.amount = String(updatedPkg.amount);
      if (updatedPkg.price !== undefined) updateData.price = updatedPkg.price;
      if (updatedPkg.icon !== undefined) updateData.icon = updatedPkg.icon || null;
      if (updatedPkg.label !== undefined) updateData.label = updatedPkg.label || null;
      if (updatedPkg.labelBgColor !== undefined) updateData.label_bg_color = updatedPkg.labelBgColor || null;
      if (updatedPkg.labelTextColor !== undefined) updateData.label_text_color = updatedPkg.labelTextColor || null;
      if (updatedPkg.labelIcon !== undefined) updateData.label_icon = updatedPkg.labelIcon || null;
      if (updatedPkg.g2bulkProductId !== undefined) updateData.g2bulk_product_id = updatedPkg.g2bulkProductId || null;
      if (updatedPkg.g2bulkTypeId !== undefined) updateData.g2bulk_type_id = updatedPkg.g2bulkTypeId || null;

      const { error } = await supabase
        .from('special_packages')
        .update(updateData)
        .eq('id', packageId);
      
      if (error) throw error;
      setGames(prev => prev.map(g => 
        g.id === gameId 
          ? { ...g, specialPackages: g.specialPackages.map(p => p.id === packageId ? { ...p, ...updatedPkg } : p) }
          : g
      ));
    } catch (error) {
      handleApiError(error, 'SiteContext.updateSpecialPackage');
    }
  };

  const deleteSpecialPackage = async (gameId: string, packageId: string) => {
    try {
      const { error } = await supabase
        .from('special_packages')
        .delete()
        .eq('id', packageId);
      
      if (error) throw error;
      setGames(prev => prev.map(g => 
        g.id === gameId 
          ? { ...g, specialPackages: g.specialPackages.filter(p => p.id !== packageId) }
          : g
      ));
    } catch (error) {
      handleApiError(error, 'SiteContext.deleteSpecialPackage');
    }
  };

  const moveSpecialPackage = async (gameId: string, packageId: string, direction: 'up' | 'down') => {
    const game = games.find(g => g.id === gameId);
    if (!game) return;
    
    const currentIndex = game.specialPackages.findIndex(p => p.id === packageId);
    if (currentIndex === -1) return;
    
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= game.specialPackages.length) return;
    
    const newPackages = [...game.specialPackages];
    [newPackages[currentIndex], newPackages[targetIndex]] = [newPackages[targetIndex], newPackages[currentIndex]];
    
    try {
      await Promise.all([
        supabase.from('special_packages').update({ sort_order: targetIndex }).eq('id', game.specialPackages[currentIndex].id),
        supabase.from('special_packages').update({ sort_order: currentIndex }).eq('id', game.specialPackages[targetIndex].id),
      ]);
      setGames(prev => prev.map(g => 
        g.id === gameId ? { ...g, specialPackages: newPackages } : g
      ));
    } catch (error) {
      handleApiError(error, 'SiteContext.moveSpecialPackage');
    }
  };

  return (
    <SiteContext.Provider value={{
      settings,
      games,
      paymentMethods,
      ikhodePayment,
      isLoading,
      refreshGames,
      updateSettings,
      addGame,
      updateGame,
      deleteGame,
      moveGame,
      addPaymentMethod,
      updatePaymentMethod,
      deletePaymentMethod,
      addPackage,
      updatePackage,
      deletePackage,
      movePackage,
      addSpecialPackage,
      updateSpecialPackage,
      deleteSpecialPackage,
      moveSpecialPackage,
    }}>
      {children}
    </SiteContext.Provider>
  );
};

export const useSite = () => {
  const context = useContext(SiteContext);
  if (!context) {
    console.warn('useSite used outside SiteProvider; using fallback defaults');
    return {
      settings: defaultSettings,
      games: [],
      paymentMethods: defaultPaymentMethods,
      ikhodePayment: null,
      isLoading: false,
      refreshGames: async () => {},
      updateSettings: () => {},
      addGame: async () => {},
      updateGame: async () => {},
      deleteGame: async () => {},
      moveGame: async () => {},
      addPaymentMethod: () => {},
      updatePaymentMethod: () => {},
      deletePaymentMethod: () => {},
      addPackage: async () => {},
      updatePackage: async () => {},
      deletePackage: async () => {},
      movePackage: async () => {},
      addSpecialPackage: async () => {},
      updateSpecialPackage: async () => {},
      deleteSpecialPackage: async () => {},
      moveSpecialPackage: async () => {},
    } as SiteContextType;
  }
  return context;
};
