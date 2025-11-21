// Walrus storage client utilities

const WALRUS_AGGREGATOR_URL = 'https://aggregator.walrus-testnet.walrus.space';
const WALRUS_PUBLISHER_URL = 'https://publisher.walrus-testnet.walrus.space';

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