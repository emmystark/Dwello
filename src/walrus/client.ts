// Walrus storage client utilities
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';

// Aggregator is recommended for reads, publisher for writes (see https://docs.wal.app/usage/web-api.html)
const WALRUS_AGGREGATOR_URL =  'https://aggregator.walrus-testnet.walrus.space';
const WALRUS_PUBLISHER_URL = 'https://publisher.walrus-testnet.walrus.space';

// Shared Sui client (testnet) for reading transaction blocks, events, etc.
export const suiClient = new SuiClient({
  url: getFullnodeUrl('testnet'),
});

export interface UploadResult {
  blobId: string;
  url: string;
}

export interface PaymentStatus {
  hasPaid: boolean;
  accessPass?: string;
  amount?: string;
}

export interface PaymentVerification {
  paymentVerified: boolean;
  blobValid: boolean;
  accessGranted: boolean;
  details?: {
    payment: PaymentStatus;
    blob: {
      valid: boolean;
      blobId: string;
      status?: number;
      url?: string;
      error?: string;
    };
  };
  error?: string;
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
 * Check if user has paid for property access
 * Makes request to backend API which verifies on-chain
 */
export const checkPaymentStatus = async (
  userAddress: string,
  propertyId: string
): Promise<PaymentStatus> => {
  try {
    if (!userAddress || !propertyId) {
      return { hasPaid: false };
    }

    const response = await fetch(
      `/api/payment-status?userAddress=${userAddress}&propertyId=${propertyId}`
    );

    if (!response.ok) {
      console.warn(`Payment status check failed: ${response.statusText}`);
      return { hasPaid: false };
    }

    return await response.json();
  } catch (error) {
    console.error('Payment status check failed:', error);
    return { hasPaid: false };
  }
};

/**
 * Verify both payment and blob validity
 */
export const verifyPaymentAndBlob = async (
  userAddress: string,
  propertyId: string,
  blobId: string
): Promise<PaymentVerification> => {
  try {
    const response = await fetch(
      `/api/verify-access?userAddress=${userAddress}&propertyId=${propertyId}&blobId=${blobId}`
    );

    if (!response.ok) {
      return {
        paymentVerified: false,
        blobValid: false,
        accessGranted: false,
        error: `Verification failed: ${response.statusText}`,
      };
    }

    return await response.json();
  } catch (error) {
    console.error('Access verification failed:', error);
    return {
      paymentVerified: false,
      blobValid: false,
      accessGranted: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
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
 * Upload file to Walrus with metadata tracking
 */
export const uploadToWalrusWithMetadata = async (
  file: File,
  metadata?: { fileName?: string; mimeType?: string }
): Promise<UploadResult & { metadata: Record<string, string> }> => {
  const result = await uploadToWalrus(file);

  return {
    ...result,
    metadata: {
      fileName: metadata?.fileName || file.name,
      mimeType: metadata?.mimeType || file.type,
      size: file.size.toString(),
      uploadedAt: new Date().toISOString(),
    },
  };
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
 * Upload multiple files with payment verification
 * Only uploads if user has already paid (optional check)
 */
export const uploadMultipleToWalrusGated = async (
  files: File[],
  userAddress?: string,
  propertyId?: string,
  onProgress?: (progress: number) => void
): Promise<UploadResult[]> => {
  // Optional: Verify payment before upload
  if (userAddress && propertyId) {
    const paymentStatus = await checkPaymentStatus(userAddress, propertyId);
    if (!paymentStatus.hasPaid) {
      console.warn('User has not paid for this property');
      // Still allow upload for caretaker, fail gracefully for others
    }
  }

  return uploadMultipleToWalrus(files, onProgress);
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
 * Get Walrus blob with payment verification
 * Returns blob URL only if user has paid
 */
export const getGatedBlobUrl = async (
  blobId: string,
  userAddress?: string,
  propertyId?: string
): Promise<string | null> => {
  if (!blobId) {
    throw new Error('Blob ID is required');
  }

  // If payment info provided, verify access
  if (userAddress && propertyId) {
    const paymentStatus = await checkPaymentStatus(userAddress, propertyId);
    if (!paymentStatus.hasPaid) {
      console.warn('Access denied: Payment required');
      return null;
    }
  }

  return getWalrusBlobUrl(blobId);
};

/**
 * Batch get Walrus blobs with payment verification
 */
export const getGatedBlobUrls = async (
  blobIds: string[],
  userAddress?: string,
  propertyId?: string
): Promise<(string | null)[]> => {
  const urls: (string | null)[] = [];

  for (const blobId of blobIds) {
    try {
      const url = await getGatedBlobUrl(blobId, userAddress, propertyId);
      urls.push(url);
    } catch (error) {
      console.error(`Failed to get blob ${blobId}:`, error);
      urls.push(null);
    }
  }

  return urls;
};

export default {
  getWalrusBlobUrl,
  getGatedBlobUrl,
  uploadToWalrus,
  uploadToWalrusWithMetadata,
  uploadMultipleToWalrus,
  uploadMultipleToWalrusGated,
  checkBlobExists,
  getBlobMetadata,
  checkPaymentStatus,
  verifyPaymentAndBlob,
  getGatedBlobUrls,
};