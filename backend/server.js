import express from 'express';
import cors from 'cors';
import multer from 'multer';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';
import dotenv from 'dotenv';
import { MongoClient, ObjectId } from 'mongodb';

dotenv.config();

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Create temp directory for files before Walrus upload
const TEMP_DIR = path.join(__dirname, 'temp');
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
  console.log('📁 Created temp directory:', TEMP_DIR);
}

// ==================== MONGODB SETUP ====================
const MONGO_URL = process.env.MONGO_URL || 'mongodb://127.0.0.1:27017';
const DB_NAME = process.env.DB_NAME || 'dwello';
let db;
let mongoClient;

async function connectDB() {
  try {
    mongoClient = new MongoClient(MONGO_URL);
    await mongoClient.connect();
    db = mongoClient.db(DB_NAME);
    
    console.log('✅ Successfully connected to MongoDB');
    console.log('📍 Database:', DB_NAME);
    
    // Create indexes for better performance
    await db.collection('properties').createIndex({ caretakerAddress: 1 });
    await db.collection('properties').createIndex({ walrusId: 1 });
    await db.collection('properties').createIndex({ createdAt: -1 });
    await db.collection('blobUploads').createIndex({ blobId: 1 }, { unique: true });
    await db.collection('blobUploads').createIndex({ caretakerAddress: 1 });
    
    const count = await db.collection('properties').countDocuments();
    console.log(`📊 Found ${count} properties in database`);
    
    // Start periodic sync
    startPeriodicSync();
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    console.error('⚠️  Falling back to in-memory storage');
  }
}

// In-memory fallback storage
const inMemoryProperties = new Map();
const inMemoryUploads = new Map();

// Multer setup
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only images and videos are allowed'));
    }
  },
});

// Walrus configuration
const WALRUS_EPOCHS = process.env.WALRUS_EPOCHS || '53';
const WALRUS_AGGREGATOR_URL = process.env.WALRUS_AGGREGATOR_URL || 'https://aggregator.walrus-testnet.walrus.space';

// ==================== SYNC FUNCTIONALITY ====================

/**
 * Sync in-memory data to MongoDB
 */
async function syncToMongoDB() {
  if (!db) {
    console.log('⚠️  MongoDB not connected, skipping sync');
    return;
  }

  try {
    console.log('🔄 Starting periodic sync to MongoDB...');
    let syncedProperties = 0;
    let syncedUploads = 0;

    // Sync properties
    for (const [id, property] of inMemoryProperties.entries()) {
      try {
        await db.collection('properties').updateOne(
          { _id: property._id || new ObjectId() },
          { 
            $set: { 
              ...property,
              lastSynced: new Date(),
              syncedAt: new Date()
            } 
          },
          { upsert: true }
        );
        syncedProperties++;
      } catch (err) {
        console.error(`Failed to sync property ${id}:`, err);
      }
    }

    // Sync blob uploads
    for (const [blobId, uploadData] of inMemoryUploads.entries()) {
      try {
        await db.collection('blobUploads').updateOne(
          { blobId },
          { 
            $set: { 
              ...uploadData,
              lastSynced: new Date()
            } 
          },
          { upsert: true }
        );
        syncedUploads++;
      } catch (err) {
        console.error(`Failed to sync blob ${blobId}:`, err);
      }
    }

    console.log(`✅ Sync complete: ${syncedProperties} properties, ${syncedUploads} uploads`);
  } catch (error) {
    console.error('❌ Sync failed:', error);
  }
}

/**
 * Load data from MongoDB to in-memory cache on startup
 */
async function loadFromMongoDB() {
  if (!db) return;

  try {
    console.log('📥 Loading data from MongoDB...');

    // Load properties
    const properties = await db.collection('properties').find({}).toArray();
    properties.forEach(prop => {
      const id = prop.id || prop._id.toString();
      inMemoryProperties.set(id, prop);
    });

    // Load blob uploads
    const uploads = await db.collection('blobUploads').find({}).toArray();
    uploads.forEach(upload => {
      inMemoryUploads.set(upload.blobId, upload);
    });

    console.log(`✅ Loaded ${properties.length} properties and ${uploads.length} uploads`);
  } catch (error) {
    console.error('❌ Failed to load from MongoDB:', error);
  }
}

/**
 * Start periodic sync (every 30 seconds)
 */
