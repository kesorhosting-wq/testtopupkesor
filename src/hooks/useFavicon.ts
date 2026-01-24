import { useEffect } from 'react';

export const useFavicon = (faviconUrl: string | undefined) => {
  useEffect(() => {
    if (!faviconUrl) return;

    // Get or create favicon link element
    let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
    
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    
    // Add timestamp to bust cache
    const urlWithCacheBust = faviconUrl.includes('?') 
      ? `${faviconUrl}&t=${Date.now()}` 
      : `${faviconUrl}?t=${Date.now()}`;
    
    link.href = urlWithCacheBust;
    link.type = 'image/png';
  }, [faviconUrl]);
};
