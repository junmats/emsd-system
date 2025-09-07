// Dynamic API URL detection for production
const getApiUrl = () => {
  // Always return the production Railway URL for production builds
  return 'https://emsd-system-production.up.railway.app/api';
};

export const environment = {
  production: true,
  apiUrl: 'https://emsd-system-production.up.railway.app/api'
};
