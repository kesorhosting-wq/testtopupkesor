import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Loader2, 
  Receipt, 
  CheckCircle2,
  Clock,
  AlertCircle,
  Home,
  ShoppingBag,
  ExternalLink,
  FileText
} from "lucide-react";
import { useSite } from "@/contexts/SiteContext";
import { useFavicon } from "@/hooks/useFavicon";
import { useAuth } from "@/contexts/AuthContext";

interface Order {
  id: string;
  game_name: string;
  package_name: string;
  player_id: string;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
}

const OrderHistoryPage = () => {
  const { settings } = useSite();
  const { user } = useAuth();
  
  useFavicon(settings.siteIcon);

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchOrders();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from("topup_orders")
        .select("id, game_name, package_name, player_id, amount, currency, status, created_at")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (err: any) {
      console.error("Error fetching orders:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("km-KH", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return (
          <Badge className="bg-green-500 hover:bg-green-600 text-white gap-1">
            <CheckCircle2 className="w-3 h-3" />
            បង់រួច
          </Badge>
        );
      case "pending":
        return (
          <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white gap-1">
            <Clock className="w-3 h-3" />
            រង់ចាំ
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="destructive" className="gap-1">
            <AlertCircle className="w-3 h-3" />
            បរាជ័យ
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gold" />
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <Helmet>
          <title>ប្រវត្តិការបញ្ជាទិញ - {settings.siteName}</title>
        </Helmet>
        <div className="min-h-screen pb-8">
          <Header />
          <div className="container mx-auto px-4 py-12 max-w-lg">
            <Card className="text-center">
              <CardContent className="py-8">
                <ShoppingBag className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h1 className="text-2xl font-bold mb-2">សូមចូលគណនី</h1>
                <p className="text-muted-foreground mb-4">
                  អ្នកត្រូវចូលគណនីដើម្បីមើលប្រវត្តិការបញ្ជាទិញ។
                </p>
                <Link to="/auth">
                  <Button className="bg-gold hover:bg-gold/90 text-white">
                    ចូលគណនី
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>ប្រវត្តិការបញ្ជាទិញ - {settings.siteName}</title>
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
        
        <div className="container mx-auto px-4 py-6 max-w-4xl">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Receipt className="w-6 h-6 text-gold" />
              ប្រវត្តិការបញ្ជាទិញ
            </h1>
            <Link to="/">
              <Button variant="outline" size="sm">
                <Home className="w-4 h-4 mr-2" />
                ទំព័រដើម
              </Button>
            </Link>
          </div>

          {orders.length === 0 ? (
            <Card className="text-center">
              <CardContent className="py-12">
                <FileText className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h2 className="text-xl font-semibold mb-2">មិនមានការបញ្ជាទិញ</h2>
                <p className="text-muted-foreground mb-4">
                  អ្នកមិនទាន់មានការបញ្ជាទិញណាមួយទេ។
                </p>
                <Link to="/">
                  <Button className="bg-gold hover:bg-gold/90 text-white">
                    <ShoppingBag className="w-4 h-4 mr-2" />
                    ចាប់ផ្តើមទិញ
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <Card key={order.id} className="hover:border-gold/50 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold">{order.game_name}</h3>
                          {getStatusBadge(order.status)}
                        </div>
                        <p className="text-sm text-muted-foreground mb-1">
                          {order.package_name}
                        </p>
                        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                          <span>Player: {order.player_id}</span>
                          <span>{formatDate(order.created_at)}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-lg font-bold text-gold">
                            ${order.amount?.toFixed(2)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {order.currency}
                          </p>
                        </div>
                        
                        <Link to={`/invoice/${order.id}`}>
                          <Button variant="outline" size="sm">
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default OrderHistoryPage;