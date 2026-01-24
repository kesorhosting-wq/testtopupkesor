import { useNavigate, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Header from "@/components/Header";
import { useCart } from "@/contexts/CartContext";
import { useSite } from "@/contexts/SiteContext";
import { useFavicon } from "@/hooks/useFavicon";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Trash2, ShoppingCart, ArrowRight, Plus, Minus, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const CartPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { items, removeFromCart, updateQuantity, getTotal, itemCount } = useCart();
  const { settings } = useSite();

  useFavicon(settings.siteIcon);

  const handleProceedToCheckout = () => {
    if (items.length === 0) {
      toast({
        title: "កន្ត្រកទទេ",
        description: "សូមបន្ថែមរបស់របរក្នុងកន្ត្រកមុនពេលបង់ប្រាក់",
        variant: "destructive",
      });
      return;
    }
    navigate("/checkout");
  };

  return (
    <>
      <Helmet>
        <title>កន្ត្រក - {settings.siteName}</title>
        <meta name="description" content="View your cart and proceed to checkout" />
      </Helmet>

      <div 
        className="min-h-screen pb-8"
        style={{
          backgroundColor: settings.topupBackgroundColor || undefined,
          backgroundImage: settings.topupBackgroundImage ? `url(${settings.topupBackgroundImage})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed'
        }}
      >
        <Header />
        
        <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6">
          {/* Back button */}
          <Link to="/" className="inline-flex items-center gap-2 text-sm sm:text-base text-muted-foreground hover:text-foreground mb-4 sm:mb-6 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>ត្រលប់ក្រោយ</span>
          </Link>

          <h1 className="font-display text-2xl sm:text-3xl font-bold mb-6 sm:mb-8 flex items-center gap-3">
            <ShoppingCart className="w-7 h-7 sm:w-8 sm:h-8 text-gold" />
            កន្ត្រកទិញ
            {itemCount > 0 && (
              <span className="text-sm font-normal text-muted-foreground">
                ({itemCount} {itemCount === 1 ? "របស់" : "របស់"})
              </span>
            )}
          </h1>

          {items.length === 0 ? (
            <Card className="text-center py-12 sm:py-16">
              <CardContent>
                <ShoppingCart className="w-14 h-14 sm:w-16 sm:h-16 text-muted-foreground mx-auto mb-4" />
                <h2 className="text-lg sm:text-xl font-semibold mb-2">កន្ត្រករបស់អ្នកទទេ</h2>
                <p className="text-muted-foreground mb-6 text-sm sm:text-base">
                  រកមើលហ្គេមរបស់យើង ហើយបន្ថែមកញ្ចប់ទៅក្នុងកន្ត្រករបស់អ្នក
                </p>
                <Button onClick={() => navigate("/")}>
                  រកមើលហ្គេម
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid lg:grid-cols-3 gap-6 sm:gap-8">
              {/* Cart Items */}
              <div className="lg:col-span-2 space-y-3 sm:space-y-4">
                {items.map((item) => (
                  <Card key={item.id}>
                    <CardContent className="p-4 sm:p-6">
                      <div className="flex items-start gap-3 sm:gap-4">
                        <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl bg-muted flex items-center justify-center">
                          {item.gameIcon?.startsWith("/") || item.gameIcon?.startsWith("http") ? (
                            <img src={item.gameIcon} alt={item.gameName} className="w-10 h-10 sm:w-12 sm:h-12 object-contain rounded" />
                          ) : (
                            <span className="text-2xl sm:text-3xl">{item.gameIcon || "🎮"}</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start gap-2">
                            <div className="min-w-0">
                              <h3 className="font-semibold text-base sm:text-lg truncate">{item.gameName}</h3>
                              <p className="text-muted-foreground text-sm truncate">{item.packageName}</p>
                              <p className="text-xs sm:text-sm text-gold font-medium mt-1">{item.amount}</p>
                              {/* Player Info */}
                              <div className="mt-2 text-xs text-muted-foreground space-y-0.5">
                                <p>👤 {item.playerName} ({item.playerId}{item.serverId ? ` - ${item.serverId}` : ''})</p>
                                <p>💳 {item.paymentMethodName}</p>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeFromCart(item.id)}
                              className="text-destructive hover:text-destructive flex-shrink-0"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                          <div className="mt-3 sm:mt-4 flex items-center justify-between">
                            <span className="text-lg sm:text-xl font-bold text-gold">
                              ${(item.price * item.quantity).toFixed(2)}
                            </span>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-7 w-7 sm:h-8 sm:w-8"
                                onClick={() => updateQuantity(item.id, item.quantity - 1)}
                              >
                                <Minus className="w-3 h-3 sm:w-4 sm:h-4" />
                              </Button>
                              <span className="w-6 sm:w-8 text-center font-medium text-sm sm:text-base">{item.quantity}</span>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-7 w-7 sm:h-8 sm:w-8"
                                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              >
                                <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Order Summary */}
              <div className="lg:col-span-1">
                <Card className="sticky top-24">
                  <CardHeader className="pb-3 sm:pb-4">
                    <CardTitle className="text-lg sm:text-xl">សង្ខេបការបញ្ជាទិញ</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 sm:space-y-4">
                    {items.map((item) => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span className="text-muted-foreground truncate mr-2">
                          {item.gameName} - {item.packageName} x{item.quantity}
                        </span>
                        <span className="flex-shrink-0">${(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                    <Separator />
                    <div className="flex justify-between font-semibold text-base sm:text-lg">
                      <span>សរុប</span>
                      <span className="text-gold">${getTotal().toFixed(2)}</span>
                    </div>

                    <Button
                      className="w-full gap-2 bg-gradient-to-r from-gold to-gold-dark hover:from-gold-dark hover:to-gold text-primary-foreground"
                      size="lg"
                      onClick={handleProceedToCheckout}
                    >
                      បន្ត
                      <ArrowRight className="w-4 h-4" />
                    </Button>

                    {/* Suggestions */}
                    <div className="pt-3 sm:pt-4 border-t">
                      <p className="text-xs sm:text-sm text-muted-foreground mb-2 sm:mb-3">អ្នកក៏អាចចង់បាន:</p>
                      <Button
                        variant="outline"
                        className="w-full text-xs sm:text-sm"
                        onClick={() => navigate("/")}
                      >
                        បន្ថែមកញ្ចប់ផ្សេងទៀត
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default CartPage;
