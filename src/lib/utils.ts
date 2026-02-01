import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Generate a URL-friendly slug from a game name
 * Each game gets its own unique slug based on its actual name
 * Examples: "Mobile Legends Russia" -> "mobile-legends-russia"
 */
export function generateGameSlug(gameName: string): string {
  return gameName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}
