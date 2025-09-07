// Dynamic API URL detection for production
const getApiUrl = () => {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    
    // Local development (in case someone builds for production locally)
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:3000/api';
    }
    
    // Production - Update this with your actual Railway backend URL
    return 'https://emsd-system-production.up.railway.app/api';
  }
  
  // Server-side rendering fallback
  return 'https://emsd-system-production.up.railway.app/api';
};

export const environment = {
  production: true,
  apiUrl: getApiUrl()
};
