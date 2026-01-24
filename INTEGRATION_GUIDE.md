# Dwello Full Stack Real Estate Platform - Integration Guide

## Overview

This is a complete full-stack real estate platform built on the Sui blockchain with Walrus protocol for secure image storage. The system allows property owners (caretakers) to upload properties with images, automatically storing images on Walrus and property metadata on the Sui blockchain.

## Architecture

### Frontend (React/TypeScript)
- **PropertyUpload.tsx** - Upload component for new listings
- **PropertyShowcase.tsx** - Browse and view properties
- **src/walrus/client.ts** - Walrus upload utilities
- **src/walrus/sui-helpers.ts** - Sui blockchain helpers
- **src/walrus/bloblds.ts** - Blob storage management

### Backend (Node.js/Express)
- **backend/api.js** - REST API for property management
- Handles file uploads and stores to Walrus
- Manages property metadata

### Smart Contract (Move)
- **src/contract/sources/house.move** - Main house contract
  - Stores property metadata on-chain
  - Tracks Walrus blob IDs for images
  - Manages caretaker permissions

## Setup Instructions

### 1. Install Dependencies

```bash
# Frontend dependencies
npm install @mysten/sui @mysten/dapp-kit @mysten/walrus express multer cors dotenv

# Backend dependencies (if using Node.js for server.js)
npm install express multer cors dotenv
```

### 2. Environment Variables

Create `.env` file in root:

```env
# Walrus
WALRUS_PUBLISHER_URL=https://publisher.walrus-testnet.walrus.space
WALRUS_AGGREGATOR_URL=https://aggregator.walrus-testnet.walrus.space

# Sui
REACT_APP_DWELLO_PACKAGE_ID=0x<your-package-id>
REACT_APP_CARETAKER_CAP_ID=0x<your-cap-id>

# API
REACT_APP_API_URL=http://localhost:3001
PORT=3001
```

### 3. Start Services

```bash
# Terminal 1: Backend API
node backend/api.js

# Terminal 2: Frontend Dev Server
npm run dev
```

## Usage

### Creating a Property Listing

1. **Use PropertyUpload Component**

```tsx
import PropertyUpload from './components/PropertyUpload';

function App() {
  return (
    <PropertyUpload 
      onSuccess={(property) => console.log('Property created:', property)}
      onError={(error) => console.error('Upload failed:', error)}
    />
  );
}
```

2. **User Flow**:
   - Fill in property details (name, address, price, bedrooms, etc.)
   - Drag & drop or select images/videos
   - Click "Create Listing"
   - Images are uploaded to Walrus
   - Property metadata is sent to backend
   - Optional: Submit to Sui blockchain

### Displaying Properties

```tsx
import PropertyShowcase from './components/PropertyShowcase';

function Browse() {
  return (
    <PropertyShowcase 
      sortBy="newest"
      filters={{ minPrice: 1000, maxPrice: 100000, bedrooms: 2 }}
      onPropertySelect={(prop) => console.log('Selected:', prop)}
    />
  );
}
```

## API Endpoints

### Create Property
```http
POST /api/properties
Content-Type: multipart/form-data

{
  "houseName": "Luxury Downtown Apartment",
  "address": "123 Main St",
  "price": "50000",
  "bedrooms": "2",
  "bathrooms": "1",
  "area": "1000",
  "propertyType": "Apartment",
  "country": "USA",
  "state": "CA",
  "city": "San Francisco",
  "description": "Beautiful apartment...",
  "images": [File, File, ...]
}
```

### Get Properties
```http
GET /api/properties?page=1&limit=12
```

### Get Single Property
```http
GET /api/properties/:id
```

### Update Property
```http
PUT /api/properties/:id
Content-Type: multipart/form-data
```

### Search Properties
```http
GET /api/properties/search/:query?minPrice=1000&maxPrice=100000&bedrooms=2
```

### Get Caretaker Properties
```http
GET /api/caretaker/:address/properties
```

## Walrus Integration

### Uploading Files to Walrus

```typescript
import { uploadToWalrus, uploadMultipleToWalrus } from './walrus/client';

// Single file
const result = await uploadToWalrus(imageFile);
console.log('Blob URL:', result.url);
console.log('Blob ID:', result.blobId);

// Multiple files
const results = await uploadMultipleToWalrus(
  [file1, file2, file3],
  (progress) => console.log(`Progress: ${progress}%`)
);
```

### File URL Generation

```typescript
import { getWalrusBlobUrl } from './walrus/client';

const url = getWalrusBlobUrl('0xabc123...');
// https://aggregator.walrus-testnet.walrus.space/v1/blobs/0xabc123...
```

