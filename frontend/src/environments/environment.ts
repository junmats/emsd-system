// Dynamic API URL detection
const getApiUrl = () => {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    
    // Local development - temporarily use production API
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'https://emsd-system-production.up.railway.app/api';
    }
    
    // Production (Vercel domain or custom domain)
    return 'https://emsd-system-production.up.railway.app/api';
  }
  
  // Server-side rendering fallback - use production API
  return 'https://emsd-system-production.up.railway.app/api';
};

export const environment = {
  production: false,
  apiUrl: getApiUrl()
};
