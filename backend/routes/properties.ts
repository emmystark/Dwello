/**
 * Backend API Route: Properties with Walrus Integration
 * File: backend/src/routes/properties.ts
 */

import { Router, Request, Response } from 'express';
import { SuiClient } from '@mysten/sui.js/client';

const router = Router();

// Initialize Sui client
const suiClient = new SuiClient({ 
  url: process.env.SUI_RPC_URL || 'https://fullnode.testnet.sui.io:443'
});

// In-memory storage (replace with database in production)
interface PropertyData {
  id: string;
  title: string;
  houseName?: string;
  description: string;
  address: string;
  city: string;
  state: string;
  country: string;
  price: number;
  currency: string;
  period?: string;
  bedrooms: number;
  bathrooms: number;
  area: string;
  propertyType: string;
  walrusId: string; // Walrus blob ID
  blobId?: string; // Alternative field name
  imageUrl?: string; // Full Walrus URL
  objectId?: string; // Sui object ID (if using smart contract)
  owner?: string;
  createdAt: string;
  updatedAt: string;
}

// Sample data storage (replace with real database)
const properties: PropertyData[] = [];

/**
 * Helper: Generate Walrus image URL from blob ID
 */
function getWalrusImageUrl(blobId: string): string {
  const aggregatorUrl = process.env.WALRUS_AGGREGATOR_URL || 
                        'https://aggregator.walrus-testnet.walrus.space';
  return `${aggregatorUrl}/v1/${blobId}`;
}

/**
 * Helper: Validate Walrus blob ID
 */
function isValidBlobId(blobId: string): boolean {
  if (!blobId || typeof blobId !== 'string') return false;
  const base64urlPattern = /^[A-Za-z0-9_-]{40,50}$/;
  return base64urlPattern.test(blobId);
}

/**
 * GET /api/properties - List all properties
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    // Get query parameters for filtering
    const { city, state, country } = req.query;

    let filteredProperties = [...properties];

    // Filter by location if provided
    if (city || state || country) {
      filteredProperties = filteredProperties.filter(p => {
        const cityMatch = !city || p.city.toLowerCase() === (city as string).toLowerCase();
        const stateMatch = !state || p.state.toLowerCase() === (state as string).toLowerCase();
        const countryMatch = !country || p.country.toLowerCase() === (country as string).toLowerCase();
        return cityMatch && stateMatch && countryMatch;
      });
    }

    // Ensure all properties have proper Walrus URLs
    const propertiesWithUrls = filteredProperties.map(p => ({
      ...p,
      imageUrl: p.walrusId ? getWalrusImageUrl(p.walrusId) : p.imageUrl,
      blobId: p.walrusId || p.blobId, // Ensure backward compatibility
    }));

    res.json({
      success: true,
      count: propertiesWithUrls.length,
      data: propertiesWithUrls,
    });
  } catch (error: any) {
    console.error('Error fetching properties:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch properties',
      message: error.message,
    });
  }
});

/**
 * GET /api/properties/:id - Get single property
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const property = properties.find(p => p.id === id);

    if (!property) {
      return res.status(404).json({
        success: false,
        error: 'Property not found',
      });
    }

    // Add Walrus URL
    const propertyWithUrl = {
      ...property,
      imageUrl: property.walrusId ? getWalrusImageUrl(property.walrusId) : property.imageUrl,
    };

    res.json({
      success: true,
      data: propertyWithUrl,
    });
  } catch (error: any) {
    console.error('Error fetching property:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch property',
      message: error.message,
    });
  }
});

/**
 * POST /api/properties - Create new property
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      title,
      houseName,
      description,
      address,
      city,
      state,
      country,
      price,
      currency = '$',
      period = 'night',
      bedrooms,
      bathrooms,
      area,
      propertyType,
      walrusId, // Walrus blob ID from upload
      objectId, // Optional: Sui object ID
      owner,
    } = req.body;

    // Validate required fields
    if (!title || !city || !state || !country || !price || !walrusId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        required: ['title', 'city', 'state', 'country', 'price', 'walrusId'],
      });
    }

    // Validate Walrus blob ID
    if (!isValidBlobId(walrusId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Walrus blob ID format',
        hint: 'Blob ID should be a base64url encoded string (40-50 chars)',
      });
    }

    // Generate ID
    const id = `prop_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create property object
    const newProperty: PropertyData = {
      id,
      title: title || houseName,
      houseName,
      description: description || '',
      address: address || '',
      city,
      state,
      country,
      price: parseFloat(price),
      currency,
      period,
      bedrooms: parseInt(bedrooms) || 0,
      bathrooms: parseInt(bathrooms) || 0,
      area: area || '',
      propertyType: propertyType || 'Property',
      walrusId, // Store the blob ID
      blobId: walrusId, // Duplicate for compatibility
      imageUrl: getWalrusImageUrl(walrusId), // Generate full URL
      objectId,
      owner,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Save to storage
    properties.push(newProperty);

    console.log('Property created:', {
      id: newProperty.id,
      title: newProperty.title,
      walrusId: newProperty.walrusId,
      imageUrl: newProperty.imageUrl,
    });

    res.status(201).json({
      success: true,
      data: newProperty,
      message: 'Property created successfully',
    });
  } catch (error: any) {
    console.error('Error creating property:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create property',
      message: error.message,
    });
  }
});

/**
 * PUT /api/properties/:id - Update property
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const propertyIndex = properties.findIndex(p => p.id === id);

    if (propertyIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Property not found',
      });
    }

    // Update property
    const updatedProperty = {
      ...properties[propertyIndex],
      ...req.body,
      id, // Ensure ID doesn't change
      updatedAt: new Date().toISOString(),
    };

    // If walrusId changed, update imageUrl
    if (req.body.walrusId && isValidBlobId(req.body.walrusId)) {
      updatedProperty.walrusId = req.body.walrusId;
      updatedProperty.imageUrl = getWalrusImageUrl(req.body.walrusId);
    }

    properties[propertyIndex] = updatedProperty;

    res.json({
      success: true,
      data: updatedProperty,
      message: 'Property updated successfully',
    });
  } catch (error: any) {
    console.error('Error updating property:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update property',
      message: error.message,
    });
  }
});

/**
 * DELETE /api/properties/:id - Delete property
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const propertyIndex = properties.findIndex(p => p.id === id);

    if (propertyIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Property not found',
      });
    }

    // Remove property
    const deletedProperty = properties.splice(propertyIndex, 1)[0];

    res.json({
      success: true,
      data: deletedProperty,
      message: 'Property deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting property:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete property',
      message: error.message,
    });
  }
});



/**
 * GET /api/properties/walrus/:blobId - Get property by Walrus blob ID
 */
