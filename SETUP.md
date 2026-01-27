# Dwello - Complete Setup & Troubleshooting Guide

## Project Overview

**Dwello** is a decentralized property management platform built on **Sui blockchain** with **Walrus decentralized storage** for images and videos. Caretakers can upload properties with images, and these are stored on-chain with Walrus blob IDs for retrieval.

### Tech Stack
- **Frontend**: React 18 + TypeScript (Vite)
- **Backend**: Node.js Express
- **Blockchain**: Sui testnet
- **Storage**: Walrus testnet (decentralized)
- **Database**: In-memory Map (backend)

---

## Architecture Overview

### Data Flow: Property Upload

```
1. FRONTEND (Caretaker Dashboard)
   ↓
   User selects images → AddNewListing component
   ↓
   Images uploaded to Walrus → Returns blob IDs
   ↓
   FormData + blob IDs sent to backend API

2. BACKEND (Express)
   ↓
   Receives JSON payload with blob IDs
   ↓
   Creates property record with images array
   ↓
   Returns property object with blob IDs

3. FRONTEND (MyInventory)
   ↓
   Displays properties with images
   ↓
   getWalrusBlobUrl(blobId) converts ID to Walrus URL
   ↓
   Images display from Walrus aggregator
```

### Data Flow: Blob ID to Display URL

```
Backend stores: images: [{ blobId: "0a1b2c3d...", url: "https://...", amount: 0 }]
                         ↓
Frontend receives property with images array
                         ↓
MyInventory calls: getWalrusBlobUrl(property.images[0].blobId)
                         ↓
Returns: https://aggregator.walrus-testnet.walrus.space/v1/blobs/0a1b2c3d...
                         ↓
<img src="{above_url}" /> → Image displays from Walrus
```

---

## File Structure

```
/Users/iboro/Downloads/Dwello/

├── backend/
│   ├── api.js                      # Main Express server (FIX LOCATION #1)
│   └── payment-service.js          # Sui/Walrus interactions
│
├── src/
│   ├── components/
│   │   ├── Caretaker/
│   │   │   ├── CaretakerDashboard.tsx  # Main dashboard (FIX LOCATION #2)
│   │   │   ├── DashboardOverview.tsx
│   │   │   └── CaretakerChat.tsx
│   │   ├── AddNewListing.tsx           # Property upload form (FIX LOCATION #3)
│   │   ├── MyInventory.tsx             # Display caretaker properties (FIX LOCATION #4)
│   │   ├── PropertyList.tsx            # Customer property list
│   │   ├── PropertyDetails.tsx
│   │   └── PropertyShowcase.tsx
│   │
│   ├── walrus/
│   │   ├── client.ts                   # Walrus upload functions (FIX LOCATION #5)
│   │   └── bloblds.ts
│   │
│   ├── sui/
│   │   └── SuiProviders.tsx            # Sui wallet context
│   │
│   ├── lib/
│   │   └── api-config.ts               # API endpoints (FIX LOCATION #6)
│   │
│   ├── types/
│   │   └── index.ts                    # TypeScript interfaces
│   │
│   └── styles/
│       ├── Dashboard.css               # Caretaker dashboard styles
│       └── AddNewListing.css
│
├── package.json
├── vite.config.ts
└── SETUP.md                            # This file

Key Deleted Files (Cleanup Done):
✓ src/components/PropertyUpload.jsx
✓ src/components/PropertyDetailViewExamples.tsx
✓ src/components/BlobManagerUI.jsx
✓ src/ExampleUsage.tsx
✓ src/components/ImageCard.tsx
✓ src/components/UploadZone.tsx
✓ Old documentation files (READY_TO_TEST.md, etc.)
```

---

## Complete Upload Process (Step-by-Step)

