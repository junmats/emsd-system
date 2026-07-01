export const schoolConfig = {
  name: process.env.SCHOOL_NAME || 'EMSD School System',
  address: process.env.SCHOOL_ADDRESS || '',
  phone: process.env.SCHOOL_PHONE || '',
  email: process.env.SCHOOL_EMAIL || '',
  adminUsername: process.env.ADMIN_USERNAME || 'admin',
  adminEmail: process.env.ADMIN_EMAIL || 'admin@school.com',
  adminDefaultPassword: process.env.ADMIN_DEFAULT_PASSWORD || 'admin123'
};
