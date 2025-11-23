# MongoDB Atlas Setup Guide

## Quick Setup Steps

### 1. Create MongoDB Atlas Account
- Visit: https://www.mongodb.com/cloud/atlas/register
- Sign up for free account

### 2. Create a Free Cluster
1. Click "Build a Database"
2. Select **FREE (M0)** tier
3. Choose cloud provider and region
4. Name: `Cluster0` (default)
5. Click "Create"

### 3. Create Database User
1. Go to **Database Access** (left sidebar)
2. Click "Add New Database User"
3. Authentication: **Password**
4. Username: `pushupapp` (or your choice)
5. Password: Generate strong password (SAVE IT!)
6. Privileges: **Atlas admin**
7. Click "Add User"

### 4. Configure Network Access
1. Go to **Network Access** (left sidebar)
2. Click "Add IP Address"
3. For development: Click **"Allow Access from Anywhere"** (0.0.0.0/0)
4. For production: Add specific IPs (Vercel IPs, etc.)
5. Click "Confirm"

### 5. Get Connection String
1. Go to **Database** (left sidebar)
2. Click **"Connect"** on your cluster
3. Choose **"Connect your application"**
4. Driver: **Node.js**, Version: Latest
5. Copy the connection string

### 6. Format Your MONGODB_URI

**Template:**
```
mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/<database-name>?retryWrites=true&w=majority
```

**Example:**
```
mongodb+srv://pushupapp:MySecurePass123@cluster0.abc123.mongodb.net/pushup-checker?retryWrites=true&w=majority
```

**Important:**
- Replace `<username>` with your database username
- Replace `<password>` with your database password (URL-encode special chars: `@` → `%40`, `#` → `%23`, etc.)
- Replace `<database-name>` with `pushup-checker` (or your preferred name)
- Keep the query parameters: `?retryWrites=true&w=majority`

### 7. Set Environment Variable

#### Local Development (.env.local)
```bash
MONGODB_URI=mongodb+srv://pushupapp:MySecurePass123@cluster0.abc123.mongodb.net/pushup-checker?retryWrites=true&w=majority
```

#### Production (Vercel/Other Platforms)
1. Go to your project settings
2. Navigate to "Environment Variables"
3. Add:
   - Key: `MONGODB_URI`
   - Value: Your connection string
   - Environment: Production, Preview, Development (select all)

## Security Notes

⚠️ **Important Security Tips:**
- Never commit `.env.local` to Git (already in .gitignore)
- Use different passwords for development and production
- Restrict IP access in production (don't use 0.0.0.0/0)
- Rotate passwords regularly
- Use environment-specific database users

## Testing Connection

After setting up, test the connection:
1. Restart your dev server: `npm run dev`
2. Try accessing a page that uses the database
3. Check server logs for connection errors

## Troubleshooting

**Connection Timeout:**
- Check Network Access settings
- Verify IP address is whitelisted
- Check firewall settings

**Authentication Failed:**
- Verify username and password are correct
- URL-encode special characters in password
- Check user has proper permissions

**Database Not Found:**
- Database will be created automatically on first write
- Or create it manually in Atlas UI

## Free Tier Limits

MongoDB Atlas Free (M0) includes:
- 512 MB storage
- Shared RAM and vCPU
- Sufficient for MVP/testing
- Upgrade when needed

