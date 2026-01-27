# Dwello - Quick Start & What Was Fixed

## What Was Done

### 1. Cleanup ✓
Deleted unnecessary files:
- `PropertyUpload.jsx` (duplicate)
- `PropertyDetailViewExamples.tsx` (broken)
- `BlobManagerUI.jsx` (unused)
- `ExampleUsage.tsx` (unused)
- `ImageCard.tsx` (unused)
- `UploadZone.tsx` (unused)
- Old documentation files (READY_TO_TEST.md, etc.)

### 2. Fixed Upload Pipeline ✓

**Problem**: AddNewListing was NOT calling the backend API. Properties were only created locally.

**Solution**: 
- Added backend API call to AddNewListing.tsx (lines 245-275)
- Now sends blob IDs to `/api/properties` endpoint as JSON
- Backend receives images and stores them with property

**Code added** (AddNewListing.tsx, after line 244):
```typescript
// Send property to backend API
try {
  const backendPayload = {
    houseName: formData.houseName,
    address: formData.address,
    caretakerAddress: account,
    imagesWithAmounts: imagesWithAmounts,  // Array with blob IDs
    // ... other fields
  };

  const apiResult = await apiRequest(
    API_CONFIG.endpoints.properties.create,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(backendPayload),
    }
  );
} catch (backendError) {
  console.error('Backend save failed:', backendError);
}
```

### 3. Updated Backend to Handle JSON Payloads ✓

**Problem**: Backend expected files via multer but frontend sends JSON with blob IDs.

**Solution**: Modified POST /api/properties endpoint to handle both:
1. Files (old method - multer still uploads to Walrus)
2. JSON with blob IDs (new method - frontend already uploaded)

**Backend changes** (api.js, lines 195-208):
```javascript
// Check if blob IDs were provided (frontend-uploaded images)
if (imagesWithAmounts && typeof imagesWithAmounts === 'string') {
  uploadedBlobs = JSON.parse(imagesWithAmounts);
} else if (imagesWithAmounts && Array.isArray(imagesWithAmounts)) {
  uploadedBlobs = imagesWithAmounts;
}
// Otherwise, try to upload files using multer
```

### 4. Image Display Already Working ✓

MyInventory was already correctly set up to:
- Extract blob ID from `property.images[0].blobId`
- Convert to URL: `getWalrusBlobUrl(blobId)`
- Display via `<img src={url} />`
- Show placeholder if image fails to load

---

## How It Works Now

```
1. User fills form in AddNewListing component
   ↓
2. Selects images, clicks "Upload to Walrus"
   ↓
3. Images uploaded to Walrus storage → blob IDs returned
   ↓
4. Clicks "Add to Blockchain"
   ↓
5. AddNewListing sends JSON to backend with blob IDs
   ↓
6. Backend stores property with images array containing blob IDs
   ↓
7. CaretakerDashboard auto-refreshes after 2 seconds
   ↓
8. MyInventory displays images using Walrus URLs
```

---

## Testing the Fix

### Step 1: Start Backend
```bash
cd /Users/iboro/Downloads/Dwello
npm run dev
# Backend runs on http://localhost:3001
```

### Step 2: Start Frontend (new terminal)
```bash
cd /Users/iboro/Downloads/Dwello
npm run dev
# Frontend runs on http://localhost:5173
```

### Step 3: Test Upload
1. Open http://localhost:5173
2. Connect your Sui wallet (testnet)
3. Go to "Caretaker" dashboard
4. Click "Add New Property"
5. Fill in:
   - House Name: "Test House"
   - Address: "123 Main St"
   - Pricing: 1000
   - Bedrooms: 2
   - Bathrooms: 1
   - Country: Select from dropdown
   - State: Select from dropdown
   - City: Select from dropdown
6. Click "Browse Files" and select an image
7. Click "Upload to Walrus" button
8. Wait for success (green checkmark)
9. Click "Add to Blockchain"
10. Wait 2 seconds, property should appear in "My Inventory"
11. Image should display (from Walrus storage)

### Step 4: Check Console for Debugging
```javascript
// If images don't show, open DevTools Console and check:
console.log('Property images:', property.images);
console.log('Blob ID:', property.images?.[0]?.blobId);
console.log('Image URL:', getWalrusBlobUrl(property.images?.[0]?.blobId));
```

---

## Common Issues & Fixes

### Issue 1: Images not uploading to Walrus
- Check browser console for error message
- Verify Walrus testnet is online: `https://publisher.walrus-testnet.walrus.space/health`
- Ensure images are < 100MB

### Issue 2: Backend API call fails
- Check Network tab → POST /api/properties
- Look at response body for error
- Ensure backend is running on port 3001
- Check api-config.ts for correct endpoint URL

### Issue 3: Property uploaded but doesn't appear in My Inventory
- Check Network tab → GET /api/caretaker/:address/properties
- Verify response has the property with images array
- Ensure caretaker address matches wallet
- Wait another 2 seconds for auto-refresh

### Issue 4: Images show broken icon
- Check browser console for failed image load
- Copy the Walrus URL and try opening directly in browser
- Verify Walrus aggregator is responding: `https://aggregator.walrus-testnet.walrus.space/health`

---

## File Structure Changes

```
Deleted:
✗ src/components/PropertyUpload.jsx
✗ src/components/PropertyDetailViewExamples.tsx
✗ src/components/BlobManagerUI.jsx
✗ src/ExampleUsage.tsx
✗ src/components/ImageCard.tsx
✗ src/components/UploadZone.tsx
✗ Old .md files (READY_TO_TEST.md, TESTING_GUIDE.md, etc.)

Modified:
✓ src/components/AddNewListing.tsx (added backend API call)
✓ backend/api.js (updated to handle JSON payloads)
✓ src/components/PropertyShowcase.tsx (removed unused import)

New:
✓ SETUP.md (comprehensive documentation)
✓ QUICK_START.md (this file)
```

---

## Complete Documentation

For detailed information about:
- **Architecture & data flow**: See [SETUP.md](SETUP.md) - Architecture Overview section
- **Step-by-step upload process**: See [SETUP.md](SETUP.md) - Complete Upload Process
- **Troubleshooting**: See [SETUP.md](SETUP.md) - Common Issues & Troubleshooting section
- **File locations**: See [SETUP.md](SETUP.md) - File Locations for Quick Reference table
- **API endpoints**: See [SETUP.md](SETUP.md) - API Endpoints Reference section

---

## Next Steps

1. ✓ Test the upload flow as described above
2. If images show up, everything is working!
3. If images don't show, follow troubleshooting in SETUP.md
4. For any errors, check browser console (DevTools F12)
5. Refer to exact line numbers in SETUP.md for code locations

---

## Key Code References

| What to Fix | File | Lines | What Changed |
|---|---|---|---|
| Upload not reaching backend | AddNewListing.tsx | 245-275 | Added API call with JSON payload |
| Backend not accepting JSON | backend/api.js | 195-208 | Added JSON parsing logic |
| Images not displaying | MyInventory.tsx | 35-47 | Already correct, just needed backend fix |
| Get Walrus URL | client.ts | 42 | Already correct |

---

## Success Indicators

✓ Backend POST request includes imagesWithAmounts
✓ Backend response includes property with images array
✓ GET caretaker properties returns images with blobIds
✓ MyInventory receives property with images
✓ Images load from Walrus aggregator URL
✓ No console errors

All set! Your platform should now properly upload, store, and display images on the Walrus network.
