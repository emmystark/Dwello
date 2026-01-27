# Dwello Backend

Production-ready Node.js backend with Express, Walrus SDK integration, and Sui blockchain support.

## 📋 Requirements

- **Node.js**: 16.0.0 or higher
- **npm**: 8.0.0 or higher
- **Internet**: Connection to Walrus testnet and Sui RPC

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

```bash
# Copy example configuration
cp .env.example .env

# Edit .env with your settings
# Minimum required: WALRUS_PRIVATE_KEY (leave empty for dev)
```

### 3. Start Backend

```bash
# Development
npm run dev

# Production
npm start
```

Expected output:
```
[Walrus] ✅ Connected to aggregator
[Server] ✅ Server running on http://localhost:3001
```

## 📦 Installed Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| express | ^4.22.1 | Web framework |
| multer | ^1.4.5-lts.1 | File upload handling |
| cors | ^2.8.6 | Cross-origin requests |
| dotenv | ^16.6.1 | Environment variables |
| node-fetch | ^3.3.2 | HTTP requests |
| form-data | ^4.0.5 | FormData for multipart |
| @mysten/sui | ^1.45.0 | Sui SDK |
| @mysten/sui.js | ^0.54.1 | Sui utilities |
| @mysten/walrus | ^0.8.4 | Walrus SDK |

## 🔧 Configuration

### Environment Variables (.env)

```env
# Server
PORT=3001
NODE_ENV=development

# Walrus Configuration
WALRUS_AGGREGATOR_URL=https://aggregator.walrus-testnet.walrus.space
WALRUS_PUBLISHER_URL=https://publisher.walrus-testnet.walrus.space

# Sui Configuration
SUI_NETWORK=testnet
SUI_RPC_URL=https://fullnode.testnet.sui.io

# Walrus Signer
WALRUS_PRIVATE_KEY=              # Leave empty for dev (auto-generates)
```

## 📁 File Structure

```
backend/
├── api.js                 # Main Express API endpoints
├── server.js              # Server startup (legacy)
├── walrus-service.js      # Walrus SDK integration
├── payment-service.js     # Sui payment verification
├── package.json           # Node.js dependencies
├── .env.example           # Configuration template
├── .env                   # Configuration (git-ignored)
├── setup.sh               # Setup script
└── node_modules/          # Dependencies (git-ignored)
```

## 🌐 API Endpoints

### Upload File
```
POST /api/walrus/upload
Content-Type: multipart/form-data

Parameters:
- file: (File) Image/document to upload
- title: (string) Display title
- amount: (string) Associated amount
- caretakerAddress: (string) User wallet
- propertyId: (string) Property reference
```

### Retrieve File
```
GET /api/walrus/file/:blobId

Returns: JSON with bytes (base64), tags, size
```

### Verify File
```
GET /api/walrus/verify/:blobId

Returns: { exists: boolean, url: string }
```

### Properties
```
POST /api/properties
GET /api/properties/:propertyId
```

## 🔐 Security

- ✅ Environment variables for sensitive data
- ✅ Server-side signer for Walrus uploads
- ✅ CORS configured
- ✅ File type validation
- ✅ Error handling

### Best Practices

1. **Never commit .env** - Add to .gitignore
2. **Use production key** - Secure Ed25519 keypair in production
3. **Enable HTTPS** - Use reverse proxy (nginx/Apache)
4. **Rate limiting** - Implement in production
5. **Logging** - Monitor API calls and errors

## 🧪 Testing

### Test Upload
```bash
curl -X POST http://localhost:3001/api/walrus/upload \
  -F "file=@test.jpg" \
  -F "title=Test Property"
```

### Test Retrieval
```bash
BLOB_ID="from_upload_response"
curl http://localhost:3001/api/walrus/file/$BLOB_ID | jq .
```

## 📊 Project Structure

### Main Files

**api.js** (850+ lines)
- Express app setup
- All route handlers
- Walrus endpoints
- Payment verification
- Error handling

**walrus-service.js** (200+ lines)
- WalrusClient initialization
- File upload with tags
- File retrieval
- Verification logic
- Signer management

**payment-service.js** (320+ lines)
- Sui payment verification
- AccessPass NFT checking
- Property ownership validation
- Caretaker management

## 🚀 Deployment

### Local Development
```bash
npm run dev
```

### Production
```bash
# Install dependencies
npm install --production

# Start server
npm start

# Or use PM2
pm2 start api.js --name "dwello-backend"
```

### Docker (Optional)
```bash
docker build -t dwello-backend .
docker run -p 3001:3001 -e WALRUS_PRIVATE_KEY=... dwello-backend
```

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Change port
PORT=3002 npm run dev

# Or kill process using 3001
lsof -ti:3001 | xargs kill -9
```

### Walrus Connection Failed
```bash
# Check URLs in .env
# Verify internet connection
# Check Walrus testnet status
curl https://aggregator.walrus-testnet.walrus.space/health
```

### Module Not Found
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### EACCES Permission Denied
```bash
# Fix npm permissions
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
export PATH=~/.npm-global/bin:$PATH
```

## 📚 Documentation

- See [BACKEND_SETUP.md](../BACKEND_SETUP.md) for detailed setup
- See [TESTING_GUIDE.md](../TESTING_GUIDE.md) for test procedures
- See [WALRUS_SDK_IMPLEMENTATION.md](../WALRUS_SDK_IMPLEMENTATION.md) for architecture

## 🔗 Related

- **Frontend**: See ../README.md
- **Walrus Docs**: https://docs.walrus.space
- **Sui Docs**: https://docs.sui.io

## 📝 Scripts

```bash
# Development (auto-restart on changes)
npm run dev

# Production
npm start

# Testing
npm test
```

## 🤝 Contributing

1. Create feature branch
2. Make changes
3. Test with TESTING_GUIDE.md
4. Submit PR

## 📄 License

MIT
