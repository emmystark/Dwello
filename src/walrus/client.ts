// src/walrus/client.ts
import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';
import { WalrusClient } from '@mysten/walrus';

// Cache for blob URLs to avoid re-fetching
const blobUrlCache = new Map<string, string>();
let walrusClient: WalrusClient | null = null;

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

// Fetch blob from Walrus and convert to blob URL
export const getWalrusBlobUrl = async (blobId: string): Promise<string | null> => {
  // Return cached URL if available
  if (blobUrlCache.has(blobId)) {
    return blobUrlCache.get(blobId)!;
  }

  try {
    // Try direct HTTP fetch first (faster)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    const response = await fetch(`https://walrus.testnet.mystenlabs.com/v1/blobs/${blobId}/content`, {
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
    const blobData = await client.readBlob(blobId);
    
    if (blobData) {
      const blob = new Blob([blobData]);
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

// Export the initialized client
export const getWalrusClient = async (): Promise<WalrusClient> => {
  return initWalrusClient();
};