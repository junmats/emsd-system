# Deployment Guide

## Prerequisites
- Vercel account (for frontend)
- Railway account (for backend + database)

## Step 1: Deploy Backend to Railway

1. **Connect Repository to Railway:**
   - Go to Railway dashboard
   - Click "New Project"
   - Choose "Deploy from GitHub repo"
   - Select your `emsd-system` repository
   - Choose the `backend` folder as root directory

2. **Configure Environment Variables:**
   Add these environment variables in Railway:
   ```
   NODE_ENV=production
   PORT=3000
   DB_HOST=<railway-mysql-host>
   DB_PORT=3306
   DB_USER=<railway-mysql-user>
   DB_PASSWORD=<railway-mysql-password>
   DB_NAME=emsd_system
   JWT_SECRET=<generate-strong-secret>
   JWT_EXPIRES_IN=24h
   FRONTEND_URL=https://your-app-name.vercel.app
   ```

3. **Add MySQL Database:**
   - In Railway project, click "Add Service"
   - Choose "MySQL"
   - Railway will provide database credentials
   - Update environment variables with the provided credentials

4. **Deploy:**
   - Railway will automatically build and deploy
   - Note your backend URL (e.g., `https://your-backend.railway.app`)

## Step 2: Update Frontend Configuration

1. **Update Environment Files:**
   
   In `frontend/src/environments/environment.prod.ts`, update the API URL:
   ```typescript
   return 'https://your-backend.railway.app/api';
   ```

2. **Commit Changes:**
   ```bash
   git add .
   git commit -m "Update production API URL"
   git push origin main
   ```

## Step 3: Deploy Frontend to Vercel

1. **Connect Repository to Vercel:**
   - Go to Vercel dashboard
   - Click "New Project"
   - Import your `emsd-system` repository
   - Set root directory to `frontend`

2. **Configure Build Settings:**
   - Framework Preset: Angular
   - Build Command: `npm run build`
   - Output Directory: `dist/frontend/browser`
   - Install Command: `npm install`

3. **Deploy:**
   - Vercel will automatically build and deploy
   - Note your frontend URL (e.g., `https://your-app.vercel.app`)

## Step 4: Update CORS Configuration

After getting your Vercel URL, update the backend environment variable:
```
FRONTEND_URL=https://your-app.vercel.app
```

## Testing

1. **Backend Health Check:**
   Visit: `https://your-backend.railway.app/api/health`

2. **Frontend:**
   Visit: `https://your-app.vercel.app`

3. **Full Integration:**
   - Try logging in
   - Test CRUD operations
   - Verify API calls work

## Environment URLs

- **Development:**
  - Frontend: http://localhost:4201
  - Backend: http://localhost:3000

- **Production:**
  - Frontend: https://your-app.vercel.app
  - Backend: https://your-backend.railway.app

## Troubleshooting

### CORS Issues
- Ensure `FRONTEND_URL` in Railway matches your Vercel domain
- Check browser console for CORS errors

### Database Connection
- Verify all database environment variables in Railway
- Check Railway logs for connection errors

### API Not Found
- Verify backend is running on Railway
- Check health endpoint: `/api/health`

### Build Failures
- Check build logs in respective platforms
- Ensure all dependencies are in package.json
- Verify TypeScript compilation succeeds
