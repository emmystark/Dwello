/**
 * Walrus Utilities
 * Helper functions for working with Walrus blob storage
 */

export const AGGREGATOR_URL = 'https://aggregator.walrus-testnet.walrus.space';
export const PUBLISHER_URL = 'https://publisher.walrus-testnet.walrus.space';

/**
 * Check if a blob ID is valid
 */
export function isValidBlobId(blobId: string | undefined | null): boolean {
  if (!blobId) return false;
  if (typeof blobId !== 'string') return false;
  if (blobId === 'null') return false;
  if (blobId === 'undefined') return false;
  if (blobId === 'placeholder blob id') return false;
  if (blobId.length < 10) return false;
  return true;
}

/**
 * Get Walrus image URL from blob ID
 */
export function getWalrusImageUrl(blobId: string | undefined | null): string | null {
  if (!isValidBlobId(blobId)) {
    return null;
  }
  return `${AGGREGATOR_URL}/v1/blobs/${blobId}`;
}

/**
 * Extract blob ID from property object
 * Checks multiple possible field names
 */
export function extractBlobId(property: any): string | null {
  const possibleFields = [
    'walrusId',
    'blobId',
    'imageBlobId',
    'imageId',
    'image',
    'imageUrl'
  ];
  
  for (const field of possibleFields) {
    const value = property[field];
    if (isValidBlobId(value)) {
      return value;
    }
  }
  
  return null;
}

/**
 * Upload file to Walrus
 */
export async function uploadToWalrus(
  file: File,
  epochs: number = 100
): Promise<{ blobId: string; url: string } | null> {
  try {
    const response = await fetch(`${PUBLISHER_URL}/v1/blobs?epochs=${epochs}`, {
      method: 'PUT',
      body: file,
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    const data = await response.json();
    const blobId = data?.newlyCreated?.blobObject?.blobId || data?.alreadyCertified?.blobId;

    if (!blobId) {
      throw new Error('No blob ID returned from Walrus');
    }

    return {
      blobId,
      url: getWalrusImageUrl(blobId)!,
    };
  } catch (error) {
    console.error('Error uploading to Walrus:', error);
    return null;
  }
}

/**
 * Check if Walrus blob exists
 */
export async function checkBlobExists(blobId: string): Promise<boolean> {
  if (!isValidBlobId(blobId)) {
    return false;
  }

  try {
    const url = getWalrusImageUrl(blobId);
    if (!url) return false;

    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
}