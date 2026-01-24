import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowLeft, CheckCircle, Loader2, UserCheck, XCircle } from "lucide-react";
import Header from "@/components/Header";
import PackageCard from "@/components/PackageCard";
import KhmerFrame from "@/components/KhmerFrame";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSite } from "@/contexts/SiteContext";
import { useCart } from "@/contexts/CartContext";
import { useFavicon } from "@/hooks/useFavicon";
import { useGameIdCache } from "@/hooks/useGameIdCache";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface VerifiedUser {
  username: string;
  id: string;
  serverId?: string;
  accountName?: string;
}

const TopupPage: React.FC = () => {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const { games, paymentMethods, settings, isLoading } = useSite();
  const { addToCart } = useCart();

  // Update favicon dynamically
  useFavicon(settings.siteIcon);

  const game = games.find((g) => g.id === gameId);

  // Auto-load cached game IDs (24h cache)
  const { cachedUserId, cachedServerId, saveToCache, hasCachedData } = useGameIdCache(gameId);

  const [userId, setUserId] = useState("");
  const [serverId, setServerId] = useState("");
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<string | null>(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Verification states
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifiedUser, setVerifiedUser] = useState<VerifiedUser | null>(null);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [alternateRegions, setAlternateRegions] = useState<Array<{
    gameName: string;
    apiCode: string;
    requiresZone: boolean;
  }> | null>(null);

  // Auto-fill cached IDs when available
  useEffect(() => {
    if (hasCachedData && !userId) {
      setUserId(cachedUserId);
      setServerId(cachedServerId);
    }
  }, [hasCachedData, cachedUserId, cachedServerId]);

  // Show loading state while data is being fetched
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold"></div>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Game not found</h1>
          <Link to="/" className="text-gold hover:underline">
            Go back home
          </Link>
        </div>
      </div>
    );
  }

  // Game-specific ID field configurations based on real game requirements
  const getGameIdConfig = (gameName: string) => {
    const normalizedName = gameName.toLowerCase().trim();

    // Mobile Legends variants - require User ID + Server ID
    if (normalizedName.includes("mobile legends") || normalizedName === "mlbb") {
      return {
        fields: [
          { key: "userId", label: "User ID", placeholder: "បញ្ចូល User ID" },
          { key: "serverId", label: "Server ID", placeholder: "Server ID", width: "w-24 sm:w-32" },
        ],
        validation: "សូមបញ្ចូល User ID និង Server ID",
        example: "ឧទាហរណ៍: 123456789 (1234)",
      };
    }

    // Free Fire variants - require Player ID (no server needed for most regions)
    if (normalizedName.includes("freefire") || normalizedName.includes("free fire") || normalizedName === "ff") {
      return {
        fields: [{ key: "userId", label: "Player ID", placeholder: "បញ្ចូល Player ID" }],
        validation: "សូមបញ្ចូល Player ID",
        example: "ឧទាហរណ៍: 123456789",
      };
    }

    // Valorant - Riot ID format
    if (normalizedName.includes("valorant")) {
      return {
        fields: [{ key: "userId", label: "Riot ID", placeholder: "Name#Tag" }],
        validation: "សូមបញ្ចូល Riot ID",
        example: "ឧទាហរណ៍: PlayerName#1234",
      };
    }

    // League of Legends - Riot ID format
    if (normalizedName.includes("league of legends") || normalizedName === "lol") {
      return {
        fields: [{ key: "userId", label: "Riot ID", placeholder: "Name#Tag" }],
        validation: "សូមបញ្ចូល Riot ID",
        example: "ឧទាហរណ៍: Summoner#1234",
      };
    }

    // Teamfight Tactics - Riot ID format
    if (normalizedName.includes("teamfight tactics") || normalizedName === "tft") {
      return {
        fields: [{ key: "userId", label: "Riot ID", placeholder: "Name#Tag" }],
        validation: "សូមបញ្ចូល Riot ID",
        example: "ឧទាហរណ៍: Player#1234",
      };
    }

    // Legends of Runeterra - Riot ID
    if (normalizedName.includes("legends of runeterra") || normalizedName === "lor") {
      return {
        fields: [{ key: "userId", label: "Riot ID", placeholder: "Name#Tag" }],
        validation: "សូមបញ្ចូល Riot ID",
        example: "ឧទាហរណ៍: Player#1234",
      };
    }

    // Call of Duty Mobile - Player UID
    if (normalizedName.includes("call of duty") || normalizedName.includes("cod")) {
      return {
        fields: [{ key: "userId", label: "Player UID", placeholder: "បញ្ចូល Player UID" }],
        validation: "សូមបញ្ចូល Player UID",
        example: "ឧទាហរណ៍: 6742123456789",
      };
    }

    // PUBG Mobile - Character ID
    if (normalizedName.includes("pubg")) {
      return {
        fields: [{ key: "userId", label: "Character ID", placeholder: "បញ្ចូល Character ID" }],
        validation: "សូមបញ្ចូល Character ID",
        example: "ឧទាហរណ៍: 5123456789",
      };
    }

    // Blood Strike / Bloodstrike - Player ID
    if (normalizedName.includes("blood strike") || normalizedName.includes("bloodstrike")) {
      return {
        fields: [{ key: "userId", label: "Player ID", placeholder: "បញ្ចូល Player ID" }],
        validation: "សូមបញ្ចូល Player ID",
        example: "ឧទាហរណ៍: 123456789",
      };
    }

    // Delta Force - Player ID
    if (normalizedName.includes("delta force")) {
      return {
        fields: [{ key: "userId", label: "Player ID", placeholder: "បញ្ចូល Player ID" }],
        validation: "សូមបញ្ចូល Player ID",
        example: "ឧទាហរណ៍: 123456789",
      };
    }

    // Identity V - Player ID + Server
    if (normalizedName.includes("identity v")) {
      return {
        fields: [
          { key: "userId", label: "Player ID", placeholder: "បញ្ចូល Player ID" },
          { key: "serverId", label: "Server", placeholder: "Server", width: "w-24 sm:w-32" },
        ],
        validation: "សូមបញ្ចូល Player ID និង Server",
        example: "ឧទាហរណ៍: 12345678 (Asia)",
      };
    }

    // Sausage Man - Player ID
    if (normalizedName.includes("sausage man")) {
      return {
        fields: [{ key: "userId", label: "Player ID", placeholder: "បញ្ចូល Player ID" }],
        validation: "សូមបញ្ចូល Player ID",
        example: "ឧទាហរណ៍: 123456789",
      };
    }

    // Undawn - Player ID + Server
    if (normalizedName.includes("undawn")) {
      return {
        fields: [
          { key: "userId", label: "Player ID", placeholder: "បញ្ចូល Player ID" },
          { key: "serverId", label: "Server", placeholder: "Server", width: "w-32" },
        ],
        validation: "សូមបញ្ចូល Player ID និង Server",
        example: "ឧទាហរណ៍: 12345678 (SEA-01)",
      };
    }

    // EAFC / EA FC / FIFA - EA ID or Player ID
    if (normalizedName.includes("eafc") || normalizedName.includes("ea fc") || normalizedName.includes("fifa")) {
      return {
        fields: [{ key: "userId", label: "Player ID", placeholder: "បញ្ចូល Player ID" }],
        validation: "សូមបញ្ចូល Player ID",
        example: "ឧទាហរណ៍: 123456789",
      };
    }

    // Yalla Ludo - Player ID
    if (normalizedName.includes("yalla ludo")) {
      return {
        fields: [{ key: "userId", label: "Player ID", placeholder: "បញ្ចូល Player ID" }],
        validation: "សូមបញ្ចូល Player ID",
        example: "ឧទាហរណ៍: 123456789",
      };
    }

    // Zepeto - ZEPETO ID
    if (normalizedName.includes("zepeto")) {
      return {
        fields: [{ key: "userId", label: "ZEPETO ID", placeholder: "បញ្ចូល ZEPETO ID" }],
        validation: "សូមបញ្ចូល ZEPETO ID",
        example: "ឧទាហរណ៍: abc123xyz",
      };
    }

    // Poppo Live - User ID
    if (normalizedName.includes("poppo live")) {
      return {
        fields: [{ key: "userId", label: "User ID", placeholder: "បញ្ចូល User ID" }],
        validation: "សូមបញ្ចូល User ID",
        example: "ឧទាហរណ៍: 123456789",
      };
    }

    // Blockman Go - Player ID
    if (normalizedName.includes("blockman go")) {
      return {
        fields: [{ key: "userId", label: "Player ID", placeholder: "បញ្ចូល Player ID" }],
        validation: "សូមបញ្ចូល Player ID",
        example: "ឧទាហរណ៍: 123456789",
      };
    }

    // Pixel Gun 3D - Player ID
    if (normalizedName.includes("pixel gun")) {
      return {
        fields: [{ key: "userId", label: "Player ID", placeholder: "បញ្ចូល Player ID" }],
        validation: "សូមបញ្ចូល Player ID",
        example: "ឧទាហរណ៍: 123456789",
      };
    }

    // Bullet Echo - Player ID
    if (normalizedName.includes("bullet echo")) {
      return {
        fields: [{ key: "userId", label: "Player ID", placeholder: "បញ្ចូល Player ID" }],
        validation: "សូមបញ្ចូល Player ID",
        example: "ឧទាហរណ៍: 123456789",
      };
    }

    // Ragnarok games - Character ID + Server
    if (normalizedName.includes("ragnarok")) {
      return {
        fields: [
          { key: "userId", label: "Character ID", placeholder: "បញ្ចូល Character ID" },
          { key: "serverId", label: "Server", placeholder: "Server", width: "w-32" },
        ],
        validation: "សូមបញ្ចូល Character ID និង Server",
        example: "ឧទាហរណ៍: 12345678 (Prontera)",
      };
    }

    // Solo Leveling: Arise - Player ID
    if (normalizedName.includes("solo leveling")) {
      return {
        fields: [{ key: "userId", label: "Player ID", placeholder: "បញ្ចូល Player ID" }],
        validation: "សូមបញ្ចូល Player ID",
        example: "ឧទាហរណ៍: 123456789",
      };
    }

    // AFK Journey - Player ID
    if (normalizedName.includes("afk journey")) {
      return {
        fields: [{ key: "userId", label: "Player ID", placeholder: "បញ្ចូល Player ID" }],
        validation: "សូមបញ្ចូល Player ID",
        example: "ឧទាហរណ៍: 123456789",
      };
    }

    // Age of Empires Mobile - Player ID
    if (normalizedName.includes("age of empire")) {
      return {
        fields: [{ key: "userId", label: "Player ID", placeholder: "បញ្ចូល Player ID" }],
        validation: "សូមបញ្ចូល Player ID",
        example: "ឧទាហរណ៍: 123456789",
      };
    }

    // State of Survival - Player ID + State
    if (normalizedName.includes("state of survival")) {
      return {
        fields: [
          { key: "userId", label: "Player ID", placeholder: "បញ្ចូល Player ID" },
          { key: "serverId", label: "State", placeholder: "State #", width: "w-24 sm:w-32" },
        ],
        validation: "សូមបញ្ចូល Player ID និង State",
        example: "ឧទាហរណ៍: 12345678 (State 123)",
      };
    }

    // Puzzles and Survival - Player ID + State
    if (normalizedName.includes("puzzles and survival")) {
      return {
        fields: [
          { key: "userId", label: "Player ID", placeholder: "បញ្ចូល Player ID" },
          { key: "serverId", label: "State", placeholder: "State #", width: "w-24 sm:w-32" },
        ],
        validation: "សូមបញ្ចូល Player ID និង State",
        example: "ឧទាហរណ៍: 12345678 (State 123)",
      };
    }

    // Lord of the Rings - Player ID
    if (normalizedName.includes("lord of the rings")) {
      return {
        fields: [{ key: "userId", label: "Player ID", placeholder: "បញ្ចូល Player ID" }],
        validation: "សូមបញ្ចូល Player ID",
        example: "ឧទាហរណ៍: 123456789",
      };
    }

    // Love and Deepspace - UID
    if (normalizedName.includes("love and deepspace")) {
      return {
        fields: [{ key: "userId", label: "UID", placeholder: "បញ្ចូល UID" }],
        validation: "សូមបញ្ចូល UID",
        example: "ឧទាហរណ៍: 123456789",
      };
    }

    // Love Nikki / Shining Nikki - Player ID
    if (normalizedName.includes("nikki")) {
      return {
        fields: [{ key: "userId", label: "Player ID", placeholder: "បញ្ចូល Player ID" }],
        validation: "សូមបញ្ចូល Player ID",
        example: "ឧទាហរណ៍: 123456789",
      };
    }

    // Life Makeover - Player ID
    if (normalizedName.includes("life makeover")) {
      return {
        fields: [{ key: "userId", label: "Player ID", placeholder: "បញ្ចូល Player ID" }],
        validation: "សូមបញ្ចូល Player ID",
        example: "ឧទាហរណ៍: 123456789",
      };
    }

    // Crystal of Atlan - Player ID
    if (normalizedName.includes("crystal of atlan")) {
      return {
        fields: [{ key: "userId", label: "Player ID", placeholder: "បញ្ចូល Player ID" }],
        validation: "សូមបញ្ចូល Player ID",
        example: "ឧទាហរណ៍: 123456789",
      };
    }

    // Devil May Cry - Player ID
    if (normalizedName.includes("devil may cry")) {
      return {
        fields: [{ key: "userId", label: "Player ID", placeholder: "បញ្ចូល Player ID" }],
        validation: "សូមបញ្ចូល Player ID",
        example: "ឧទាហរណ៍: 123456789",
      };
    }

    // Metal Slug - Player ID
    if (normalizedName.includes("metal slug")) {
      return {
        fields: [{ key: "userId", label: "Player ID", placeholder: "បញ្ចូល Player ID" }],
        validation: "សូមបញ្ចូល Player ID",
        example: "ឧទាហរណ៍: 123456789",
      };
    }

    // Marvel Duel - Player ID
    if (normalizedName.includes("marvel duel")) {
      return {
        fields: [{ key: "userId", label: "Player ID", placeholder: "បញ្ចូល Player ID" }],
        validation: "សូមបញ្ចូល Player ID",
        example: "ឧទាហរណ៍: 123456789",
      };
    }

    // One Punch Man World - Player ID
    if (normalizedName.includes("one punch man")) {
      return {
        fields: [{ key: "userId", label: "Player ID", placeholder: "បញ្ចូល Player ID" }],
        validation: "សូមបញ្ចូល Player ID",
        example: "ឧទាហរណ៍: 123456789",
      };
    }

    // Path to Nowhere - Player ID + Server
    if (normalizedName.includes("path to nowhere")) {
      return {
        fields: [
          { key: "userId", label: "Player ID", placeholder: "បញ្ចូល Player ID" },
          { key: "serverId", label: "Server", placeholder: "Server", width: "w-24 sm:w-32" },
        ],
        validation: "សូមបញ្ចូល Player ID និង Server",
        example: "ឧទាហរណ៍: 12345678 (SEA)",
      };
    }

    // Moonlight Blade - Character ID + Server
    if (normalizedName.includes("moonlight blade")) {
      return {
        fields: [
          { key: "userId", label: "Character ID", placeholder: "បញ្ចូល Character ID" },
          { key: "serverId", label: "Server", placeholder: "Server", width: "w-32" },
        ],
        validation: "សូមបញ្ចូល Character ID និង Server",
        example: "ឧទាហរណ៍: 12345678 (Server)",
      };
    }

    // Heaven Burns Red - Player ID
    if (normalizedName.includes("heaven burns red")) {
      return {
        fields: [{ key: "userId", label: "Player ID", placeholder: "បញ្ចូល Player ID" }],
        validation: "សូមបញ្ចូល Player ID",
        example: "ឧទាហរណ៍: 123456789",
      };
    }

    // Star Resonance - Player ID
    if (normalizedName.includes("star resonance")) {
      return {
        fields: [{ key: "userId", label: "Player ID", placeholder: "បញ្ចូល Player ID" }],
        validation: "សូមបញ្ចូល Player ID",
        example: "ឧទាហរណ៍: 123456789",
      };
    }

    // Deadly Dudes - Player ID
    if (normalizedName.includes("deadly dudes")) {
      return {
        fields: [{ key: "userId", label: "Player ID", placeholder: "បញ្ចូល Player ID" }],
        validation: "សូមបញ្ចូល Player ID",
        example: "ឧទាហរណ៍: 123456789",
      };
    }

    // Rememento - Player ID
    if (normalizedName.includes("rememento")) {
      return {
        fields: [{ key: "userId", label: "Player ID", placeholder: "បញ្ចូល Player ID" }],
        validation: "សូមបញ្ចូល Player ID",
        example: "ឧទាហរណ៍: 123456789",
      };
    }

    // Valorant Global / Valorant SEA - Riot ID format
    if (normalizedName.includes("valorant")) {
      return {
        fields: [{ key: "userId", label: "Riot ID", placeholder: "Name#Tag" }],
        validation: "សូមបញ្ចូល Riot ID",
        example: "ឧទាហរណ៍: PlayerName#1234",
      };
    }

    // Wild Rift - Riot ID + Region
    if (normalizedName.includes("wild rift")) {
      return {
        fields: [{ key: "userId", label: "Riot ID", placeholder: "Name#Tag" }],
        validation: "សូមបញ្ចូល Riot ID",
        example: "ឧទាហរណ៍: Player#SEA1",
      };
    }

    // Zenless Zone Zero - UID + Server
    if (normalizedName.includes("zenless zone zero") || normalizedName === "zzz") {
      return {
        fields: [
          { key: "userId", label: "UID", placeholder: "បញ្ចូល UID" },
          { key: "serverId", label: "Server", placeholder: "Server", width: "w-32" },
        ],
        validation: "សូមបញ្ចូល UID និង Server",
        example: "ឧទាហរណ៍: 1234567890 (Asia)",
      };
    }

    // Wuthering Waves - UID + Server
    if (normalizedName.includes("wuthering waves")) {
      return {
        fields: [
          { key: "userId", label: "UID", placeholder: "បញ្ចូល UID" },
          { key: "serverId", label: "Server", placeholder: "Server", width: "w-32" },
        ],
        validation: "សូមបញ្ចូល UID និង Server",
        example: "ឧទាហរណ៍: 1234567890 (SEA)",
      };
    }

    // TikTok Coins - TikTok Username
    if (normalizedName.includes("tiktok")) {
      return {
        fields: [{ key: "userId", label: "TikTok Username", placeholder: "@username" }],
        validation: "សូមបញ្ចូល TikTok Username",
        example: "ឧទាហរណ៍: @yourusername",
      };
    }

    // Tower of Fantasy - UID + Server
    if (normalizedName.includes("tower of fantasy") || normalizedName === "tof") {
      return {
        fields: [
          { key: "userId", label: "UID", placeholder: "បញ្ចូល UID" },
          { key: "serverId", label: "Server", placeholder: "Server", width: "w-32" },
        ],
        validation: "សូមបញ្ចូល UID និង Server",
        example: "ឧទាហរណ៍: 1234567890 (SEA-Fantasia)",
      };
    }

    // Honkai Star Rail - UID + Server
    if (normalizedName.includes("honkai star rail") || normalizedName === "hsr") {
      return {
        fields: [
          { key: "userId", label: "UID", placeholder: "បញ្ចូល UID" },
          { key: "serverId", label: "Server", placeholder: "Server", width: "w-32" },
        ],
        validation: "សូមបញ្ចូល UID និង Server",
        example: "ឧទាហរណ៍: 8001234567 (Asia)",
      };
    }

    // Genshin Impact - UID + Server
    if (normalizedName.includes("genshin impact") || normalizedName === "genshin") {
      return {
        fields: [
          { key: "userId", label: "UID", placeholder: "បញ្ចូល UID" },
          { key: "serverId", label: "Server", placeholder: "Server", width: "w-32" },
        ],
        validation: "សូមបញ្ចូល UID និង Server",
        example: "ឧទាហរណ៍: 8001234567 (Asia)",
      };
    }

    // Honkai Impact 3rd - UID + Server
    if (normalizedName.includes("honkai impact") || normalizedName === "hi3") {
      return {
        fields: [
          { key: "userId", label: "UID", placeholder: "បញ្ចូល UID" },
          { key: "serverId", label: "Server", placeholder: "Server", width: "w-32" },
        ],
        validation: "សូមបញ្ចូល UID និង Server",
        example: "ឧទាហរណ៍: 12345678 (SEA)",
      };
    }

    // Clash of Clans - Player Tag
    if (normalizedName.includes("clash of clans") || normalizedName === "coc") {
      return {
        fields: [{ key: "userId", label: "Player Tag", placeholder: "#ABC123" }],
        validation: "សូមបញ្ចូល Player Tag",
        example: "ឧទាហរណ៍: #ABC123XY",
      };
    }

    // Clash Royale - Player Tag
    if (normalizedName.includes("clash royale")) {
      return {
        fields: [{ key: "userId", label: "Player Tag", placeholder: "#ABC123" }],
        validation: "សូមបញ្ចូល Player Tag",
        example: "ឧទាហរណ៍: #ABC123XY",
      };
    }

    // Brawl Stars - Player Tag
    if (normalizedName.includes("brawl stars")) {
      return {
        fields: [{ key: "userId", label: "Player Tag", placeholder: "#ABC123" }],
        validation: "សូមបញ្ចូល Player Tag",
        example: "ឧទាហរណ៍: #ABC123XY",
      };
    }

    // Steam Wallet - Steam ID
    if (normalizedName.includes("steam")) {
      return {
        fields: [{ key: "userId", label: "Steam ID", placeholder: "បញ្ចូល Steam ID" }],
        validation: "សូមបញ្ចូល Steam ID",
        example: "ឧទាហរណ៍: 76561198012345678",
      };
    }

    // Discord Nitro - Discord Username
    if (normalizedName.includes("discord")) {
      return {
        fields: [{ key: "userId", label: "Discord Username", placeholder: "username#0000" }],
        validation: "សូមបញ្ចូល Discord Username",
        example: "ឧទាហរណ៍: player#1234 ឬ @player",
      };
    }

    // Roblox - Roblox Username
    if (normalizedName.includes("roblox")) {
      return {
        fields: [{ key: "userId", label: "Roblox Username", placeholder: "បញ្ចូល Username" }],
        validation: "សូមបញ្ចូល Roblox Username",
        example: "ឧទាហរណ៍: YourRobloxName",
      };
    }

    // Fortnite - Epic Games ID
    if (normalizedName.includes("fortnite")) {
      return {
        fields: [{ key: "userId", label: "Epic Games ID", placeholder: "បញ្ចូល Epic ID" }],
        validation: "សូមបញ្ចូល Epic Games ID",
        example: "ឧទាហរណ៍: EpicUsername",
      };
    }

    // Arena of Valor / Liên Quân - Player ID + Server
    if (normalizedName.includes("arena of valor") || normalizedName === "aov" || normalizedName.includes("liên quân")) {
      return {
        fields: [
          { key: "userId", label: "Player ID", placeholder: "បញ្ចូល Player ID" },
          { key: "serverId", label: "Server", placeholder: "Server", width: "w-32" },
        ],
        validation: "សូមបញ្ចូល Player ID និង Server",
        example: "ឧទាហរណ៍: 12345678 (SEA)",
      };
    }

    // Stumble Guys - Player ID
    if (normalizedName.includes("stumble guys")) {
      return {
        fields: [{ key: "userId", label: "Player ID", placeholder: "បញ្ចូល Player ID" }],
        validation: "សូមបញ្ចូល Player ID",
        example: "ឧទាហរណ៍: 123456789",
      };
    }

    // Whiteout Survival - Player ID + State
    if (normalizedName.includes("whiteout survival")) {
      return {
        fields: [
          { key: "userId", label: "Player ID", placeholder: "បញ្ចូល Player ID" },
          { key: "serverId", label: "State", placeholder: "State #", width: "w-24 sm:w-32" },
        ],
        validation: "សូមបញ្ចូល Player ID និង State",
        example: "ឧទាហរណ៍: 12345678 (State 123)",
      };
    }

    // Last War: Survival - Player ID + Server
    if (normalizedName.includes("last war")) {
      return {
        fields: [
          { key: "userId", label: "Player ID", placeholder: "បញ្ចូល Player ID" },
          { key: "serverId", label: "Server", placeholder: "Server", width: "w-24 sm:w-32" },
        ],
        validation: "សូមបញ្ចូល Player ID និង Server",
        example: "ឧទាហរណ៍: 12345678 (S123)",
      };
    }

    // Default configuration for other games
    return {
      fields: [{ key: "userId", label: "Player ID", placeholder: "បញ្ចូល Player ID" }],
      validation: "សូមបញ្ចូល Player ID",
      example: "ឧទាហរណ៍: 123456789",
    };
  };

  const gameIdConfig = game ? getGameIdConfig(game.name) : null;
  const hasMultipleFields = gameIdConfig && gameIdConfig.fields.length > 1;

  // Handle ID verification using real API
  const handleVerify = async () => {
    if (!userId.trim()) {
      toast({ title: gameIdConfig?.validation || "សូមបញ្ចូល Game ID", variant: "destructive" });
      return;
    }

    // For games with server ID, check if it's required
    if (hasMultipleFields && !serverId.trim()) {
      toast({ title: gameIdConfig?.validation || "សូមបញ្ចូល Server ID", variant: "destructive" });
      return;
    }

    setIsVerifying(true);
    setVerificationError(null);
    setVerifiedUser(null);
    setAlternateRegions(null);

    try {
      const { data, error } = await supabase.functions.invoke("verify-game-id", {
        body: {
          gameName: game?.name,
          userId: userId.trim(),
          serverId: serverId.trim() || undefined,
        },
      });

      console.log("Verification response:", data, error);

      if (error) {
        let msg = error.message || "Verification failed";

        // Try to read backend error body when the function returns non-2xx
        const anyErr = error as any;
        if (anyErr?.context && typeof anyErr.context.json === "function") {
          try {
            const body = await anyErr.context.json();
            msg = body?.error || body?.message || msg;
          } catch {
            // ignore JSON parse failures
          }
        }

        throw new Error(msg);
      }

      if (data?.success) {
        // Enforce real verification only (no placeholder/manual fallbacks)
        if (data?.manualVerification) {
          const errorMsg = data?.message || "Automatic verification is unavailable. Please try again.";
          setVerificationError(errorMsg);
          toast({
            title: "ផ្ទៀងផ្ទាត់បរាជ័យ",
            description: errorMsg,
            variant: "destructive",
          });
          return;
        }

        const username = data.username || data.accountName;
        setVerifiedUser({
          username,
          id: userId,
          serverId: serverId || undefined,
          accountName: data.accountName,
        });

        // Save to cache for 24 hours
        saveToCache(userId, serverId);

        toast({
          title: "✓ ផ្ទៀងផ្ទាត់ដោយជោគជ័យ",
          description: `Username: ${username}`,
        });
      } else {
        const errorMsg = data?.error || "មិនអាចផ្ទៀងផ្ទាត់ ID បានទេ។";
        setVerificationError(errorMsg);
        
        // Capture alternate regions if available
        if (data?.alternateRegions && Array.isArray(data.alternateRegions)) {
          setAlternateRegions(data.alternateRegions);
        }
        
        toast({
          title: "ផ្ទៀងផ្ទាត់បរាជ័យ",
          description: errorMsg,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Verification error:", error);
      const errorMsg = error?.message || "មិនអាចផ្ទៀងផ្ទាត់ ID បានទេ។ សូមពិនិត្យម្តងទៀត។";
      setVerificationError(errorMsg);
      toast({
        title: "ផ្ទៀងផ្ទាត់បរាជ័យ",
        description: errorMsg,
        variant: "destructive",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  // Reset verification when ID changes
  const handleUserIdChange = (value: string) => {
    setUserId(value);
    setVerifiedUser(null);
    setVerificationError(null);
    setAlternateRegions(null);
  };

  const handleServerIdChange = (value: string) => {
    setServerId(value);
    setVerifiedUser(null);
    setVerificationError(null);
    setAlternateRegions(null);
  };

  // Handle retry with alternate region
  const handleRetryWithRegion = async (region: { gameName: string; apiCode: string; requiresZone: boolean }) => {
    setIsVerifying(true);
    setVerificationError(null);
    setVerifiedUser(null);
    setAlternateRegions(null);

    try {
      const { data, error } = await supabase.functions.invoke("verify-game-id", {
        body: {
          gameName: region.gameName,
          userId: userId.trim(),
          serverId: region.requiresZone ? serverId.trim() : undefined,
        },
      });

      console.log("Retry verification response:", data, error);

      if (error) {
        let msg = error.message || "Verification failed";
        const anyErr = error as any;
        if (anyErr?.context && typeof anyErr.context.json === "function") {
          try {
            const body = await anyErr.context.json();
            msg = body?.error || body?.message || msg;
          } catch {
            // ignore JSON parse failures
          }
        }
        throw new Error(msg);
      }

      if (data?.success) {
        const username = data.username || data.accountName;
        setVerifiedUser({
          username,
          id: userId,
          serverId: serverId || undefined,
          accountName: data.accountName,
        });

        saveToCache(userId, serverId);

        toast({
          title: "✓ ផ្ទៀងផ្ទាត់ដោយជោគជ័យ",
          description: `Username: ${username} (${region.gameName})`,
        });
      } else {
        const errorMsg = data?.error || "មិនអាចផ្ទៀងផ្ទាត់ ID បានទេ។";
        setVerificationError(errorMsg);
        
        if (data?.alternateRegions && Array.isArray(data.alternateRegions)) {
          setAlternateRegions(data.alternateRegions);
        }
        
        toast({
          title: "ផ្ទៀងផ្ទាត់បរាជ័យ",
          description: errorMsg,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Retry verification error:", error);
      const errorMsg = error?.message || "មិនអាចផ្ទៀងផ្ទាត់ ID បានទេ។";
      setVerificationError(errorMsg);
      toast({
        title: "ផ្ទៀងផ្ទាត់បរាជ័យ",
        description: errorMsg,
        variant: "destructive",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  // Render dynamic ID input fields based on game
  const renderIdInputs = () => {
    if (!gameIdConfig) return null;

    const fields = gameIdConfig.fields;

    return (
      <div className="space-y-2">
        <div className={hasMultipleFields ? "flex gap-2 sm:gap-4" : ""}>
          {fields.map((field, index) => (
            <div key={field.key} className={field.width || (hasMultipleFields && index === 0 ? "flex-1" : "")}>
              <label
                className="text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 block"
                style={{ color: settings.frameColor || "hsl(30 30% 35%)" }}
              >
                {field.label}
              </label>
              <Input
                placeholder={field.placeholder}
                value={field.key === "userId" ? userId : serverId}
                onChange={(e) =>
                  field.key === "userId" ? handleUserIdChange(e.target.value) : handleServerIdChange(e.target.value)
                }
                className="bg-white/80 border-0 rounded-full h-10 sm:h-12 px-4 sm:px-5 text-sm sm:text-base text-foreground placeholder:text-muted-foreground"
                disabled={isVerifying}
              />
            </div>
          ))}
        </div>
        {gameIdConfig.example && (
          <p
            className="text-xs text-muted-foreground pl-1"
            style={{ color: settings.frameColor ? `${settings.frameColor}99` : "hsl(30 30% 50%)" }}
          >
            {gameIdConfig.example}
          </p>
        )}
      </div>
    );
  };

  const handleSubmit = () => {
    if (!userId) {
      toast({ title: "Please enter your Game ID", variant: "destructive" });
      return;
    }
    if (!verifiedUser) {
      toast({ title: "សូមផ្ទៀងផ្ទាត់ ID របស់អ្នកជាមុនសិន", variant: "destructive" });
      return;
    }
    if (!selectedPackage) {
      toast({ title: "Please select a package", variant: "destructive" });
      return;
    }
    if (!selectedPayment) {
      toast({ title: "Please select a payment method", variant: "destructive" });
      return;
    }
    if (!agreedToTerms) {
      toast({ title: "Please agree to the terms", variant: "destructive" });
      return;
    }

    const pkg =
      game.packages.find((p) => p.id === selectedPackage) || game.specialPackages.find((p) => p.id === selectedPackage);

    if (!pkg) return;

    const paymentMethod = paymentMethods.find((p) => p.id === selectedPayment);

    // Add to cart with verified player info and G2Bulk product ID
    addToCart({
      id: `${pkg.id}-${userId}-${Date.now()}`,
      packageId: pkg.id,
      gameId: game.id,
      gameName: game.name,
      gameIcon: game.image || "",
      packageName: pkg.name,
      amount: pkg.amount,
      price: pkg.price,
      playerId: userId.trim(),
      serverId: serverId.trim() || undefined,
      playerName: verifiedUser.username,
      paymentMethodId: selectedPayment,
      paymentMethodName: paymentMethod?.name || "Unknown",
      g2bulkProductId: pkg.g2bulkProductId,
      g2bulkTypeId: pkg.g2bulkTypeId,
    });

    toast({
      title: "✓ បានបន្ថែមទៅកន្ត្រក!",
      description: `${pkg.name} សម្រាប់ ${verifiedUser.username}`,
    });

    // Navigate to cart
    navigate("/cart");
  };

  return (
    <>
      <Helmet>
        <title>
          {game.name} Topup - {settings.siteName}
        </title>
        <meta
          name="description"
          content={`Top up ${game.name} instantly. Choose from various packages and payment methods.`}
        />
      </Helmet>

      <div
        className="min-h-screen pb-8"
        style={{
          backgroundColor: settings.topupBackgroundColor || undefined,
          backgroundImage: settings.topupBackgroundImage ? `url(${settings.topupBackgroundImage})` : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundAttachment: "fixed",
        }}
      >
        <Header />

        <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 max-w-2xl">
          {/* Back button */}
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm sm:text-base text-muted-foreground hover:text-foreground mb-4 sm:mb-6 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>ត្រលប់ក្រោយ</span>
          </Link>

          {/* Game Header */}
          <KhmerFrame variant="gold" className="mb-6 sm:mb-8">
            <div
              className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4"
              style={{
                backgroundImage: settings.topupBannerImage ? `url(${settings.topupBannerImage})` : undefined,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            >
              <img
                src={game.image}
                alt={game.name}
                className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl object-cover border-2"
                style={{ borderColor: settings.topupBannerColor || "hsl(43 74% 49%)" }}
              />
              <h1
                className="font-display text-xl sm:text-2xl font-bold"
                style={{ color: settings.topupBannerColor || "hsl(43 74% 49%)" }}
              >
                {game.name}
              </h1>
            </div>
          </KhmerFrame>

          {/* Step 1: Enter ID */}
          <div
            className="mb-6 sm:mb-8 p-4 sm:p-6 rounded-lg relative"
            style={{
              backgroundColor: settings.idSectionBgColor || "hsl(39 40% 88%)",
              backgroundImage: settings.idSectionBgImage ? `url(${settings.idSectionBgImage})` : undefined,
              backgroundSize: "cover",
              backgroundPosition: "center",
              color: settings.idSectionTextColor || undefined,
            }}
          >
            {/* Flower ornaments - smaller on mobile */}
            <img
              src="/assets/romdoul-flower.png"
              alt=""
              className="absolute -top-2 sm:-top-4 -left-2 sm:-left-4 w-16 sm:w-24 h-16 sm:h-24 object-contain pointer-events-none"
              style={{ transform: "scaleX(-1)" }}
            />
            <img
              src="/assets/romdoul-flower.png"
              alt=""
              className="absolute -top-2 sm:-top-4 -right-2 sm:-right-4 w-16 sm:w-24 h-16 sm:h-24 object-contain pointer-events-none"
            />

            {/* Header with number */}
            <div className="flex items-center justify-center gap-2 sm:gap-3 mb-4 sm:mb-6">
              <span
                className="w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm"
                style={{
                  backgroundColor: settings.frameColor || "hsl(43 74% 49%)",
                  color: "hsl(var(--primary-foreground))",
                }}
              >
                1
              </span>
              <h2
                className="font-khmer text-base sm:text-xl font-bold"
                style={{ color: settings.frameColor || "hsl(30 30% 35%)" }}
              >
                សុំបញ្ចូល ID របស់អ្នក
              </h2>
            </div>

            {/* Dynamic ID inputs based on game */}
            <div className="mb-4">{renderIdInputs()}</div>

            {/* Verification Status Display - Stylish Design */}
            {verifiedUser && (
              <div className="relative overflow-hidden rounded-2xl p-4 sm:p-5 mb-4 bg-gradient-to-br from-emerald-500/20 via-green-500/15 to-teal-500/20 border-2 border-emerald-400/50 shadow-lg">
                {/* Decorative elements */}
                <div className="absolute -top-4 -right-4 w-24 h-24 bg-emerald-400/20 rounded-full blur-2xl" />
                <div className="absolute -bottom-4 -left-4 w-20 h-20 bg-teal-400/20 rounded-full blur-xl" />

                <div className="relative z-10">
                  {/* Header with emoji and icon */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center shadow-lg">
                      <span className="text-xl sm:text-2xl">✅</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-emerald-700 dark:text-emerald-300 text-sm sm:text-base flex items-center gap-2">
                        <UserCheck className="w-4 h-4" />
                        ផ្ទៀងផ្ទាត់ដោយជោគជ័យ! 🎉
                      </h3>
                      <p className="text-xs text-emerald-600/80 dark:text-emerald-400/80">
                        Account verified successfully
                      </p>
                    </div>
                  </div>

                  {/* User info card */}
                  <div className="bg-white/60 dark:bg-black/20 rounded-xl p-3 sm:p-4 backdrop-blur-sm border border-emerald-300/30">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">👤</span>
                      <span className="font-bold text-sm sm:text-base text-foreground break-all">
                        {verifiedUser.username}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs sm:text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <span>🆔</span> {verifiedUser.id}
                      </span>
                      {verifiedUser.serverId && (
                        <span className="flex items-center gap-1">
                          <span>🌐</span> {verifiedUser.serverId}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {verificationError && (
              <div className="relative overflow-hidden rounded-2xl p-4 sm:p-5 mb-4 bg-gradient-to-br from-red-500/20 via-rose-500/15 to-pink-500/20 border-2 border-red-400/50 shadow-lg">
                {/* Decorative elements */}
                <div className="absolute -top-4 -right-4 w-24 h-24 bg-red-400/20 rounded-full blur-2xl" />

                <div className="relative z-10 flex items-start gap-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-red-400 to-rose-500 flex items-center justify-center shadow-lg flex-shrink-0">
                    <span className="text-xl sm:text-2xl">❌</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-red-700 dark:text-red-300 text-sm sm:text-base flex items-center gap-2 mb-1">
                      <XCircle className="w-4 h-4" />
                      ផ្ទៀងផ្ទាត់បរាជ័យ 😔
                    </h3>
                    <p className="text-xs sm:text-sm text-red-600 dark:text-red-400">{verificationError}</p>
                    <p className="text-xs text-red-500/70 mt-1">សូមពិនិត្យ ID ម្តងទៀត</p>
                    
                    {/* Alternate Regions Switcher */}
                    {alternateRegions && alternateRegions.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-red-300/30">
                        <p className="text-xs sm:text-sm font-semibold text-amber-700 dark:text-amber-300 mb-2 flex items-center gap-2">
                          🌍 សាកល្បង Region ផ្សេង:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {alternateRegions.map((region) => (
                            <Button
                              key={region.apiCode}
                              size="sm"
                              variant="outline"
                              onClick={() => handleRetryWithRegion(region)}
                              disabled={isVerifying}
                              className="text-xs bg-white/80 hover:bg-amber-50 border-amber-400/50 text-amber-700 hover:text-amber-800 hover:border-amber-500 transition-colors"
                            >
                              {isVerifying ? (
                                <Loader2 className="w-3 h-3 animate-spin mr-1" />
                              ) : (
                                <span className="mr-1">🔄</span>
                              )}
                              {region.gameName}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {!verifiedUser && (
              <p
                className="text-xs sm:text-sm mt-3 sm:mt-4"
                style={{ color: settings.frameColor || "hsl(30 30% 35%)" }}
              >
                បញ្ចូល ID ហើយចុច "ផ្ទៀងផ្ទាត់" ដើម្បីពិនិត្យ
              </p>
            )}

            {/* Verify Button */}
            <div className="flex justify-center mt-4 sm:mt-6">
              <Button
                onClick={handleVerify}
                disabled={isVerifying || !userId.trim() || !!verifiedUser}
                variant="outline"
                className={cn(
                  "rounded-full px-6 sm:px-8 py-2 sm:py-3 h-auto flex items-center gap-2 text-sm sm:text-base font-bold transition-all",
                  verifiedUser
                    ? "bg-green-500 text-white border-green-500 hover:bg-green-500"
                    : "bg-white/90 hover:bg-white",
                )}
                style={
                  !verifiedUser
                    ? {
                        borderColor: settings.frameColor || "hsl(43 74% 49%)",
                        color: settings.frameColor || "hsl(30 30% 35%)",
                      }
                    : undefined
                }
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="font-khmer">កំពុងផ្ទៀងផ្ទាត់...</span>
                  </>
                ) : verifiedUser ? (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span className="font-khmer">បានផ្ទៀងផ្ទាត់</span>
                  </>
                ) : (
                  <span className="font-khmer">ផ្ទៀងផ្ទាត់ ID</span>
                )}
              </Button>
            </div>
          </div>

          {/* Special Price Section - Only show if there are special packages */}
          {game.specialPackages && game.specialPackages.length > 0 && (
            <div className="mb-6 sm:mb-8">
              <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                <span className="w-auto px-3 sm:px-4 h-6 sm:h-8 rounded-full bg-gradient-to-r from-red-500 to-orange-500 text-white flex items-center justify-center font-bold text-xs sm:text-sm">
                  Special Price
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:gap-4">
                {[...game.specialPackages]
                  .sort((a, b) => a.price - b.price)
                  .map((pkg) => (
                    <PackageCard
                      key={pkg.id}
                      pkg={pkg}
                      selected={selectedPackage === pkg.id}
                      onSelect={() => setSelectedPackage(pkg.id)}
                    />
                  ))}
              </div>
            </div>
          )}

          {/* Step 2: Select Package */}
          <div className="mb-6 sm:mb-8">
            <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
              <span
                className="w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-bold text-xs sm:text-base"
                style={{
                  backgroundColor: settings.frameColor || "hsl(43 74% 49%)",
                  color: "hsl(var(--primary-foreground))",
                }}
              >
                2
              </span>
              <h2 className="font-khmer text-base sm:text-lg font-bold">ជ្រើសរើសតម្លៃពេជ្រ</h2>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:gap-4">
              {[...game.packages]
                .sort((a, b) => a.price - b.price)
                .map((pkg) => (
                  <PackageCard
                    key={pkg.id}
                    pkg={pkg}
                    selected={selectedPackage === pkg.id}
                    onSelect={() => setSelectedPackage(pkg.id)}
                  />
                ))}
            </div>
          </div>

          {/* Step 3: Payment Method */}
          <div
            className="mb-6 sm:mb-8 p-3 sm:p-4 rounded-lg"
            style={{
              backgroundColor: settings.paymentSectionBgColor || undefined,
              backgroundImage: settings.paymentSectionBgImage ? `url(${settings.paymentSectionBgImage})` : undefined,
              backgroundSize: "cover",
              backgroundPosition: "center",
              color: settings.paymentSectionTextColor || undefined,
            }}
          >
            <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
              <span
                className="w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-bold text-xs sm:text-base"
                style={{
                  backgroundColor: settings.frameColor || "hsl(43 74% 49%)",
                  color: "hsl(var(--primary-foreground))",
                }}
              >
                3
              </span>
              <h2 className="font-khmer text-base sm:text-lg font-bold">ជ្រើសរើសធនាគារបង់ប្រាក់</h2>
            </div>

            <div className="flex gap-2 sm:gap-4 flex-wrap">
              {paymentMethods.map((method) => (
                <button
                  key={method.id}
                  onClick={() => setSelectedPayment(method.id)}
                  className={cn(
                    "px-3 sm:px-6 py-2 sm:py-4 rounded-xl border-2 transition-all flex flex-col items-center gap-1 sm:gap-2 min-w-[70px] sm:min-w-[100px]",
                    selectedPayment === method.id
                      ? "border-gold bg-gold/20"
                      : "border-border bg-card hover:border-gold/50",
                  )}
                >
                  {method.icon.startsWith("http") ? (
                    <img
                      src={method.icon}
                      alt={method.name}
                      className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg object-cover"
                    />
                  ) : (
                    <img
                      src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSwG-Zx92YNnU6BuabALnRRwBqX_5USd3AJJw&s"
                      alt="phone"
                      className="w-6 h-6 inline"
                    />
                  )}
                  <span className="text-xs sm:text-sm font-medium">{method.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Terms & Submit */}
          <div className="border-t border-border pt-4 sm:pt-6">
            <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
              <span className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-gold text-black flex items-center justify-center text-sm sm:text-base font-bold flex-shrink-0">
                4
              </span>
              <span className="font-khmer text-sm sm:text-base font-bold text-black">ចុច​ ✔ នៅខាងក្រោម​</span>
            </div>
            <label className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6 cursor-pointer">
              <button
                onClick={() => setAgreedToTerms(!agreedToTerms)}
                className={cn(
                  "w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 flex items-center justify-center transition-colors flex-shrink-0",
                  agreedToTerms ? "bg-gold border-gold" : "border-muted-foreground",
                )}
              >
                {agreedToTerms && <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-primary-foreground" />}
              </button>
              <span className="font-khmer text-sm sm:text-base">យកព្រមទទួលលក្ខខណ្ឌ</span>
            </label>

            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !agreedToTerms || !selectedPackage || !selectedPayment || !verifiedUser}
              className="w-full py-4 sm:py-6 text-base sm:text-lg font-bold bg-gradient-to-r from-gold to-gold-dark hover:from-gold-dark hover:to-gold text-primary-foreground shadow-gold disabled:opacity-50"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  កំពុងដំណើរការ...
                </span>
              ) : (
                "សម្រេចទិញ"
              )}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};

export default TopupPage;
