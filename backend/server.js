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
// In-memory databases
const properties = new Map();
const uploads = new Map();
// Walrus configuration
const WALRUS_EPOCHS = process.env.WALRUS_EPOCHS || '53'; // Store for 200 epochs (~200 days)
const WALRUS_AGGREGATOR_URL = process.env.WALRUS_AGGREGATOR_URL || 'https://aggregator.walrus-testnet.walrus.space';
/**
 * Upload file to Walrus using CLI
 */
async function uploadToWalrus(fileBuffer, filename, caretakerAddress) {
const tempFilePath = path.join(TEMP_DIR, `${Date.now()}_${filename}`);
try {
console.log(`📤 Uploading ${filename} to Walrus...`);
// Save file temporarily
fs.writeFileSync(tempFilePath, fileBuffer);
console.log(`💾 Saved temp file: ${tempFilePath}`);
// Upload to Walrus using CLI
const command = `walrus store "${tempFilePath}" --epochs ${WALRUS_EPOCHS} --context testnet --json`;
console.log(`🔧 Running: ${command}`);
const { stdout, stderr } = await execAsync(command);
if (stderr && !stderr.includes('WARN')) {
console.error('⚠️ Walrus stderr:', stderr);
    }
console.log('📦 Walrus response:', stdout);
// Parse JSON output
let walrusResponse;
try {
walrusResponse = JSON.parse(stdout);
    } catch (parseError) {
// Try to extract JSON from output
const jsonMatch = stdout.match(/\[\s*\{[\s\S]*\}\s*\]/) || stdout.match(/\{[\s\S]*\}/);
if (jsonMatch) {
walrusResponse = JSON.parse(jsonMatch[0]);
      } else {
throw new Error('Failed to parse Walrus response: ' + parseError.message);
      }
    }
// Handle array response (Walrus CLI returns an array for store command)
let result = walrusResponse;
if (Array.isArray(walrusResponse)) {
if (walrusResponse.length === 0) {
throw new Error('Empty response array from Walrus');
      }
result = walrusResponse[0];
    }
// Extract from blobStoreResult
const blobStoreResult = result.blobStoreResult;
if (!blobStoreResult) {
throw new Error('No blobStoreResult in Walrus response');
    }
let blobId;
if (blobStoreResult.newlyCreated) {
const blobObject = blobStoreResult.newlyCreated.blobObject;
if (!blobObject || !blobObject.blobId) {
throw new Error('No blobObject or blobId in newlyCreated');
      }
blobId = blobObject.blobId;
    } else if (blobStoreResult.alreadyCertified) {
if (!blobStoreResult.alreadyCertified.blobId) {
throw new Error('No blobId in alreadyCertified');
      }
blobId = blobStoreResult.alreadyCertified.blobId;
    } else {
throw new Error('Neither newlyCreated nor alreadyCertified in blobStoreResult');
    }
if (!blobId) {
throw new Error('No blob ID returned from Walrus');
    }
console.log(`✅ Successfully uploaded to Walrus: ${blobId}`);
// Store upload metadata
const uploadData = {
blobId,
filename,
originalFilename: filename,
uploadedAt: new Date().toISOString(),
caretakerAddress,
url: `${WALRUS_AGGREGATOR_URL}/v1/${blobId}`,
size: fileBuffer.length,
epochs: parseInt(WALRUS_EPOCHS),
walrusResponse: result, // Store the inner result object
    };
uploads.set(blobId, uploadData);
return uploadData;
  } catch (error) {
console.error('❌ Walrus upload error:', error);
throw error;
  } finally {
// Clean up temp file
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
 * Upload a file to Walrus
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
epochs: uploadResult.epochs,
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
const blobData = uploads.get(blobId);
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
 * GET /api/walrus/uploads
 * Get all uploaded blobs metadata (optionally filtered by caretakerAddress)
 */
app.get('/api/walrus/uploads', (req, res) => {
  try {
    const { caretakerAddress } = req.query;
    let uploadList = Array.from(uploads.values());
    if (caretakerAddress) {
      uploadList = uploadList.filter(u => u.caretakerAddress === caretakerAddress);
    }
    res.json({
      success: true,
      uploads: uploadList,
      count: uploadList.length,
    });
  } catch (error) {
    console.error('❌ Error fetching uploads:', error);
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
error: 'Missing required fields: houseName, address, price, caretakerAddress',
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
const { caretakerAddress, country, state, city } = req.query;
let propertyList = Array.from(properties.values());
// Apply filters
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
id,
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
storage: 'WALRUS (via CLI)',
uploadsCount: uploads.size,
propertiesCount: properties.size,
walrusAggregator: WALRUS_AGGREGATOR_URL,
walrusEpochs: WALRUS_EPOCHS,
  });
});
/**
 * GET /api/stats
 * Get server statistics
 */
app.get('/api/stats', (req, res) => {
const uploadStats = Array.from(uploads.values());
const totalSize = uploadStats.reduce((sum, upload) => sum + upload.size, 0);
res.json({
success: true,
uploads: {
count: uploads.size,
totalSize,
totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
    },
properties: {
count: properties.size,
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
app.listen(PORT, () => {
console.log(`\n🐋 Dwello Backend Server with REAL WALRUS`);
console.log(`=====================================`);
console.log(`Running on: http://localhost:${PORT}`);
console.log(`Storage: WALRUS TESTNET (via CLI)`);
console.log(`Walrus Aggregator: ${WALRUS_AGGREGATOR_URL}`);
console.log(`Storage Duration: ${WALRUS_EPOCHS} epochs`);
console.log(`\n📡 API Endpoints:`);
console.log(` POST /api/walrus/upload`);
console.log(` GET /api/walrus/blob/:blobId`);
console.log(` POST /api/properties/create`);
console.log(` GET /api/properties`);
console.log(` GET /api/properties/:id`);
console.log(` PUT /api/properties/:id`);
console.log(` DELETE /api/properties/:id`);
console.log(` GET /api/health`);
console.log(` GET /api/stats`);
console.log(`=====================================\n`);
console.log(`✅ Using Walrus CLI for uploads`);
console.log(`📁 Temp directory: ${TEMP_DIR}\n`);
});
export default app;