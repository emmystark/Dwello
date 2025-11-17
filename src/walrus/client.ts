import { SuiJsonRpcClient } from '@mysten/sui/jsonRpc';
import { getFullnodeUrl } from '@mysten/sui/client';
import { walrus } from '@mysten/walrus';
const client = new SuiJsonRpcClient({
	url: getFullnodeUrl('testnet'),
	// Setting network on your client is required for walrus to work correctly
	network: 'testnet',
}).$extend(
	walrus({
		storageNodeClientOptions: {
			fetch: (url, options) => {
				console.log('fetching', url);
				return fetch(url, options);
			},
			timeout: 60_000,
		},
	}),
);

// 1. Fetch the file from Walrus by blob ID
const blobId = 'yourBlobIdHere'; // Replace with your actual blob ID

async function displayWalrusImage(blobId: string): Promise<String> {
const blobData = await client.walrus.readBlob({ blobId });
// Create a Blob object with the correct MIME type
const safeArray = new Uint8Array(blobData); // This ensures the buffer is ArrayBuffer
const imageBlob = new Blob([safeArray.buffer], { type: 'image/jpg' });

// Create a URL for the Blob
const imageUrl = URL.createObjectURL(imageBlob);
return imageUrl;

}

