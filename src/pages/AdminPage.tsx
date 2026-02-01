import React, { useState, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Settings,
  Package,
  CreditCard,
  Palette,
  Plus,
  Trash2,
  Edit2,
  LogOut,
  User,
  Save,
  X,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Home,
  ArrowUp,
  ArrowDown,
  Key,
  ShoppingCart,
  QrCode,
  Link2,
  Link2Off,
  Shield,
  Star,
  Database,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSite, Game, PaymentMethod, Package as PackageType } from "@/contexts/SiteContext";
import { toast } from "@/hooks/use-toast";
import ImageUpload from "@/components/ImageUpload";
import BannerImagesUpload from "@/components/admin/BannerImagesUpload";
import ApiSettingsTab from "@/components/admin/ApiSettingsTab";
import GameVerificationConfigsTab from "@/components/admin/GameVerificationConfigsTab";
import OrdersTab from "@/components/admin/OrdersTab";
import KesorSettingsTab from "@/components/admin/KesorSettingsTab";
import G2BulkProductSelector from "@/components/admin/G2BulkProductSelector";
import G2BulkBalanceDisplay from "@/components/admin/G2BulkBalanceDisplay";
import G2BulkCategorySelector from "@/components/admin/G2BulkCategorySelector";
import G2BulkAutoImport from "@/components/admin/G2BulkAutoImport";
import G2BulkSyncWidget from "@/components/admin/G2BulkSyncWidget";
import G2BulkBulkLinker from "@/components/admin/G2BulkBulkLinker";
import G2BulkLinkStats from "@/components/admin/G2BulkLinkStats";
import G2BulkFullImport from "@/components/admin/G2BulkFullImport";
import G2BulkDebugLogs from "@/components/admin/G2BulkDebugLogs";
import PackageStockBadge from "@/components/admin/PackageStockBadge";
import AIGameImageGenerator, { AIBulkImageGenerator } from "@/components/admin/AIGameImageGenerator";
import DatabaseExportImport from "@/components/admin/DatabaseExportImport";
import { useG2BulkProductStatus } from "@/hooks/useG2BulkProductStatus";

