import express from 'express';
import multer from 'multer';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import fetch from 'node-fetch';
import FormData from 'form-data';
import {
  verifyPayment,
  validateWalrusBlob,
  verifyPaymentAndBlob,
  isCaretaker,
  getCaretakerProperties,
} from './payment-service.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = crypto.randomBytes(8).toString('hex');
    cb(null, `${name}${ext}`);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    // Allow images and videos only
    const allowedMimes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'video/mp4',
      'video/webm',
    ];

    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type: ${file.mimetype}`));
    }
  },
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB
  },
});

// Walrus configuration
const WALRUS_PUBLISHER_URL =
  process.env.WALRUS_PUBLISHER_URL ||
  'https://publisher.walrus-testnet.walrus.space';
const WALRUS_AGGREGATOR_URL =
  process.env.WALRUS_AGGREGATOR_URL ||
  'https://aggregator.walrus-testnet.walrus.space';

// In-memory database (replace with proper DB)
const properties = new Map();
const blobRegistry = new Map(); // Track which blobs belong to which property

/**
 * Middleware to verify payment before accessing paid content
 */
async function requirePayment(req, res, next) {
  const { userAddress, propertyId } = req.query;

  if (!userAddress || !propertyId) {
    return res.status(400).json({
      error: 'Missing userAddress or propertyId',
    });
  }

  try {
    const paymentStatus = await verifyPayment(userAddress, propertyId);

    if (!paymentStatus.hasPaid) {
      return res.status(403).json({
        error: 'Payment required',
        message: 'User must pay fee to access this property',
        paymentRequired: true,
      });
    }

    // Store payment info in request for downstream handlers
    req.paymentVerified = true;
    req.accessPass = paymentStatus.accessPass;
    next();
  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({
      error: 'Payment verification failed',
      details: error.message,
    });
  }
}

/**
 * Upload file to Walrus
 */
async function uploadToWalrus(filePath, fileName) {
  try {
    const fileStream = fs.createReadStream(filePath);
    const fileStats = fs.statSync(filePath);

    const url = `${WALRUS_PUBLISHER_URL}/v1/blobs?epochs=5&deletable=true`;

    const response = await fetch(url, {
      method: 'PUT',
      body: fileStream,
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Length': fileStats.size,
      },
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Upload failed: HTTP ${response.status} - ${text}`);
    }

    const result = await response.json();

    const blobId =
      result.blob_id ||
      result.blobId ||
      result.id ||
      result.cid ||
      result.newlyCreated?.blobObject?.blobId ||
      result.alreadyCertified?.blobId;

    if (!blobId) {
      throw new Error('No blob ID returned from Walrus');
    }

    return {
      blobId,
      fileName,
      mimeType: getMimeType(filePath),
      url: `${WALRUS_AGGREGATOR_URL}/v1/blobs/${blobId}`,
    };
  } catch (error) {
    console.error('Walrus upload error:', error);
    throw error;
  }
}

function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
  };
  return mimeTypes[ext] || 'application/octet-stream';
}

/**
 * Property endpoints
 */

// Create a new property listing
app.post('/api/properties', upload.array('images', 10), async (req, res) => {
  try {
    const {
      houseName,
      address,
      price,
      bedrooms,
      bathrooms,
      area,
      propertyType,
      country,
      state,
      city,
      description,
      caretakerAddress,
    } = req.body;

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No images provided' });
    }

    if (!houseName || !address || !price) {
      return res.status(400).json({
        error: 'Missing required fields: houseName, address, price',
      });
    }

    // Upload all files to Walrus
    const uploadedBlobs = [];
    const primaryImage = {
      blobId: null,
      url: null,
    };

    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];
      try {
        const blob = await uploadToWalrus(file.path, file.originalname);
        uploadedBlobs.push(blob);

        if (i === 0) {
          primaryImage.blobId = blob.blobId;
          primaryImage.url = blob.url;
        }

        // Clean up local file after upload
        fs.unlink(file.path, (err) => {
          if (err) console.error('Failed to delete temp file:', err);
        });
      } catch (error) {
        console.error(`Failed to upload ${file.originalname}:`, error);
        // Continue with other files
      }
    }

    if (uploadedBlobs.length === 0) {
      return res.status(500).json({
        error: 'Failed to upload any images to Walrus',
      });
    }

    // Create property record
    const propertyId = `prop_${crypto.randomBytes(8).toString('hex')}`;
    const property = {
      id: propertyId,
      houseName,
      address,
      price: parseFloat(price),
      bedrooms: parseInt(bedrooms) || 0,
      bathrooms: parseInt(bathrooms) || 0,
      area: area || 'N/A',
      propertyType: propertyType || 'Apartment',
      country,
      state,
      city,
      description,
      caretakerAddress,
      primaryImage,
      images: uploadedBlobs,
      blobIds: uploadedBlobs.map((b) => b.blobId),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      views: 0,
      featured: false,
    };

    properties.set(propertyId, property);

    // Register blobs
    for (const blob of uploadedBlobs) {
      blobRegistry.set(blob.blobId, propertyId);
    }

    res.status(201).json({
      success: true,
      property,
      message: 'Property created successfully',
    });
  } catch (error) {
    console.error('Error creating property:', error);
    res.status(500).json({
      error: error.message || 'Failed to create property',
    });
  }
});

