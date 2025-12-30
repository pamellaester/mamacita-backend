# Mamacita Backend API

Node.js + Express + Prisma backend for the Mamacita pregnancy & motherhood app.

## Quick Deploy to Railway

### 1. Create GitHub Repository

```bash
# Initialize git
git init
git add .
git commit -m "Initial commit"

# Create new repo on GitHub named "mamacita-backend"
# Then push:
git remote add origin https://github.com/YOUR-USERNAME/mamacita-backend.git
git branch -M main
git push -u origin main
```

### 2. Deploy to Railway

1. Go to [railway.app](https://railway.app)
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Choose **`mamacita-backend`**
5. Railway will auto-detect and deploy!

### 3. Add PostgreSQL Database

1. In Railway project, click **"+ New"**
2. Select **"Database" → "PostgreSQL"**
3. Railway auto-connects it to your backend

### 4. Add Environment Variables

Go to your service → **Variables** tab → Add these:

```bash
NODE_ENV=production
JWT_SECRET=your-super-secret-jwt-key-change-this
JWT_EXPIRES_IN=7d
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
SENDGRID_API_KEY=your-key
FROM_EMAIL=noreply@mamacita.com
ALLOWED_ORIGINS=*
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### 5. Get Your API URL

1. Go to **Settings** → **Networking**
2. Click **"Generate Domain"**
3. Copy the URL (e.g., `https://mamacita-backend.up.railway.app`)

## Local Development

```bash
# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your database URL

# Run migrations
npm run db:migrate

# Seed database
npm run db:seed

# Start dev server
npm run dev
```

## API Endpoints

- **Auth**: `/api/v1/auth/*` - Register, login, current user
- **Users**: `/api/v1/users/*` - Profile management
- **Pregnancy**: `/api/v1/pregnancy/*` - Tracking, symptoms, weekly content
- **Community**: `/api/v1/community/*` - Groups, posts, comments
- **Classes**: `/api/v1/classes/*` - Educational content
- **Events**: `/api/v1/events/*` - Workshops, webinars
- **Media**: `/api/v1/media/*` - File uploads
- **Notifications**: `/api/v1/notifications/*` - Push notifications
- **Admin**: `/api/v1/admin/*` - Moderation, analytics

## Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: PostgreSQL + Prisma ORM
- **Auth**: JWT + bcrypt
- **File Upload**: Cloudinary
- **Logging**: Winston

## License

Proprietary - All rights reserved
