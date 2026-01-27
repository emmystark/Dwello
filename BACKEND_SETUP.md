# Backend Setup Guide - Walrus SDK Integration

## Overview

The backend now uses the Walrus SDK for proper file uploads and retrievals with metadata tags. This guide explains how to set up and run the backend.

---

## Prerequisites

1. **Node.js** (v16+)
2. **npm** or **yarn**
3. **Sui Private Key** (for signing Walrus transactions)
4. **Sui Testnet account** (for gas and signer)

---

## Installation

### Step 1: Install Dependencies

```bash
cd /Users/iboro/Downloads/Dwello
npm install
```

Required packages (already in package.json):
- `@mysten/walrus` - Walrus SDK
- `@mysten/sui` - Sui SDK
- `express` - Web framework
- `multer` - File upload middleware
- `cors` - Cross-origin requests
- `dotenv` - Environment variables

### Step 2: Setup Environment Variables

Create a `.env` file in the backend root:

```bash
cd /Users/iboro/Downloads/Dwello
touch .env
```

Add these variables:

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

# Walrus Signer (IMPORTANT: See below for security)
WALRUS_PRIVATE_KEY=your_base64_encoded_private_key_here
```

### Step 3: Get Your Private Key for Signing

The backend needs a Sui private key to sign Walrus upload transactions.

#### Option A: Generate a New Test Key

```bash
# Using Sui CLI (if installed)
sui client new-address ed25519

# The output will be: Created new keypair for address: 0x...
# You need the private key in base64 format
```

#### Option B: Export Existing Key

If you already have a wallet:

```bash
# Show your current addresses
sui client active-address

# Get the key in base64 (method varies by wallet)
# For Sui CLI, check: ~/.sui/sui_config/sui.keystore
```

#### Option C: Use Ed25519Keypair (Development Only)

For development/testing, the backend will create a temporary keypair if `WALRUS_PRIVATE_KEY` is not set.

**⚠️ WARNING**: This is NOT for production. Always use a proper key in production.

### Step 4: Format Private Key as Base64

Your private key should be:
1. In Ed25519 format
2. Encoded as base64
3. Set in `WALRUS_PRIVATE_KEY` env variable

Example conversion:
```bash
# If you have raw private key bytes:
echo -n "your_private_key_bytes" | base64

# Result: your_base64_encoded_private_key
# Add to .env: WALRUS_PRIVATE_KEY=your_base64_encoded_private_key
```

---

## Starting the Backend

### Basic Start

```bash
cd /Users/iboro/Downloads/Dwello
npm run dev
```

Expected output:
```
[Walrus] 🚀 Initializing Walrus client...
[Walrus] ✅ Connected to aggregator: https://aggregator.walrus-testnet.walrus.space
[Walrus] ✅ Connected to publisher: https://publisher.walrus-testnet.walrus.space
[Server] ✅ Server running on http://localhost:3001
```

### With Custom Port

```bash
PORT=3002 npm run dev
```

### Debug Mode (Show Logs)

```bash
DEBUG=* npm run dev
```

---

## API Endpoints

### Upload File to Walrus

```http
POST /api/walrus/upload
Content-Type: multipart/form-data

Parameters:
- file: (required) File to upload
- title: (optional) Display title
- amount: (optional) Associated amount
- caretakerAddress: (optional) Wallet address
- propertyId: (optional) Property identifier
```

**cURL Example**:
```bash
curl -X POST http://localhost:3001/api/walrus/upload \
  -F "file=@/path/to/image.jpg" \
  -F "title=House Photo" \
  -F "caretakerAddress=0x1234..." \
  -F "propertyId=prop_123"
```

**Response**:
```json
{
  "success": true,
  "blobId": "0a1b2c3d...",
  "url": "https://aggregator.walrus-testnet.walrus.space/v1/blobs/0a1b2c3d...",
  "certificateId": "cert_123",
  "tags": {
    "filename": "image.jpg",
    "uploadedAt": "2025-01-27T...",
    "mimeType": "image/jpeg",
    "title": "House Photo",
    "caretakerAddress": "0x1234...",
    "propertyId": "prop_123"
  },
  "size": 102400
}
```

### Retrieve File from Walrus

```http
GET /api/walrus/file/:blobId
```

**cURL Example**:
```bash
curl http://localhost:3001/api/walrus/file/0a1b2c3d... > image.jpg
```

**Response**:
```json
{
  "success": true,
  "blobId": "0a1b2c3d...",
  "bytes": "base64_encoded_file_data",
  "size": 102400,
  "tags": {
    "filename": "image.jpg",
    "title": "House Photo",
    "mimeType": "image/jpeg"
  }
}
```

### Verify File Exists

```http
GET /api/walrus/verify/:blobId
```

**Response**:
```json
{
  "success": true,
  "exists": true,
  "blobId": "0a1b2c3d...",
  "url": "https://aggregator.walrus-testnet.walrus.space/v1/blobs/0a1b2c3d...",
  "tags": { ... }
}
```

### Bulk Verify Files

```http
POST /api/walrus/verify-bulk
Content-Type: application/json

