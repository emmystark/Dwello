# Backend Setup Guide

Complete guide to set up and run the Dwello backend.

## ✅ Prerequisites Checklist

- [ ] Node.js 16+ installed (`node -v`)
- [ ] npm 8+ installed (`npm -v`)
- [ ] Backend directory exists: `/Users/iboro/Downloads/Dwello/backend/`
- [ ] Internet connection (for Walrus/Sui networks)

## 📦 Installation

### Step 1: Navigate to Backend Directory

```bash
cd /Users/iboro/Downloads/Dwello/backend
```

### Step 2: Install Dependencies

All dependencies are defined in `package.json`:

```bash
npm install
```

**Expected output:**
```
added 164 packages, and audited 165 packages in 1m31s
found 0 vulnerabilities
```

### Step 3: Verify Installation

Check that all dependencies are installed:

```bash
npm list
```

**Expected (first level):**
```
dwello-backend@1.0.0
├── @mysten/sui@1.45.0+
├── @mysten/walrus@0.8.4+
├── cors@2.8.6+
├── dotenv@16.6.1+
├── express@4.22.1+
├── form-data@4.0.5+
├── multer@1.4.5-lts.1+
├── node-fetch@3.3.2+
└── nodemon@3.1.0+
```

## ⚙️ Configuration

### Step 1: Create .env File

```bash
# From template
cp .env.example .env
```

### Step 2: Edit .env

```bash
# Open in your editor
nano .env
# or
vim .env
# or
code .env
```

### Step 3: Set Required Variables

Minimum configuration:

```env
PORT=3001
NODE_ENV=development

# Walrus (testnet - no changes needed)
WALRUS_AGGREGATOR_URL=https://aggregator.walrus-testnet.walrus.space
WALRUS_PUBLISHER_URL=https://publisher.walrus-testnet.walrus.space

# Sui (testnet - no changes needed)
SUI_NETWORK=testnet
SUI_RPC_URL=https://fullnode.testnet.sui.io

# Leave empty for development
WALRUS_PRIVATE_KEY=
```

### Step 4: Production Configuration

For production, add:

```env
NODE_ENV=production
WALRUS_PRIVATE_KEY=your_base64_encoded_ed25519_key
```

## 🚀 Starting the Backend

### Development Mode (with auto-reload)

```bash
npm run dev
```

**Expected output:**
```
[Walrus] 🚀 Initializing Walrus client...
[Walrus] ✅ Connected to aggregator
[Walrus] ✅ Connected to publisher
[Server] ✅ Server running on http://localhost:3001
```

### Production Mode

```bash
npm start
```

### Using PM2 (Recommended for Production)

```bash
# Install PM2 globally
npm install -g pm2

# Start backend
pm2 start api.js --name "dwello-backend"

# View logs
pm2 logs dwello-backend

# Stop backend
pm2 stop dwello-backend

# Restart
pm2 restart dwello-backend
```

## 📋 Installed Dependencies Explained

| Package | Version | Why We Use It |
|---------|---------|---------------|
| **express** | ^4.22.1 | Web server framework |
| **multer** | ^1.4.5-lts.1 | Handle file uploads |
| **cors** | ^2.8.6 | Cross-origin requests from frontend |
| **dotenv** | ^16.6.1 | Load environment variables from .env |
| **node-fetch** | ^3.3.2 | Make HTTP requests |
| **form-data** | ^4.0.5 | Create multipart form data |
| **@mysten/sui** | ^1.45.0 | Sui blockchain SDK |
| **@mysten/walrus** | ^0.8.4 | Walrus storage SDK |
| **nodemon** | ^3.1.0 | Auto-restart on file changes (dev) |
| **@types/node** | ^24.10.0 | TypeScript definitions for Node.js |

## 🧪 Verification

### Test 1: Backend Health Check

```bash
curl http://localhost:3001/health
```

### Test 2: Upload Test

```bash
# Create test image
curl -o test.png "https://via.placeholder.com/100x100"

# Upload
curl -X POST http://localhost:3001/api/walrus/upload \
  -F "file=@test.png" \
  -F "title=Test"

# Expected response:
# { "blobId": "...", "url": "...", "success": true }
```