// Get all properties with pagination
app.get('/api/properties', (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;

    const allProperties = Array.from(properties.values());
    const total = allProperties.length;
    const paginatedProperties = allProperties
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(skip, skip + limit);

    res.json({
      success: true,
      data: paginatedProperties,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single property by ID
app.get('/api/properties/:id', (req, res) => {
  try {
    const property = properties.get(req.params.id);

    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }

    // Increment view count
    property.views = (property.views || 0) + 1;
    properties.set(req.params.id, property);

    res.json({
      success: true,
      property,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update property
app.put('/api/properties/:id', upload.array('images', 5), async (req, res) => {
  try {
    const property = properties.get(req.params.id);

    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }

    // Update basic fields
    const updates = [
      'houseName',
      'address',
      'price',
      'bedrooms',
      'bathrooms',
      'area',
      'propertyType',
      'country',
      'state',
      'city',
      'description',
      'featured',
    ];

    for (const field of updates) {
      if (req.body[field] !== undefined) {
        if (['price', 'bedrooms', 'bathrooms'].includes(field)) {
          property[field] = parseFloat(req.body[field]) || property[field];
        } else {
          property[field] = req.body[field];
        }
      }
    }

    // Handle new image uploads
    if (req.files && req.files.length > 0) {
      const newBlobs = [];
      for (const file of req.files) {
        try {
          const blob = await uploadToWalrus(file.path, file.originalname);
          newBlobs.push(blob);
          fs.unlink(file.path, (err) => {
            if (err) console.error('Failed to delete temp file:', err);
          });
        } catch (error) {
          console.error(`Failed to upload ${file.originalname}:`, error);
        }
      }

      if (newBlobs.length > 0) {
        property.images.push(...newBlobs);
        if (!property.primaryImage.blobId) {
          property.primaryImage = {
            blobId: newBlobs[0].blobId,
            url: newBlobs[0].url,
          };
        }
        property.blobIds = property.images.map((b) => b.blobId);

        for (const blob of newBlobs) {
          blobRegistry.set(blob.blobId, req.params.id);
        }
      }
    }

    property.updatedAt = new Date().toISOString();
    properties.set(req.params.id, property);

    res.json({
      success: true,
      property,
      message: 'Property updated successfully',
    });
  } catch (error) {
    console.error('Error updating property:', error);
    res.status(500).json({
      error: error.message || 'Failed to update property',
    });
  }
});

// Delete property
app.delete('/api/properties/:id', (req, res) => {
  try {
    const property = properties.get(req.params.id);

    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }

    // Remove blob registry entries
    for (const blob of property.images) {
      blobRegistry.delete(blob.blobId);
    }

    properties.delete(req.params.id);

    res.json({
      success: true,
      message: 'Property deleted successfully',
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Search properties
app.get('/api/properties/search/:query', (req, res) => {
  try {
    const query = req.query.q?.toLowerCase() || req.params.query.toLowerCase();
    const minPrice = parseFloat(req.query.minPrice) || 0;
    const maxPrice = parseFloat(req.query.maxPrice) || Infinity;
    const bedrooms = parseInt(req.query.bedrooms) || 0;

    const results = Array.from(properties.values()).filter((prop) => {
      const matchesQuery =
        prop.houseName.toLowerCase().includes(query) ||
        prop.address.toLowerCase().includes(query) ||
        prop.city?.toLowerCase().includes(query) ||
        prop.propertyType.toLowerCase().includes(query);

      const matchesPrice = prop.price >= minPrice && prop.price <= maxPrice;
      const matchesBedrooms = bedrooms === 0 || prop.bedrooms >= bedrooms;

      return matchesQuery && matchesPrice && matchesBedrooms;
    });

    res.json({
      success: true,
      data: results,
      count: results.length,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get properties by caretaker
app.get('/api/caretaker/:address/properties', (req, res) => {
  try {
    const caretakerAddress = req.params.address;

    const results = Array.from(properties.values()).filter(
      (prop) => prop.caretakerAddress?.toLowerCase() === caretakerAddress.toLowerCase()
    );

    res.json({
      success: true,
      data: results,
      count: results.length,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Payment & Access Control Routes
 */

// Check if user has paid for a property
app.get('/api/payment-status', async (req, res) => {
  const { userAddress, propertyId } = req.query;

  if (!userAddress || !propertyId) {
    return res.status(400).json({
      error: 'Missing userAddress or propertyId',
    });
  }

  try {
    const status = await verifyPayment(userAddress, propertyId);
    res.json(status);
  } catch (error) {
    console.error('Payment status check error:', error);
    res.status(500).json({
      error: 'Failed to check payment status',
      details: error.message,
    });
  }
});

// Verify payment AND blob validity together
app.get('/api/verify-access', async (req, res) => {
  const { userAddress, propertyId, blobId } = req.query;

  if (!userAddress || !propertyId) {
    return res.status(400).json({
      error: 'Missing userAddress or propertyId',
    });
  }

  try {
    const verification = await verifyPaymentAndBlob(userAddress, propertyId, blobId);
    res.json(verification);
  } catch (error) {
    console.error('Access verification error:', error);
    res.status(500).json({
      error: 'Failed to verify access',
      details: error.message,
    });
  }
});

// Validate Walrus blob exists
app.get('/api/blob-validation/:blobId', async (req, res) => {
  const { blobId } = req.params;

  if (!blobId) {
    return res.status(400).json({ error: 'Blob ID required' });
  }

  try {
    const validation = await validateWalrusBlob(blobId);
    res.json(validation);
  } catch (error) {
    res.status(500).json({
      error: 'Blob validation failed',
      details: error.message,
    });
  }
});

// Get property details (payment-protected)
app.get('/api/properties/:id/details', requirePayment, async (req, res) => {
  try {
    const property = properties.get(req.params.id);

    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }

    res.json({
      success: true,
      property,
      accessVerified: true,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get property images (payment-protected)
app.get('/api/properties/:id/images', requirePayment, async (req, res) => {
  try {
    const property = properties.get(req.params.id);

    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }

    res.json({
      success: true,
      images: property.images,
      primaryImage: property.primaryImage,
      accessVerified: true,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Protected Walrus blob retrieval route
app.get('/api/walrus/blob/:blobId', requirePayment, async (req, res) => {
  const { blobId } = req.params;

  if (!blobId) {
    return res.status(400).json({ error: 'Blob ID required' });
  }

  try {
    const validation = await validateWalrusBlob(blobId);

    if (!validation.valid) {
      return res.status(404).json({
        error: 'Blob not found or inaccessible',
        blobId,
      });
    }

    res.json({
      success: true,
      blobId,
      url: validation.url,
      accessible: true,
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to access blob',
      details: error.message,
    });
  }
});

// Check if user is a caretaker
app.get('/api/is-caretaker/:address', async (req, res) => {
  const { address } = req.params;

  if (!address) {
    return res.status(400).json({ error: 'Address required' });
  }

  try {
    const isCaret = await isCaretaker(address);
    res.json({
      address,
      isCaretaker: isCaret,
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to check caretaker status',
      details: error.message,
    });
  }
});

// Get caretaker's properties from on-chain
app.get('/api/caretaker/:address/properties-onchain', async (req, res) => {
  const { address } = req.params;

  if (!address) {
    return res.status(400).json({ error: 'Address required' });
  }

  try {
    const properties = await getCaretakerProperties(address);
    res.json({
      success: true,
      caretaker: address,
      properties,
      count: properties.length,
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get caretaker properties',
      details: error.message,
    });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    walrus: {
      publisher: WALRUS_PUBLISHER_URL,
      aggregator: WALRUS_AGGREGATOR_URL,
    },
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Error:', error);

  if (error instanceof multer.MulterError) {
    if (error.code === 'FILE_TOO_LARGE') {
      return res.status(400).json({ error: 'File too large (max 100MB)' });
    }
    return res.status(400).json({ error: error.message });
  }

  res.status(500).json({
    error: error.message || 'Internal server error',
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 API server running on http://localhost:${PORT}`);
  console.log(`📦 Walrus Publisher: ${WALRUS_PUBLISHER_URL}`);
  console.log(`📡 Walrus Aggregator: ${WALRUS_AGGREGATOR_URL}`);
});

export default app;
