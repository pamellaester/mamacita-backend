# 🚀 Deploy Mamacita Backend to Railway

## ✅ STEP 1: Create GitHub Repository (2 minutes)

1. Go to **https://github.com/new**
2. Repository name: **`mamacita-backend`**
3. Description: **"Mamacita Backend API - Node.js + Express + Prisma"**
4. Visibility: **Public** (or Private if you prefer)
5. **DO NOT** initialize with README, .gitignore, or license (we already have them!)
6. Click **"Create repository"**

---

## ✅ STEP 2: Push Code to GitHub (1 minute)

Copy and paste these commands in your terminal:

```bash
cd /Users/pamella/mamacita-backend

git remote add origin https://github.com/pamellaester/mamacita-backend.git

git push -u origin main
```

You should see: ✓ Code pushed successfully!

---

## ✅ STEP 3: Deploy to Railway (3 minutes)

### 3.1 Create Project
1. Go to **https://railway.app**
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Choose **`pamellaester/mamacita-backend`**
5. Railway will auto-detect Node.js and deploy!

### 3.2 Add PostgreSQL Database
1. In your Railway project, click **"+ New"**
2. Select **"Database"**
3. Choose **"Add PostgreSQL"**
4. Done! Railway automatically connects it

### 3.3 Add Environment Variables
1. Click on your **backend service** (not the database)
2. Go to **"Variables"** tab
3. Click **"+ New Variable"** and add these one by one:

```
NODE_ENV=production
JWT_SECRET=mamacita-super-secret-jwt-key-12345678
JWT_EXPIRES_IN=7d
CLOUDINARY_CLOUD_NAME=skip-for-now
CLOUDINARY_API_KEY=skip-for-now
CLOUDINARY_API_SECRET=skip-for-now
SENDGRID_API_KEY=skip-for-now
FROM_EMAIL=noreply@mamacita.com
ALLOWED_ORIGINS=*
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

**Note:** DATABASE_URL is automatically added by Railway - don't add it manually!

### 3.4 Generate Public URL
1. Click on your backend service
2. Go to **"Settings"** tab
3. Scroll to **"Networking"**
4. Click **"Generate Domain"**
5. **COPY THIS URL** - you'll need it for the mobile app!

Example: `https://mamacita-backend-production.up.railway.app`

---

## ✅ STEP 4: Verify Deployment (1 minute)

### Check the logs:
1. Click on your service
2. Go to **"Deployments"** tab
3. Click on the latest deployment
4. You should see:
```
✓ Building...
✓ npm install
✓ prisma generate && prisma migrate deploy
✓ Starting server...
✓ Server running on port 3000
```

### Test the API:
Open this URL in your browser (replace with YOUR domain):
```
https://YOUR-RAILWAY-URL.up.railway.app/api/v1/health
```

You should see: `{"status":"ok"}`

---

## 🎉 SUCCESS! Your backend is live!

### Next Steps:
1. ✅ Copy your Railway URL
2. ✅ Update mobile app to use this URL instead of localhost
3. ✅ Test login/register on Expo Go

---

## ⚠️ Troubleshooting

**Build failed?**
- Check the deployment logs
- Make sure PostgreSQL database is added
- Verify environment variables are set

**Database migration failed?**
- This is OK on first deploy if database is empty
- Railway will create tables automatically

**Can't access API?**
- Make sure domain is generated in Settings → Networking
- Check that deployment is "Active" (green status)

---

## 📱 Update Mobile App

After deployment succeeds, update your mobile app:

File: `/Users/pamella/mamacita/mobile/.env`

Change from:
```
EXPO_PUBLIC_API_URL=http://localhost:3000/api/v1
```

To:
```
EXPO_PUBLIC_API_URL=https://YOUR-RAILWAY-URL.up.railway.app/api/v1
```

Then test on Expo Go!