### Test 3: Frontend Connection

```bash
# In another terminal, start frontend
cd /Users/iboro/Downloads/Dwello
npm run dev

# Open http://localhost:5173 in browser
# Try uploading an image
# Should see it in My Inventory
```

## 📊 File Structure After Setup

```
backend/
├── node_modules/              ✅ Created (164 packages)
├── package.json               ✅ Dependencies defined
├── package-lock.json          ✅ Created (dependency lock)
├── .env                       ✅ Create & configure
├── .env.example               ✅ Template provided
├── .gitignore                 ✅ Exclude from git
├── api.js                     ✅ Main server
├── walrus-service.js          ✅ Walrus integration
├── payment-service.js         ✅ Payment verification
├── server.js                  ✅ Legacy startup
├── README.md                  ✅ Documentation
├── setup.sh                   ✅ Setup script
└── uploads/                   ✅ Created at runtime
```

## 🔐 Security Setup

### 1. Add to .gitignore

Already included in `backend/.gitignore`:
- ✅ `.env` (never commit secrets)
- ✅ `node_modules/` (rebuild with npm install)
- ✅ `uploads/` (temporary files)
- ✅ `*.log` (log files)

### 2. Environment Variables

```bash
# Never hardcode secrets!
# Always use .env files
# Never commit .env to git
```

### 3. Private Key Management

**Development:**
```env
WALRUS_PRIVATE_KEY=
# Leave empty, backend generates temp key
```

**Production:**
```env
# Use environment variable from secure storage:
# AWS Secrets Manager, HashiCorp Vault, etc.
WALRUS_PRIVATE_KEY=base64_encoded_ed25519_key
```

## 🐛 Troubleshooting

### Issue: "npm: command not found"

**Solution:** Install Node.js from https://nodejs.org

```bash
# Verify installation
node -v
npm -v
```

### Issue: "Port 3001 already in use"

**Solution:** Use a different port or kill the process

```bash
# Use different port
PORT=3002 npm run dev

# Or kill process on 3001
lsof -ti:3001 | xargs kill -9
```

### Issue: "Cannot find module '@mysten/walrus'"

**Solution:** Reinstall dependencies

```bash
rm -rf node_modules package-lock.json
npm install
```

### Issue: "EACCES: permission denied"

**Solution:** Fix npm permissions

```bash
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
export PATH=~/.npm-global/bin:$PATH
```

### Issue: "Failed to connect to Walrus"

**Solution:** Check network and URLs

```bash
# Verify URLs in .env are correct
cat .env | grep WALRUS

# Test connection
curl https://aggregator.walrus-testnet.walrus.space/health
```

### Issue: Backend starts but frontend can't connect

**Solution:** Check CORS configuration

```bash
# Verify backend is running
curl http://localhost:3001/health

# Verify frontend is accessing correct URL
# Should be http://localhost:3001 (not https)
```

## 📚 Next Steps

1. **✅ Installation Complete** (you are here)
2. **⏭️ Start Backend**
   ```bash
   npm run dev
   ```
3. **⏭️ Start Frontend**
   ```bash
   cd .. && npm run dev
   ```
4. **⏭️ Test Upload**
   - Open http://localhost:5173
   - Go to "Add New Listing"
   - Upload an image
   - Check "My Inventory"

## 📖 Documentation

- [Backend README.md](./README.md) - Backend overview
- [package.json](./package.json) - Dependencies
- [.env.example](./.env.example) - Configuration template
- [../BACKEND_SETUP.md](../BACKEND_SETUP.md) - Detailed backend guide
- [../TESTING_GUIDE.md](../TESTING_GUIDE.md) - Test procedures

## ✨ Summary

**Backend Setup Status:**
- ✅ package.json created with all dependencies
- ✅ Dependencies installed (164 packages)
- ✅ .env.example provided
- ✅ .gitignore configured
- ✅ README.md with documentation
- ✅ Ready to start with `npm run dev`

**Ready to run:**
```bash
npm run dev
# Server running on http://localhost:3001
```
