# 🏠 Dwello - Real Estate on Sui Blockchain

A **complete full-stack real estate platform** built on the **Sui blockchain** with **Walrus protocol** for secure, decentralized property management. Upload properties with images once, and they're stored securely and immutably across the blockchain and distributed storage.

## ✨ Features

### 🖼️ Image Management
- **Walrus Protocol Integration** - Store images immutably on distributed storage
- **Secure Upload** - Direct browser-to-Walrus uploads with no intermediary
- **Batch Upload** - Upload multiple images in one operation
- **Progress Tracking** - Real-time upload progress feedback

### 📍 Property Management
- **Rich Metadata** - Store comprehensive property details (beds, baths, area, type)
- **Flexible Filtering** - Filter by price, bedrooms, property type, location
- **Smart Sorting** - Sort by newest, price, or popularity
- **Search** - Full-text search across property listings
- **Pagination** - Efficient browsing with pagination

### 🔐 Blockchain Features
- **On-Chain Registry** - Properties recorded immutably on Sui
- **Caretaker Management** - Secure capability-based access control
- **View Tracking** - Track property views on-chain
- **Blob References** - Link Walrus blob IDs to properties on-chain
- **Event Emission** - Transparent property creation events

### 🎨 User Interface
- **Responsive Design** - Works seamlessly on mobile, tablet, desktop
- **Grid & List Views** - Toggle between different property views
- **Detail Modal** - Beautiful property detail view with image gallery
- **Image Carousel** - Browse through property images with keyboard navigation
- **Drag & Drop** - Easy file selection with drag-and-drop support

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (React)                      │
│  PropertyUpload │ PropertyShowcase │ Responsive UI     │
└─────────────────────────────────────────────────────────┘
                          ↓
                    REST API (Express)
                          ↓
        ┌───────────────────────────────────┐
        │     File Uploads (Multer)         │
        │     Property CRUD                 │
        │     Search & Filter               │
        └───────────────────────────────────┘
                ↙                      ↖
        ┌──────────────────┐      ┌──────────────────┐
        │  Walrus Storage  │      │  Sui Blockchain  │
        │  (Image Blobs)   │      │  (Metadata)      │
        └──────────────────┘      └──────────────────┘
```

## 📦 What's Included

### Frontend Components
- **PropertyUpload.tsx** - Full-featured property upload form
- **PropertyShowcase.tsx** - Browse and search properties
- **PropertyDetailModal** - Beautiful property detail view

### Backend Services
- **backend/api.js** - Express REST API with full CRUD operations
- Walrus integration for file uploads
- Property metadata management
- Search and filter endpoints

### Smart Contracts
- **house.move** - Sui Move contract for on-chain property registry
- Stores property metadata and Walrus blob IDs
- Caretaker capability-based access

### Utilities
- **src/walrus/client.ts** - Walrus upload and retrieval
- **src/walrus/sui-helpers.ts** - Sui transaction helpers
- **src/walrus/bloblds.ts** - Blob storage management

### Styles
- **PropertyUpload.css** - Upload component styles (fully responsive)
- **PropertyShowcase.css** - Browse component styles (fully responsive)
- Mobile-first responsive design

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ and npm
- Sui Wallet or other Sui-compatible wallet
- Basic understanding of React and TypeScript

### Installation

1. **Clone and setup**
```bash
cd Dwello
npm install
```

2. **Configure environment**
```bash
# .env file
REACT_APP_API_URL=http://localhost:3001
REACT_APP_DWELLO_PACKAGE_ID=0x<your-package-id>
REACT_APP_CARETAKER_CAP_ID=0x<your-cap-id>
WALRUS_PUBLISHER_URL=https://publisher.walrus-testnet.walrus.space
WALRUS_AGGREGATOR_URL=https://aggregator.walrus-testnet.walrus.space
```

3. **Start backend**
```bash
node backend/api.js
# API running on http://localhost:3001
```

4. **Start frontend** (in another terminal)
```bash
npm run dev
# Frontend running on http://localhost:5173
```

## 📖 Usage

### Upload a Property

```typescript
import PropertyUpload from './components/PropertyUpload';

export default function UploadPage() {
  return (
    <PropertyUpload 
      onSuccess={(property) => {
        console.log('Property created:', property);
        // Handle success (redirect, notification, etc.)
      }}
      onError={(error) => {
        console.error('Upload failed:', error);
      }}
    />
  );
}
```

**User Experience:**
1. Fill in property details (name, address, price, bedrooms, bathrooms, type, location)
2. Drag & drop or click to upload images/videos
3. Watch real-time upload progress
4. Property is instantly available in the system

### Browse Properties

```typescript
import PropertyShowcase from './components/PropertyShowcase';

export default function BrowsePage() {
  return (
    <PropertyShowcase 
      sortBy="newest"
      filters={{
        minPrice: 50000,
        maxPrice: 500000,
        bedrooms: 2,
      }}
      onPropertySelect={(property) => {
        console.log('User selected property:', property);
      }}
    />
  );
}
```

**Features:**
- Toggle between grid and list views
- Sort by newest, price (low/high), or popularity
- Filter by price range, bedrooms, property type
- View detailed property information with image gallery
- Pagination for efficient browsing

## 🔌 API Reference

### Properties Endpoints

#### Create Property
```http
POST /api/properties
Content-Type: multipart/form-data