### Step 1: Caretaker Clicks "Add New Property"
- Location: **[CaretakerDashboard.tsx](src/components/Caretaker/CaretakerDashboard.tsx#L96)** line 96
- Shows AddNewListing component in "addNew" tab

### Step 2: Form Filling & Image Selection
- Location: **[AddNewListing.tsx](src/components/AddNewListing.tsx)** lines 1-150
- User fills: House Name, Address, Pricing, Bedrooms, Bathrooms, Country/State/City
- User selects images via file input
- Images stored in state: `selectedFiles: File[]`

### Step 3: Upload to Walrus (Frontend)
- **Trigger**: Click "Upload to Walrus" button
- Location: **[AddNewListing.tsx](src/components/AddNewListing.tsx#L154)** line 154 - `handleUploadToWalrus()`
- Calls: **[uploadMultipleToWalrus()](src/walrus/client.ts#L190)**
- Function: **[src/walrus/client.ts](src/walrus/client.ts)** lines 190-210

```typescript
// What happens:
files.forEach(file => {
  fetch('https://publisher.walrus-testnet.walrus.space/v1/blobs?epochs=3', {
    method: 'PUT',
    body: file,
    headers: { 'Content-Type': file.type }
  })
  .then(res => res.json())
  .then(data => {
    blobId = data.blob_id (or data.blobId, etc.)
    return { blobId, url: getWalrusBlobUrl(blobId) }
  })
})
```

- **Returns**: `UploadResult[]` with `{ blobId: "0a1b2c...", url: "https://aggregator..." }`
- **Stored in state**: `uploadedBlobIds: string[]`
- **Success**: Green checkmark appears

### Step 4: Submit Form & Send to Backend
- **Trigger**: Click "Add to Blockchain" button
- Location: **[AddNewListing.tsx](src/components/AddNewListing.tsx#L175)** line 175 - `handleSubmit()`
- **Important checks**: Images must be uploaded to Walrus first

```typescript
if (selectedFiles.length > 0 && uploadedBlobIds.length === 0) {
  alert('Please upload images to Walrus first');
  return;
}
```

### Step 5: Create Property Object with Images
- Location: **[AddNewListing.tsx](src/components/AddNewListing.tsx#L210)** line 210
- Creates `imagesWithAmounts` array:

```typescript
const imagesWithAmounts = uploadedBlobIds.map((blobId) => ({
  blobId,                              // Image ID on Walrus
  url: getWalrusBlobUrl(blobId),       // Full display URL
  amount: 0,
  uploadedAt: new Date().toISOString(),
}));
```

### Step 6: Send to Backend API
- **Endpoint**: `POST /api/properties`
- Location: **[AddNewListing.tsx](src/components/AddNewListing.tsx#L245)** lines 245-275
- **Payload** (JSON):

```json
{
  "houseName": "Afasa Lounges",
  "address": "No 15 Ogbowodeci",
  "price": 25000,
  "bedrooms": "3",
  "bathrooms": "2",
  "area": "100 sqm",
  "propertyType": "Apartment",
  "country": "Nigeria",
  "state": "Lagos",
  "city": "Lekki",
  "description": "3 bedroom, 2 bathroom apartment",
  "caretakerAddress": "0x1234...",
  "imagesWithAmounts": [
    {
      "blobId": "0a1b2c3d...",
      "url": "https://aggregator.walrus-testnet.walrus.space/v1/blobs/0a1b2c3d...",
      "amount": 0,
      "uploadedAt": "2025-01-27T..."
    }
  ]
}
```

- **Important**: Content-Type is `application/json`, NOT multipart/form-data

### Step 7: Backend Receives & Stores Property
- Location: **[backend/api.js](backend/api.js#L181)** lines 181-265
- **API endpoint**: `POST /api/properties`
- Middleware: `upload.array('images', 10)` - Allows both multer and JSON

**Backend logic**:

```javascript
// Check if blob IDs were provided (frontend-uploaded)
if (imagesWithAmounts && typeof imagesWithAmounts === 'string') {
  uploadedBlobs = JSON.parse(imagesWithAmounts);
} else if (imagesWithAmounts && Array.isArray(imagesWithAmounts)) {
  uploadedBlobs = imagesWithAmounts;
}
// Otherwise, try to upload files using multer

// Create property record
const property = {
  id: `prop_${randomId}`,
  houseName,
  address,
  price: parseFloat(price),
  bedrooms: parseInt(bedrooms),
  bathrooms: parseInt(bathrooms),
  caretakerAddress,
  images: uploadedBlobs,           // CRITICAL: Full array with blobIds
  blobIds: uploadedBlobs.map(b => b.blobId),
  createdAt: new Date().toISOString(),
  // ... other fields
};

properties.set(propertyId, property);
```

### Step 8: Backend Returns Property
- **Response** (201 Created):

```json
{
  "success": true,
  "property": {
    "id": "prop_abc123...",
    "houseName": "Afasa Lounges",
    "caretakerAddress": "0x1234...",
    "images": [
      {
        "blobId": "0a1b2c3d...",
        "url": "https://aggregator...",
        "amount": 0,
        "uploadedAt": "..."
      }
    ],
    "blobIds": ["0a1b2c3d..."],
    "createdAt": "2025-01-27T..."
  }
}
```

### Step 9: Caretaker Dashboard Refreshes
- Location: **[CaretakerDashboard.tsx](src/components/Caretaker/CaretakerDashboard.tsx#L52)** lines 52-57
- Auto-refresh triggered 2 seconds after property submission
- Calls: `GET /api/caretaker/:address/properties`

### Step 10: MyInventory Receives Properties & Displays
- Location: **[MyInventory.tsx](src/components/MyInventory.tsx)** lines 1-118
- **Critical code** (lines 35-47):

```tsx
// Get first image's blob ID
const blobId = property.images?.[0]?.blobId;

// Convert to Walrus display URL
const walrusUrl = getWalrusBlobUrl(blobId);

// Render image
<img src={walrusUrl} alt={property.houseName} />

// Fallback if image fails
onError={(e) => { 
  (e.target as HTMLImageElement).style.display = 'none'; 
}}
```

---

## Common Issues & Troubleshooting

### ❌ Issue 1: "Failed to upload any images to Walrus"

**Where to check**: **[AddNewListing.tsx](src/components/AddNewListing.tsx#L154)**

**Root causes**:

1. **Walrus Publisher URL unreachable**
   - Check: **[src/walrus/client.ts](src/walrus/client.ts#L5)**
   - Line 5: `const WALRUS_PUBLISHER_URL = 'https://publisher.walrus-testnet.walrus.space'`
   - **Fix**: Test in browser console:
     ```javascript
     fetch('https://publisher.walrus-testnet.walrus.space/health')
       .then(r => console.log('Status:', r.status))
       .catch(e => console.error('Walrus down:', e))
     ```

2. **File size too large**
   - Check: **[backend/api.js](backend/api.js#L45)** line 45
   - Multer limit: `fileSize: 100 * 1024 * 1024` (100MB)
   - **Fix**: Ensure images are < 100MB

3. **Wrong Content-Type header**
   - Check: **[src/walrus/client.ts](src/walrus/client.ts#L120)**
   - Line 120-126: Headers should include correct MIME type
   - **Fix**: Ensure `file.type` is set correctly (usually automatic)

**Debug steps**:
```
1. Open browser DevTools → Network tab
2. Click "Upload to Walrus"
3. Look for PUT request to publisher.walrus-testnet
4. Check response:
   - Status 200 = Success
   - Status 413 = File too large
   - Status 400 = Bad request (check body)
5. Look for blobId in response
```

---

### ❌ Issue 2: "Images uploaded but not showing on dashboard"

**Where to check**: **[MyInventory.tsx](src/components/MyInventory.tsx#L35)**

**Root causes**:

1. **Property doesn't have images array**
   - Check: **[backend/api.js](backend/api.js#L258)** line 258
   - Backend must include: `images: uploadedBlobs` in response
   - **Fix**: Verify property object has images field
   - Debug:
     ```javascript
     // In MyInventory component
     console.log('Property received:', property);
     console.log('Images array:', property.images);
     ```

2. **Blob ID not being extracted**
   - Check: **[MyInventory.tsx](src/components/MyInventory.tsx#L35)** lines 35-47
   - Code: `property.images?.[0]?.blobId`
   - **Fix**: Ensure property.images is an array with blobId fields
   - Debug:
     ```javascript
     console.log('Blob ID:', property.images?.[0]?.blobId);
     console.log('URL:', getWalrusBlobUrl(property.images?.[0]?.blobId));
     ```

3. **getWalrusBlobUrl returns wrong URL**
   - Check: **[src/walrus/client.ts](src/walrus/client.ts#L42)**
   - Should be: `https://aggregator.walrus-testnet.walrus.space/v1/blobs/{blobId}`
   - **Fix**: URL format must match exactly
   - Test:
     ```javascript
     // In browser console
     fetch('https://aggregator.walrus-testnet.walrus.space/v1/blobs/0a1b2c3d...')
       .then(r => r.blob())
       .then(b => console.log('Image loaded:', b.size, 'bytes'))
       .catch(e => console.error('Image not found:', e))
     ```

4. **CORS error when loading image**
   - **Fix**: Walrus testnet aggregator should allow CORS
   - If still blocked, backend can act as proxy:
     ```javascript
     // In backend/api.js
     app.get('/api/image/:blobId', async (req, res) => {
       const imageUrl = `https://aggregator.walrus-testnet/v1/blobs/${req.params.blobId}`;
       const response = await fetch(imageUrl);
       res.set('Access-Control-Allow-Origin', '*');
       response.body.pipe(res);
     });
     ```

**Debug steps**:
```
1. Open browser DevTools → Console
2. Type: copy(JSON.stringify(document.querySelector('[data-property-id]').__reactFiber))
3. Check for images array in property object
4. Try getWalrusBlobUrl() manually in console
5. Try fetching image URL directly in new tab
```

---

### ❌ Issue 3: "Backend not receiving images - empty images array"

**Where to check**: **[backend/api.js](backend/api.js#L195)**

**Root causes**:

1. **Frontend not sending images in payload**
   - Check: **[AddNewListing.tsx](src/components/AddNewListing.tsx#L245)** lines 245-275
   - Must include: `imagesWithAmounts: JSON.stringify(imagesWithAmounts)` OR as array
   - **Fix**: Ensure payload includes images
   - Debug backend:
     ```javascript
     // Add to backend POST /api/properties
     console.log('Received body:', req.body);
     console.log('Images field:', req.body.imagesWithAmounts);
     ```

2. **Content-Type mismatch**
   - Check: **[AddNewListing.tsx](src/components/AddNewListing.tsx#L258)**
   - Must be: `'Content-Type': 'application/json'`
   - **NOT** `multipart/form-data`
   - **Fix**: Ensure correct header
   - Backend logging:
     ```javascript
     app.post('/api/properties', (req, res) => {
       console.log('Content-Type:', req.get('content-type'));
       console.log('Body:', req.body);
     });
     ```

3. **Backend not parsing JSON correctly**
   - Check: **[backend/api.js](backend/api.js#L195)** lines 195-208
   - Code should handle: `JSON.parse(imagesWithAmounts)`
   - **Fix**: Ensure parsing logic handles both string and array
   ```javascript
   if (imagesWithAmounts && typeof imagesWithAmounts === 'string') {
     uploadedBlobs = JSON.parse(imagesWithAmounts);
   } else if (imagesWithAmounts && Array.isArray(imagesWithAmounts)) {
     uploadedBlobs = imagesWithAmounts;
   }
   ```

**Debug steps**:
```
1. Add console.log in backend POST endpoint (line 191)
2. Restart backend: npm run dev
3. Upload property from frontend
4. Check terminal for console output
5. Look for imagesWithAmounts in output
```

---

### ❌ Issue 4: "Caretaker dashboard not showing properties"

**Where to check**: **[CaretakerDashboard.tsx](src/components/Caretaker/CaretakerDashboard.tsx#L23)**

**Root causes**:

1. **Account not connected**
   - Check: **[CaretakerDashboard.tsx](src/components/Caretaker/CaretakerDashboard.tsx#L11)**
   - Must have: `const { account } = useSui();`
   - **Fix**: Connect wallet first (see Sui Providers setup)

2. **API endpoint returning wrong data**
   - Check: **[backend/api.js](backend/api.js#L479)** lines 479-490
   - Endpoint: `GET /api/caretaker/:address/properties`
   - Must filter by `caretakerAddress` matching query param
   - **Fix**: Verify filter logic
   ```javascript
   const results = Array.from(properties.values()).filter(
     (prop) => prop.caretakerAddress?.toLowerCase() === caretakerAddress.toLowerCase()
   );
   ```

3. **Properties created but caretakerAddress not set**
   - Check: **[AddNewListing.tsx](src/components/AddNewListing.tsx#L259)**
   - Must include: `caretakerAddress: account`
   - **Fix**: Ensure account is passed to backend

**Debug steps**:
```
1. Check wallet is connected (look for address in top-right)
2. Open DevTools → Network tab
3. Look for GET /api/caretaker/:address/properties
4. Check response has properties array
5. If empty, log backend: console.log('Caretaker:', caretakerAddress, 'Found:', results.length)
```

---

### ❌ Issue 5: "Property upload succeeds but property not visible after refresh"

**Where to check**: **[CaretakerDashboard.tsx](src/components/Caretaker/CaretakerDashboard.tsx#L23)**

**Root causes**:

1. **Auto-refresh not triggered**
   - Check: **[CaretakerDashboard.tsx](src/components/Caretaker/CaretakerDashboard.tsx#L52)** lines 52-57
   - Code: `setTimeout(() => { setRefreshKey(prev => prev + 1) }, 2000)`
   - **Fix**: Ensure refresh is called after API returns
   - Verify:
     ```typescript
     // In browser console
     // After uploading property, property should appear in 2 seconds
     ```

2. **Backend didn't save property**
   - Check: **[backend/api.js](backend/api.js#L263)** line 263
   - Code: `properties.set(propertyId, property);`
   - **Fix**: Ensure property is stored before response sent
   - Debug:
     ```javascript
     console.log('Properties in Map:', properties.size);
     console.log('All properties:', Array.from(properties.values()));
     ```

3. **Properties Map being cleared on backend restart**
   - **Note**: Backend uses in-memory Map, not persistent DB
   - **Issue**: Restarting backend loses all properties
   - **Fix**: Either:
     - Don't restart backend during testing, OR
     - Replace Map with actual database (MongoDB, PostgreSQL, etc.)

**Debug steps**:
```
1. Upload property
2. Open DevTools Console
3. Wait 2 seconds
4. Properties should auto-load
5. If not, check Network tab for GET /api/caretaker/:address/properties
6. Check response has the new property
```

---

## API Endpoints Reference

### Property Endpoints

#### Create Property
```
POST /api/properties
Content-Type: application/json

Body:
{
  "houseName": string,
  "address": string,
  "price": string | number,
  "bedrooms": string,
  "bathrooms": string,
  "area": string,
  "propertyType": string,
  "country": string,
  "state": string,
  "city": string,
  "description": string,
  "caretakerAddress": string,
  "imagesWithAmounts": [ { blobId, url, amount, uploadedAt } ] OR JSON string,
  "blobIds": string[]
}

Response (201):
{
  "success": true,
  "property": { id, houseName, images, blobIds, caretakerAddress, ... }
}
```

#### Get All Properties
```
GET /api/properties?page=1&limit=12

Response (200):
{
  "success": true,
  "data": [ { ... properties ... } ],
  "total": number,
  "page": number
}
```

#### Get Caretaker Properties
```
GET /api/caretaker/:address/properties

Response (200):
{
  "success": true,
  "data": [ { ... properties for this caretaker ... } ],
  "count": number
}
```

---

## Environment Setup

### Frontend (.env or .env.local)
```env
VITE_APP_API_URL=http://localhost:3001
VITE_WALRUS_PUBLISHER=https://publisher.walrus-testnet.walrus.space
VITE_WALRUS_AGGREGATOR=https://aggregator.walrus-testnet.walrus.space
```

### Backend (.env)
```env
PORT=3001
WALRUS_PUBLISHER_URL=https://publisher.walrus-testnet.walrus.space
WALRUS_AGGREGATOR_URL=https://aggregator.walrus-testnet.walrus.space
SUI_NETWORK=testnet
```

---

## Running the Application

### Backend
```bash
cd /Users/iboro/Downloads/Dwello
npm install
npm run dev
# Starts on http://localhost:3001
```

### Frontend
```bash
cd /Users/iboro/Downloads/Dwello
npm install
npm run dev
# Starts on http://localhost:5173
```

### Testing Upload Flow
1. Open http://localhost:5173
2. Connect wallet (Sui testnet)
3. Go to Caretaker Dashboard
4. Click "Add New Property"
5. Fill form and select images
6. Click "Upload to Walrus"
7. Wait for success message
8. Click "Add to Blockchain"
9. Check browser console for errors
10. Wait 2 seconds for auto-refresh
11. Images should appear in My Inventory

---

## If Images Still Don't Show - Ultimate Checklist

### Frontend Image Display (MyInventory.tsx)
- [ ] `property.images` array exists and has at least 1 item
- [ ] `property.images[0].blobId` is a non-empty string
- [ ] `getWalrusBlobUrl(blobId)` generates: `https://aggregator.walrus-testnet.walrus.space/v1/blobs/{blobId}`
- [ ] `<img src={url} />` is rendered (not hidden by CSS)
- [ ] Image isn't 404 at Walrus

### Backend Property Storage (api.js POST endpoint)
- [ ] `imagesWithAmounts` is parsed correctly (line 195-208)
- [ ] `uploadedBlobs` array is populated (line 209+)
- [ ] `property.images = uploadedBlobs` (line 258)
- [ ] Response includes full images array (line 263)

### Walrus Upload (client.ts)
- [ ] File successfully uploaded to `https://publisher.walrus-testnet...`
- [ ] Response contains blobId (check extraction logic line 145-151)
- [ ] getWalrusBlobUrl URL format is exact (line 42)

### Network & CORS
- [ ] Frontend can reach backend on http://localhost:3001
- [ ] Frontend can reach Walrus publisher
- [ ] Frontend can reach Walrus aggregator
- [ ] No browser console errors about CORS

### Data Pipeline
- [ ] User uploads images → blob IDs returned → stored in state
- [ ] Form submitted with blob IDs → sent to backend as JSON
- [ ] Backend receives and stores → returns in property.images
- [ ] Dashboard refreshes → fetches properties → MyInventory gets images
- [ ] MyInventory extracts blob ID → creates URL → renders img tag

---

## File Locations for Quick Reference

| What | Where | Lines |
|------|-------|-------|
| Frontend upload form | [AddNewListing.tsx](src/components/AddNewListing.tsx) | 1-658 |
| Walrus upload function | [client.ts](src/walrus/client.ts) | 113-165 |
| Image display | [MyInventory.tsx](src/components/MyInventory.tsx) | 35-47 |
| Backend API | [api.js](backend/api.js) | 181-265 |
| Caretaker dashboard | [CaretakerDashboard.tsx](src/components/Caretaker/CaretakerDashboard.tsx) | 1-171 |
| API config | [api-config.ts](src/lib/api-config.ts) | - |
| Sui providers | [SuiProviders.tsx](src/sui/SuiProviders.tsx) | - |

---

## Summary

**Upload process**: Images → Walrus (blob IDs) → Backend (stores) → Frontend (displays)

**If images don't show**:
1. Check MyInventory.tsx line 35-47 (image display logic)
2. Check AddNewListing.tsx line 245-275 (API payload)
3. Check backend/api.js line 195-208 (image parsing)
4. Check client.ts line 42 (URL format)

**Debug**: Open DevTools → Console, log property.images and getWalrusBlobUrl() output

**Backend issues**: Check `/Users/iboro/Downloads/Dwello/backend/api.js`
**Frontend issues**: Check `/Users/iboro/Downloads/Dwello/src/components/AddNewListing.tsx` and `MyInventory.tsx`
**Walrus issues**: Check `/Users/iboro/Downloads/Dwello/src/walrus/client.ts`
