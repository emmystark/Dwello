# Testing Guide - Walrus SDK Integration

## Overview

This guide walks through testing the complete Walrus SDK integration from upload to retrieval.

---

## Prerequisites

- Backend running: `npm run dev` (should output "Server running on http://localhost:3001")
- Frontend running: `npm run dev` in another terminal (should output "http://localhost:5173")
- `.env` configured with `WALRUS_PRIVATE_KEY` (or using auto-generated key)
- Test image file ready (JPEG, PNG, or WebP)

---

## Test 1: Backend Walrus Connection

### Verify Backend Started Successfully

```bash
# Check backend is running
curl http://localhost:3001/health

# Expected response:
# {"status":"ok"} or similar
```

### Check Walrus Initialization

```bash
# Look for logs in backend terminal:
# [Walrus] 🚀 Initializing Walrus client...
# [Walrus] ✅ Connected to aggregator: https://aggregator.walrus-testnet.walrus.space
# [Walrus] ✅ Connected to publisher: https://publisher.walrus-testnet.walrus.space
```

If you see ❌ errors:
- Check internet connection
- Verify URLs in .env are correct
- Check if Walrus testnet is operational

---

## Test 2: File Upload (Backend)

### Upload Test Image

```bash
# Create test image (1x1 PNG)
curl -o test.png "https://via.placeholder.com/100x100/FF0000/000000?text=Test"

# Upload to backend
curl -X POST http://localhost:3001/api/walrus/upload \
  -F "file=@test.png" \
  -F "title=Test Property" \
  -F "amount=500000" \
  -F "caretakerAddress=0x123abc" \
  -F "propertyId=test_prop_1"
```

### Expected Response

```json
{
  "success": true,
  "blobId": "9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d",
  "url": "https://aggregator.walrus-testnet.walrus.space/v1/blobs/9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d",
  "certificateId": "cert_12345",
  "tags": {
    "filename": "test.png",
    "uploadedAt": "2025-01-27T10:30:45.123Z",
    "mimeType": "image/png",
    "title": "Test Property",
    "amount": "500000",
    "caretakerAddress": "0x123abc",
    "propertyId": "test_prop_1"
  },
  "size": 5284
}
```

### Save the blobId

```bash
# Save for later tests
export BLOB_ID="9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d"
echo "Testing with blob ID: $BLOB_ID"
```

### Troubleshooting Upload

**Error: "Failed to upload to Walrus"**
- Check backend logs for detailed error
- Verify file is not corrupted
- Ensure file size < 50MB

**Error: "Failed to initialize signer"**
- Check WALRUS_PRIVATE_KEY is set in .env
- Verify it's valid base64
- Restart backend

**Error: "Network timeout"**
- Check internet connection
- Verify Walrus URLs are accessible
- Try again (network may be temporarily unavailable)

---

## Test 3: File Verification

### Verify File Exists

```bash
curl http://localhost:3001/api/walrus/verify/$BLOB_ID

# Expected response:
# {
#   "success": true,
#   "exists": true,
#   "blobId": "9a8b7c6d5e4f...",
#   "url": "https://aggregator.walrus-testnet.walrus.space/v1/blobs/9a8b7c6d5e4f...",
#   "tags": { ... }
# }
```

### Bulk Verify Multiple Files

```bash
curl -X POST http://localhost:3001/api/walrus/verify-bulk \
  -H "Content-Type: application/json" \
  -d '{
    "blobIds": ["'$BLOB_ID'", "invalid_id_test"]
  }'

# Expected response:
# {
#   "success": true,
#   "results": [
#     { "blobId": "9a8b7c6d5e4f...", "exists": true, ... },
#     { "blobId": "invalid_id_test", "exists": false }
#   ]
# }
```

---

## Test 4: File Retrieval

### Retrieve File

```bash
# Get file from backend
curl http://localhost:3001/api/walrus/file/$BLOB_ID > retrieved.json

# Pretty print to see structure
cat retrieved.json | jq .

# Expected structure:
# {
#   "success": true,
#   "blobId": "9a8b7c6d5e4f...",
#   "bytes": "iVBORw0KGgoAAAANS...",  (base64-encoded PNG data)
#   "size": 5284,
#   "tags": { ... }
# }
```

### Convert Retrieved Bytes to Image

```bash
# Extract base64 bytes and convert to image
node << 'EOF'
const fs = require('fs');
const data = JSON.parse(fs.readFileSync('retrieved.json', 'utf8'));

// Decode base64 to buffer
const buffer = Buffer.from(data.bytes, 'base64');

// Save as PNG
fs.writeFileSync('retrieved.png', buffer);
console.log('✅ Image saved as retrieved.png');
console.log('Size:', buffer.length, 'bytes');
console.log('Tags:', data.tags);
EOF

# Verify retrieved image
ls -lh retrieved.png
file retrieved.png
```

### Verify Retrieved Data