{
  "blobIds": ["0a1b2c3d...", "1b2c3d4e...", ...]
}
```

---

## File Structure

```
backend/
├── api.js                 # Main Express app with all endpoints
├── walrus-service.js      # Walrus SDK integration (NEW)
├── payment-service.js     # Payment/contract logic
├── server.js              # Server startup
└── uploads/              # Temporary file storage (created at runtime)
```

### Key Files Modified

| File | Changes |
|------|---------|
| `api.js` | Added import for walrus-service, added 4 new endpoints |
| `walrus-service.js` | NEW - Walrus SDK implementation |

---

## Walrus Service Functions

### `uploadToWalrus(fileBuffer, fileName, metadata)`

Uploads file to Walrus with SDK.

```javascript
import { uploadToWalrus } from './walrus-service.js';

const result = await uploadToWalrus(
  fileBuffer,
  'image.jpg',
  {
    title: 'House Photo',
    amount: '0',
    caretakerAddress: '0x1234...',
    propertyId: 'prop_123'
  }
);

console.log('Blob ID:', result.blobId);
console.log('Tags:', result.tags);
```

### `getWalrusFile(blobId)`

Retrieves file from Walrus.

```javascript
import { getWalrusFile } from './walrus-service.js';

const fileData = await getWalrusFile('0a1b2c3d...');

console.log('File size:', fileData.size);
console.log('Metadata:', fileData.tags);
console.log('Bytes:', fileData.bytes);
```

### `verifyWalrusFile(blobId)`

Checks if file exists on Walrus.

```javascript
import { verifyWalrusFile } from './walrus-service.js';

const verification = await verifyWalrusFile('0a1b2c3d...');

if (verification.exists) {
  console.log('File found:', verification.url);
} else {
  console.log('File not found');
}
```

---

## Workflow: Upload → Store → Retrieve

### Frontend (AddNewListing)

```
1. User selects image
2. Click "Upload to Walrus"
3. POST /api/walrus/upload with file
4. Backend handles SDK upload
5. Returns blobId
6. Frontend saves blobId with property metadata
```

### Backend (walrus-service.js)

```
1. Receive file from frontend
2. Create WalrusFile with tags:
   - filename
   - title
   - amount
   - caretakerAddress
   - propertyId
   - mimeType
   - uploadedAt
3. Call walrusClient.writeFiles() with signer
4. Return blobId + tags
```

### Frontend (MyInventory)

```
1. Dashboard fetches properties
2. For each property with blobId:
3. GET /api/walrus/file/{blobId}
4. Backend fetches from Walrus
5. Returns base64-encoded file
6. Frontend converts to blob URL
7. Renders image
```

---

## Troubleshooting

### Error: "WALRUS_PRIVATE_KEY not set"

**Issue**: Backend can't sign transactions

**Fix**:
```bash
# 1. Generate or get your key
# 2. Encode as base64
# 3. Add to .env:
WALRUS_PRIVATE_KEY=your_base64_key

# 4. Restart backend
npm run dev
```

### Error: "Failed to decode WALRUS_PRIVATE_KEY"

**Issue**: Key format is wrong

**Fix**:
```bash
# Ensure key is properly base64 encoded
echo -n "raw_private_key_bytes" | base64

# Paste result in .env
WALRUS_PRIVATE_KEY=correct_base64_format
```

### Error: "No blob ID returned from Walrus"

**Issue**: Upload succeeded but no ID in response

**Debug**:
```javascript
// In walrus-service.js, check response structure
console.log('Upload response:', JSON.stringify(result, null, 2));

// Look for: newlyCreated.blobObject.blobId or newlyCreated.blobId
```

### Error: "File not found" on retrieval

**Issue**: blobId doesn't exist on Walrus

**Debug**:
```bash
# Verify file exists
curl http://localhost:3001/api/walrus/verify/YOUR_BLOB_ID

