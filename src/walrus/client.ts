import { SuiJsonRpcClient } from '@mysten/sui/jsonRpc';
import { getFullnodeUrl } from '@mysten/sui/client';
import { walrus } from '@mysten/walrus';
import bedroomBlobIds from './bloblds';

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

export async function displayWalrusImage(blobId: string): Promise<String> {
const blobData = await client.walrus.readBlob({ blobId });
// Create a Blob object with the correct MIME type
const safeArray = new Uint8Array(blobData); // This ensures the buffer is ArrayBuffer
const imageBlob = new Blob([safeArray.buffer], { type: 'image/jpg' });

// Create a URL for the Blob
const imageUrl = URL.createObjectURL(imageBlob);
return imageUrl;

}

async function test() {
	try {
		// Get the first blob ID from 1-bedroom
		const blobId = bedroomBlobIds[1][0];
		console.log('Testing with blob ID:', blobId);
		
		const result = await displayWalrusImage(blobId);
		console.log('Result:', result);
	} catch (err) {
		console.error('Error:', err);
	}
}

test();
