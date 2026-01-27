// lib/walrusUpload.js
// Frontend utility for uploading images to Walrus decentralized storage

const WALRUS_PUBLISHER = process.env.NEXT_PUBLIC_WALRUS_PUBLISHER || 
  'https://publisher.walrus-testnet.walrus.space';
const WALRUS_AGGREGATOR = process.env.NEXT_PUBLIC_WALRUS_AGGREGATOR || 
  'https://aggregator.walrus-testnet.walrus.space';

/**
 * Compress image before upload to reduce size
 */
async function compressImage(file, maxWidth = 1200, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(new File([blob], file.name, { type: 'image/jpeg' }));
            } else {
              reject(new Error('Failed to compress image'));
            }
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Upload image to Walrus storage
 * @param {File} file - Image file to upload
 * @param {boolean} compress - Whether to compress before upload
 * @returns {Promise<{blobId: string, url: string, size: number}>}
 */
export async function uploadToWalrus(file, compress = true) {
  try {
    // Compress image if needed
    let uploadFile = file;
    if (compress && file.type.startsWith('image/')) {
      console.log('Compressing image...');
      uploadFile = await compressImage(file);
      console.log(`Compressed: ${file.size} → ${uploadFile.size} bytes`);
    }

    // Create FormData
    const formData = new FormData();
    formData.append('file', uploadFile);

    // Upload to Walrus
    console.log('Uploading to Walrus...');
    const uploadUrl = `${WALRUS_PUBLISHER}/v1/store`;
    
    const response = await fetch(uploadUrl, {
      method: 'PUT',
      body: uploadFile, // Send file directly for PUT request
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Upload failed: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log('Walrus upload response:', result);

    // Extract blob ID from response
    const blobId = result.newlyCreated?.blobObject?.blobId || 
                   result.alreadyCertified?.blobId ||
                   result.blobId ||
                   result.id;

    if (!blobId) {
      throw new Error('No blob ID in response: ' + JSON.stringify(result));
    }

    // Construct public URL
    const publicUrl = `${WALRUS_AGGREGATOR}/v1/${blobId}`;

    return {
      blobId,
      url: publicUrl,
      size: uploadFile.size,
      originalSize: file.size,
      uploadResponse: result,
    };
  } catch (error) {
    console.error('Walrus upload error:', error);
    throw new Error(`Failed to upload to Walrus: ${error.message}`);
  }
}

/**
 * Upload multiple images to Walrus
 */
export async function uploadMultipleToWalrus(files, compress = true) {
  const results = [];
  
  for (let i = 0; i < files.length; i++) {
    try {
      console.log(`Uploading ${i + 1}/${files.length}...`);
      const result = await uploadToWalrus(files[i], compress);
      results.push({ success: true, ...result });
    } catch (error) {
      console.error(`Failed to upload file ${i + 1}:`, error);
      results.push({ 
        success: false, 
        error: error.message,
        fileName: files[i].name 
      });
    }
  }

  return results;
}

/**
 * Verify blob exists in Walrus storage
 */
export async function verifyWalrusBlob(blobId) {
  try {
    const url = `${WALRUS_AGGREGATOR}/v1/${blobId}`;
    const response = await fetch(url, { method: 'HEAD' });
    
    return {
      exists: response.ok,
      blobId,
      url: response.ok ? url : null,
      status: response.status,
    };
  } catch (error) {
    console.error('Blob verification error:', error);
    return {
      exists: false,
      blobId,
      error: error.message,
    };
  }
}

/**
 * Get Walrus blob URL from blob ID
 */
export function getWalrusUrl(blobId) {
  if (!blobId) return null;
  return `${WALRUS_AGGREGATOR}/v1/${blobId}`;
}

/**
 * Delete blob from Walrus (if supported)
 */
export async function deleteFromWalrus(blobId) {
  try {
    const url = `${WALRUS_PUBLISHER}/v1/delete/${blobId}`;
    const response = await fetch(url, { method: 'DELETE' });
    
    return {
      success: response.ok,
      blobId,
      status: response.status,
    };
  } catch (error) {
    console.error('Delete error:', error);
    return {
      success: false,
      blobId,
      error: error.message,
    };
  }
}