// server-with-db.js
// Production server with MongoDB integration

import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { SuiClient } from '@mysten/sui/client';
import fetch from 'node-fetch';
import FormData from 'form-data';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { Property, WalrusUpload, Transaction, connectDatabase } from './database-schemas.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Multer setup
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    // Allow images and videos
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only images and videos are allowed'));
    }
  },
});

// Walrus configuration
const WALRUS_PUBLISHER_URL = process.env.WALRUS_PUBLISHER_URL || 'https://publisher.walrus-testnet.walrus.space';
const WALRUS_AGGREGATOR_URL = process.env.WALRUS_AGGREGATOR_URL || 'https://aggregator.walrus-testnet.walrus.space';

/**
 * Upload file to Walrus storage
 */
async function uploadToWalrus(fileBuffer, filename, contentType) {
  try {
    console.log(`📤 Uploading ${filename} to Walrus...`);
    
    const formData = new FormData();
    formData.append('file', fileBuffer, {
      filename: filename,
      contentType: contentType || 'application/octet-stream',
    });

    const response = await fetch(`${WALRUS_PUBLISHER_URL}/v1/store`, {
      method: 'PUT',
      body: formData,
      headers: formData.getHeaders(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Walrus upload failed: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    
    const blobId = result.newlyCreated?.blobObject?.blobId || 
                   result.alreadyCertified?.blobId;
    
    if (!blobId) {
      throw new Error('No blob ID returned from Walrus');
    }

    console.log(`✅ Successfully uploaded to Walrus: ${blobId}`);

    return {
      blobId,
      url: `${WALRUS_AGGREGATOR_URL}/v1/${blobId}`,
    };
  } catch (error) {
    console.error('❌ Walrus upload error:', error);
    throw error;
  }
}

// ==================== API ROUTES ====================

/**
 * POST /api/walrus/upload
 */
app.post('/api/walrus/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded',
      });
    }

    const { title, caretakerAddress } = req.body;
    
    if (!caretakerAddress) {
      return res.status(400).json({
        success: false,
        error: 'Caretaker address is required',
      });
    }

    console.log(`📄 Uploading: ${req.file.originalname} (${req.file.size} bytes)`);

    // Upload to Walrus
    const { blobId, url } = await uploadToWalrus(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype
    );

    // Save to database
    const uploadRecord = new WalrusUpload({
      blobId,
      filename: req.file.originalname,
      caretakerAddress,
      url,
      size: req.file.size,
      contentType: req.file.mimetype,
      metadata: {
        title: title || req.file.originalname,
      },
    });

    await uploadRecord.save();

    res.json({
      success: true,
      blobId,
      url,
      filename: req.file.originalname,
      uploadedAt: uploadRecord.createdAt,
      size: req.file.size,
    });

  } catch (error) {
    console.error('❌ Upload error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Upload failed',
    });
  }
});

/**
 * GET /api/walrus/blob/:blobId
 */
app.get('/api/walrus/blob/:blobId', async (req, res) => {
  try {
    const { blobId } = req.params;
    const blob = await WalrusUpload.findOne({ blobId });

    if (!blob) {
      return res.status(404).json({
        success: false,
        error: 'Blob not found',
      });
    }

    res.json({
      success: true,
      blob,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/properties/create
 */
app.post('/api/properties/create', async (req, res) => {
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
      imagesWithAmounts,
      blobIds,
      apartments,
    } = req.body;

    // Validate required fields
    if (!houseName || !address || !price || !caretakerAddress) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: houseName, address, price, caretakerAddress',
      });
    }

    // Create property
    const property = new Property({
      houseName,
      address,
      price,
      bedrooms: parseInt(bedrooms) || 1,
      bathrooms: parseInt(bathrooms) || 1,
      area: area || '100 sqm',
      propertyType: propertyType || 'Apartment',
      country,
      state,
      city,
      description,
      caretakerAddress,
      images: imagesWithAmounts || [],
      blobIds: blobIds || [],
      apartments: apartments || [],
    });

    await property.save();

    console.log(`✅ Property created: ${property._id}`);

    res.json({
      success: true,
      property,
    });

  } catch (error) {
    console.error('❌ Error creating property:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/properties
 */
app.get('/api/properties', async (req, res) => {
  try {
    const { caretakerAddress, country, state, city, propertyType } = req.query;
    
    const filter = {};
    if (caretakerAddress) filter.caretakerAddress = caretakerAddress;
    if (country) filter.country = country;
    if (state) filter.state = state;
    if (city) filter.city = city;
    if (propertyType) filter.propertyType = propertyType;

    const properties = await Property.find(filter)
      .sort({ createdAt: -1 })
      .limit(100);

    res.json({
      success: true,
      properties,
      count: properties.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/properties/:id
 */
app.get('/api/properties/:id', async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);

    if (!property) {
      return res.status(404).json({
        success: false,
        error: 'Property not found',
      });
    }

    res.json({
      success: true,
      property,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * PUT /api/properties/:id
 */
app.put('/api/properties/:id', async (req, res) => {
  try {
    const property = await Property.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!property) {
      return res.status(404).json({
        success: false,
        error: 'Property not found',
      });
    }

    res.json({
      success: true,
      property,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * DELETE /api/properties/:id
 */
app.delete('/api/properties/:id', async (req, res) => {
  try {
    const property = await Property.findByIdAndDelete(req.params.id);

    if (!property) {
      return res.status(404).json({
        success: false,
        error: 'Property not found',
      });
    }

    res.json({
      success: true,
      message: 'Property deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/transactions/create
 */
app.post('/api/transactions/create', async (req, res) => {
  try {
    const {
      propertyId,
      apartmentNumber,
      amount,
      currency,
      fromAddress,
      toAddress,
      txHash,
      type,
      description,
    } = req.body;

    const transaction = new Transaction({
      propertyId,
      apartmentNumber,
      amount,
      currency: currency || 'USD',
      fromAddress,
      toAddress,
      txHash,
      type,
      description,
      status: 'pending',
    });

    await transaction.save();

    res.json({
      success: true,
      transaction,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/transactions
 */
app.get('/api/transactions', async (req, res) => {
  try {
    const { propertyId, fromAddress, toAddress, status } = req.query;
    
    const filter = {};
    if (propertyId) filter.propertyId = propertyId;
    if (fromAddress) filter.fromAddress = fromAddress;
    if (toAddress) filter.toAddress = toAddress;
    if (status) filter.status = status;

    const transactions = await Transaction.find(filter)
      .sort({ createdAt: -1 })
      .populate('propertyId')
      .limit(100);

    res.json({
      success: true,
      transactions,
      count: transactions.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/health
 */
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    walrus: {
      publisher: WALRUS_PUBLISHER_URL,
      aggregator: WALRUS_AGGREGATOR_URL,
    },
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('❌ Server error:', err);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal server error',
  });
});

// Start server
async function startServer() {
  try {
    // Connect to database if configured
    if (process.env.DATABASE_URL) {
      await connectDatabase(process.env.DATABASE_URL);
    } else {
      console.warn('⚠️  No DATABASE_URL configured, running without database');
    }

    app.listen(PORT, () => {
      console.log(`\n🚀 Server running on http://localhost:${PORT}`);
      console.log(`📡 Walrus Publisher: ${WALRUS_PUBLISHER_URL}`);
      console.log(`📡 Walrus Aggregator: ${WALRUS_AGGREGATOR_URL}`);
      console.log(`\n✅ Ready to accept requests!\n`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

export default app;