## Sui Blockchain Integration

### Creating Property On-Chain

```typescript
import { 
  createHouseOnChain, 
  executeTransaction 
} from './walrus/sui-helpers';

const tx = await createHouseOnChain(
  propertyData,
  caretakerAddress,
  signerAddress
);

const digest = await executeTransaction(tx, signer);
```

### Adding Walrus Blobs to House

```typescript
import { addWalrusBlobsToHouse } from './walrus/sui-helpers';

const tx = await addWalrusBlobsToHouse(
  houseId,
  ['blob1_id', 'blob2_id', 'blob3_id'],
  caretakerAddress
);

const digest = await executeTransaction(tx, signer);
```

### Validating Property Data

```typescript
import { validatePropertyData } from './walrus/sui-helpers';

const { valid, errors } = validatePropertyData(propertyData);

if (!valid) {
  console.error('Validation errors:', errors);
}
```

## Blob Storage Management

### Register Property Blobs

```typescript
import { registerPropertyBlobs } from './walrus/bloblds';

const blobs = [
  {
    blobId: '0xabc123',
    fileName: 'image1.jpg',
    mimeType: 'image/jpeg',
    uploadedAt: new Date().toISOString(),
    size: 1024000
  },
  // ... more blobs
];

registerPropertyBlobs('prop_123', blobs, '0xabc123');
```

### Get Storage Statistics

```typescript
import { getStorageStats } from './walrus/bloblds';

const stats = getStorageStats();
console.log(`Total properties: ${stats.totalProperties}`);
console.log(`Total blobs: ${stats.totalBlobs}`);
console.log(`Total size: ${stats.totalSize} bytes`);
```

## Responsive UI Components

### PropertyUpload Features
- ✅ Drag & drop file upload
- ✅ Image preview grid
- ✅ Progress tracking
- ✅ Form validation
- ✅ Error handling
- ✅ Fully responsive design

### PropertyShowcase Features
- ✅ Grid and list view toggle
- ✅ Sorting (newest, price, popularity)
- ✅ Filtering (price, bedrooms, type)
- ✅ Pagination
- ✅ Property detail modal
- ✅ Image gallery with navigation
- ✅ Fully responsive design

## Security Features

1. **Walrus Storage**: Images stored immutably and securely
2. **Sui Blockchain**: Property metadata on-chain for immutability
3. **Caretaker Capability**: Only authorized caretakers can create properties
4. **File Validation**: Server-side validation of file types and sizes
5. **CORS Protection**: Backend CORS configuration

## Performance Optimization

- Image lazy loading
- Pagination (12 items per page)
- Batch Walrus uploads with progress tracking
- Efficient state management
- Optimized CSS with minimal repaints

## Error Handling

All components include comprehensive error handling:

```typescript
// In PropertyUpload
try {
  const results = await uploadMultipleToWalrus(files);
} catch (error) {
  setError(error.message);
}

// In PropertyShowcase
try {
  const response = await fetch(`${API_URL}/api/properties`);
} catch (error) {
  setError('Failed to load properties');
}
```

## Troubleshooting

### Walrus Upload Fails
- Check Walrus URLs in .env
- Verify network connectivity to Walrus testnet
- Check browser console for detailed error messages

### Sui Transaction Fails
- Verify package ID and cap ID in .env
- Ensure wallet has sufficient SUI for gas fees
- Check contract compilation with `sui move build`

### Images Not Loading
- Check blob IDs in database
- Verify Walrus aggregator URL
- Inspect network requests in browser DevTools

### API Errors
- Check backend server is running on port 3001
- Verify CORS settings if accessing from different origin
- Check request/response format matches API spec

## Production Deployment

1. **Environment Setup**
   - Use mainnet Sui RPC instead of testnet
   - Deploy contract to mainnet
   - Use production Walrus endpoints

2. **Backend Deployment**
   - Use PostgreSQL or MongoDB instead of in-memory storage
   - Configure proper error logging
   - Set up CI/CD pipeline

3. **Frontend Deployment**
   - Build: `npm run build`
   - Deploy to Vercel, Netlify, or similar
   - Configure environment variables in deployment platform

## Testing

```bash
# API Testing
curl -X GET http://localhost:3001/api/properties

# Upload Test
curl -X POST http://localhost:3001/api/properties \
  -F "houseName=Test House" \
  -F "address=123 Main St" \
  -F "price=50000" \
  -F "images=@/path/to/image.jpg"
```

## Support & Resources

- [Sui Documentation](https://docs.sui.io)
- [Walrus Protocol Docs](https://docs.wal.app)
- [Move Language Guide](https://move-language.github.io)
