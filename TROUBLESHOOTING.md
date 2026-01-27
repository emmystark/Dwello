# TROUBLESHOOTING REFERENCE - Images Not Showing

Use this document ONLY if images don't appear after uploading. Check each section in order.

---

## Symptom 1: Images upload to Walrus but property doesn't save to backend

### Check Point 1.1 - Frontend Logging
**Location**: [AddNewListing.tsx](src/components/AddNewListing.tsx#L245)

1. Open browser DevTools (F12) → Console
2. Upload property with images
3. You should see in console:
   ```
   Property saved to backend: {...}
   ```

**If you DON'T see this message:**
- Backend API call failed
- Go to Network tab (DevTools)
- Find POST request to `/api/properties`
- Check Status code:
  - 201 = Success (should have seen log)
  - 400 = Bad request (missing fields)
  - 500 = Server error (backend issue)
  - No request = Frontend not sending

### Check Point 1.2 - Verify Images Were Uploaded to Walrus
**Location**: Browser DevTools Network tab

1. Before form submission, click "Upload to Walrus"
2. Look for PUT request to `publisher.walrus-testnet.walrus.space`
3. Check Status: Should be 200
4. Check Response: Should contain `blob_id` or `blobId`

**If blob ID not returned:**
- Check [src/walrus/client.ts](src/walrus/client.ts#L145) lines 145-151
- Response might use different field name
- File might be too large

### Check Point 1.3 - Verify FormData Being Sent
**Location**: [AddNewListing.tsx](src/components/AddNewListing.tsx#L245)

Add console.log to see what's being sent:

```typescript
// Add before apiRequest call (line 250)
console.log('Sending to backend:', backendPayload);
```

Restart frontend and try again. Check console for:
- `imagesWithAmounts` array present
- `caretakerAddress` filled in
- All required fields present

---

## Symptom 2: Backend receives property but not images

### Check Point 2.1 - Check Backend Logs
**Location**: [backend/api.js](backend/api.js#L181)

Add debug logging:

```javascript
app.post('/api/properties', upload.array('images', 10), async (req, res) => {
  console.log('=== RECEIVED PROPERTY ===');
  console.log('Body:', JSON.stringify(req.body, null, 2));
  console.log('imagesWithAmounts:', req.body.imagesWithAmounts);
  console.log('==================');
  // ... rest of code
```

1. Restart backend: `npm run dev`
2. Upload property from frontend
3. Check terminal output for logs
4. Look for `imagesWithAmounts` field

**If empty or missing:**
- Frontend not sending images
- Check AddNewListing API call again (Point 1.3)

### Check Point 2.2 - Verify JSON Parsing
**Location**: [backend/api.js](backend/api.js#L195)

Add debug code:

```javascript
// After extracting from req.body, add:
if (imagesWithAmounts && typeof imagesWithAmounts === 'string') {
  try {
    uploadedBlobs = JSON.parse(imagesWithAmounts);
    console.log('Parsed blob IDs:', uploadedBlobs.length);
  } catch (e) {
    console.error('Failed to parse images:', e);
  }
} else if (imagesWithAmounts && Array.isArray(imagesWithAmounts)) {
  uploadedBlobs = imagesWithAmounts;
  console.log('Used array directly:', uploadedBlobs.length);
}

console.log('Final uploadedBlobs:', uploadedBlobs);
```

Check terminal for parsing errors.

---

## Symptom 3: Property shows but images array is empty

### Check Point 3.1 - Verify Backend Response
**Location**: Browser DevTools Network tab

1. Open DevTools → Network tab
2. Submit property from frontend
3. Find POST `/api/properties`
4. Click on it → Response tab
5. Look for `"images": [ ... ]` field
6. Should contain `{ blobId, url, amount, uploadedAt }`

**If images array is empty:**
- Backend code at [api.js](backend/api.js#L195) not extracting blob IDs
- Check Check Point 2.2 (parsing issue)

### Check Point 3.2 - Verify Property Storage
**Location**: [backend/api.js](backend/api.js#L258)

Add logging:

```javascript
// Before properties.set() call:
console.log('Storing property with images:', property.images);
console.log('Images count:', property.images ? property.images.length : 0);
```

---

## Symptom 4: Dashboard refreshes but images still don't show in My Inventory

### Check Point 4.1 - Verify GET Returns Images
**Location**: Browser DevTools Network tab

1. After property should be visible, check Network tab
2. Find GET `/api/caretaker/:address/properties`
3. Click → Response tab
4. Look for `images` array in each property
5. Should have `{ blobId, url, amount, uploadedAt }`

**If images missing from GET:**
- Backend storing without images (Check Point 3.2)
- Properties Map not being populated correctly

### Check Point 4.2 - Component Receives Data
**Location**: [MyInventory.tsx](src/components/MyInventory.tsx#L10)

Add console.log to component:

```tsx
const MyInventory = ({ properties, onViewDetails }: MyInventoryProps) => {
  console.log('=== MyInventory Received ===');
  console.log('Properties:', properties);
  properties.forEach((p, i) => {
    console.log(`Property ${i}:`, p.houseName, 'Images:', p.images);
  });
  console.log('============================');
```

Restart frontend and view My Inventory. Check console.

**If images missing:**
- Backend not returning them
- Check Check Point 4.1

---

## Symptom 5: Component receives images but img tag shows broken image

### Check Point 5.1 - Verify URL Format
**Location**: [src/walrus/client.ts](src/walrus/client.ts#L42)

```typescript
export const getWalrusBlobUrl = (blobId: string): string => {
  return `${WALRUS_AGGREGATOR_URL}/v1/blobs/${blobId}`;
};
```

URL should be exactly: `https://aggregator.walrus-testnet.walrus.space/v1/blobs/{BLOB_ID}`

Add to console to verify:

```javascript
// In browser console
const blobId = "0a1b2c3d..."; // from property
const url = getWalrusBlobUrl(blobId);
console.log('URL:', url);
// Should output: https://aggregator.walrus-testnet.walrus.space/v1/blobs/0a1b2c3d...
```

### Check Point 5.2 - Test Image URL Directly
**Location**: Browser address bar

1. Get blob ID from property
2. Open new tab
3. Paste URL directly: `https://aggregator.walrus-testnet.walrus.space/v1/blobs/{BLOB_ID}`
4. Should show image in browser

**If 404 or error:**
- Blob ID is wrong
- Walrus aggregator is down
- Blob was never actually uploaded

### Check Point 5.3 - Check img tag is Rendering
**Location**: [MyInventory.tsx](src/components/MyInventory.tsx#L35)

Add console.log:

```tsx
{property.images && property.images.length > 0 && property.images[0]?.blobId ? (
  <>
    {(() => {
      const url = getWalrusBlobUrl(property.images[0].blobId);
      console.log('Rendering image with URL:', url);
      return <img src={url} alt={property.houseName} />;
    })()}
  </>
) : (
  console.log('Skipping image - no blob ID'),
  null
)}
```

Check console to see if "Rendering image" message appears.

---

## Symptom 6: No errors but still no images

### Ultimate Debug Checklist

Run these in browser console while viewing My Inventory:

```javascript
// 1. Check properties exist
const prop = document.querySelector('[data-property]');
console.log('1. Properties on page:', prop ? 'YES' : 'NO');

// 2. Check first property has images
const properties = /* from React DevTools */;
console.log('2. First property:', properties[0]);
console.log('3. Has images array:', properties[0]?.images ? 'YES' : 'NO');
console.log('4. Has blob ID:', properties[0]?.images?.[0]?.blobId ? 'YES' : 'NO');

// 3. Generate URL
const blobId = properties[0]?.images?.[0]?.blobId;
const url = `https://aggregator.walrus-testnet.walrus.space/v1/blobs/${blobId}`;
console.log('5. Generated URL:', url);

// 4. Test image loads
fetch(url)
  .then(r => {
    console.log('6. Image fetch status:', r.status);
    return r.blob();
  })
  .then(b => console.log('7. Image size:', b.size, 'bytes'))
  .catch(e => console.error('8. Image load error:', e));

// 5. Check img element
const img = document.querySelector('img[alt*="Apartment"]');
console.log('9. img element:', img);
console.log('10. img.src:', img?.src);
console.log('11. img.style.display:', img?.style.display);
```

This shows exactly where the issue is.

---

## If Nothing Works - Nuclear Option

Reset everything:

### 1. Backend
```bash
cd /Users/iboro/Downloads/Dwello/backend
# Delete any uploaded files
rm -rf uploads/*

# Restart
npm run dev
```

### 2. Frontend
```bash
cd /Users/iboro/Downloads/Dwello
# Clear cache
rm -rf node_modules/.vite

# Restart
npm run dev
```

### 3. Test Fresh Upload
1. Open http://localhost:5173 (new tab)
2. Reconnect wallet
3. Go to Add New Property
4. Upload fresh image
5. Check console for ALL logs at each step
6. Save screenshot of Network tab responses

---

## Manual Backend Test

Instead of UI, test API directly:

```bash
# 1. Test Walrus upload
curl -X PUT \
  -H "Content-Type: image/jpeg" \
  --data-binary @/path/to/image.jpg \
  "https://publisher.walrus-testnet.walrus.space/v1/blobs?epochs=3"

# Copy blob_id from response, then:

# 2. Test backend property creation
curl -X POST http://localhost:3001/api/properties \
  -H "Content-Type: application/json" \
  -d '{
    "houseName": "Test",
    "address": "Test St",
    "price": "1000",
    "bedrooms": "2",
    "bathrooms": "1",
    "area": "100",
    "propertyType": "Apt",
    "country": "USA",
    "state": "CA",
    "city": "LA",
    "description": "Test",
    "caretakerAddress": "0x123",
    "imagesWithAmounts": [{
      "blobId": "PASTE_BLOB_ID_HERE",
      "url": "https://aggregator.walrus-testnet.walrus.space/v1/blobs/PASTE_BLOB_ID_HERE",
      "amount": 0
    }]
  }'

# 3. Test backend retrieval
curl http://localhost:3001/api/caretaker/0x123/properties

# 4. Test Walrus image exists
curl https://aggregator.walrus-testnet.walrus.space/v1/blobs/PASTE_BLOB_ID_HERE > /tmp/test.jpg
file /tmp/test.jpg  # Should say "image data"
```

If manual test works but UI doesn't, issue is in React components.
If manual test fails, issue is in backend or Walrus.

---

## Quick Summary

**Images don't show** usually means one of:

1. **Not uploaded to Walrus** → Check Network tab for PUT request
2. **Backend not receiving blob IDs** → Add console.logs to backend (Point 2.1)
3. **Backend not storing images** → Check property.images field (Point 3.2)
4. **Frontend not getting images** → Check GET response (Point 4.1)
5. **URL format wrong** → Verify exact Walrus URL format (Point 5.1)
6. **Image doesn't exist on Walrus** → Test URL in browser directly (Point 5.2)

Start with Point 1.1, work through checklist in order. First issue found = root cause.
