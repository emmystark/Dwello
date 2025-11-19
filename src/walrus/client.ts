// src/walrus/client.ts
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { walrus } from '@mysten/walrus';

const WALRUS_AGGREGATOR = 'https://walrus.my-gateway.io'; // fastest public aggregator Nov 2025
const WALRUS_UPLOAD_RELAY = 'https://upload-relay.walrus.space';

export const client = new SuiClient({
  url: getFullnodeUrl('mainnet'),
}).$extend(
  walrus({
    aggregatorUrl: WALRUS_AGGREGATOR,
    uploadRelay: {
      host: WALRUS_UPLOAD_RELAY,
      // Optional small tip for faster relay inclusion
      sendTip: { max: 10_000_000n }, // 0.01 SUI max
    },
  })
);

// Helper: download and display an image from Walrus by blobId
export async function loadImageUrlFromBlobId(blobId: string): Promise<string> {
  try {
    // NEW API: readBlob now requires an object with blobId
    const blobData = await client.readBlob({ blobId });

    // blobData is now correctly typed as Uint8Array
    const blob = new Blob([blobData], { type: 'application/octet-stream' });

    // For images we can let the browser detect the type, or guess from magic bytes
    // But simplest & works 99% of the time:
    const url = URL.createObjectURL(blob);
    return url;
  } catch (err) {
    console.error('Failed to read blob from Walrus', blobId, err);
    throw err;
  }
}

// Optional: direct public URL (no download only, not revocable object URL)
export const getDirectWalrusUrl = (blobId: string) =>
  `${WALRUS_AGGREGATOR}/v1/${blobId}`;