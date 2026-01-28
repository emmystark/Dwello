import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import fetch from 'node-fetch';
import FormData from 'form-data';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Multer setup for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

// Sui client setup
const suiClient = new SuiClient({
  url: process.env.SUI_NETWORK_URL || 'https://fullnode.testnet.sui.io:443',
});

// Walrus configuration
const WALRUS_PUBLISHER_URL = process.env.WALRUS_PUBLISHER_URL || 'https://publisher.walrus-testnet.walrus.space';
const WALRUS_AGGREGATOR_URL = process.env.WALRUS_AGGREGATOR_URL || 'https://aggregator.walrus-testnet.walrus.space';
const WALRUS_PACKAGE_ID = process.env.WALRUS_PACKAGE_ID;
const WALRUS_SYSTEM_OBJECT = process.env.WALRUS_SYSTEM_OBJECT;

// Database (in-memory for now, replace with actual DB)
const properties = new Map();
const walrusUploads = new Map();

/**
 * Upload file to Walrus storage
 */
async function uploadToWalrus(fileBuffer, filename, caretakerAddress) {
  try {
    console.log(`📤 Uploading ${filename} to Walrus...`);
    
    // Create form data for Walrus
    const formData = new FormData();
    formData.append('file', fileBuffer, {
      filename: filename,
      contentType: 'application/octet-stream',
    });

    // Upload to Walrus publisher
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
    
    // Check if we got a blob ID
    if (!result.newlyCreated && !result.alreadyCertified) {
      throw new Error('Walrus upload did not return blob info');
    }

    const blobId = result.newlyCreated?.blobObject?.blobId || 
                   result.alreadyCertified?.blobId;
    
    if (!blobId) {
      throw new Error('No blob ID returned from Walrus');
    }

    console.log(`✅ Successfully uploaded to Walrus: ${blobId}`);

    // Store upload metadata
    const uploadData = {
      blobId,
      filename,
      uploadedAt: new Date().toISOString(),
      caretakerAddress,
      url: `${WALRUS_AGGREGATOR_URL}/v1/${blobId}`,
      size: fileBuffer.length,
    };

    walrusUploads.set(blobId, uploadData);

    return uploadData;
  } catch (error) {
    console.error('❌ Walrus upload error:', error);
    throw error;
  }
}

/**
 * Register blob on Sui blockchain (optional)
 */
async function registerBlobOnChain(blobId, caretakerAddress, metadata) {
  try {
    if (!WALRUS_PACKAGE_ID || !WALRUS_SYSTEM_OBJECT) {
      console.warn('⚠️ Walrus package ID or system object not configured, skipping on-chain registration');
      return null;
    }

    // Create transaction to register blob
    const tx = new Transaction();
    
    tx.moveCall({
      target: `${WALRUS_PACKAGE_ID}::blob::register`,
      arguments: [
        tx.object(WALRUS_SYSTEM_OBJECT),
        tx.pure.string(blobId),
        tx.pure.string(JSON.stringify(metadata)),
      ],
    });

    // For now, return null as we need the user's wallet to sign
    // In production, this would be handled client-side
    return null;
  } catch (error) {
    console.error('❌ On-chain registration error:', error);
    return null;
  }
}

// ==================== API ROUTES ====================

/**
 * POST /api/walrus/upload
 * Upload a file to Walrus storage
 */
app.post('/api/walrus/upload', upload.single('file'), async (req, res) => {
  try {
    console.log('📨 Received upload request');
    
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

    console.log(`📄 File: ${req.file.originalname}, Size: ${req.file.size} bytes`);

    // Upload to Walrus
    const uploadResult = await uploadToWalrus(
      req.file.buffer,
      req.file.originalname,
      caretakerAddress
    );

    // Return success response
    res.json({
      success: true,
      blobId: uploadResult.blobId,
      url: uploadResult.url,
      filename: uploadResult.filename,
      uploadedAt: uploadResult.uploadedAt,
      size: uploadResult.size,
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
 * Get blob metadata
 */
app.get('/api/walrus/blob/:blobId', (req, res) => {
  try {
    const { blobId } = req.params;
    const blobData = walrusUploads.get(blobId);

    if (!blobData) {
      return res.status(404).json({
        success: false,
        error: 'Blob not found',
      });
    }

    res.json({
      success: true,
      blob: blobData,
    });
  } catch (error) {
    console.error('❌ Error fetching blob:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/properties/create
 * Create a new property listing
 */
app.post('/api/properties/create', async (req, res) => {
  try {
    console.log('📨 Creating property...');
    
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
    } = req.body;

    // Validate required fields
    if (!houseName || !address || !price || !caretakerAddress) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
      });
    }

    // Create property object
    const propertyId = `prop_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const property = {
      id: propertyId,
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
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Store property
    properties.set(propertyId, property);

    console.log(`✅ Property created: ${propertyId}`);

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
 * Get all properties
 */
app.get('/api/properties', (req, res) => {
  try {
    const { caretakerAddress } = req.query;
    
    let propertyList = Array.from(properties.values());
    
    // Filter by caretaker if provided
    if (caretakerAddress) {
      propertyList = propertyList.filter(
        p => p.caretakerAddress === caretakerAddress
      );
    }

    res.json({
      success: true,
      properties: propertyList,
      count: propertyList.length,
    });
  } catch (error) {
    console.error('❌ Error fetching properties:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/properties/:id
 * Get a specific property
 */
app.get('/api/properties/:id', (req, res) => {
  try {
    const { id } = req.params;
    const property = properties.get(id);

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
    console.error('❌ Error fetching property:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * PUT /api/properties/:id
 * Update a property
 */
app.put('/api/properties/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const property = properties.get(id);

    if (!property) {
      return res.status(404).json({
        success: false,
        error: 'Property not found',
      });
    }

    // Update property
    const updatedProperty = {
      ...property,
      ...req.body,
      id, // Ensure ID doesn't change
      updatedAt: new Date().toISOString(),
    };

    properties.set(id, updatedProperty);

    res.json({
      success: true,
      property: updatedProperty,
    });
  } catch (error) {
    console.error('❌ Error updating property:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * DELETE /api/properties/:id
 * Delete a property
 */
app.delete('/api/properties/:id', (req, res) => {
  try {
    const { id } = req.params;
    
    if (!properties.has(id)) {
      return res.status(404).json({
        success: false,
        error: 'Property not found',
      });
    }

    properties.delete(id);

    res.json({
      success: true,
      message: 'Property deleted successfully',
    });
  } catch (error) {
    console.error('❌ Error deleting property:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/health
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    walrus: {
      publisher: WALRUS_PUBLISHER_URL,
      aggregator: WALRUS_AGGREGATOR_URL,
    },
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Server error:', err);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal server error',
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 Server running on http://localhost:${PORT}`);
  console.log(`📡 Walrus Publisher: ${WALRUS_PUBLISHER_URL}`);
  console.log(`📡 Walrus Aggregator: ${WALRUS_AGGREGATOR_URL}`);
  console.log(`\n✅ Ready to accept requests!\n`);
});

export default app;