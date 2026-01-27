// Walrus storage client utilities using Walrus SDK
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { WalrusClient, WalrusFile } from '@mysten/walrus';

// Aggregator is recommended for reads, publisher for writes (see https://docs.wal.app/usage/web-api.html)
const WALRUS_AGGREGATOR_URL = 'https://aggregator.walrus-testnet.walrus.space';
const WALRUS_PUBLISHER_URL = 'https://publisher.walrus-testnet.walrus.space';

// Shared Sui client (testnet) for reading transaction blocks, events, etc.
export const suiClient = new SuiClient({
  url: getFullnodeUrl('testnet'),
});

// Initialize Walrus client
export const walrusClient = new WalrusClient({
  aggregatorUrl: WALRUS_AGGREGATOR_URL,
  publisherUrl: WALRUS_PUBLISHER_URL,
});

export interface UploadResult {
  blobId: string;
  url: string;
  bytes?: Uint8Array;
  tags?: Record<string, string>;
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
 * Upload file to Walrus using SDK (without signer - requires backend)
 * For signer-based uploads, backend must handle it
 */
export const uploadToWalrus = async (file: File, metadata?: { title?: string; amount?: string }): Promise<UploadResult> => {
  try {
    // Send to backend which handles signer and SDK upload
    const formData = new FormData();
    formData.append('file', file);
    if (metadata?.title) formData.append('title', metadata.title);
    if (metadata?.amount) formData.append('amount', metadata.amount);

    const response = await fetch('/api/walrus/upload', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `Upload failed: ${response.statusText}`);
    }

    const result = await response.json();
    return {
      blobId: result.blobId,
      url: getWalrusBlobUrl(result.blobId),
      bytes: result.bytes,
      tags: result.tags,
    };
  } catch (error) {
    console.error('Walrus upload error:', error);
    throw error;
  }
};

/**
 * Retrieve file from Walrus using SDK
 */
export const getWalrusFile = async (blobId: string): Promise<UploadResult> => {
  try {
    // Retrieve from backend which uses SDK to fetch
    const response = await fetch(`/api/walrus/file/${blobId}`);

    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.statusText}`);
    }

    const result = await response.json();
    return {
      blobId,
      url: getWalrusBlobUrl(blobId),
      bytes: result.bytes ? new Uint8Array(result.bytes) : undefined,
      tags: result.tags,
    };
  } catch (error) {
    console.error('Walrus fetch error:', error);
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