Form Data:
- houseName (string, required)
- address (string, required)
- price (number, required)
- bedrooms (number)
- bathrooms (number)
- area (string)
- propertyType (string)
- country (string)
- state (string)
- city (string)
- description (string)
- images (files, multiple)

Response:
{
  "success": true,
  "property": { ... },
  "message": "Property created successfully"
}
```

#### Get All Properties
```http
GET /api/properties?page=1&limit=12

Response:
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 12,
    "total": 45,
    "pages": 4
  }
}
```

#### Get Single Property
```http
GET /api/properties/:id

Response:
{
  "success": true,
  "property": { ... }
}
```

#### Update Property
```http
PUT /api/properties/:id
Content-Type: multipart/form-data

Form Data: Same as create, with updated values

Response:
{
  "success": true,
  "property": { ... }
}
```

#### Delete Property
```http
DELETE /api/properties/:id

Response:
{
  "success": true,
  "message": "Property deleted successfully"
}
```

#### Search Properties
```http
GET /api/properties/search/:query?minPrice=1000&maxPrice=100000&bedrooms=2

Response:
{
  "success": true,
  "data": [ ... ],
  "count": 12
}
```

#### Get Caretaker Properties
```http
GET /api/caretaker/:address/properties

Response:
{
  "success": true,
  "data": [ ... ],
  "count": 5
}
```

## 🛠️ Development

### Project Structure
```
src/
├── components/
│   ├── PropertyUpload.tsx        # Upload form
│   ├── PropertyShowcase.tsx      # Browse component
│   └── ...other components
├── styles/
│   ├── PropertyUpload.css
│   ├── PropertyShowcase.css
│   └── ...other styles
├── walrus/
│   ├── client.ts                 # Walrus API
│   ├── sui-helpers.ts            # Sui helpers
│   ├── bloblds.ts                # Blob management
│   └── ...data files
├── types/
│   └── index.ts                  # TypeScript types
└── contract/
    └── sources/
        └── house.move            # Smart contract

backend/
├── api.js                         # Express server
└── ...uploads folder

public/
└── index.html
```

### Build for Production
```bash
npm run build
# Creates optimized build in dist/
```

### Deploy Smart Contract
```bash
sui move publish --path src/contract
# Deploy to Sui network
```

## 📊 Type Definitions

### Property Interface
```typescript
interface Property {
  id: string;
  houseName: string;
  address: string;
  price: number;
  bedrooms?: number;
  bathrooms?: number;
  area?: string;
  propertyType?: string;
  country?: string;
  state?: string;
  city?: string;
  description?: string;
  images?: Array<{
    blobId: string;
    fileName: string;
    mimeType: string;
    url: string;
  }>;
  blobIds?: string[];
  primaryImage?: {
    blobId: string;
    url: string;
  };
  createdAt?: string;
  views?: number;
  featured?: boolean;
}
```

## 🔐 Security Considerations

1. **File Upload Security**
   - Server-side file type validation
   - File size limits (100MB)
   - Only images and videos accepted
   - MIME type verification

2. **Walrus Integration**
   - Direct browser-to-Walrus uploads
   - No sensitive data passed through backend
   - Immutable storage guarantees

3. **Sui Blockchain**
   - Caretaker capability-based access control
   - Property metadata immutability
   - Event transparency

4. **API Security**
   - CORS configuration
   - Input validation on all endpoints
   - Error handling without exposing internals

## 🎯 Performance

- **Lazy Loading** - Images loaded only when needed
- **Pagination** - 12 items per page default
- **Batch Uploads** - Multiple files with progress tracking
- **Efficient State** - React hooks for minimal re-renders
- **CSS Optimization** - Mobile-first, responsive design
- **CDN Ready** - Static assets optimized for CDN delivery

## 🚨 Troubleshooting

### Images Not Uploading?
- Check Walrus URLs in .env
- Verify file sizes (max 100MB)
- Check browser console for errors
- Ensure internet connectivity

### API Errors?
- Verify backend is running on port 3001
- Check API_URL environment variable
- Look at backend logs for details
- Verify JSON request format

### Blockchain Issues?
- Confirm package ID and cap ID
- Check wallet has sufficient SUI for gas
- Verify contract compilation
- Use testnet for development

## 📚 Additional Resources

- **[Integration Guide](./INTEGRATION_GUIDE.md)** - Detailed setup and usage
- **[Sui Documentation](https://docs.sui.io)** - Sui blockchain docs
- **[Walrus Documentation](https://docs.wal.app)** - Walrus protocol docs
- **[Move Language](https://move-language.github.io)** - Smart contract language
- **[React Documentation](https://react.dev)** - Frontend framework

## 🤝 Contributing

Contributions are welcome! Please follow these steps:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

MIT License - See LICENSE file for details

## 💡 Future Enhancements

- [ ] Advanced search with ML recommendations
- [ ] Listing analytics and insights
- [ ] Caretaker reputation system
- [ ] Payment integration (SUI payments)
- [ ] Multi-language support
- [ ] 3D property tours
- [ ] Virtual staging with AI
- [ ] Blockchain-based leasing contracts

## 🙏 Acknowledgments

Built with:
- ❤️ Sui Foundation
- 🔐 Walrus Protocol
- ⚛️ React Community
- 🚀 Open Source Community

---

**Made with ❤️ on Sui**

For questions or support, please open an issue or reach out to the community.
