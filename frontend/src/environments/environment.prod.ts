// Dynamic API URL detection for production
const getApiUrl = () => {
  // Always return the production Railway URL for production builds
  return 'https://emsd-system-production.up.railway.app/api';
};

export const environment = {
  production: true,
  apiUrl: 'https://emsd-system-production.up.railway.app/api',
  appVersion: '1.1.0' // Force redeployment for middle name feature
};