function startPeriodicSync() {
  const SYNC_INTERVAL = 30 * 1000; // 30 seconds

  setInterval(async () => {
    await syncToMongoDB();
  }, SYNC_INTERVAL);

  console.log(`🔄 Periodic sync started (every ${SYNC_INTERVAL / 1000} seconds)`);
}

/**
 * Verify blob IDs in MongoDB and update status
 */
async function verifyBlobIds() {
  if (!db) return;

  try {
    const properties = await db.collection('properties').find({}).toArray();
    let verified = 0;
    let failed = 0;

    for (const property of properties) {
      if (property.blobIds && property.blobIds.length > 0) {
        const verificationResults = [];
        
        for (const blobId of property.blobIds) {
          try {
            const url = `${WALRUS_AGGREGATOR_URL}/v1/blobs/${blobId}`;
            const response = await fetch(url, { method: 'HEAD' });
            verificationResults.push({
              blobId,
              verified: response.ok,
              lastChecked: new Date()
            });
            if (response.ok) verified++;
            else failed++;
          } catch (err) {
            verificationResults.push({
              blobId,
              verified: false,
              error: err.message,
              lastChecked: new Date()
            });
            failed++;
          }
        }

        // Update property with verification results
        await db.collection('properties').updateOne(
          { _id: property._id },
          { 
            $set: { 
              blobVerification: verificationResults,
              lastBlobCheck: new Date()
            } 
          }
        );
      }
    }

    console.log(`✅ Blob verification: ${verified} verified, ${failed} failed`);
  } catch (error) {
    console.error('❌ Blob verification failed:', error);
  }
}

// ==================== WALRUS UPLOAD ====================

/**
 * Upload file to Walrus using CLI
 */
async function uploadToWalrus(fileBuffer, filename, caretakerAddress) {
  const tempFilePath = path.join(TEMP_DIR, `${Date.now()}_${filename}`);
  try {
    console.log(`📤 Uploading ${filename} to Walrus...`);
    
    fs.writeFileSync(tempFilePath, fileBuffer);
    console.log(`💾 Saved temp file: ${tempFilePath}`);
    
    const command = `walrus store "${tempFilePath}" --epochs ${WALRUS_EPOCHS} --context testnet --json`;
    console.log(`🔧 Running: ${command}`);
    
    const { stdout, stderr } = await execAsync(command);
    
    if (stderr && !stderr.includes('WARN')) {
      console.error('⚠️ Walrus stderr:', stderr);
    }
    
    console.log('📦 Walrus response:', stdout);
    
    let walrusResponse;
    try {
      walrusResponse = JSON.parse(stdout);
    } catch (parseError) {
      const jsonMatch = stdout.match(/\[\s*\{[\s\S]*\}\s*\]/) || stdout.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        walrusResponse = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Failed to parse Walrus response: ' + parseError.message);
      }
    }
    
    let result = walrusResponse;
    if (Array.isArray(walrusResponse)) {
      if (walrusResponse.length === 0) {
        throw new Error('Empty response array from Walrus');
      }
      result = walrusResponse[0];
    }
    
    const blobStoreResult = result.blobStoreResult;
    if (!blobStoreResult) {
      throw new Error('No blobStoreResult in Walrus response');
    }
    
    let blobId;
    if (blobStoreResult.newlyCreated) {
      blobId = blobStoreResult.newlyCreated.blobObject?.blobId;
    } else if (blobStoreResult.alreadyCertified) {
      blobId = blobStoreResult.alreadyCertified.blobId;
    }
    
    if (!blobId) {
      throw new Error('No blob ID returned from Walrus');
    }
    
    console.log(`✅ Successfully uploaded to Walrus: ${blobId}`);
    
    const uploadData = {
      blobId,
      filename,
      originalFilename: filename,
      uploadedAt: new Date(),
      caretakerAddress,
      url: `${WALRUS_AGGREGATOR_URL}/v1/blobs/${blobId}`,
      size: fileBuffer.length,
      epochs: parseInt(WALRUS_EPOCHS),
      walrusResponse: result,
      verified: true,
      lastChecked: new Date()
    };
    
    // Store in memory
    inMemoryUploads.set(blobId, uploadData);
    
    // Immediately sync to MongoDB if available
    if (db) {
      try {
        await db.collection('blobUploads').updateOne(
          { blobId },
          { $set: uploadData },
          { upsert: true }
        );
        console.log('💾 Blob immediately synced to MongoDB');
      } catch (dbError) {
        console.error('⚠️ Failed to sync blob to MongoDB:', dbError);
      }
    }
    
    return uploadData;
    
  } catch (error) {
    console.error('❌ Walrus upload error:', error);
    throw error;
  } finally {
    try {
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
        console.log('🗑️ Cleaned up temp file');
      }
    } catch (cleanupError) {
      console.error('Warning: Failed to cleanup temp file:', cleanupError);
    }
  }
}