```bash
# Compare original and retrieved
md5 test.png
md5 retrieved.png

# Should have same MD5 hash
```

---

## Test 5: Frontend Upload (UI)

### Start Frontend

```bash
# In terminal, navigate to project root
cd /Users/iboro/Downloads/Dwello

# Start frontend
npm run dev

# Should output something like:
# ➜ Local: http://localhost:5173/
# ➜ press h to show help
```

### Manual Upload Test

1. Open http://localhost:5173 in browser
2. Navigate to Add New Listing or Upload Property page
3. Fill in property details:
   - Title: "Test Property 1"
   - Location: Any location
   - Details: Add description
   - Select image file: `test.png`
4. Click "Upload to Walrus"
5. Check browser console (F12 → Console tab)

### Expected Browser Console Output

```javascript
// Should see logs like:
// ✅ Uploading file: test.png
// 📤 Sending to: /api/walrus/upload
// ✅ Upload successful! Blob ID: 9a8b7c6d5e4f...
// 💾 Property saved with blobId
```

### Check Network Tab

1. Open DevTools (F12)
2. Go to Network tab
3. Upload image
4. Check request to `/api/walrus/upload`:
   - Method: POST
   - Status: 200
   - Request body: multipart/form-data with file + metadata
   - Response: JSON with blobId

---

## Test 6: Frontend Retrieval (UI)

### Navigate to Dashboard

1. Open http://localhost:5173
2. Go to "My Inventory" or "Caretaker Dashboard"
3. Look for property you just uploaded

### Expected Display

- Property card should show:
  - Title: "Test Property 1"
  - Image retrieved from backend
  - All property details

### Check Image Loading

1. Right-click on image → "Inspect"
2. Check `<img>` tag shows blob URL:
   ```html
   <img src="blob:http://localhost:5173/123abc..." />
   ```
3. Check Network tab for `/api/walrus/file/{blobId}` request
4. Verify it returns image data

### If Image Doesn't Load

**Issue**: Image shows broken

**Debug**:
```javascript
// In browser console:
// Check if fetch succeeded
fetch('/api/walrus/file/9a8b7c6d5e4f...')
  .then(r => r.json())
  .then(data => {
    console.log('Bytes length:', data.bytes.length);
    console.log('Tags:', data.tags);
    
    // Try to create blob
    const blob = new Blob([new Uint8Array(atob(data.bytes))]);
    console.log('Blob size:', blob.size);
  });
```

---

## Test 7: Metadata Tags

### Verify Tags Are Stored

```bash
# Retrieve file and check tags
curl http://localhost:3001/api/walrus/file/$BLOB_ID \
  | jq '.tags'

# Expected tags:
# {
#   "filename": "test.png",
#   "uploadedAt": "2025-01-27T10:30:45.123Z",
#   "mimeType": "image/png",
#   "title": "Test Property",
#   "amount": "500000",
#   "caretakerAddress": "0x123abc",
#   "propertyId": "test_prop_1"
# }
```

### Verify Tags Contain All Expected Fields

```bash
# Check each tag
curl http://localhost:3001/api/walrus/file/$BLOB_ID \
  | jq '.tags | keys'

# Should include:
# [
#   "amount",
#   "caretakerAddress",
#   "filename",
#   "mimeType",
#   "propertyId",
#   "title",
#   "uploadedAt"
# ]
```

---

## Test 8: Performance Testing

### Test Large File Upload

```bash
# Create 5MB test file
dd if=/dev/zero bs=1M count=5 | tr '\0' '\n' | head -c 5242880 > large.bin

# Upload and time it
time curl -X POST http://localhost:3001/api/walrus/upload \
  -F "file=@large.bin" \
  -F "title=Large File Test"

# Note the duration
```

### Expected Performance

- Small file (< 1MB): < 2 seconds
- Medium file (1-5MB): 2-10 seconds
- Large file (5-50MB): 10-60 seconds

### Optimize if Too Slow

```bash
# In walrus-service.js, reduce redundancy:
const walrusFile = WalrusFile.from({
  contents: fileBuffer,
  identifier: `${fileName}-${Date.now()}`,
  redundancy: 'low',  // Faster but less redundant
  epochs: 3,          // Shorter lifetime
  tags: { ... }
});
```

---

## Test 9: Error Cases

### Test Invalid File Type

```bash
# Create a test file
echo "this is text" > test.txt

# Try to upload
curl -X POST http://localhost:3001/api/walrus/upload \
  -F "file=@test.txt" \
  -F "title=Text File"

# Should either:
# A) Upload successfully (backend allows it)
# B) Reject with error about file type
```

### Test Missing Metadata

```bash
# Upload without optional fields
curl -X POST http://localhost:3001/api/walrus/upload \
  -F "file=@test.png"

# Should upload successfully
# Tags should have defaults/nulls for missing fields
```

### Test Network Error Recovery

