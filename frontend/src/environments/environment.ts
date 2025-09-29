// Dynamic API URL detection
const getApiUrl = () => {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    
    // Local development - use local backend
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:3000/api';
    }
    
    // Production (Vercel domain or custom domain)
    return 'https://emsd-system-production.up.railway.app/api';
  }
  
  // Server-side rendering fallback - use local for development
  return 'http://localhost:3000/api';
};

export const environment = {
  production: false,
  apiUrl: getApiUrl()
};