router.get('/walrus/:blobId', async (req: Request, res: Response) => {
  try {
    const { blobId } = req.params;
    const property = properties.find(p => p.walrusId === blobId || p.blobId === blobId);

    if (!property) {
      return res.status(404).json({
        success: false,
        error: 'Property with this Walrus blob ID not found',
      });
    }

    res.json({
      success: true,
      data: {
        ...property,
        imageUrl: getWalrusImageUrl(property.walrusId),
      },
    });
  } catch (error: any) {
    console.error('Error fetching property by blob ID:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch property',
      message: error.message,
    });
  }
});

// backend/routes/properties.js (or wherever your route is)

router.post('/api/properties/create', async (req: Request, res: Response) => {
  try {
    console.log('📥 Received property creation request:', req.body);

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
      blobIds
    } = req.body;

    // Extract the first blob ID for the main property image
    const walrusId = blobIds && blobIds.length > 0 ? blobIds[0] : null;

    // Create property document
    const property = {
      // Use houseName as title
      title: houseName,
      houseName,
      
      // Walrus image - CRITICAL for display
      walrusId,
      blobId: walrusId,
      blobIds: blobIds || [],
      
      // Location
      address,
      country,
      state,
      city,
      location: `${city}, ${state}`,
      
      // Pricing
      price: price.toString(),
      pricing: price.toString(),
      currency: '$',
      period: 'year',
      
      // Property details
      bedrooms: parseInt(bedrooms) || 0,
      bathrooms: parseInt(bathrooms) || 0,
      area,
      type: propertyType || 'Apartment',
      propertyType: propertyType || 'Apartment',
      
      // Additional info
      description,
      caretakerAddress,
      
      // Images
      images: imagesWithAmounts || [],
      imagesWithAmounts: imagesWithAmounts || [],
      
      // Metadata
      createdAt: new Date(),
      updatedAt: new Date()
    };

    console.log('💾 Saving property to database:', property);

    // Save to MongoDB
    const result = await db.collection('properties').insertOne(property);
    
    console.log('✅ Property saved successfully:', result.insertedId);

    res.json({
      success: true,
      property: {
        ...property,
        _id: result.insertedId
      },
      message: 'Property created successfully'
    });

  } catch (error) {
    console.error('❌ Error creating property:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/properties/verify-blob - Verify Walrus blob accessibility
 */
router.post('/verify-blob', async (req: Request, res: Response) => {
  try {
    const { blobId } = req.body;

    if (!blobId || !isValidBlobId(blobId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid blob ID',
      });
    }

    const url = getWalrusImageUrl(blobId);

    // Try to fetch the blob
    const response = await fetch(url, { method: 'HEAD' });

    res.json({
      success: true,
      blobId,
      url,
      accessible: response.ok,
      status: response.status,
      size: response.headers.get('content-length'),
      contentType: response.headers.get('content-type'),
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Failed to verify blob',
      message: error.message,
    });
  }
});

export default router;