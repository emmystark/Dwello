# Quick Start Guide

Get up and running with Walrus SDK integration in 5 minutes.

---

## 🚀 5-Minute Setup

### Step 1: Configure Environment (1 min)

```bash
cd /Users/iboro/Downloads/Dwello

# Create .env file
cat > .env << 'EOF'
PORT=3001
NODE_ENV=development
WALRUS_AGGREGATOR_URL=https://aggregator.walrus-testnet.walrus.space
WALRUS_PUBLISHER_URL=https://publisher.walrus-testnet.walrus.space
SUI_NETWORK=testnet
SUI_RPC_URL=https://fullnode.testnet.sui.io
WALRUS_PRIVATE_KEY=
EOF
```

For production or if you have an existing key, add it:

```bash
# If you have Ed25519 private key in base64:
echo "WALRUS_PRIVATE_KEY=your_base64_key_here" >> .env
```

See [ENV_SETUP.md](ENV_SETUP.md) for how to get a key.

### Step 2: Start Backend (1 min)

```bash
npm install  # If not already done
npm run dev

# Expected output:
# [Walrus] ✅ Connected to aggregator
# [Server] ✅ Server running on http://localhost:3001
```

### Step 3: Start Frontend (1 min)

In a new terminal:

```bash
npm run dev

# Expected output:
# ➜ Local: http://localhost:5173/
```

### Step 4: Test Upload (1 min)

```bash
# Create test image
curl -o test.png "https://via.placeholder.com/100x100/FF0000/000000?text=Test"

# Upload to backend
curl -X POST http://localhost:3001/api/walrus/upload \
  -F "file=@test.png" \
  -F "title=Test Property"

# Should return JSON with blobId
```

### Step 5: Test Display (1 min)

1. Open http://localhost:5173
2. Go to "Add New Listing"
3. Upload image
4. Check "My Inventory" - image should display

---

## 📋 Common Commands

### Backend

```bash
# Start backend
npm run dev

# Check if running
curl http://localhost:3001/health

# View logs
# Just watch terminal running npm run dev
```

### Frontend

```bash
# Start frontend
npm run dev

# View at http://localhost:5173
```

### Test Upload

```bash
# Quick test
curl -X POST http://localhost:3001/api/walrus/upload \
  -F "file=@test.png"
```

### Test Retrieval

```bash
# Save blob ID from upload response as:
export BLOB_ID="9a8b7c6d5e4f..."

# Retrieve
curl http://localhost:3001/api/walrus/file/$BLOB_ID | jq .
```

---

## 🐛 Troubleshooting

### Backend won't start

**Error**: `Failed to initialize Walrus client`

**Fix**:
```bash
# Check internet connection
ping aggregator.walrus-testnet.walrus.space

# Verify URLs in .env are correct
cat .env | grep WALRUS
```

### Upload fails

**Error**: `Failed to upload to Walrus`

**Fix**:
```bash
# Check backend is running
curl http://localhost:3001/health

# Check backend logs for error
# See what's in the terminal running npm run dev
```

### Image doesn't display

**Error**: Broken image in dashboard

**Fix**:
1. Check browser console (F12) for errors
2. Check Network tab for `/api/walrus/file/{blobId}` request
3. Verify blobId is correct
4. Check backend logs

### Signer error

**Error**: `Failed to initialize signer` or `WALRUS_PRIVATE_KEY not set`

**Fix**:
```bash
# Either:
# 1. Add private key to .env
echo "WALRUS_PRIVATE_KEY=your_base64_key" >> .env

# 2. Or leave empty for auto-generated key (dev only)
# Then restart backend
npm run dev
```

---

## 📁 File Locations

Important files for Walrus integration:

```
/Users/iboro/Downloads/Dwello/
├── .env                              # Configuration (add WALRUS_PRIVATE_KEY here)
├── backend/
│   ├── api.js                        # Express endpoints
│   ├── walrus-service.js             # Walrus SDK logic
│   └── server.js                     # Server startup
├── src/
│   ├── walrus/
│   │   └── client.ts                 # Frontend Walrus client
│   └── components/
│       ├── AddNewListing.tsx          # Upload form
│       └── MyInventory.tsx            # Display dashboard
└── Documentation/
    ├── BACKEND_SETUP.md              # Detailed backend guide
    ├── ENV_SETUP.md                  # Environment variables
    ├── TESTING_GUIDE.md              # Test procedures
    └── WALRUS_SDK_IMPLEMENTATION.md  # Implementation details
```

