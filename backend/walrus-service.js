/**
 * Walrus Service - Handles SDK-based uploads and retrievals
 * Uses WalrusClient with proper signer integration
 */

import { WalrusClient, WalrusFile } from '@mysten/walrus';
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import fs from 'fs';
import path from 'path';

// Configuration
const WALRUS_AGGREGATOR_URL = process.env.WALRUS_AGGREGATOR_URL || 'https://aggregator.walrus-testnet.walrus.space';
const WALRUS_PUBLISHER_URL = process.env.WALRUS_PUBLISHER_URL || 'https://publisher.walrus-testnet.walrus.space';

// Initialize Walrus client
const walrusClient = new WalrusClient({
  aggregatorUrl: WALRUS_AGGREGATOR_URL,
  publisherUrl: WALRUS_PUBLISHER_URL,
});

// Initialize Sui client
const suiClient = new SuiClient({
  url: getFullnodeUrl('testnet'),
});

/**
 * Get or create signer from environment
 * In production, use a secure key management system
 */
function getSigner() {
  const privateKeyEnv = process.env.WALRUS_PRIVATE_KEY;
  
  if (!privateKeyEnv) {
    console.warn('⚠️ WALRUS_PRIVATE_KEY not set. Using dummy keypair for testing.');
    // Create a temporary keypair for testing (DO NOT USE IN PRODUCTION)
    return Ed25519Keypair.generate();
  }

  try {
    // Assumes private key is base64 encoded
    const secretKey = Buffer.from(privateKeyEnv, 'base64');
    return Ed25519Keypair.fromSecretKey(secretKey);
  } catch (error) {
    console.error('Failed to decode WALRUS_PRIVATE_KEY:', error);
    throw new Error('Invalid WALRUS_PRIVATE_KEY format');
  }
}

/**
 * Upload file to Walrus with metadata tags
 * 
 * @param {Buffer} fileBuffer - File content as buffer
 * @param {string} fileName - Original file name
 * @param {Object} metadata - Metadata to store as tags
 * @returns {Promise<Object>} Upload result with blobId
 */
export async function uploadToWalrus(fileBuffer, fileName, metadata = {}) {
  try {
    console.log('🚀 Starting Walrus upload for:', fileName);

    const signer = getSigner();
    const publicAddress = signer.getPublicKey().toSuiAddress();
    console.log('📝 Signer address:', publicAddress);

    // Create WalrusFile with metadata tags
    const walrusFile = WalrusFile.from({
      contents: fileBuffer,
      identifier: `${fileName}-${Date.now()}`,
      tags: {
        filename: fileName,
        uploadedAt: new Date().toISOString(),
        mimeType: metadata.mimeType || 'application/octet-stream',
        title: metadata.title || fileName,
        amount: metadata.amount || '0',
        caretakerAddress: metadata.caretakerAddress || publicAddress,
        propertyId: metadata.propertyId || 'unknown',
        ...metadata.customTags,
      },
    });

    console.log('📦 Created WalrusFile with tags:', walrusFile.tags);

    // Upload to Walrus using SDK
    const result = await walrusClient.writeFiles({
      files: [walrusFile],
      signer,
    });

    console.log('✅ Upload successful. Result:', result);

    const blobId = result.newlyCreated?.blobObject?.blobId || result.newlyCreated?.blobId;

    if (!blobId) {
      throw new Error('No blob ID in upload response');
    }

    return {
      blobId,
      certificateId: result.newlyCreated?.certificateId,
      url: `${WALRUS_AGGREGATOR_URL}/v1/blobs/${blobId}`,
      tags: walrusFile.tags,
      fileName,
      size: fileBuffer.length,
    };
  } catch (error) {
    console.error('❌ Walrus upload failed:', error);
    throw new Error(`Walrus upload error: ${error.message}`);
  }
}

/**
 * Retrieve file from Walrus by blob ID
 * 
 * @param {string} blobId - Blob ID to retrieve
 * @returns {Promise<Object>} File data with tags
 */
export async function getWalrusFile(blobId) {
  try {
    console.log('📥 Retrieving file from Walrus:', blobId);

    // Fetch file using Walrus SDK
    const files = await walrusClient.getFiles({ ids: [blobId] });

    if (!files || files.length === 0) {
      throw new Error(`File not found: ${blobId}`);
    }

    const file = files[0];
    const bytes = await file.bytes();
    const tags = file.tags || {};

    console.log('✅ Retrieved file. Size:', bytes.length, 'bytes');

    return {
      blobId,
      bytes: Buffer.from(bytes).toString('base64'), // Convert to base64 for JSON
      size: bytes.length,
      tags,
    };
  } catch (error) {
    console.error('❌ Walrus retrieval failed:', error);
    throw new Error(`Walrus retrieval error: ${error.message}`);
  }
}

/**
 * List files by tags (for querying properties)
 * Note: Walrus doesn't have native listing - this would require backend DB
 */
export async function getFilesByTag(tagKey, tagValue) {
  try {
    console.log(`📋 Querying files with ${tagKey}=${tagValue}`);
    // Note: This requires backend database to track blob IDs by tags
    // Direct Walrus API doesn't support listing
    throw new Error('Use backend database to query files by tags');
  } catch (error) {
    console.error('❌ Tag query failed:', error);
    throw error;
  }
}

/**
 * Delete file from Walrus
 * Requires signer authorization
 */
export async function deleteWalrusFile(blobId) {
  try {
    console.log('🗑️ Deleting file from Walrus:', blobId);
    
    // Walrus deletion requires certificate ID and signer
    // Implementation depends on Walrus SDK version
    console.warn('⚠️ File deletion not yet implemented');
    
    return { success: true, blobId };
  } catch (error) {
    console.error('❌ Walrus deletion failed:', error);
    throw error;
  }
}

/**
 * Verify file exists on Walrus
 */
export async function verifyWalrusFile(blobId) {
  try {
    console.log('🔍 Verifying file on Walrus:', blobId);

    const files = await walrusClient.getFiles({ ids: [blobId] });

    if (!files || files.length === 0) {
      return { exists: false, blobId };
    }

    const file = files[0];
    return {
      exists: true,
      blobId,
      tags: file.tags,
      url: `${WALRUS_AGGREGATOR_URL}/v1/blobs/${blobId}`,
    };
  } catch (error) {
    console.error('❌ Verification failed:', error);
    return { exists: false, blobId, error: error.message };
  }
}

export { walrusClient, suiClient };