const AdminPage: React.FC = () => {
  const { user, signOut } = useAuth();
  const {
    settings,
    games,
    paymentMethods,
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
  } = useSite();

  // G2Bulk product status hook for stock warnings
  const { productStatuses, checkProductStatus } = useG2BulkProductStatus();

  const handleSignOut = async () => {
    await signOut();
    toast({ title: "Signed out successfully" });
  };

  // Game state
  const [editingGame, setEditingGame] = useState<string | null>(null);
  const [newGame, setNewGame] = useState({ name: "", slug: "", image: "", g2bulkCategoryId: "" });
  const [editGameData, setEditGameData] = useState<{ name: string; slug: string; image: string; g2bulkCategoryId: string }>({
    name: "",
    slug: "",
    image: "",
    g2bulkCategoryId: "",
  });

  // Package state
  const [expandedGame, setExpandedGame] = useState<string | null>(null);
  const [packageListSort, setPackageListSort] = useState<"price" | "manual">("price");
  const [editingPackage, setEditingPackage] = useState<string | null>(null);
  const [newPackage, setNewPackage] = useState({
    name: "",
    amount: "",
    price: 0,
    currency: "USD",
    icon: "",
    label: "",
    labelBgColor: "#dc2626",
    labelTextColor: "#ffffff",
    labelIcon: "",
    g2bulkProductId: "",
    g2bulkTypeId: "",
  });
  const [editPackageData, setEditPackageData] = useState({
    name: "",
    amount: "",
    price: 0,
    currency: "USD",
    icon: "",
    label: "",
    labelBgColor: "#dc2626",
    labelTextColor: "#ffffff",
    labelIcon: "",
    g2bulkProductId: "",
    g2bulkTypeId: "",
  });

  // Special Package state
  const [editingSpecialPackage, setEditingSpecialPackage] = useState<string | null>(null);
  const [newSpecialPackage, setNewSpecialPackage] = useState({
    name: "",
    amount: "",
    price: 0,
    currency: "USD",
    icon: "",
    label: "",
    labelBgColor: "#dc2626",
    labelTextColor: "#ffffff",
    labelIcon: "",
    g2bulkProductId: "",
    g2bulkTypeId: "",
  });
  const [editSpecialPackageData, setEditSpecialPackageData] = useState({
    name: "",
    amount: "",
    price: 0,
    currency: "USD",
    icon: "",
    label: "",
    labelBgColor: "#dc2626",
    labelTextColor: "#ffffff",
    labelIcon: "",
    g2bulkProductId: "",
    g2bulkTypeId: "",
  });

  // Payment state
  const [newPayment, setNewPayment] = useState({ name: "", icon: "" });
  const [editingPayment, setEditingPayment] = useState<string | null>(null);
  const [editPaymentData, setEditPaymentData] = useState<{ name: string; icon: string }>({ name: "", icon: "" });

  const handleUpdateSettings = (key: string, value: string | number | string[]) => {
    updateSettings({ [key]: value });
    toast({ title: "Settings updated!" });
  };

  const handleAddGame = async () => {
    if (!newGame.name || !newGame.image) {
      toast({ title: "Please fill all fields", variant: "destructive" });
      return;
    }

    // Auto-generate slug from name if not provided
    const slug = newGame.slug || newGame.name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-');

    await addGame({
      name: newGame.name,
      slug: slug,
      image: newGame.image,
      g2bulkCategoryId: newGame.g2bulkCategoryId || undefined,
    });
    setNewGame({ name: "", slug: "", image: "", g2bulkCategoryId: "" });
    toast({ title: "Game added!" });
  };

  const handleStartEditGame = (game: Game) => {
    setEditingGame(game.id);
    setEditGameData({
      name: game.name,
      slug: game.slug,
      image: game.image,
      g2bulkCategoryId: game.g2bulkCategoryId || "",
    });
  };

  const handleSaveGame = async (gameId: string) => {
    await updateGame(gameId, {
      name: editGameData.name,
      slug: editGameData.slug,
      image: editGameData.image,
      g2bulkCategoryId: editGameData.g2bulkCategoryId || undefined,
    });
    setEditingGame(null);
    toast({ title: "Game updated!" });
  };

  // Package handlers
  const handleAddPackage = async (gameId: string) => {
    if (!newPackage.name || newPackage.price <= 0) {
      toast({ title: "Please fill package name and price", variant: "destructive" });
      return;
    }

    await addPackage(gameId, {
      name: newPackage.name,
      amount: newPackage.amount,
      price: newPackage.price,
      currency: newPackage.currency,
      icon: newPackage.icon || undefined,
      label: newPackage.label || undefined,
      labelBgColor: newPackage.labelBgColor || undefined,
      labelTextColor: newPackage.labelTextColor || undefined,
      labelIcon: newPackage.labelIcon || undefined,
      g2bulkProductId: newPackage.g2bulkProductId || undefined,
      g2bulkTypeId: newPackage.g2bulkTypeId || undefined,
    });
    setNewPackage({
      name: "",
      amount: "",
      price: 0,
      currency: "USD",
      icon: "",
      label: "",
      labelBgColor: "#dc2626",
      labelTextColor: "#ffffff",
      labelIcon: "",
      g2bulkProductId: "",
      g2bulkTypeId: "",
    });
    toast({ title: "Package added!" });
  };

  const handleStartEditPackage = (pkg: PackageType) => {
    setEditingPackage(pkg.id);
    setEditPackageData({
      name: pkg.name,
      amount: pkg.amount,
      price: pkg.price,
      currency: pkg.currency,
      icon: pkg.icon || "",
      label: pkg.label || "",
      labelBgColor: pkg.labelBgColor || "#dc2626",
      labelTextColor: pkg.labelTextColor || "#ffffff",
      labelIcon: pkg.labelIcon || "",
      g2bulkProductId: pkg.g2bulkProductId || "",
      g2bulkTypeId: pkg.g2bulkTypeId || "",
    });
  };

  const handleSavePackage = async (gameId: string, packageId: string) => {
    await updatePackage(gameId, packageId, editPackageData);
    setEditingPackage(null);
    toast({ title: "Package updated!" });
  };

  // Special Package handlers
  const handleAddSpecialPackage = async (gameId: string) => {
    if (!newSpecialPackage.name || newSpecialPackage.price <= 0) {
      toast({ title: "Please fill package name and price", variant: "destructive" });
      return;
    }

    await addSpecialPackage(gameId, {
      name: newSpecialPackage.name,
      amount: newSpecialPackage.amount,
      price: newSpecialPackage.price,
      currency: newSpecialPackage.currency,
      icon: newSpecialPackage.icon || undefined,
      label: newSpecialPackage.label || undefined,
      labelBgColor: newSpecialPackage.labelBgColor || undefined,
      labelTextColor: newSpecialPackage.labelTextColor || undefined,
      labelIcon: newSpecialPackage.labelIcon || undefined,
      g2bulkProductId: newSpecialPackage.g2bulkProductId || undefined,
      g2bulkTypeId: newSpecialPackage.g2bulkTypeId || undefined,
    });
    setNewSpecialPackage({
      name: "",
      amount: "",
      price: 0,
      currency: "USD",
      icon: "",
      label: "",
      labelBgColor: "#dc2626",
      labelTextColor: "#ffffff",
      labelIcon: "",
      g2bulkProductId: "",
      g2bulkTypeId: "",
    });
    toast({ title: "Special package added!" });
  };

  const handleStartEditSpecialPackage = (pkg: PackageType) => {
    setEditingSpecialPackage(pkg.id);
    setEditSpecialPackageData({
      name: pkg.name,
      amount: pkg.amount,
      price: pkg.price,
      currency: pkg.currency,
      icon: pkg.icon || "",
      label: pkg.label || "",
      labelBgColor: pkg.labelBgColor || "#dc2626",
      labelTextColor: pkg.labelTextColor || "#ffffff",
      labelIcon: pkg.labelIcon || "",
      g2bulkProductId: pkg.g2bulkProductId || "",
      g2bulkTypeId: pkg.g2bulkTypeId || "",
    });
  };

  const handleSaveSpecialPackage = async (gameId: string, packageId: string) => {
    await updateSpecialPackage(gameId, packageId, editSpecialPackageData);
    setEditingSpecialPackage(null);
    toast({ title: "Special package updated!" });
  };

  const handleAddPayment = () => {
    if (!newPayment.name) {
      toast({ title: "Please enter payment method name", variant: "destructive" });
      return;
    }

    const payment: PaymentMethod = {
      id: Date.now().toString(),
      name: newPayment.name,
      icon: newPayment.icon || "💳",
    };

    addPaymentMethod(payment);
    setNewPayment({ name: "", icon: "" });
    toast({ title: "Payment method added!" });
  };

  const handleStartEditPayment = (payment: PaymentMethod) => {
    setEditingPayment(payment.id);
    setEditPaymentData({ name: payment.name, icon: payment.icon });
  };

  const handleSavePayment = (paymentId: string) => {
    updatePaymentMethod(paymentId, editPaymentData);
    setEditingPayment(null);
    toast({ title: "Payment method updated!" });
  };

  return (
    <>
      <Helmet>
        <title>Admin Panel - {settings.siteName}</title>
      </Helmet>

      <div className="min-h-screen pb-8">
        {/* Header */}
        <header className="bg-card border-b border-border py-4 px-4 sticky top-0 z-50">
          <div className="container mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/" className="p-2 rounded-lg hover:bg-secondary transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <h1 className="font-display text-xl font-bold gold-text">Admin Panel</h1>
            </div>
            <div className="flex items-center gap-3">
              <G2BulkBalanceDisplay />
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <User className="w-4 h-4" />
                <span className="max-w-[150px] truncate hidden sm:inline">{user?.email}</span>
              </div>
              <button
                onClick={handleSignOut}
                className="p-2 rounded-lg border border-border hover:bg-secondary transition-colors flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline text-sm">Logout</span>
              </button>
            </div>
          </div>
        </header>

        <div className="container mx-auto px-4 py-6">
          <Tabs defaultValue="settings" className="space-y-6">
            <TabsList className="grid w-full grid-cols-9 bg-card border border-border">
              <TabsTrigger
                value="settings"
                className="data-[state=active]:bg-gold data-[state=active]:text-primary-foreground text-xs sm:text-sm"
              >
                <Settings className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Site</span>
              </TabsTrigger>
              <TabsTrigger
                value="home-edit"
                className="data-[state=active]:bg-gold data-[state=active]:text-primary-foreground text-xs sm:text-sm"
              >
                <Home className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Home</span>
              </TabsTrigger>
              <TabsTrigger
                value="games"
                className="data-[state=active]:bg-gold data-[state=active]:text-primary-foreground text-xs sm:text-sm"
              >
                <Package className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Games</span>
              </TabsTrigger>
              <TabsTrigger
                value="payments"
                className="data-[state=active]:bg-gold data-[state=active]:text-primary-foreground text-xs sm:text-sm"
              >
                <CreditCard className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Pay</span>
              </TabsTrigger>
              <TabsTrigger
                value="qr-settings"
                className="data-[state=active]:bg-gold data-[state=active]:text-primary-foreground text-xs sm:text-sm"
              >
                <QrCode className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">QR</span>
              </TabsTrigger>
              <TabsTrigger
                value="orders"
                className="data-[state=active]:bg-gold data-[state=active]:text-primary-foreground text-xs sm:text-sm"
              >
                <ShoppingCart className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Orders</span>
              </TabsTrigger>
              <TabsTrigger
                value="verification"
                className="data-[state=active]:bg-gold data-[state=active]:text-primary-foreground text-xs sm:text-sm"
              >
                <Shield className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Verify</span>
              </TabsTrigger>
              <TabsTrigger
                value="api"
                className="data-[state=active]:bg-gold data-[state=active]:text-primary-foreground text-xs sm:text-sm"
              >
                <Key className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">API</span>
              </TabsTrigger>
              <TabsTrigger
                value="backup"
                className="data-[state=active]:bg-gold data-[state=active]:text-primary-foreground text-xs sm:text-sm"
              >
                <Database className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Backup</span>
              </TabsTrigger>
            </TabsList>

            {/* Site Settings */}
            <TabsContent value="settings">
              <Card className="border-gold/30">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Palette className="w-5 h-5 text-gold" />
                    Site Configuration
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-6 md:grid-cols-2">
                    {/* Header Logo Upload */}
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium mb-2 block">Header Logo</label>
                        <ImageUpload
                          value={settings.logoUrl}
                          onChange={(url) => handleUpdateSettings("logoUrl", url)}
                          folder="logos"
                          aspectRatio="square"
                          placeholder="Upload Header Logo"
                          className="max-w-[200px]"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-2 block">
                          Header Logo Size: {settings.logoSize}px
                        </label>
                        <input
                          type="range"
                          min="24"
                          max="200"
                          value={settings.logoSize}
                          onChange={(e) => handleUpdateSettings("logoSize", Number(e.target.value))}
                          className="w-full"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground mt-1">
                          <span>24px</span>
                          <span>200px</span>
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-2 block">
                          Mobile Logo Position: {settings.logoMobilePosition}%
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={settings.logoMobilePosition}
                          onChange={(e) => handleUpdateSettings("logoMobilePosition", Number(e.target.value))}
                          className="w-full"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground mt-1">
                          <span>Left</span>
                          <span>Center</span>
                          <span>Right</span>
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-2 block">
                          Header Height (Desktop): {settings.headerHeightDesktop}px
                        </label>
                        <input
                          type="range"
                          min="40"
                          max="200"
                          value={settings.headerHeightDesktop || 96}
                          onChange={(e) => handleUpdateSettings("headerHeightDesktop", Number(e.target.value))}
                          className="w-full"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground mt-1">
                          <span>40px</span>
                          <span>200px</span>
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-2 block">
                          Header Height (Mobile): {settings.headerHeightMobile}px
                        </label>
                        <input
                          type="range"
                          min="40"
                          max="150"
                          value={settings.headerHeightMobile || 56}
                          onChange={(e) => handleUpdateSettings("headerHeightMobile", Number(e.target.value))}
                          className="w-full"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground mt-1">
                          <span>40px</span>
                          <span>150px</span>
                        </div>
                      </div>
                    </div>

                    {/* Footer Logo Upload */}
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium mb-2 block">Footer Logo</label>
                        <ImageUpload
                          value={settings.footerLogoUrl}
                          onChange={(url) => handleUpdateSettings("footerLogoUrl", url)}
                          folder="logos"
                          aspectRatio="square"
                          placeholder="Upload Footer Logo"
                          className="max-w-[200px]"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-2 block">
                          Footer Logo Size: {settings.footerLogoSize}px
                        </label>
                        <input
                          type="range"
                          min="16"
                          max="100"
                          value={settings.footerLogoSize}
                          onChange={(e) => handleUpdateSettings("footerLogoSize", Number(e.target.value))}
                          className="w-full"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground mt-1">
                          <span>16px</span>
                          <span>100px</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium mb-2 block">Site Name</label>
                        <Input
                          value={settings.siteName}
                          onChange={(e) => handleUpdateSettings("siteName", e.target.value)}
                          className="border-gold/50"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-2 block">Hero Text (Khmer)</label>
                        <Input
                          value={settings.heroText}
                          onChange={(e) => handleUpdateSettings("heroText", e.target.value)}
                          className="border-gold/50"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-border">
                    <h3 className="font-bold mb-4">Colors</h3>
                    <div className="grid gap-4 md:grid-cols-3">
                      <div>
                        <label className="text-sm font-medium mb-2 block">Primary Color</label>
                        <div className="flex gap-2">
                          <input
                            type="color"
                            value={settings.primaryColor}
                            onChange={(e) => handleUpdateSettings("primaryColor", e.target.value)}
                            className="w-12 h-10 rounded cursor-pointer"
                          />
                          <Input
                            value={settings.primaryColor}
                            onChange={(e) => handleUpdateSettings("primaryColor", e.target.value)}
                            className="flex-1 border-gold/50"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-2 block">Accent Color</label>
                        <div className="flex gap-2">
                          <input
                            type="color"
                            value={settings.accentColor}
                            onChange={(e) => handleUpdateSettings("accentColor", e.target.value)}
                            className="w-12 h-10 rounded cursor-pointer"
                          />
                          <Input
                            value={settings.accentColor}
                            onChange={(e) => handleUpdateSettings("accentColor", e.target.value)}
                            className="flex-1 border-gold/50"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-2 block">Background Color</label>
                        <div className="flex gap-2">
                          <input
                            type="color"
                            value={settings.backgroundColor}
                            onChange={(e) => handleUpdateSettings("backgroundColor", e.target.value)}
                            className="w-12 h-10 rounded cursor-pointer"
                          />
                          <Input
                            value={settings.backgroundColor}
                            onChange={(e) => handleUpdateSettings("backgroundColor", e.target.value)}
                            className="flex-1 border-gold/50"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Home Edit */}
            <TabsContent value="home-edit">
              <div className="space-y-6">
                {/* Browser Settings */}
                <Card className="border-gold/30">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Palette className="w-5 h-5 text-gold" />
                      Browser Settings
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Site Icon (Favicon)</label>
                      <ImageUpload
                        value={settings.siteIcon}
                        onChange={(url) => handleUpdateSettings("siteIcon", url)}
                        folder="site-icons"
                        aspectRatio="square"
                        placeholder="Upload Favicon"
                        className="max-w-[100px]"
                      />
                      <p className="text-xs text-muted-foreground mt-1">Recommended: 32x32px or 64x64px PNG/ICO</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Browser Title</label>
                      <Input
                        value={settings.browserTitle}
                        onChange={(e) => handleUpdateSettings("browserTitle", e.target.value)}
                        className="border-gold/50"
                        placeholder="KESOR TOPUP - Game Topup Cambodia"
                      />
                      <p className="text-xs text-muted-foreground mt-1">Text shown in browser tab</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Background Settings */}
                <Card className="border-gold/30">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Palette className="w-5 h-5 text-gold" />
                      Site Background
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Background Image</label>
                      <ImageUpload
                        value={settings.backgroundImage}
                        onChange={(url) => handleUpdateSettings("backgroundImage", url)}
                        folder="backgrounds"
                        aspectRatio="wide"
                        placeholder="Upload Background"
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Header Settings */}
                <Card className="border-gold/30">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Palette className="w-5 h-5 text-gold" />
                      Header Settings
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Header Background Image</label>
                      <ImageUpload
                        value={settings.headerImage}
                        onChange={(url) => handleUpdateSettings("headerImage", url)}
                        folder="headers"
                        aspectRatio="wide"
                        placeholder="Upload Header Image"
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Banner Settings */}
                <Card className="border-gold/30">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Palette className="w-5 h-5 text-gold" />
                      Banner Slideshow
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <BannerImagesUpload
                      value={settings.bannerImages || []}
                      onChange={(urls) => handleUpdateSettings("bannerImages", urls)}
                      folder="banners"
                    />
                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        Banner Height: {settings.bannerHeight || 256}px
                      </label>
                      <input
                        type="range"
                        min="100"
                        max="500"
                        value={settings.bannerHeight || 256}
                        onChange={(e) => handleUpdateSettings("bannerHeight", parseInt(e.target.value))}
                        className="w-full h-2 bg-gold/20 rounded-lg appearance-none cursor-pointer accent-gold"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>100px</span>
                        <span>500px</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Game Card Settings */}
                <Card className="border-gold/30">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Package className="w-5 h-5 text-gold" />
                      Game Card Styling
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="text-sm font-medium mb-2 block">Card Background Color</label>
                        <div className="flex gap-2">
                          <input
                            type="color"
                            value={settings.gameCardBgColor || "#1a1a1a"}
                            onChange={(e) => handleUpdateSettings("gameCardBgColor", e.target.value)}
                            className="w-12 h-10 rounded cursor-pointer"
                          />
                          <Input
                            value={settings.gameCardBgColor}
                            onChange={(e) => handleUpdateSettings("gameCardBgColor", e.target.value)}
                            className="flex-1 border-gold/50"
                            placeholder="Leave empty for default"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-2 block">Card Border Color</label>
                        <div className="flex gap-2">
                          <input
                            type="color"
                            value={settings.gameCardBorderColor || "#D4A84B"}
                            onChange={(e) => handleUpdateSettings("gameCardBorderColor", e.target.value)}
                            className="w-12 h-10 rounded cursor-pointer"
                          />
                          <Input
                            value={settings.gameCardBorderColor}
                            onChange={(e) => handleUpdateSettings("gameCardBorderColor", e.target.value)}
                            className="flex-1 border-gold/50"
                            placeholder="Leave empty for default"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="text-sm font-medium mb-2 block">Card Frame Image</label>
                        <ImageUpload
                          value={settings.gameCardFrameImage}
                          onChange={(url) => handleUpdateSettings("gameCardFrameImage", url)}
                          folder="card-frames"
                          aspectRatio="square"
                          placeholder="Upload Frame"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-2 block">Card Border Image</label>
                        <ImageUpload
                          value={settings.gameCardBorderImage}
                          onChange={(url) => handleUpdateSettings("gameCardBorderImage", url)}
                          folder="card-borders"
                          aspectRatio="square"
                          placeholder="Upload Border"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Package Styling */}
                <Card className="border-gold/30">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="w-5 h-5 text-gold" />
                      Package Styling
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="text-sm font-medium mb-2 block">Package Background Color</label>
                        <div className="flex gap-2">
                          <input
                            type="color"
                            value={settings.packageBgColor || "#1a1a1a"}
                            onChange={(e) => handleUpdateSettings("packageBgColor", e.target.value)}
                            className="w-12 h-10 rounded cursor-pointer"
                          />
                          <Input
                            value={settings.packageBgColor}
                            onChange={(e) => handleUpdateSettings("packageBgColor", e.target.value)}
                            className="flex-1 border-gold/50"
                            placeholder="Leave empty for default gradient"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-2 block">Package Background Image</label>
                        <ImageUpload
                          value={settings.packageBgImage}
                          onChange={(url) => handleUpdateSettings("packageBgImage", url)}
                          folder="package-bg"
                          aspectRatio="wide"
                          placeholder="Upload Background"
                        />
                      </div>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="text-sm font-medium mb-2 block">Package Text Color</label>
                        <div className="flex gap-2">
                          <input
                            type="color"
                            value={settings.packageTextColor || "#ffffff"}
                            onChange={(e) => handleUpdateSettings("packageTextColor", e.target.value)}
                            className="w-12 h-10 rounded cursor-pointer"
                          />
                          <Input
                            value={settings.packageTextColor}
                            onChange={(e) => handleUpdateSettings("packageTextColor", e.target.value)}
                            className="flex-1 border-gold/50"
                            placeholder="Leave empty for white"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-2 block">Package Price Color</label>
                        <div className="flex gap-2">
                          <input
                            type="color"
                            value={settings.packagePriceColor || "#ffffff"}
                            onChange={(e) => handleUpdateSettings("packagePriceColor", e.target.value)}
                            className="w-12 h-10 rounded cursor-pointer"
                          />
                          <Input
                            value={settings.packagePriceColor}
                            onChange={(e) => handleUpdateSettings("packagePriceColor", e.target.value)}
                            className="flex-1 border-gold/50"
                            placeholder="Leave empty for white"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="text-sm font-medium mb-2 block">
                          Package Icon (replaces default diamond)
                        </label>
                        <ImageUpload
                          value={settings.packageIconUrl}
                          onChange={(url) => handleUpdateSettings("packageIconUrl", url)}
                          folder="package-icons"
                          aspectRatio="square"
                          placeholder="Upload Icon"
                          className="max-w-[100px]"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-2 block">Currency Format</label>
                        <select
                          value={settings.packageCurrency || "USD"}
                          onChange={(e) => {
                            const currency = e.target.value;
                            const symbols: Record<string, string> = {
                              USD: "$",
                              KHR: "៛",
                              THB: "฿",
                              VND: "₫",
                              EUR: "€",
                              GBP: "£",
                              IDR: "Rp",
                              MYR: "RM",
                              SGD: "S$",
                              PHP: "₱",
                            };
                            handleUpdateSettings("packageCurrency", currency);
                            handleUpdateSettings("packageCurrencySymbol", symbols[currency] || "$");
                          }}
                          className="w-full h-10 px-3 rounded-md border border-gold/50 bg-background text-foreground"
                        >
                          <option value="USD">USD ($)</option>
                          <option value="KHR">KHR (៛)</option>
                          <option value="THB">THB (฿)</option>
                          <option value="VND">VND (₫)</option>
                          <option value="EUR">EUR (€)</option>
                          <option value="GBP">GBP (£)</option>
                          <option value="IDR">IDR (Rp)</option>
                          <option value="MYR">MYR (RM)</option>
                          <option value="SGD">SGD (S$)</option>
                          <option value="PHP">PHP (₱)</option>
                        </select>
                        <p className="text-xs text-muted-foreground mt-1">
                          Current symbol: {settings.packageCurrencySymbol || "$"}
                        </p>
                      </div>
                    </div>

                    {/* Size Controls */}
                    <div className="pt-4 border-t border-border">
                      <h4 className="text-sm font-medium mb-4">Size Settings</h4>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <label className="text-sm font-medium mb-2 block">
                            Package Height: {settings.packageHeight || 36}px
                          </label>
                          <input
                            type="range"
                            min="28"
                            max="80"
                            value={settings.packageHeight || 36}
                            onChange={(e) => handleUpdateSettings("packageHeight", parseInt(e.target.value))}
                            className="w-full h-2 bg-gold/20 rounded-lg appearance-none cursor-pointer accent-gold"
                          />
                          <div className="flex justify-between text-xs text-muted-foreground mt-1">
                            <span>28px</span>
                            <span>80px</span>
                          </div>
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-2 block">
                            Icon Width: {settings.packageIconWidth || 24}px
                          </label>
                          <input
                            type="range"
                            min="12"
                            max="72"
                            value={settings.packageIconWidth || 24}
                            onChange={(e) => handleUpdateSettings("packageIconWidth", parseInt(e.target.value))}
                            className="w-full h-2 bg-gold/20 rounded-lg appearance-none cursor-pointer accent-gold"
                          />
                          <div className="flex justify-between text-xs text-muted-foreground mt-1">
                            <span>12px</span>
                            <span>72px</span>
                          </div>
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-2 block">
                            Icon Height: {settings.packageIconHeight || 24}px
                          </label>
                          <input
                            type="range"
                            min="12"
                            max="72"
                            value={settings.packageIconHeight || 24}
                            onChange={(e) => handleUpdateSettings("packageIconHeight", parseInt(e.target.value))}
                            className="w-full h-2 bg-gold/20 rounded-lg appearance-none cursor-pointer accent-gold"
                          />
                          <div className="flex justify-between text-xs text-muted-foreground mt-1">
                            <span>12px</span>
                            <span>72px</span>
                          </div>
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-2 block">
                            Icon Size (Desktop): {settings.packageIconSizeDesktop || 32}px
                          </label>
                          <input
                            type="range"
                            min="16"
                            max="80"
                            value={settings.packageIconSizeDesktop || 32}
                            onChange={(e) => handleUpdateSettings("packageIconSizeDesktop", parseInt(e.target.value))}
                            className="w-full h-2 bg-gold/20 rounded-lg appearance-none cursor-pointer accent-gold"
                          />
                          <div className="flex justify-between text-xs text-muted-foreground mt-1">
                            <span>16px</span>
                            <span>80px</span>
                          </div>
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-2 block">
                            Icon Size (Mobile): {settings.packageIconSizeMobile || 50}px
                          </label>
                          <input
                            type="range"
                            min="16"
                            max="80"
                            value={settings.packageIconSizeMobile || 50}
                            onChange={(e) => handleUpdateSettings("packageIconSizeMobile", parseInt(e.target.value))}
                            className="w-full h-2 bg-gold/20 rounded-lg appearance-none cursor-pointer accent-gold"
                          />
                          <div className="flex justify-between text-xs text-muted-foreground mt-1">
                            <span>16px</span>
                            <span>80px</span>
                          </div>
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-2 block">
                            Text Size: {settings.packageTextSize || 14}px
                          </label>
                          <input
                            type="range"
                            min="8"
                            max="36"
                            value={settings.packageTextSize || 14}
                            onChange={(e) => handleUpdateSettings("packageTextSize", parseInt(e.target.value))}
                            className="w-full h-2 bg-gold/20 rounded-lg appearance-none cursor-pointer accent-gold"
                          />
                          <div className="flex justify-between text-xs text-muted-foreground mt-1">
                            <span>8px</span>
                            <span>36px</span>
                          </div>
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-2 block">
                            Price Size: {settings.packagePriceSize || 14}px
                          </label>
                          <input
                            type="range"
                            min="8"
                            max="36"
                            value={settings.packagePriceSize || 14}
                            onChange={(e) => handleUpdateSettings("packagePriceSize", parseInt(e.target.value))}
                            className="w-full h-2 bg-gold/20 rounded-lg appearance-none cursor-pointer accent-gold"
                          />
                          <div className="flex justify-between text-xs text-muted-foreground mt-1">
                            <span>8px</span>
                            <span>36px</span>
                          </div>
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-2 block">
                            Text Weight: {settings.packageTextWeight || 700}
                          </label>
                          <select
                            value={settings.packageTextWeight || 700}
                            onChange={(e) => handleUpdateSettings("packageTextWeight", parseInt(e.target.value))}
                            className="w-full h-10 px-3 rounded-md border border-gold/50 bg-background text-foreground"
                          >
                            <option value={400}>Normal (400)</option>
                            <option value={500}>Medium (500)</option>
                            <option value={600}>Semibold (600)</option>
                            <option value={700}>Bold (700)</option>
                            <option value={800}>Extrabold (800)</option>
                            <option value={900}>Black (900)</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-2 block">
                            Price Weight: {settings.packagePriceWeight || 700}
                          </label>
                          <select
                            value={settings.packagePriceWeight || 700}
                            onChange={(e) => handleUpdateSettings("packagePriceWeight", parseInt(e.target.value))}
                            className="w-full h-10 px-3 rounded-md border border-gold/50 bg-background text-foreground"
                          >
                            <option value={400}>Normal (400)</option>
                            <option value={500}>Medium (500)</option>
                            <option value={600}>Semibold (600)</option>
                            <option value={700}>Bold (700)</option>
                            <option value={800}>Extrabold (800)</option>
                            <option value={900}>Black (900)</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-2 block">
                            Package Border Width: {settings.packageBorderWidth || 0}px
                          </label>
                          <input
                            type="range"
                            min="0"
                            max="6"
                            value={settings.packageBorderWidth || 0}
                            onChange={(e) => handleUpdateSettings("packageBorderWidth", parseInt(e.target.value))}
                            className="w-full h-2 bg-gold/20 rounded-lg appearance-none cursor-pointer accent-gold"
                          />
                          <div className="flex justify-between text-xs text-muted-foreground mt-1">
                            <span>0px</span>
                            <span>6px</span>
                          </div>
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-2 block">Package Border Color</label>
                          <div className="flex gap-2">
                            <input
                              type="color"
                              value={settings.packageBorderColor || "#D4A84B"}
                              onChange={(e) => handleUpdateSettings("packageBorderColor", e.target.value)}
                              className="w-12 h-10 rounded cursor-pointer"
                            />
                            <Input
                              value={settings.packageBorderColor || ""}
                              onChange={(e) => handleUpdateSettings("packageBorderColor", e.target.value)}
                              className="flex-1 border-gold/50"
                              placeholder="#D4A84B"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Frame Styling */}
                <Card className="border-gold/30">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Palette className="w-5 h-5 text-gold" />
                      Frame Styling
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="text-sm font-medium mb-2 block">Frame Color</label>
                        <div className="flex gap-2">
                          <input
                            type="color"
                            value={settings.frameColor || "#D4A84B"}
                            onChange={(e) => handleUpdateSettings("frameColor", e.target.value)}
                            className="w-12 h-10 rounded cursor-pointer"
                          />
                          <Input
                            value={settings.frameColor || ""}
                            onChange={(e) => handleUpdateSettings("frameColor", e.target.value)}
                            className="flex-1 border-gold/50"
                            placeholder="#D4A84B (Gold)"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-2 block">
                          Frame Border Width: {settings.frameBorderWidth || 4}px
                        </label>
                        <input
                          type="range"
                          min="1"
                          max="8"
                          value={settings.frameBorderWidth || 4}
                          onChange={(e) => handleUpdateSettings("frameBorderWidth", parseInt(e.target.value))}
                          className="w-full h-2 bg-gold/20 rounded-lg appearance-none cursor-pointer accent-gold"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground mt-1">
                          <span>1px</span>
                          <span>8px</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* ID Section Styling */}
                <Card className="border-gold/30">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Palette className="w-5 h-5 text-gold" />
                      ID Section Styling
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="text-sm font-medium mb-2 block">ID Section Background Color</label>
                        <div className="flex gap-2">
                          <input
                            type="color"
                            value={settings.idSectionBgColor || "#f5f0e6"}
                            onChange={(e) => handleUpdateSettings("idSectionBgColor", e.target.value)}
                            className="w-12 h-10 rounded cursor-pointer"
                          />
                          <Input
                            value={settings.idSectionBgColor || ""}
                            onChange={(e) => handleUpdateSettings("idSectionBgColor", e.target.value)}
                            className="flex-1 border-gold/50"
                            placeholder="Leave empty for default"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-2 block">ID Section Text Color</label>
                        <div className="flex gap-2">
                          <input
                            type="color"
                            value={settings.idSectionTextColor || "#333333"}
                            onChange={(e) => handleUpdateSettings("idSectionTextColor", e.target.value)}
                            className="w-12 h-10 rounded cursor-pointer"
                          />
                          <Input
                            value={settings.idSectionTextColor || ""}
                            onChange={(e) => handleUpdateSettings("idSectionTextColor", e.target.value)}
                            className="flex-1 border-gold/50"
                            placeholder="Leave empty for default"
                          />
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">ID Section Background Image</label>
                      <ImageUpload
                        value={settings.idSectionBgImage}
                        onChange={(url) => handleUpdateSettings("idSectionBgImage", url)}
                        folder="section-bg"
                        aspectRatio="wide"
                        placeholder="Upload Background"
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Payment Section Styling */}
                <Card className="border-gold/30">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CreditCard className="w-5 h-5 text-gold" />
                      Payment Section Styling
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="text-sm font-medium mb-2 block">Payment Section Background Color</label>
                        <div className="flex gap-2">
                          <input
                            type="color"
                            value={settings.paymentSectionBgColor || "#f5f0e6"}
                            onChange={(e) => handleUpdateSettings("paymentSectionBgColor", e.target.value)}
                            className="w-12 h-10 rounded cursor-pointer"
                          />
                          <Input
                            value={settings.paymentSectionBgColor || ""}
                            onChange={(e) => handleUpdateSettings("paymentSectionBgColor", e.target.value)}
                            className="flex-1 border-gold/50"
                            placeholder="Leave empty for default"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-2 block">Payment Section Text Color</label>
                        <div className="flex gap-2">
                          <input
                            type="color"
                            value={settings.paymentSectionTextColor || "#333333"}
                            onChange={(e) => handleUpdateSettings("paymentSectionTextColor", e.target.value)}
                            className="w-12 h-10 rounded cursor-pointer"
                          />
                          <Input
                            value={settings.paymentSectionTextColor || ""}
                            onChange={(e) => handleUpdateSettings("paymentSectionTextColor", e.target.value)}
                            className="flex-1 border-gold/50"
                            placeholder="Leave empty for default"
                          />
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Payment Section Background Image</label>
                      <ImageUpload
                        value={settings.paymentSectionBgImage}
                        onChange={(url) => handleUpdateSettings("paymentSectionBgImage", url)}
                        folder="section-bg"
                        aspectRatio="wide"
                        placeholder="Upload Background"
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Footer Settings */}
                <Card className="border-gold/30">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Palette className="w-5 h-5 text-gold" />
                      Footer Settings
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Footer Text (Copyright)</label>
                      <Input
                        value={settings.footerText}
                        onChange={(e) => handleUpdateSettings("footerText", e.target.value)}
                        className="border-gold/50"
                        placeholder="Custom footer text (leave empty for default)"
                      />
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="text-sm font-medium mb-2 block">Footer Background Color</label>
                        <div className="flex gap-2">
                          <input
                            type="color"
                            value={settings.footerBgColor || "#9b7bb8"}
                            onChange={(e) => handleUpdateSettings("footerBgColor", e.target.value)}
                            className="w-12 h-10 rounded cursor-pointer"
                          />
                          <Input
                            value={settings.footerBgColor}
                            onChange={(e) => handleUpdateSettings("footerBgColor", e.target.value)}
                            className="flex-1 border-gold/50"
                            placeholder="Leave empty for default"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-2 block">Footer Text Color</label>
                        <div className="flex gap-2">
                          <input
                            type="color"
                            value={settings.footerTextColor || "#f5e6f5"}
                            onChange={(e) => handleUpdateSettings("footerTextColor", e.target.value)}
                            className="w-12 h-10 rounded cursor-pointer"
                          />
                          <Input
                            value={settings.footerTextColor}
                            onChange={(e) => handleUpdateSettings("footerTextColor", e.target.value)}
                            className="flex-1 border-gold/50"
                            placeholder="Leave empty for default"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Social Icons */}
                    <div className="pt-4 border-t border-border">
                      <h4 className="text-sm font-medium mb-4">Social Media Icons & Links</h4>
                      <div className="grid gap-6 md:grid-cols-3">
                        <div className="space-y-2">
                          <label className="text-sm font-medium block">Telegram Icon</label>
                          <ImageUpload
                            value={settings.footerTelegramIcon}
                            onChange={(url) => handleUpdateSettings("footerTelegramIcon", url)}
                            folder="social-icons"
                            aspectRatio="square"
                            placeholder="Upload Telegram"
                            className="max-w-[100px]"
                          />
                          <Input
                            value={settings.footerTelegramUrl}
                            onChange={(e) => handleUpdateSettings("footerTelegramUrl", e.target.value)}
                            className="border-gold/50"
                            placeholder="Telegram URL"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium block">TikTok Icon</label>
                          <ImageUpload
                            value={settings.footerTiktokIcon}
                            onChange={(url) => handleUpdateSettings("footerTiktokIcon", url)}
                            folder="social-icons"
                            aspectRatio="square"
                            placeholder="Upload TikTok"
                            className="max-w-[100px]"
                          />
                          <Input
                            value={settings.footerTiktokUrl}
                            onChange={(e) => handleUpdateSettings("footerTiktokUrl", e.target.value)}
                            className="border-gold/50"
                            placeholder="TikTok URL"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium block">Facebook Icon</label>
                          <ImageUpload
                            value={settings.footerFacebookIcon}
                            onChange={(url) => handleUpdateSettings("footerFacebookIcon", url)}
                            folder="social-icons"
                            aspectRatio="square"
                            placeholder="Upload Facebook"
                            className="max-w-[100px]"
                          />
                          <Input
                            value={settings.footerFacebookUrl}
                            onChange={(e) => handleUpdateSettings("footerFacebookUrl", e.target.value)}
                            className="border-gold/50"
                            placeholder="Facebook URL"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Payment Icons */}
                    <div className="pt-4 border-t border-border">
                      <h4 className="text-sm font-medium mb-4">Payment Method Icons</h4>
                      <div className="mb-4">
                        <label className="text-sm font-medium mb-2 block">
                          Icon Size: {settings.footerPaymentIconSize || 32}px
                        </label>
                        <input
                          type="range"
                          min="16"
                          max="64"
                          value={settings.footerPaymentIconSize || 32}
                          onChange={(e) => handleUpdateSettings("footerPaymentIconSize", parseInt(e.target.value))}
                          className="w-full h-2 bg-gold/20 rounded-lg appearance-none cursor-pointer accent-gold"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground mt-1">
                          <span>16px</span>
                          <span>64px</span>
                        </div>
                      </div>
                      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
                        {(settings.footerPaymentIcons || []).map((icon, index) => (
                          <div key={index} className="relative">
                            <img
                              src={icon}
                              alt={`Payment ${index + 1}`}
                              className="w-full h-12 object-contain bg-white rounded p-1"
                            />
                            <button
                              onClick={() => {
                                const newIcons = [...(settings.footerPaymentIcons || [])];
                                newIcons.splice(index, 1);
                                handleUpdateSettings("footerPaymentIcons", newIcons as any);
                              }}
                              className="absolute -top-2 -right-2 w-5 h-5 bg-destructive text-white rounded-full text-xs flex items-center justify-center"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                        <ImageUpload
                          value=""
                          onChange={(url) => {
                            if (url) {
                              const newIcons = [...(settings.footerPaymentIcons || []), url];
                              handleUpdateSettings("footerPaymentIcons", newIcons as any);
                            }
                          }}
                          folder="payment-icons"
                          aspectRatio="wide"
                          placeholder="Add Payment Icon"
                          className="h-12"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Topup Page Settings */}
                <Card className="border-gold/30">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Palette className="w-5 h-5 text-gold" />
                      Topup Page Settings
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Topup Background Image</label>
                      <ImageUpload
                        value={settings.topupBackgroundImage}
                        onChange={(url) => handleUpdateSettings("topupBackgroundImage", url)}
                        folder="topup-backgrounds"
                        aspectRatio="wide"
                        placeholder="Upload Topup Background"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Topup Background Color</label>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          value={settings.topupBackgroundColor || "#1a1a1a"}
                          onChange={(e) => handleUpdateSettings("topupBackgroundColor", e.target.value)}
                          className="w-12 h-10 rounded cursor-pointer"
                        />
                        <Input
                          value={settings.topupBackgroundColor}
                          onChange={(e) => handleUpdateSettings("topupBackgroundColor", e.target.value)}
                          className="flex-1 border-gold/50"
                          placeholder="Leave empty for default"
                        />
                      </div>
                    </div>
                    <div className="pt-4 border-t border-border">
                      <h4 className="text-sm font-medium mb-4">Topup Banner</h4>
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium mb-2 block">Banner Image</label>
                          <ImageUpload
                            value={settings.topupBannerImage}
                            onChange={(url) => handleUpdateSettings("topupBannerImage", url)}
                            folder="topup-banners"
                            aspectRatio="wide"
                            placeholder="Upload Topup Banner"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-2 block">Banner Accent Color</label>
                          <div className="flex gap-2">
                            <input
                              type="color"
                              value={settings.topupBannerColor || "#D4A84B"}
                              onChange={(e) => handleUpdateSettings("topupBannerColor", e.target.value)}
                              className="w-12 h-10 rounded cursor-pointer"
                            />
                            <Input
                              value={settings.topupBannerColor}
                              onChange={(e) => handleUpdateSettings("topupBannerColor", e.target.value)}
                              className="flex-1 border-gold/50"
                              placeholder="Leave empty for default gold"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Games Management */}
            <TabsContent value="games">
              {/* G2Bulk Sync Widget */}
              <div className="mb-6">
                <G2BulkSyncWidget />
              </div>

              {/* Full Import */}
              <div className="mb-6">
                <G2BulkFullImport onImportComplete={refreshGames} />
              </div>

              {/* Bulk Linker */}
              <div className="mb-6">
                <G2BulkBulkLinker games={games} onLinkComplete={refreshGames} />
              </div>

              {/* AI Image Generator */}
              <div className="mb-6">
                <AIBulkImageGenerator games={games} onComplete={refreshGames} />
              </div>
              <Card className="border-gold/30 mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Plus className="w-5 h-5 text-gold" />
                    Add New Game
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-4 items-end flex-wrap">
                    <div className="w-24">
                      <label className="text-sm font-medium mb-2 block">Image</label>
                      <ImageUpload
                        value={newGame.image}
                        onChange={(url) => setNewGame((prev) => ({ ...prev, image: url }))}
                        folder="games"
                        aspectRatio="square"
                        placeholder="Game"
                      />
                    </div>
                    <div className="flex-1 min-w-[200px]">
                      <label className="text-sm font-medium mb-2 block">Game Name</label>
                      <Input
                        placeholder="e.g. Mobile Legends"
                        value={newGame.name}
                        onChange={(e) => setNewGame((prev) => ({ ...prev, name: e.target.value }))}
                        className="border-gold/50"
                      />
                    </div>
                    <div className="flex-1 min-w-[150px]">
                      <label className="text-sm font-medium mb-2 block">URL Slug</label>
                      <Input
                        placeholder="e.g. mobile-legends"
                        value={newGame.slug}
                        onChange={(e) => setNewGame((prev) => ({ ...prev, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))}
                        className="border-gold/50"
                      />
                      <p className="text-xs text-muted-foreground mt-1">Auto-generated if empty</p>
                    </div>
                    <div className="flex-1 min-w-[250px]">
                      <label className="text-sm font-medium mb-2 block">Link to G2Bulk Category</label>
                      <G2BulkCategorySelector
                        value={newGame.g2bulkCategoryId}
                        onChange={(catId, catName) => {
                          setNewGame((prev) => ({
                            ...prev,
                            g2bulkCategoryId: catId || "",
                            name: prev.name || catName || "",
                          }));
                        }}
                        placeholder="Select G2Bulk game..."
                      />
                    </div>
                    <Button onClick={handleAddGame} className="bg-gold hover:bg-gold-dark text-primary-foreground">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Game
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-4">
                {games.map((game) => (
                  <Card key={game.id} className="border-gold/30">
                    <CardContent className="p-4">
                      {editingGame === game.id ? (
                        <div className="space-y-4">
                          <div className="flex gap-4 items-start flex-wrap">
                            <div className="w-20">
                              <ImageUpload
                                value={editGameData.image}
                                onChange={(url) => setEditGameData((prev) => ({ ...prev, image: url }))}
                                folder="games"
                                aspectRatio="square"
                              />
                            </div>
                            <div className="flex-1 min-w-[150px]">
                              <label className="text-xs text-muted-foreground mb-1 block">Name</label>
                              <Input
                                value={editGameData.name}
                                onChange={(e) => setEditGameData((prev) => ({ ...prev, name: e.target.value }))}
                                className="border-gold/50"
                              />
                            </div>
                            <div className="flex-1 min-w-[120px]">
                              <label className="text-xs text-muted-foreground mb-1 block">URL Slug</label>
                              <Input
                                value={editGameData.slug}
                                onChange={(e) => setEditGameData((prev) => ({ ...prev, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))}
                                className="border-gold/50"
                              />
                            </div>
                            <div className="flex-1 min-w-[200px]">
                              <label className="text-xs text-muted-foreground mb-1 block">G2Bulk Category</label>
                              <G2BulkCategorySelector
                                value={editGameData.g2bulkCategoryId}
                                onChange={(catId) =>
                                  setEditGameData((prev) => ({ ...prev, g2bulkCategoryId: catId || "" }))
                                }
                                placeholder="Link to G2Bulk..."
                              />
                            </div>
                          </div>
                          <div className="flex gap-2 justify-end">
                            <Button variant="outline" size="sm" onClick={() => setEditingGame(null)}>
                              <X className="w-4 h-4 mr-1" />
                              Cancel
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleSaveGame(game.id)}
                              className="bg-gold hover:bg-gold-dark text-primary-foreground"
                            >
                              <Save className="w-4 h-4 mr-1" />
                              Save
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-4">
                            <img
                              src={game.image}
                              alt={game.name}
                              className="w-16 h-16 rounded-lg object-cover border-2 border-gold/50"
                            />
                            <div className="flex-1">
                              <h3 className="font-bold">{game.name}</h3>
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <p className="text-sm text-muted-foreground">
                                  {game.packages.length + game.specialPackages.length} packages
                                </p>
                                {game.g2bulkCategoryId && (
                                  <span className="text-xs bg-green-500/20 text-green-600 px-2 py-0.5 rounded-full flex items-center gap-1">
                                    ✓ G2Bulk Linked
                                  </span>
                                )}
                              </div>
                              <div className="mt-1">
                                <G2BulkLinkStats game={game} productStatuses={productStatuses} compact />
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <div className="flex flex-col gap-1">
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="border-gold/50 h-7 w-7"
                                  onClick={() => moveGame(game.id, "up")}
                                  disabled={games.findIndex((g) => g.id === game.id) === 0}
                                >
                                  <ArrowUp className="w-3 h-3" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="border-gold/50 h-7 w-7"
                                  onClick={() => moveGame(game.id, "down")}
                                  disabled={games.findIndex((g) => g.id === game.id) === games.length - 1}
                                >
                                  <ArrowDown className="w-3 h-3" />
                                </Button>
                              </div>
                              <Button
                                variant="outline"
                                size="icon"
                                className="border-gold/50"
                                onClick={() => setExpandedGame(expandedGame === game.id ? null : game.id)}
                              >
                                {expandedGame === game.id ? (
                                  <ChevronUp className="w-4 h-4" />
                                ) : (
                                  <ChevronDown className="w-4 h-4" />
                                )}
                              </Button>
                              <AIGameImageGenerator
                                gameName={game.name}
                                gameId={game.id}
                                currentImage={game.image}
                                onImageGenerated={(url) => {
                                  refreshGames();
                                }}
                                variant="icon"
                              />
                              <Button
                                variant="outline"
                                size="icon"
                                className="border-gold/50"
                                onClick={() => handleStartEditGame(game)}
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={async () => {
                                  await deleteGame(game.id);
                                  toast({ title: "Game deleted" });
                                }}
                                className="border-destructive/50 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>

                          {/* Package Management */}
                          {expandedGame === game.id && (
                            <>
                              <div className="mt-4 pt-4 border-t border-border space-y-4">
                                <h4 className="font-semibold flex items-center gap-2">
                                  <DollarSign className="w-4 h-4 text-gold" />
                                  Packages
                                </h4>

                                {/* Add New Package */}
                                <div className="bg-secondary/50 rounded-lg p-3 space-y-3">
                                  <p className="text-sm font-medium">Add New Package</p>
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                    <div className="col-span-2">
                                      <Input
                                        placeholder="Package Name"
                                        value={newPackage.name}
                                        onChange={(e) => setNewPackage((prev) => ({ ...prev, name: e.target.value }))}
                                        className="border-gold/50 text-sm"
                                      />
                                    </div>
                                    <Input
                                      type="text"
                                      placeholder="Amount"
                                      value={newPackage.amount}
                                      onChange={(e) => setNewPackage((prev) => ({ ...prev, amount: e.target.value }))}
                                      className="border-gold/50 text-sm"
                                    />
                                    <Input
                                      type="number"
                                      step="0.01"
                                      placeholder="Price"
                                      value={newPackage.price || ""}
                                      onChange={(e) =>
                                        setNewPackage((prev) => ({ ...prev, price: Number(e.target.value) }))
                                      }
                                      className="border-gold/50 text-sm"
                                    />
                                  </div>
                                  {/* G2Bulk Product Selector for new package */}
                                  {game.g2bulkCategoryId && (
                                    <div className="border border-dashed border-gold/30 rounded-lg p-2 bg-gold/5">
                                      <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                                        <Link2 className="w-3 h-3" />
                                        Link to G2Bulk Product (optional)
                                      </p>
                                      <G2BulkProductSelector
                                        value={newPackage.g2bulkProductId}
                                        gameName={game.name}
                                        g2bulkCategoryId={game.g2bulkCategoryId}
                                        onChange={(productId, typeId) => {
                                          setNewPackage((prev) => ({
                                            ...prev,
                                            g2bulkProductId: productId || "",
                                            g2bulkTypeId: typeId || "",
                                          }));
                                        }}
                                      />
                                    </div>
                                  )}
                                  <div className="flex gap-2 items-end flex-wrap">
                                    <div className="w-16">
                                      <ImageUpload
                                        value={newPackage.icon}
                                        onChange={(url) => setNewPackage((prev) => ({ ...prev, icon: url }))}
                                        folder="packages"
                                        aspectRatio="square"
                                        placeholder="Icon"
                                      />
                                    </div>
                                    <div className="flex-1 min-w-[150px]">
                                      <Input
                                        placeholder="Label text (optional)"
                                        value={newPackage.label}
                                        onChange={(e) => setNewPackage((prev) => ({ ...prev, label: e.target.value }))}
                                        className="border-gold/50 text-sm"
                                      />
                                    </div>
                                    <Button
                                      size="sm"
                                      onClick={() => handleAddPackage(game.id)}
                                      className="bg-gold hover:bg-gold-dark text-primary-foreground"
                                    >
                                      <Plus className="w-4 h-4 mr-1" />
                                      Add
                                    </Button>
                                  </div>
                                  {/* Label styling row */}
                                  <div className="flex gap-2 items-center flex-wrap">
                                    <div className="w-10">
                                      <ImageUpload
                                        value={newPackage.labelIcon}
                                        onChange={(url) => setNewPackage((prev) => ({ ...prev, labelIcon: url }))}
                                        folder="packages"
                                        aspectRatio="square"
                                        placeholder="🏷️"
                                      />
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <span className="text-xs text-muted-foreground">BG:</span>
                                      <input
                                        type="color"
                                        value={newPackage.labelBgColor}
                                        onChange={(e) =>
                                          setNewPackage((prev) => ({ ...prev, labelBgColor: e.target.value }))
                                        }
                                        className="w-8 h-8 rounded cursor-pointer border border-border"
                                      />
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <span className="text-xs text-muted-foreground">Text:</span>
                                      <input
                                        type="color"
                                        value={newPackage.labelTextColor}
                                        onChange={(e) =>
                                          setNewPackage((prev) => ({ ...prev, labelTextColor: e.target.value }))
                                        }
                                        className="w-8 h-8 rounded cursor-pointer border border-border"
                                      />
                                    </div>
                                  </div>
                                </div>

                                {/* G2Bulk Auto Import */}
                                {game.g2bulkCategoryId && (
                                  <G2BulkAutoImport
                                    gameId={game.id}
                                    gameName={game.name}
                                    g2bulkCategoryId={game.g2bulkCategoryId}
                                    existingProductIds={game.packages
                                      .filter((p) => p.g2bulkProductId)
                                      .map((p) => p.g2bulkProductId!)}
                                    onImport={async (products) => {
                                      for (const product of products) {
                                        await addPackage(game.id, {
                                          name: product.name,
                                          amount: product.amount,
                                          price: product.price,
                                          currency: "USD",
                                          g2bulkProductId: product.g2bulkProductId,
                                          g2bulkTypeId: product.g2bulkTypeId,
                                        });
                                      }
                                    }}
                                  />
                                )}

                                {/* Package List */}
                                <div className="flex items-center justify-between gap-3 mb-3">
                                  <p className="text-sm font-medium">Packages</p>
                                  <div className="flex items-center gap-1">
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant={packageListSort === "price" ? "default" : "outline"}
                                      onClick={() => setPackageListSort("price")}
                                    >
                                      Price ↑
                                    </Button>
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant={packageListSort === "manual" ? "default" : "outline"}
                                      onClick={() => setPackageListSort("manual")}
                                    >
                                      Manual
                                    </Button>
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  {(packageListSort === "price"
                                    ? [...game.packages].sort((a, b) => a.price - b.price)
                                    : game.packages
                                  ).map((pkg) => (
                                    <div key={pkg.id} className="bg-card border border-border rounded-lg p-3">
                                      {editingPackage === pkg.id ? (
                                        <div className="space-y-3">
                                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                            <div className="col-span-2">
                                              <Input
                                                value={editPackageData.name}
                                                onChange={(e) =>
                                                  setEditPackageData((prev) => ({ ...prev, name: e.target.value }))
                                                }
                                                className="border-gold/50 text-sm"
                                              />
                                            </div>
                                            <Input
                                              type="text"
                                              value={editPackageData.amount}
                                              onChange={(e) =>
                                                setEditPackageData((prev) => ({ ...prev, amount: e.target.value }))
                                              }
                                              className="border-gold/50 text-sm"
                                            />
                                            <Input
                                              type="number"
                                              step="0.01"
                                              value={editPackageData.price}
                                              onChange={(e) =>
                                                setEditPackageData((prev) => ({
                                                  ...prev,
                                                  price: Number(e.target.value),
                                                }))
                                              }
                                              className="border-gold/50 text-sm"
                                            />
                                          </div>
                                          <div className="flex gap-2 items-center flex-wrap">
                                            <div className="w-12">
                                              <ImageUpload
                                                value={editPackageData.icon}
                                                onChange={(url) =>
                                                  setEditPackageData((prev) => ({ ...prev, icon: url }))
                                                }
                                                folder="packages"
                                                aspectRatio="square"
                                              />
                                            </div>
                                            <div className="flex-1 min-w-[120px]">
                                              <Input
                                                placeholder="Label text (optional)"
                                                value={editPackageData.label}
                                                onChange={(e) =>
                                                  setEditPackageData((prev) => ({ ...prev, label: e.target.value }))
                                                }
                                                className="border-gold/50 text-sm"
                                              />
                                            </div>
                                            <div className="w-10">
                                              <ImageUpload
                                                value={editPackageData.labelIcon}
                                                onChange={(url) =>
                                                  setEditPackageData((prev) => ({ ...prev, labelIcon: url }))
                                                }
                                                folder="packages"
                                                aspectRatio="square"
                                                placeholder="🏷️"
                                              />
                                            </div>
                                            <div className="flex items-center gap-1">
                                              <input
                                                type="color"
                                                value={editPackageData.labelBgColor}
                                                onChange={(e) =>
                                                  setEditPackageData((prev) => ({
                                                    ...prev,
                                                    labelBgColor: e.target.value,
                                                  }))
                                                }
                                                className="w-6 h-6 rounded cursor-pointer border border-border"
                                              />
                                            </div>
                                            <div className="flex items-center gap-1">
                                              <input
                                                type="color"
                                                value={editPackageData.labelTextColor}
                                                onChange={(e) =>
                                                  setEditPackageData((prev) => ({
                                                    ...prev,
                                                    labelTextColor: e.target.value,
                                                  }))
                                                }
                                                className="w-6 h-6 rounded cursor-pointer border border-border"
                                              />
                                            </div>
                                            <Button variant="outline" size="sm" onClick={() => setEditingPackage(null)}>
                                              <X className="w-3 h-3" />
                                            </Button>
                                            <Button
                                              size="sm"
                                              onClick={() => handleSavePackage(game.id, pkg.id)}
                                              className="bg-gold hover:bg-gold-dark text-primary-foreground"
                                            >
                                              <Save className="w-3 h-3" />
                                            </Button>
                                          </div>
                                        </div>
                                      ) : (
                                        <div
                                          className={`flex items-center gap-3 ${pkg.g2bulkProductId ? "border-l-2 border-l-green-500 pl-2" : "border-l-2 border-l-orange-400 pl-2"}`}
                                        >
                                          {pkg.icon ? (
                                            <img
                                              src={pkg.icon}
                                              alt={pkg.name}
                                              className="w-8 h-8 rounded object-cover"
                                            />
                                          ) : (
                                            <div className="w-8 h-8 bg-gold/20 rounded flex items-center justify-center text-xs">
                                              {pkg.amount}
                                            </div>
                                          )}
                                          <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                              <p className="font-medium text-sm">{pkg.name}</p>
                                              {pkg.g2bulkProductId ? (
                                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-green-500/10 text-green-600 text-[10px] rounded-full border border-green-500/20">
                                                  <Link2 className="w-3 h-3" />
                                                  Linked
                                                </span>
                                              ) : (
                                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-orange-500/10 text-orange-600 text-[10px] rounded-full border border-orange-500/20">
                                                  <Link2Off className="w-3 h-3" />
                                                  Manual
                                                </span>
                                              )}
                                              <PackageStockBadge
                                                g2bulkProductId={pkg.g2bulkProductId}
                                                productStatus={
                                                  pkg.g2bulkProductId
                                                    ? checkProductStatus(pkg.g2bulkProductId)
                                                    : undefined
                                                }
                                              />
                                            </div>
                                            <p className="text-xs text-muted-foreground">
                                              {pkg.amount} units{pkg.label && ` • ${pkg.label}`}
                                            </p>
                                            <G2BulkProductSelector
                                              value={pkg.g2bulkProductId}
                                              gameName={game.name}
                                              g2bulkCategoryId={game.g2bulkCategoryId}
                                              onChange={(productId, typeId) => {
                                                updatePackage(game.id, pkg.id, {
                                                  g2bulkProductId: productId,
                                                  g2bulkTypeId: typeId,
                                                });
                                              }}
                                            />
                                          </div>
                                          <p className="font-bold text-gold">${pkg.price.toFixed(2)}</p>
                                          <div className="flex gap-1">
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className="h-7 w-7"
                                              onClick={() => movePackage(game.id, pkg.id, "up")}
                                              disabled={
                                                packageListSort === "price" ||
                                                game.packages.findIndex((p) => p.id === pkg.id) === 0
                                              }
                                            >
                                              <ArrowUp className="w-3 h-3" />
                                            </Button>
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className="h-7 w-7"
                                              onClick={() => movePackage(game.id, pkg.id, "down")}
                                              disabled={
                                                packageListSort === "price" ||
                                                game.packages.findIndex((p) => p.id === pkg.id) ===
                                                  game.packages.length - 1
                                              }
                                            >
                                              <ArrowDown className="w-3 h-3" />
                                            </Button>
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className="h-7 w-7 text-amber-500 hover:text-amber-600 hover:bg-amber-500/10"
                                              title="Clone to Special Package"
                                              onClick={async () => {
                                                await addSpecialPackage(game.id, {
                                                  name: pkg.name,
                                                  amount: pkg.amount,
                                                  price: pkg.price,
                                                  currency: pkg.currency,
                                                  icon: pkg.icon,
                                                  label: pkg.label || "Special",
                                                  labelBgColor: pkg.labelBgColor || "#dc2626",
                                                  labelTextColor: pkg.labelTextColor || "#ffffff",
                                                  labelIcon: pkg.labelIcon,
                                                  g2bulkProductId: pkg.g2bulkProductId,
                                                  g2bulkTypeId: pkg.g2bulkTypeId,
                                                });
                                                toast({ title: "Package cloned to Special Packages!" });
                                              }}
                                            >
                                              <Star className="w-3 h-3" />
                                            </Button>
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className="h-7 w-7"
                                              onClick={() => handleStartEditPackage(pkg)}
                                            >
                                              <Edit2 className="w-3 h-3" />
                                            </Button>
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className="h-7 w-7 text-destructive hover:text-destructive"
                                              onClick={async () => {
                                                await deletePackage(game.id, pkg.id);
                                                toast({ title: "Package deleted" });
                                              }}
                                            >
                                              <Trash2 className="w-3 h-3" />
                                            </Button>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Special Packages Section */}
                              {game.specialPackages && game.specialPackages.length >= 0 && (
                                <div className="mt-6 pt-4 border-t border-border space-y-4">
                                  <h4 className="font-semibold flex items-center gap-2">
                                    <span className="px-2 py-0.5 bg-gradient-to-r from-red-500 to-orange-500 text-white text-xs rounded-full">
                                      Special Price
                                    </span>
                                    Packages
                                  </h4>

                                  {/* Add New Special Package */}
                                  <div className="bg-orange-500/10 rounded-lg p-3 space-y-3">
                                    <p className="text-sm font-medium">Add New Special Package</p>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                      <div className="col-span-2">
                                        <Input
                                          placeholder="Package Name"
                                          value={newSpecialPackage.name}
                                          onChange={(e) =>
                                            setNewSpecialPackage((prev) => ({ ...prev, name: e.target.value }))
                                          }
                                          className="border-orange-500/50 text-sm"
                                        />
                                      </div>
                                      <Input
                                        type="text"
                                        placeholder="Amount"
                                        value={newSpecialPackage.amount}
                                        onChange={(e) =>
                                          setNewSpecialPackage((prev) => ({ ...prev, amount: e.target.value }))
                                        }
                                        className="border-orange-500/50 text-sm"
                                      />
                                      <Input
                                        type="number"
                                        step="0.01"
                                        placeholder="Price"
                                        value={newSpecialPackage.price || ""}
                                        onChange={(e) =>
                                          setNewSpecialPackage((prev) => ({ ...prev, price: Number(e.target.value) }))
                                        }
                                        className="border-orange-500/50 text-sm"
                                      />
                                    </div>
                                    {/* G2Bulk Product Selector for new special package */}
                                    {game.g2bulkCategoryId && (
                                      <div className="border border-dashed border-orange-500/30 rounded-lg p-2 bg-orange-500/5">
                                        <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                                          <Link2 className="w-3 h-3" />
                                          Link to G2Bulk Product (optional)
                                        </p>
                                        <G2BulkProductSelector
                                          value={newSpecialPackage.g2bulkProductId}
                                          gameName={game.name}
                                          g2bulkCategoryId={game.g2bulkCategoryId}
                                          onChange={(productId, typeId) => {
                                            setNewSpecialPackage((prev) => ({
                                              ...prev,
                                              g2bulkProductId: productId || "",
                                              g2bulkTypeId: typeId || "",
                                            }));
                                          }}
                                        />
                                      </div>
                                    )}
                                    <div className="flex gap-2 items-end flex-wrap">
                                      <div className="w-16">
                                        <ImageUpload
                                          value={newSpecialPackage.icon}
                                          onChange={(url) => setNewSpecialPackage((prev) => ({ ...prev, icon: url }))}
                                          folder="packages"
                                          aspectRatio="square"
                                          placeholder="Icon"
                                        />
                                      </div>
                                      <div className="flex-1 min-w-[150px]">
                                        <Input
                                          placeholder="Label text (optional)"
                                          value={newSpecialPackage.label}
                                          onChange={(e) =>
                                            setNewSpecialPackage((prev) => ({ ...prev, label: e.target.value }))
                                          }
                                          className="border-orange-500/50 text-sm"
                                        />
                                      </div>
                                      <Button
                                        size="sm"
                                        onClick={() => handleAddSpecialPackage(game.id)}
                                        className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white"
                                      >
                                        <Plus className="w-4 h-4 mr-1" />
                                        Add Special
                                      </Button>
                                    </div>
                                    {/* Label styling row */}
                                    <div className="flex gap-2 items-center flex-wrap">
                                      <div className="w-10">
                                        <ImageUpload
                                          value={newSpecialPackage.labelIcon}
                                          onChange={(url) =>
                                            setNewSpecialPackage((prev) => ({ ...prev, labelIcon: url }))
                                          }
                                          folder="packages"
                                          aspectRatio="square"
                                          placeholder="🏷️"
                                        />
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <span className="text-xs text-muted-foreground">BG:</span>
                                        <input
                                          type="color"
                                          value={newSpecialPackage.labelBgColor}
                                          onChange={(e) =>
                                            setNewSpecialPackage((prev) => ({ ...prev, labelBgColor: e.target.value }))
                                          }
                                          className="w-8 h-8 rounded cursor-pointer border border-border"
                                        />
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <span className="text-xs text-muted-foreground">Text:</span>
                                        <input
                                          type="color"
                                          value={newSpecialPackage.labelTextColor}
                                          onChange={(e) =>
                                            setNewSpecialPackage((prev) => ({
                                              ...prev,
                                              labelTextColor: e.target.value,
                                            }))
                                          }
                                          className="w-8 h-8 rounded cursor-pointer border border-border"
                                        />
                                      </div>
                                    </div>
                                  </div>

                                  {/* Special Package List */}
                                  <div className="space-y-2">
                                    {game.specialPackages.map((pkg) => (
                                      <div key={pkg.id} className="bg-card border border-orange-500/30 rounded-lg p-3">
                                        {editingSpecialPackage === pkg.id ? (
                                          <div className="space-y-3">
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                              <div className="col-span-2">
                                                <Input
                                                  value={editSpecialPackageData.name}
                                                  onChange={(e) =>
                                                    setEditSpecialPackageData((prev) => ({
                                                      ...prev,
                                                      name: e.target.value,
                                                    }))
                                                  }
                                                  className="border-orange-500/50 text-sm"
                                                />
                                              </div>
                                              <Input
                                                type="text"
                                                value={editSpecialPackageData.amount}
                                                onChange={(e) =>
                                                  setEditSpecialPackageData((prev) => ({
                                                    ...prev,
                                                    amount: e.target.value,
                                                  }))
                                                }
                                                className="border-orange-500/50 text-sm"
                                              />
                                              <Input
                                                type="number"
                                                step="0.01"
                                                value={editSpecialPackageData.price}
                                                onChange={(e) =>
                                                  setEditSpecialPackageData((prev) => ({
                                                    ...prev,
                                                    price: Number(e.target.value),
                                                  }))
                                                }
                                                className="border-orange-500/50 text-sm"
                                              />
                                            </div>
                                            <div className="flex gap-2 items-center flex-wrap">
                                              <div className="w-12">
                                                <ImageUpload
                                                  value={editSpecialPackageData.icon}
                                                  onChange={(url) =>
                                                    setEditSpecialPackageData((prev) => ({ ...prev, icon: url }))
                                                  }
                                                  folder="packages"
                                                  aspectRatio="square"
                                                />
                                              </div>
                                              <div className="flex-1 min-w-[120px]">
                                                <Input
                                                  placeholder="Label text (optional)"
                                                  value={editSpecialPackageData.label}
                                                  onChange={(e) =>
                                                    setEditSpecialPackageData((prev) => ({
                                                      ...prev,
                                                      label: e.target.value,
                                                    }))
                                                  }
                                                  className="border-orange-500/50 text-sm"
                                                />
                                              </div>
                                              <div className="w-10">
                                                <ImageUpload
                                                  value={editSpecialPackageData.labelIcon}
                                                  onChange={(url) =>
                                                    setEditSpecialPackageData((prev) => ({ ...prev, labelIcon: url }))
                                                  }
                                                  folder="packages"
                                                  aspectRatio="square"
                                                  placeholder="🏷️"
                                                />
                                              </div>
                                              <div className="flex items-center gap-1">
                                                <input
                                                  type="color"
                                                  value={editSpecialPackageData.labelBgColor}
                                                  onChange={(e) =>
                                                    setEditSpecialPackageData((prev) => ({
                                                      ...prev,
                                                      labelBgColor: e.target.value,
                                                    }))
                                                  }
                                                  className="w-6 h-6 rounded cursor-pointer border border-border"
                                                />
                                              </div>
                                              <div className="flex items-center gap-1">
                                                <input
                                                  type="color"
                                                  value={editSpecialPackageData.labelTextColor}
                                                  onChange={(e) =>
                                                    setEditSpecialPackageData((prev) => ({
                                                      ...prev,
                                                      labelTextColor: e.target.value,
                                                    }))
                                                  }
                                                  className="w-6 h-6 rounded cursor-pointer border border-border"
                                                />
                                              </div>
                                              <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setEditingSpecialPackage(null)}
                                              >
                                                <X className="w-3 h-3" />
                                              </Button>
                                              <Button
                                                size="sm"
                                                onClick={() => handleSaveSpecialPackage(game.id, pkg.id)}
                                                className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white"
                                              >
                                                <Save className="w-3 h-3" />
                                              </Button>
                                            </div>
                                          </div>
                                        ) : (
                                          <div
                                            className={`flex items-center gap-3 ${pkg.g2bulkProductId ? "border-l-2 border-l-green-500 pl-2" : "border-l-2 border-l-orange-400 pl-2"}`}
                                          >
                                            {pkg.icon ? (
                                              <img
                                                src={pkg.icon}
                                                alt={pkg.name}
                                                className="w-8 h-8 rounded object-cover"
                                              />
                                            ) : (
                                              <div className="w-8 h-8 bg-orange-500/20 rounded flex items-center justify-center text-xs">
                                                {pkg.amount}
                                              </div>
                                            )}
                                            <div className="flex-1 min-w-0">
                                              <div className="flex items-center gap-2 flex-wrap">
                                                <p className="font-medium text-sm">{pkg.name}</p>
                                                {pkg.g2bulkProductId ? (
                                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-green-500/10 text-green-600 text-[10px] rounded-full border border-green-500/20">
                                                    <Link2 className="w-3 h-3" />
                                                    Linked
                                                  </span>
                                                ) : (
                                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-orange-500/10 text-orange-600 text-[10px] rounded-full border border-orange-500/20">
                                                    <Link2Off className="w-3 h-3" />
                                                    Manual
                                                  </span>
                                                )}
                                                <PackageStockBadge
                                                  g2bulkProductId={pkg.g2bulkProductId}
                                                  productStatus={
                                                    pkg.g2bulkProductId
                                                      ? checkProductStatus(pkg.g2bulkProductId)
                                                      : undefined
                                                  }
                                                />
                                              </div>
                                              <p className="text-xs text-muted-foreground">
                                                {pkg.amount} units{pkg.label && ` • ${pkg.label}`}
                                              </p>
                                              <G2BulkProductSelector
                                                value={pkg.g2bulkProductId}
                                                gameName={game.name}
                                                g2bulkCategoryId={game.g2bulkCategoryId}
                                                onChange={(productId, typeId) => {
                                                  updateSpecialPackage(game.id, pkg.id, {
                                                    g2bulkProductId: productId,
                                                    g2bulkTypeId: typeId,
                                                  });
                                                }}
                                              />
                                            </div>
                                            <p className="font-bold text-orange-500">${pkg.price.toFixed(2)}</p>
                                            <div className="flex gap-1">
                                              <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7"
                                                onClick={() => moveSpecialPackage(game.id, pkg.id, "up")}
                                                disabled={game.specialPackages.findIndex((p) => p.id === pkg.id) === 0}
                                              >
                                                <ArrowUp className="w-3 h-3" />
                                              </Button>
                                              <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7"
                                                onClick={() => moveSpecialPackage(game.id, pkg.id, "down")}
                                                disabled={
                                                  game.specialPackages.findIndex((p) => p.id === pkg.id) ===
                                                  game.specialPackages.length - 1
                                                }
                                              >
                                                <ArrowDown className="w-3 h-3" />
                                              </Button>
                                              <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7"
                                                onClick={() => handleStartEditSpecialPackage(pkg)}
                                              >
                                                <Edit2 className="w-3 h-3" />
                                              </Button>
                                              <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7 text-destructive hover:text-destructive"
                                                onClick={async () => {
                                                  await deleteSpecialPackage(game.id, pkg.id);
                                                  toast({ title: "Special package deleted" });
                                                }}
                                              >
                                                <Trash2 className="w-3 h-3" />
                                              </Button>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </>
                          )}
                        </>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Payment Methods */}
            <TabsContent value="payments">
              <Card className="border-gold/30 mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-gold" />
                    Payment Method
                  </CardTitle>
                  <CardDescription>
                    This site uses KHQR (Kesor) as the only payment method. Configure it in the "QR Settings" tab.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 p-4 bg-secondary/30 rounded-lg border border-gold/20">
                    <div className="w-12 h-12 rounded-lg bg-gold/20 flex items-center justify-center">
                      <img
                        src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSwG-Zx92YNnU6BuabALnRRwBqX_5USd3AJJw&s"
                        alt="phone"
                        className="w-6 h-6 inline"
                      />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold">KHQR</h3>
                      <p className="text-sm text-muted-foreground">Bakong KHQR Payment via Kesor</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2 py-1 bg-green-500/20 text-green-600 rounded-full">Active</span>
                    </div>
                  </div>

                  <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                    <p className="text-sm text-blue-600 dark:text-blue-400">
                      💡 To configure KHQR settings (API URL, WebSocket, etc.), go to the <strong>"QR Settings"</strong>{" "}
                      tab.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Kesor Payment Settings */}
            <TabsContent value="qr-settings">
              <KesorSettingsTab />
            </TabsContent>

            {/* Orders */}
            <TabsContent value="orders" className="space-y-6">
              <G2BulkDebugLogs />
              <OrdersTab />
            </TabsContent>

            {/* Game Verification Configs */}
            <TabsContent value="verification">
              <GameVerificationConfigsTab />
            </TabsContent>

            {/* API Settings */}
            <TabsContent value="api">
              <ApiSettingsTab />
            </TabsContent>

            {/* Database Backup */}
            <TabsContent value="backup">
              <DatabaseExportImport />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  );
};

export default AdminPage;