// ==================== API ROUTES ====================

/**
 * POST /api/walrus/upload
 * Upload a file to Walrus with automatic MongoDB sync
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
    
    const uploadResult = await uploadToWalrus(
      req.file.buffer,
      req.file.originalname,
      caretakerAddress
    );
    
    res.json({
      success: true,
      blobId: uploadResult.blobId,
      url: uploadResult.url,
      filename: uploadResult.filename,
      uploadedAt: uploadResult.uploadedAt,
      size: uploadResult.size,
      epochs: uploadResult.epochs,
      synced: db ? true : false
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
 * POST /api/properties/create
 * Create a new property with automatic MongoDB sync
 */
app.post('/api/properties/create', async (req, res) => {
  try {
    console.log('📥 Received property creation request');
    
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
    
    if (!houseName || !caretakerAddress) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: houseName, caretakerAddress',
      });
    }
    
    const walrusId = blobIds && blobIds.length > 0 ? blobIds[0] : null;
    
    const property = {
      title: houseName,
      houseName,
      walrusId,
      blobId: walrusId,
      blobIds: blobIds || [],
      address,
      country,
      state,
      city,
      location: `${city || ''}, ${state || ''}`.trim(),
      price: price ? price.toString() : '0',
      pricing: price ? price.toString() : '0',
      currency: '$',
      period: 'year',
      bedrooms: parseInt(bedrooms) || 1,
      bathrooms: parseInt(bathrooms) || 1,
      area: area || '100 sqm',
      type: propertyType || 'Apartment',
      propertyType: propertyType || 'Apartment',
      description: description || '',
      caretakerAddress,
      images: imagesWithAmounts || [],
      imagesWithAmounts: imagesWithAmounts || [],
      isLegitBlobId: blobIds && blobIds.length > 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      synced: false
    };
    
    console.log('💾 Saving property...');
    
    // Save to MongoDB immediately
    if (db) {
      try {
        const result = await db.collection('properties').insertOne({
          ...property,
          synced: true
        });
        
        // Also store in memory for quick access
        const savedProperty = {
          ...property,
          _id: result.insertedId,
          synced: true
        };
        inMemoryProperties.set(result.insertedId.toString(), savedProperty);
        
        console.log('✅ Property saved to MongoDB! ID:', result.insertedId);
        
        return res.json({
          success: true,
          property: savedProperty,
          message: 'Property created and synced to MongoDB',
          synced: true
        });
      } catch (dbError) {
        console.error('❌ MongoDB save failed:', dbError);
      }
    }
    
    // Fallback to in-memory
    const propertyId = `prop_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    property.id = propertyId;
    inMemoryProperties.set(propertyId, property);
    
    console.log('✅ Property saved to in-memory (will sync next cycle)');
    
    res.json({
      success: true,
      property,
      message: 'Property created (pending sync)',
      synced: false
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
 * Get all properties with fresh MongoDB data
 */
app.get('/api/properties', async (req, res) => {
  try {
    console.log('📋 Fetching all properties...');
    
    const { caretakerAddress, country, state, city } = req.query;
    
    let propertyList = [];
    
    // Always try MongoDB first for latest data
    if (db) {
      try {
        const filter = {};
        if (caretakerAddress) filter.caretakerAddress = caretakerAddress;
        if (country) filter.country = country;
        if (state) filter.state = state;
        if (city) filter.city = city;
        
        propertyList = await db.collection('properties')
          .find(filter)
          .sort({ createdAt: -1 })
          .toArray();
        
        console.log(`✅ Found ${propertyList.length} properties in MongoDB`);
        
        // Update in-memory cache
        propertyList.forEach(prop => {
          const id = prop.id || prop._id.toString();
          inMemoryProperties.set(id, prop);
        });
      } catch (dbError) {
        console.error('❌ MongoDB query failed:', dbError);
      }
    }
    
    // Fallback to in-memory if MongoDB failed
    if (propertyList.length === 0 && inMemoryProperties.size > 0) {
      propertyList = Array.from(inMemoryProperties.values());
      
      if (caretakerAddress) {
        propertyList = propertyList.filter(p => p.caretakerAddress === caretakerAddress);
      }
      if (country) {
        propertyList = propertyList.filter(p => p.country === country);
      }
      if (state) {
        propertyList = propertyList.filter(p => p.state === state);
      }
      if (city) {
        propertyList = propertyList.filter(p => p.city === city);
      }
      
      console.log(`✅ Found ${propertyList.length} properties in memory`);
    }
    
    res.json({
      success: true,
      properties: propertyList,
      count: propertyList.length,
      source: db ? 'mongodb' : 'memory'
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
 * POST /api/sync/trigger
 * Manually trigger sync to MongoDB
 */
app.post('/api/sync/trigger', async (req, res) => {
  try {
    await syncToMongoDB();
    res.json({
      success: true,
      message: 'Sync triggered successfully',
      timestamp: new Date()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/sync/verify-blobs
 * Manually trigger blob verification
 */
app.post('/api/sync/verify-blobs', async (req, res) => {
  try {
    await verifyBlobIds();
    res.json({
      success: true,
      message: 'Blob verification completed',
      timestamp: new Date()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/sync/status
 * Get sync status
 */
app.get('/api/sync/status', async (req, res) => {
  try {
    let mongoStatus = 'disconnected';
    let mongoCount = 0;
    let blobCount = 0;
    
    if (db) {
      try {
        mongoCount = await db.collection('properties').countDocuments();
        blobCount = await db.collection('blobUploads').countDocuments();
        mongoStatus = 'connected';
      } catch (err) {
        mongoStatus = 'error';
      }
    }
    
    res.json({
      success: true,
      mongodb: {
        status: mongoStatus,
        properties: mongoCount,
        blobs: blobCount
      },
      inMemory: {
        properties: inMemoryProperties.size,
        uploads: inMemoryUploads.size
      },
      syncEnabled: db ? true : false,
      lastSync: new Date()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/walrus/blob/:blobId
 * Get blob metadata
 */
app.get('/api/walrus/blob/:blobId', async (req, res) => {
  try {
    const { blobId } = req.params;
    
    // Try MongoDB first
    if (db) {
      try {
        const blobData = await db.collection('blobUploads').findOne({ blobId });
        if (blobData) {
          return res.json({
            success: true,
            blob: blobData,
            source: 'mongodb'
          });
        }
      } catch (dbError) {
        console.log('Blob not in MongoDB, trying memory...');
      }
    }
    
    // Fallback to memory
    const blobData = inMemoryUploads.get(blobId);
    
    if (!blobData) {
      return res.status(404).json({
        success: false,
        error: 'Blob not found',
      });
    }
    
    res.json({
      success: true,
      blob: blobData,
      source: 'memory'
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
 * GET /api/properties/:id
 */
app.get('/api/properties/:id', async (req, res) => {
  try {
    const { id } = req.params;
    let property = null;
    
    if (db) {
      try {
        property = await db.collection('properties').findOne({ _id: new ObjectId(id) });
      } catch (dbError) {
        console.log('Not found in MongoDB, trying in-memory...');
      }
    }
    
    if (!property) {
      property = inMemoryProperties.get(id);
    }
    
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
 */
app.put('/api/properties/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (db) {
      try {
        const result = await db.collection('properties').findOneAndUpdate(
          { _id: new ObjectId(id) },
          { 
            $set: { 
              ...req.body, 
              updatedAt: new Date(),
              synced: true
            } 
          },
          { returnDocument: 'after' }
        );
        
        if (result.value) {
          inMemoryProperties.set(id, result.value);
          return res.json({
            success: true,
            property: result.value,
            synced: true
          });
        }
      } catch (dbError) {
        console.log('MongoDB update failed, trying in-memory...');
      }
    }
    
    const property = inMemoryProperties.get(id);
    if (!property) {
      return res.status(404).json({
        success: false,
        error: 'Property not found',
      });
    }
    
    const updatedProperty = {
      ...property,
      ...req.body,
      id,
      updatedAt: new Date(),
      synced: false
    };
    
    inMemoryProperties.set(id, updatedProperty);
    
    res.json({
      success: true,
      property: updatedProperty,
      synced: false
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
 */
app.delete('/api/properties/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (db) {
      try {
        const result = await db.collection('properties').deleteOne({ _id: new ObjectId(id) });
        if (result.deletedCount > 0) {
          inMemoryProperties.delete(id);
          return res.json({
            success: true,
            message: 'Property deleted successfully',
          });
        }
      } catch (dbError) {
        console.log('MongoDB delete failed, trying in-memory...');
      }
    }
    
    if (!inMemoryProperties.has(id)) {
      return res.status(404).json({
        success: false,
        error: 'Property not found',
      });
    }
    
    inMemoryProperties.delete(id);
    
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
 */
app.get('/api/health', async (req, res) => {
  let dbStatus = 'disconnected';
  let dbCount = 0;
  let blobCount = 0;
  
  if (db) {
    try {
      dbCount = await db.collection('properties').countDocuments();
      blobCount = await db.collection('blobUploads').countDocuments();
      dbStatus = 'connected';
    } catch (err) {
      dbStatus = 'error';
    }
  }
  
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    storage: 'WALRUS (via CLI)',
    database: {
      status: dbStatus,
      type: db ? 'MongoDB' : 'In-Memory',
      propertiesCount: db ? dbCount : inMemoryProperties.size,
      blobsCount: blobCount
    },
    inMemory: {
      properties: inMemoryProperties.size,
      uploads: inMemoryUploads.size
    },
    syncEnabled: db ? true : false,
    walrusAggregator: WALRUS_AGGREGATOR_URL,
    walrusEpochs: WALRUS_EPOCHS,
  });
});

/**
 * GET /api/stats
 */
app.get('/api/stats', async (req, res) => {
  const uploadStats = Array.from(inMemoryUploads.values());
  const totalSize = uploadStats.reduce((sum, upload) => sum + upload.size, 0);
  
  let propertiesCount = inMemoryProperties.size;
  let blobsCount = 0;
  
  if (db) {
    try {
      propertiesCount = await db.collection('properties').countDocuments();
      blobsCount = await db.collection('blobUploads').countDocuments();
    } catch (err) {
      // Use in-memory count
    }
  }
  
  res.json({
    success: true,
    uploads: {
      count: inMemoryUploads.size,
      totalSize,
      totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
    },
    properties: {
      count: propertiesCount,
    },
    mongodb: {
      blobs: blobsCount,
      properties: propertiesCount
    },
    walrus: {
      aggregatorUrl: WALRUS_AGGREGATOR_URL,
      storageEpochs: WALRUS_EPOCHS,
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
async function startServer() {
  await connectDB();
  await loadFromMongoDB();
  
  // Schedule blob verification every 5 minutes
  setInterval(async () => {
    console.log('🔍 Running periodic blob verification...');
    await verifyBlobIds();
  }, 5 * 60 * 1000);
  
  app.listen(PORT, () => {
    console.log(`\n🐋 Dwello Backend with AUTO-SYNC`);
    console.log(`=====================================`);
    console.log(`Running on: http://localhost:${PORT}`);
    console.log(`Storage: WALRUS TESTNET (via CLI)`);
    console.log(`Database: ${db ? 'MongoDB ✅ (Auto-Sync Enabled)' : 'In-Memory ⚠️'}`);
    console.log(`Walrus Aggregator: ${WALRUS_AGGREGATOR_URL}`);
    console.log(`Storage Duration: ${WALRUS_EPOCHS} epochs`);
    console.log(`\n🔄 Auto-Sync: Enabled (30s interval)`);
    console.log(`🔍 Blob Verification: Every 5 minutes`);
    console.log(`\n📡 API Endpoints:`);
    console.log(` POST /api/walrus/upload`);
    console.log(` GET /api/walrus/blob/:blobId`);
    console.log(` POST /api/properties/create`);
    console.log(` GET /api/properties`);
    console.log(` GET /api/properties/:id`);
    console.log(` PUT /api/properties/:id`);
    console.log(` DELETE /api/properties/:id`);
    console.log(` POST /api/sync/trigger (manual sync)`);
    console.log(` POST /api/sync/verify-blobs`);
    console.log(` GET /api/sync/status`);
    console.log(` GET /api/health`);
    console.log(` GET /api/stats`);
    console.log(`=====================================\n`);
  });
}

startServer();

export default app;