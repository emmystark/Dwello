# REFERENCE CARD - Quick Lookup

## File Locations (If Issues Occur)

```
Backend Property Creation
├─ File: backend/api.js
├─ Lines: 181-265
├─ Endpoint: POST /api/properties
└─ What to check: Is imagesWithAmounts being parsed? (line 195-208)

Frontend Property Upload
├─ File: src/components/AddNewListing.tsx
├─ Lines: 245-275 (API call)
├─ Lines: 154-177 (Walrus upload)
└─ What to check: Is backendPayload being created? Is apiRequest called?

Image Display
├─ File: src/components/MyInventory.tsx
├─ Lines: 35-47
├─ Function: getWalrusBlobUrl()
└─ What to check: Is property.images being received? Is blobId extracting?

Walrus Upload
├─ File: src/walrus/client.ts
├─ Function: uploadMultipleToWalrus() at lines 190-210
├─ Function: getWalrusBlobUrl() at line 42
└─ What to check: Is publisher URL working? Is aggregator URL correct?

Dashboard Refresh
├─ File: src/components/Caretaker/CaretakerDashboard.tsx
├─ Lines: 23-37 (fetchProperties)
├─ Lines: 52-57 (auto-refresh)
└─ What to check: Is account connected? Does GET return properties?
```

---

## Common Error Messages & Solutions

| Error | Location | Fix |
|-------|----------|-----|
| "No blob ID returned from Walrus" | src/walrus/client.ts:145-151 | Walrus response doesn't have blob_id field - check response format |
| "Cannot find module './PaymentGate'" | Deleted files | Already deleted, rebuild works |
| "Failed to upload any images to Walrus" | src/components/AddNewListing.tsx:154 | Walrus publisher unreachable or file too large |
| "Property created successfully" but not visible | backend/api.js:263 | Property not in properties.set() - check storage |
| "Images uploaded but blank in inventory" | src/components/MyInventory.tsx:35 | property.images missing - check backend response |
| "Broken image icon" | getWalrusBlobUrl() | URL format wrong or blob doesn't exist on Walrus |

---

## Debug Commands (Run in Terminal)

```bash
# Test backend is running
curl http://localhost:3001/api/properties

# Create test property with blob ID
curl -X POST http://localhost:3001/api/properties \
  -H "Content-Type: application/json" \
  -d '{
    "houseName": "Test",
    "address": "Test St",
    "price": "1000",
    "caretakerAddress": "0x123",
    "imagesWithAmounts": [{"blobId": "test123", "url": "https://...", "amount": 0}]
  }'

# Get caretaker properties
curl http://localhost:3001/api/caretaker/0x123/properties

# Test Walrus upload
curl -X PUT -H "Content-Type: image/jpeg" \
  --data-binary @image.jpg \
  https://publisher.walrus-testnet.walrus.space/v1/blobs?epochs=3

# Test Walrus retrieve
curl https://aggregator.walrus-testnet.walrus.space/v1/blobs/{blobId}
```

---

## Browser Console Debug

```javascript
// Copy property object from Network response
const prop = {...}; 

// Check images exist
console.log('Images:', prop.images);
console.log('Blob ID:', prop.images?.[0]?.blobId);

// Test URL generation
const url = getWalrusBlobUrl(prop.images[0].blobId);
console.log('URL:', url);

// Test image loads
fetch(url)
  .then(r => console.log('Status:', r.status))
  .then(b => b.blob())
  .then(d => console.log('Size:', d.size));

// Check React state
const instance = document.querySelector('[data-testid="inventory"]').__reactFiber;
console.log('State:', instance.memoizedState);
```

---

## API Request/Response Examples

### Upload Property
```bash
POST /api/properties
Content-Type: application/json

Request:
{
  "houseName": "Afasa Lounges",
  "address": "No 15 Ogbowodeci",
  "price": "25000",
  "bedrooms": "3",
  "bathrooms": "2",
  "area": "100 sqm",
  "propertyType": "Apartment",
  "country": "Nigeria",
  "state": "Lagos",
  "city": "Lekki",
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

Response (201):
{
  "success": true,
  "property": {
    "id": "prop_abc123...",
    "houseName": "Afasa Lounges",
    "caretakerAddress": "0x1234...",
    "images": [
      {
        "blobId": "0a1b2c3d...",
        "url": "https://aggregator.walrus-testnet.walrus.space/v1/blobs/0a1b2c3d...",
        "amount": 0
      }
    ],
    "blobIds": ["0a1b2c3d..."],
    "price": 25000,
    "bedrooms": 3,
    "bathrooms": 2,
    "createdAt": "2025-01-27T..."
  }
}
```