# Check blob ID is correct
curl http://localhost:3001/api/walrus/file/YOUR_BLOB_ID
```

### Uploads are slow

**Issue**: Network latency or file size

**Fix**:
```bash
# Increase timeout in AddNewListing.tsx
fetch('/api/walrus/upload', {
  method: 'POST',
  body: formData,
  timeout: 60000  // 60 seconds
})
```

---

## Security Considerations

### Private Key Management

1. **Never commit `.env` to git**
   ```bash
   # Add to .gitignore
   echo ".env" >> .gitignore
   echo ".env.local" >> .gitignore
   ```

2. **Use secure key storage in production**
   - AWS Secrets Manager
   - Google Cloud Secret Manager
   - HashiCorp Vault
   - Azure Key Vault

3. **Rotate keys regularly**
   - Generate new key
   - Update environment
   - Revoke old key

### File Upload Security

1. **Validate file types**
   ```javascript
   const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
   if (!allowedTypes.includes(file.mimetype)) {
     throw new Error('Invalid file type');
   }
   ```

2. **Limit file size**
   ```javascript
   const maxSize = 10 * 1024 * 1024; // 10MB
   if (file.size > maxSize) {
     throw new Error('File too large');
   }
   ```

3. **Check caretaker authorization**
   ```javascript
   // Verify caretakerAddress matches authenticated user
   if (caretakerAddress !== req.user.address) {
     throw new Error('Unauthorized');
   }
   ```

---

## Monitoring & Logs

### Enable Detailed Logging

```javascript
// In api.js or walrus-service.js
console.log('🚀 Starting upload:', fileName);
console.log('📝 Signer:', publicAddress);
console.log('📦 File size:', fileBuffer.length);
console.log('✅ Upload complete:', blobId);
```

### Log Levels

Add to backend:
```javascript
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';

function log(level, message, data = {}) {
  if (level === 'error') console.error('❌', message, data);
  else if (level === 'warn') console.warn('⚠️', message, data);
  else if (level === 'info') console.log('ℹ️', message, data);
  else if (level === 'debug') console.log('🐛', message, data);
}
```

### Check Walrus Status

```bash
# Test aggregator
curl https://aggregator.walrus-testnet.walrus.space/health

# Test publisher
curl https://publisher.walrus-testnet.walrus.space/health
```

---

## Performance Tuning

### Optimize File Uploads

```javascript
// In walrus-service.js
const walrusFile = WalrusFile.from({
  contents: fileBuffer,
  identifier: `${fileName}-${Date.now()}`,
  redundancy: 'low',  // Lower redundancy = faster uploads
  epochs: 3,          // Shorter storage = faster
  tags: { ... }
});
```

### Batch Operations

```javascript
// Upload multiple files
const files = [file1, file2, file3];
const result = await walrusClient.writeFiles({
  files: files.map(f => WalrusFile.from({ ... })),
  signer
});
```

---

## Testing

### Manual Upload Test

```bash
# 1. Start backend
npm run dev

# 2. Upload file
curl -X POST http://localhost:3001/api/walrus/upload \
  -F "file=@test.jpg" \
  -F "title=Test"

# 3. Save the blobId from response
export BLOB_ID="your_blob_id_here"

# 4. Verify
curl http://localhost:3001/api/walrus/verify/$BLOB_ID

# 5. Retrieve
curl http://localhost:3001/api/walrus/file/$BLOB_ID > downloaded.jpg
```

### Automated Testing

```javascript
// test/walrus.test.js
import { uploadToWalrus, getWalrusFile } from '../walrus-service.js';

describe('Walrus Integration', () => {
  it('should upload and retrieve file', async () => {
    const fileBuffer = Buffer.from('test content');
    const uploadResult = await uploadToWalrus(fileBuffer, 'test.txt');
    
    expect(uploadResult.blobId).toBeDefined();
    
    const retrieveResult = await getWalrusFile(uploadResult.blobId);
    expect(retrieveResult.bytes).toBeDefined();
  });
});
```

---

## Deployment

### Environment Setup

```bash
# Production .env
PORT=3001
NODE_ENV=production
WALRUS_AGGREGATOR_URL=https://aggregator.walrus-testnet.walrus.space
WALRUS_PUBLISHER_URL=https://publisher.walrus-testnet.walrus.space
WALRUS_PRIVATE_KEY=your_secure_key_here
```

### Start Backend

```bash
# Using npm
npm start

# Using PM2 (recommended for production)
pm2 start backend/api.js --name "dwello-backend"

# Using Docker
docker build -t dwello-backend .
docker run -p 3001:3001 -e WALRUS_PRIVATE_KEY=... dwello-backend
```

---

## Summary

✅ Backend now uses Walrus SDK
✅ Proper file signing with Ed25519 keypair
✅ Metadata stored as tags
✅ 4 new API endpoints for upload/retrieve/verify
✅ Secure environment variable handling
✅ Production-ready error handling

**Next Steps**: Configure `.env` with your private key and start the backend!
