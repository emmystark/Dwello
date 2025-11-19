// src/lib/walrus.ts
import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';
import { walrus } from '@mysten/walrus';

export const WALRUS_AGGREGATOR = 'https://walrus.my-gateway.io'; // fastest Nov 2025

const client = new SuiClient({
  url: getFullnodeUrl('mainnet'),
}).$extend(
  walrus({
    aggregatorUrl: WALRUS_AGGREGATOR,
    uploadRelay: {
      host: 'https://upload-relay.walrus.space',
      sendTip: { max: 10_000_000n }, // ~0.01 SUI max tip
    },
  })
);

export { client as walrusClient };

// Direct permanent URL — this is all you need for <img>
export const getWalrusUrl = (blobId: string) =>
  `${WALRUS_AGGREGATOR}/v1/${blobId}`;