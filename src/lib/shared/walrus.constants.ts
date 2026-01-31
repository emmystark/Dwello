// src/lib/shared/walrus.constants.ts
// Walrus configuration - REAL WALRUS TESTNET

export const WALRUS_CONFIG = {
  // Backend handles uploads via Walrus CLI
  PUBLISHER_URL: import.meta.env.VITE_WALRUS_PUBLISHER_URL || 'http://localhost:3001/api/walrus',
  
  // Real Walrus aggregator for viewing blobs
  AGGREGATOR_URL: import.meta.env.VITE_WALRUS_AGGREGATOR_URL || 'https://aggregator.walrus-testnet.walrus.space',
};

/**
 * Get the full URL for a Walrus blob
 * This uses the REAL Walrus aggregator
 */
export function getWalrusBlobUrl(blobId: string): string {
  if (!blobId || blobId === 'null' || blobId === 'undefined') {
    return '';
  }
  
  // Real Walrus URL format
  return `${WALRUS_CONFIG.AGGREGATOR_URL}/v1/${blobId}`;
}

/**
 * Upload file to Walrus (via backend CLI)
 */
export async function uploadToWalrus(
  file: File,
  caretakerAddress: string,
  title?: string
): Promise<{ blobId: string; url: string }> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('caretakerAddress', caretakerAddress);
  if (title) {
    formData.append('title', title);
  }

  const response = await fetch(`${WALRUS_CONFIG.PUBLISHER_URL}/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Upload failed');
  }

  const data = await response.json();
  
  if (!data.success) {
    throw new Error(data.error || 'Upload failed');
  }

  return {
    blobId: data.blobId,
    url: data.url,
  };
}

/**
 * Get blob metadata from backend
 */
export async function getWalrusBlobMetadata(blobId: string): Promise<any> {
  const response = await fetch(`${WALRUS_CONFIG.PUBLISHER_URL.replace('/upload', '')}/blob/${blobId}`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch blob metadata: ${response.status}`);
  }
  
  const data = await response.json();
  return data.blob;
}

export default {
  WALRUS_CONFIG,
  getWalrusBlobUrl,
  uploadToWalrus,
  getWalrusBlobMetadata,
};