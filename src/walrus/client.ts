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

async function displayWalrusImage() {
    // getFiles returns an array of WalrusFile objects
    const [file] = await client.walrus.getFiles({ ids: [blobId] });

    // 2. Get the contents as a Uint8Array
    const bytes = await file.bytes();

    // 3. Convert to Blob and create an object URL
    const blob = new Blob([bytes], { type: 'image/png' }); // or 'image/jpeg' if that's your format
    let url = URL.createObjectURL(blob);

    // 4. Set the image src
    document.getElementById('myImage').src = url;
}

// Call the function (e.g., after DOM is loaded)
displayWalrusImage();