---

## 🔍 What Happens on Upload

1. **Frontend**: User selects image in "Add New Listing"
2. **Frontend**: Click "Upload to Walrus"
3. **Backend**: Receives FormData with file + metadata
4. **Backend**: Creates WalrusFile with tags
5. **Backend**: Signs and uploads using walrusClient SDK
6. **Walrus**: Stores file + metadata, returns blobId
7. **Backend**: Returns blobId to frontend
8. **Frontend**: Saves property with blobId
9. **Database**: Property now has blobId reference

---

## 🔍 What Happens on Display

1. **Frontend**: Dashboard loads properties
2. **Frontend**: For each property, gets blobId
3. **Frontend**: Calls GET `/api/walrus/file/{blobId}`
4. **Backend**: Fetches file from Walrus using SDK
5. **Backend**: Returns bytes (base64) + metadata
6. **Frontend**: Converts base64 to Blob
7. **Frontend**: Creates blob URL
8. **Frontend**: Displays image with `<img src={blobUrl} />`

---

## 🧪 Validation Checklist

Before using in production, verify:

- [ ] Backend starts without errors
- [ ] Frontend loads at http://localhost:5173
- [ ] Can upload image through UI
- [ ] Image displays in dashboard
- [ ] Image matches original file
- [ ] blobId is stored in database
- [ ] Metadata tags are included
- [ ] No TypeScript errors
- [ ] No network errors

Run tests in [TESTING_GUIDE.md](TESTING_GUIDE.md) for complete validation.

---

## 📚 Full Documentation

For more details, see:

- **[BACKEND_SETUP.md](BACKEND_SETUP.md)** - Complete backend configuration
- **[ENV_SETUP.md](ENV_SETUP.md)** - Environment variables explained
- **[TESTING_GUIDE.md](TESTING_GUIDE.md)** - Full test procedures
- **[WALRUS_SDK_IMPLEMENTATION.md](WALRUS_SDK_IMPLEMENTATION.md)** - Architecture & implementation

---

## ✅ What's Implemented

- ✅ WalrusFile SDK pattern with tags
- ✅ Backend signer management (secure)
- ✅ 4 API endpoints (upload, retrieve, verify, bulk-verify)
- ✅ Frontend → Backend → Walrus flow
- ✅ Image reconstruction from base64
- ✅ Metadata storage and retrieval
- ✅ Error handling with logging
- ✅ Frontend UI integration
- ✅ Complete documentation

---

## 🚀 Ready? Start Here

```bash
# Terminal 1: Backend
cd /Users/iboro/Downloads/Dwello
npm run dev

# Terminal 2: Frontend
npm run dev

# Terminal 3: Test
curl -X POST http://localhost:3001/api/walrus/upload \
  -F "file=@test.png" \
  -F "title=Test"

# Open browser: http://localhost:5173
```

**Expected**: Images upload, store to Walrus, display on dashboard with metadata.

---

## 💡 Tips

1. **Check Backend Logs**: npm run dev terminal shows all operations
2. **Use Browser DevTools**: F12 → Console/Network to debug frontend
3. **Save blobId**: From upload responses for manual testing
4. **Test cURL**: Before frontend, verify backend endpoints work
5. **Monitor Performance**: Uploads typically take 2-10 seconds

---

## 🆘 Need Help?

1. Check [TESTING_GUIDE.md](TESTING_GUIDE.md) for error cases
2. Review backend logs in terminal
3. Check browser console (F12) for frontend errors
4. Verify .env configuration
5. See [BACKEND_SETUP.md](BACKEND_SETUP.md) troubleshooting section

---

**That's it!** You now have Walrus SDK integration working.

Next: Deploy to production (see [BACKEND_SETUP.md](BACKEND_SETUP.md#deployment))
