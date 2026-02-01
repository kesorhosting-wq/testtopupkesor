import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Generate a URL-friendly slug from a game name
 * Examples: "Mobile Legends" -> "mlbb", "Free Fire" -> "freefire"
 */
export function generateGameSlug(gameName: string): string {
  const normalized = gameName.toLowerCase().trim();
  
  // Common game name mappings to short slugs
  if (normalized.includes("mobile legends") || normalized === "mlbb") return "mlbb";
  if (normalized.includes("free fire") || normalized.includes("freefire")) return "freefire";
  if (normalized.includes("pubg")) return "pubg";
  if (normalized.includes("valorant")) return "valorant";
  if (normalized.includes("call of duty") || normalized.includes("cod")) return "codm";
  if (normalized.includes("genshin")) return "genshin";
  if (normalized.includes("honkai star rail")) return "honkai-star-rail";
  if (normalized.includes("blood strike") || normalized.includes("bloodstrike")) return "bloodstrike";
  if (normalized.includes("delta force")) return "deltaforce";
  if (normalized.includes("magic chess")) return "magic-chess";
  if (normalized.includes("honor of kings") || normalized.includes("hok")) return "hok";
  if (normalized.includes("arena of valor") || normalized.includes("aov")) return "aov";
  if (normalized.includes("wild rift")) return "wildrift";
  if (normalized.includes("clash of clans") || normalized.includes("coc")) return "coc";
  if (normalized.includes("brawl stars")) return "brawlstars";
  if (normalized.includes("clash royale")) return "clashroyale";
  if (normalized.includes("league of legends") || normalized === "lol") return "lol";
  
  // Default: convert to kebab-case slug
  return gameName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

/**
 * Find a game by its slug
 */
export function findGameBySlug<T extends { id: string; name: string }>(games: T[], slug: string): T | undefined {
  const normalizedSlug = slug.toLowerCase();
  
  return games.find(game => {
    const gameSlug = generateGameSlug(game.name);
    return gameSlug === normalizedSlug;
  });
}