```bash
# Stop backend (Ctrl+C)
# Try to upload - should fail with connection error
curl -X POST http://localhost:3001/api/walrus/upload \
  -F "file=@test.png"

# Restart backend
# Upload should work again
```

---

## Test 10: Database Integration

### Check Property Storage

```bash
# After uploading property, verify it's in database
# This depends on your database setup (MongoDB, Postgres, etc.)

# Example for MongoDB:
mongo --eval "
  db.properties.findOne({ 
    'images.blobId': '$BLOB_ID' 
  });
"

# Should show property with blobId stored
```

---

## Full Integration Test Checklist

Use this checklist to verify complete flow:

- [ ] Backend starts without errors
- [ ] Walrus client initializes successfully
- [ ] File upload returns blobId
- [ ] File verification shows exists: true
- [ ] File retrieval returns bytes + tags
- [ ] Retrieved file matches original (same MD5)
- [ ] Frontend upload form works
- [ ] Frontend shows image in dashboard
- [ ] Tags contain all metadata
- [ ] Performance is acceptable
- [ ] Error handling works (graceful failures)

---

## Logging & Debugging

### Enable Detailed Logs

```bash
# In backend/walrus-service.js, add console.logs
console.log('[WALRUS] Uploading file:', fileName);
console.log('[WALRUS] Signer address:', signer.publicKey);
console.log('[WALRUS] File size:', fileBuffer.length);
console.log('[WALRUS] Blob ID:', result.blobId);
```

### Check Backend Logs

```bash
# Terminal running npm run dev shows:
# Each upload/retrieve will log:
# [WALRUS] 📤 Uploading: filename
# [WALRUS] ✅ Blob ID: 9a8b7c6d...
# [WALRUS] 📥 Retrieving: 9a8b7c6d...
# [WALRUS] ✅ Retrieved: 5284 bytes
```

### Browser Console Logging

```javascript
// In AddNewListing.tsx, add logging:
console.log('🚀 Starting upload:', file.name);
console.log('📤 Sending FormData');
console.log('✅ Response:', data);
```

### Network Inspector

F12 → Network tab shows all requests:
- POST /api/walrus/upload (form data)
- GET /api/walrus/verify/:blobId
- GET /api/walrus/file/:blobId

---

## Performance Profiling

### Time Individual Operations

```bash
# Time upload
time curl -X POST http://localhost:3001/api/walrus/upload \
  -F "file=@test.png" \
  -o /dev/null

# Time verification
time curl http://localhost:3001/api/walrus/verify/$BLOB_ID

# Time retrieval
time curl http://localhost:3001/api/walrus/file/$BLOB_ID \
  -o /dev/null
```

### Monitor Resource Usage

```bash
# Watch backend memory/CPU during upload
# Terminal 1: Backend
npm run dev

# Terminal 2: Monitor
watch -n 1 'ps aux | grep node'

# Or use:
top -p $(pgrep -f "node.*api.js")
```

---

## Common Test Issues & Solutions

### Issue: "Blob not found" on retrieval

**Cause**: blobId was typed wrong or upload failed silently

**Solution**:
```bash
# Double-check blobId
echo $BLOB_ID

# Verify it exists
curl http://localhost:3001/api/walrus/verify/$BLOB_ID

# Check backend logs for upload errors
```

### Issue: Image shows as broken in browser

**Cause**: Blob URL creation failed

**Solution**:
```javascript
// Debug in browser console
const response = await fetch('/api/walrus/file/YOUR_BLOB_ID');
const data = await response.json();
console.log('Data structure:', data);
console.log('Bytes type:', typeof data.bytes);
console.log('Bytes length:', data.bytes.length);

// Try manual blob creation
const uint8Array = new Uint8Array(atob(data.bytes).split('').map(c => c.charCodeAt(0)));
const blob = new Blob([uint8Array], { type: 'image/png' });
console.log('Blob created:', blob.size, 'bytes');
```

### Issue: Upload hangs / never completes

**Cause**: Network timeout or large file

**Solution**:
```javascript
// Increase timeout in AddNewListing.tsx
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 60000); // 60 sec

const response = await fetch('/api/walrus/upload', {
  method: 'POST',
  body: formData,
  signal: controller.signal
});

clearTimeout(timeout);
```

---

## Success Criteria

Test passes when:

✅ Upload succeeds with blobId returned
✅ File retrieved matches original
✅ Tags properly stored and returned
✅ Frontend image displays correctly
✅ No TypeScript errors
✅ Performance < 10 seconds for typical files
✅ Error cases handled gracefully
✅ Database shows property with blobId

---

## Next Steps

Once all tests pass:

1. Deploy backend to production server
2. Update .env with production WALRUS_PRIVATE_KEY
3. Deploy frontend to production CDN
4. Monitor Walrus blob uploads/retrievals
5. Set up automated testing CI/CD pipeline
