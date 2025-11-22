// Walrus storage client utilities
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';

// Aggregator is recommended for reads, publisher for writes (see https://docs.wal.app/usage/web-api.html)
const WALRUS_AGGREGATOR_URL = 'https://aggregator.walrus-testnet.walrus.space';
const WALRUS_PUBLISHER_URL = 'https://publisher.walrus-testnet.walrus.space';

// Shared Sui client (testnet) for reading transaction blocks, events, etc.
export const suiClient = new SuiClient({
  url: getFullnodeUrl('testnet'),
});

export interface UploadResult {
  blobId: string;
  url: string;
}

/**
 * Get Walrus blob URL from blob ID (synchronous)
 */
export const getWalrusBlobUrl = (blobId: string): string => {
  if (!blobId) {
    throw new Error('Blob ID is required');
  }
  return `${WALRUS_AGGREGATOR_URL}/v1/blobs/${blobId}`;
};

/**
 * Upload file to Walrus storage
 */
export const uploadToWalrus = async (file: File): Promise<UploadResult> => {
  try {
    // Upload to Walrus HTTP API on the publisher. See https://docs.wal.app/usage/web-api.html
    const url = `${WALRUS_PUBLISHER_URL}/v1/blobs?epochs=3&deletable=true`;
    const response = await fetch(url, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': file.type || 'application/octet-stream',
      },
    });

    if (!response.ok) {
      let extra = '';
      try {
        const text = await response.text();
        extra = text ? ` Body: ${text}` : '';
      } catch {
        // ignore
      }
      throw new Error(`Upload failed: HTTP ${response.status} ${response.statusText}.${extra}`);
    }

    const result = await response.json();

    // Extract blob ID from response (HTTP API typically returns blob_id)
    const blobId =
      result.blob_id ??
      result.blobId ??
      result.id ??
      result.cid ??
      result.hash ??
      result.newlyCreated?.blobObject?.blobId ??
      result.alreadyCertified?.blobId;

    if (!blobId) {
      throw new Error('No blob ID returned from Walrus');
    }

    return {
      blobId,
      url: getWalrusBlobUrl(blobId),
    };
  } catch (error) {
    console.error('Walrus upload error:', error);
    throw error;
  }
};

/**
 * Upload multiple files to Walrus
 */
export const uploadMultipleToWalrus = async (
  files: File[],
  onProgress?: (progress: number) => void
): Promise<UploadResult[]> => {
  const results: UploadResult[] = [];
  
  for (let i = 0; i < files.length; i++) {
    try {
      const result = await uploadToWalrus(files[i]);
      results.push(result);
      
      if (onProgress) {
        onProgress(Math.round(((i + 1) / files.length) * 100));
      }
    } catch (error) {
      console.error(`Failed to upload file ${files[i].name}:`, error);
      // Propagate the error so callers can show a proper failure message
      throw error;
    }
  }
  
  return results;
};

/**
 * Check if blob exists on Walrus
 */
export const checkBlobExists = async (blobId: string): Promise<boolean> => {
  try {
    const response = await fetch(getWalrusBlobUrl(blobId), {
      method: 'HEAD',
    });
    return response.ok;
  } catch {
    return false;
  }
};

/**
 * Get blob metadata
 */
export const getBlobMetadata = async (blobId: string) => {
  try {
    const response = await fetch(getWalrusBlobUrl(blobId), {
      method: 'HEAD',
    });
    
    if (!response.ok) {
      throw new Error('Blob not found');
    }

    return {
      size: response.headers.get('Content-Length'),
      type: response.headers.get('Content-Type'),
      lastModified: response.headers.get('Last-Modified'),
    };
  } catch (error) {
    console.error('Failed to get blob metadata:', error);
    return null;
  }
};

export default {
  getWalrusBlobUrl,
  uploadToWalrus,
  uploadMultipleToWalrus,
  checkBlobExists,
  getBlobMetadata,
};