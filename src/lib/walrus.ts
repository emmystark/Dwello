// src/lib/walrus.ts
import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';
import { WalrusClient } from '@mysten/walrus';

// Cache for blob URLs to avoid re-fetching
const blobUrlCache = new Map<string, string>();
let walrusClient: WalrusClient | null = null;

const WALRUS_AGGREGATOR_URL = 'https://aggregator.walrus-testnet.walrus.space';
const WALRUS_PUBLISHER_URL = 'https://publisher.walrus-testnet.walrus.space';

export interface UploadResult {
  blobId: string;
  url: string;
}

// Initialize Walrus client
const initWalrusClient = async (): Promise<WalrusClient> => {
  if (walrusClient) return walrusClient;

  const suiClient = new SuiClient({
    url: getFullnodeUrl('testnet'),
  });

  walrusClient = new WalrusClient({
    network: 'testnet',
    suiClient,
  });

  return walrusClient;
};

/**
 * Get Walrus blob URL from blob ID (direct URL for faster access)
 */
export const getWalrusBlobUrl = (blobId: string): string => {
  if (!blobId) {
    throw new Error('Blob ID is required');
  }
  return `${WALRUS_AGGREGATOR_URL}/v1/blobs/${blobId}`;
};

/**
 * Fetch blob from Walrus and convert to blob URL with caching
 */
export const getWalrusBlobObjectUrl = async (blobId: string): Promise<string | null> => {
  // Return cached URL if available
  if (blobUrlCache.has(blobId)) {
    return blobUrlCache.get(blobId)!;
  }

  try {
    // Try direct HTTP fetch first (faster)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    const response = await fetch(getWalrusBlobUrl(blobId), {
      method: 'GET',
      headers: {
        'Accept': '*/*',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      
      // Cache the blob URL
      blobUrlCache.set(blobId, blobUrl);
      
      return blobUrl;
    }
  } catch (error) {
    console.warn(`Direct fetch failed for blob ${blobId}, trying WalrusClient...`, error);
  }

  // Fallback to WalrusClient if direct fetch fails
  try {
    const client = await initWalrusClient();
    const blobData = await client.readBlob({ blobId });

    if (blobData) {
      const blob = new Blob([blobData as any]);
      const blobUrl = URL.createObjectURL(blob);
      
      // Cache the blob URL
      blobUrlCache.set(blobId, blobUrl);
      
      return blobUrl;
    }
  } catch (error) {
    console.warn(`Warning: Could not fetch Walrus blob ${blobId}. Using placeholder instead.`, error);
  }

  // Return null to use placeholder
  return null;
};

/**
 * Upload file to Walrus storage
 */
export const uploadToWalrus = async (file: File): Promise<UploadResult> => {
  try {
    // Create form data
    const formData = new FormData();
    formData.append('file', file);

    // Upload to Walrus
    const response = await fetch(`${WALRUS_PUBLISHER_URL}/v1/store`, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': file.type || 'application/octet-stream',
      },
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    const result = await response.json();
    
    // Extract blob ID from response
    const blobId = result.newlyCreated?.blobObject?.blobId || 
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
      throw error; // Re-throw to handle in calling component
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

/**
 * Clean up blob URLs from cache (call this when components unmount)
 */
export const cleanupBlobUrls = (blobIds?: string[]): void => {
  if (blobIds) {
    blobIds.forEach(blobId => {
      const url = blobUrlCache.get(blobId);
      if (url) {
        URL.revokeObjectURL(url);
        blobUrlCache.delete(blobId);
      }
    });
  } else {
    // Clean up all cached URLs
    blobUrlCache.forEach(url => URL.revokeObjectURL(url));
    blobUrlCache.clear();
  }
};

// Export the initialized client
export const getWalrusClient = async (): Promise<WalrusClient> => {
  return initWalrusClient();
};

// Default export with all utilities
export default {
  getWalrusBlobUrl,
  getWalrusBlobObjectUrl,
  uploadToWalrus,
  uploadMultipleToWalrus,
  checkBlobExists,
  getBlobMetadata,
  cleanupBlobUrls,
  getWalrusClient,
};