### Get Caretaker Properties
```bash
GET /api/caretaker/0x1234.../properties

Response (200):
{
  "success": true,
  "data": [
    {
      "id": "prop_abc123...",
      "houseName": "Afasa Lounges",
      "images": [
        {
          "blobId": "0a1b2c3d...",
          "url": "https://aggregator.walrus-testnet.walrus.space/v1/blobs/0a1b2c3d...",
          "amount": 0
        }
      ],
      "blobIds": ["0a1b2c3d..."],
      ...
    }
  ],
  "count": 1
}
```

---

## Development Workflow

### Start Development
```bash
# Terminal 1: Backend
cd /Users/iboro/Downloads/Dwello
npm run dev                    # Port 3001

# Terminal 2: Frontend  
cd /Users/iboro/Downloads/Dwello
npm run dev                    # Port 5173
```

### Test Upload Cycle
1. Open http://localhost:5173
2. Connect wallet
3. Dashboard → Add New Property
4. Fill form + Select image
5. Upload to Walrus (wait for green checkmark)
6. Submit form
7. Check console for logs
8. Wait 2 seconds for refresh
9. Check My Inventory for image

### Debug with Logs
```typescript
// AddNewListing.tsx - line 250
console.log('Sending to backend:', backendPayload);

// backend/api.js - line 191
console.log('Received:', req.body.imagesWithAmounts);

// MyInventory.tsx - line 10
console.log('Properties:', properties);
```

---

## What Each Component Does

| Component | File | Purpose |
|-----------|------|---------|
| AddNewListing | src/components/AddNewListing.tsx | Upload form → Walrus upload → Backend save |
| CaretakerDashboard | src/components/Caretaker/CaretakerDashboard.tsx | Main dashboard, fetches & paginates properties |
| MyInventory | src/components/MyInventory.tsx | Displays properties with images from Walrus |
| SuiProviders | src/sui/SuiProviders.tsx | Wallet context provider |
| walrus/client.ts | src/walrus/client.ts | Walrus upload & retrieval functions |

---

## Key Functions

```typescript
// Walrus Upload
uploadMultipleToWalrus(files, onProgress)
→ Returns: [{ blobId, url }, ...]

// Generate Display URL
getWalrusBlobUrl(blobId: string)
→ Returns: "https://aggregator.walrus-testnet.walrus.space/v1/blobs/{blobId}"

// API Request
apiRequest(endpoint, options)
→ Handles JSON serialization + error handling

// Fetch Properties
GET /api/caretaker/:address/properties
→ Returns: properties with images array

// Save Property
POST /api/properties
→ Expects: { ..., imagesWithAmounts: [...], caretakerAddress: "..." }
→ Returns: property with blob IDs
```

---

## Pagination Implementation

```typescript
// State
const [currentPage, setCurrentPage] = useState(1);
const [itemsPerPage] = useState(6);

// Calculation
const indexOfLastItem = currentPage * itemsPerPage;
const indexOfFirstItem = indexOfLastItem - itemsPerPage;
const currentProperties = properties.slice(indexOfFirstItem, indexOfLastItem);
const totalPages = Math.ceil(properties.length / itemsPerPage);

// Buttons
<button disabled={currentPage === 1} onClick={() => setCurrentPage(1)}>First</button>
<button disabled={currentPage === totalPages} onClick={() => setCurrentPage(totalPages)}>Last</button>
```

---

## Cleanup Checklist

After setup, ensure:
- [ ] No console errors in DevTools
- [ ] npm run build succeeds
- [ ] Backend starts without errors
- [ ] Frontend starts without errors
- [ ] Database (if applicable) is initialized
- [ ] All 5 documentation files exist
- [ ] Old files are deleted

---

## Success Criteria

When upload works:
1. ✅ No errors in browser console
2. ✅ No errors in backend terminal
3. ✅ Property appears in My Inventory within 2 seconds
4. ✅ Image displays from Walrus URL
5. ✅ Multiple pages work with pagination
6. ✅ Wallet address links to properties correctly

---

## Emergency Reference

**If completely broken**:
```bash
# 1. Clear everything
cd /Users/iboro/Downloads/Dwello
rm -rf node_modules/.vite
rm -rf backend/uploads/*
npm install

# 2. Restart backend
npm run dev

# 3. Restart frontend (new terminal)
npm run dev

# 4. Test fresh upload
# Follow QUICK_START.md steps 1-11
```

**If backend issues**:
```bash
# Check for logs
tail -f backend.log

# Reset properties
# Restart backend (in-memory Map clears)

# Test API
curl http://localhost:3001/api/properties
```

**If frontend issues**:
```bash
# Clear cache
rm -rf .vite

# Restart Vite
npm run dev

# Check Network tab for all requests
```

---

**Quick Links**:
- Start here: [QUICK_START.md](QUICK_START.md)
- Full details: [SETUP.md](SETUP.md)
- Debugging: [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
- Technical: [CHANGES.md](CHANGES.md)
- Overview: [FIX_SUMMARY.md](FIX_SUMMARY.md)
