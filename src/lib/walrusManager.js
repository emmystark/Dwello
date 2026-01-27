// lib/walrusManager.js
// Tools to list, download, and manage Walrus-stored items

const WALRUS_AGGREGATOR = process.env.NEXT_PUBLIC_WALRUS_AGGREGATOR || 
  'https://aggregator.walrus-testnet.walrus.space';

/**
 * Download a single blob from Walrus
 * @param {string} blobId - Walrus blob ID
 * @param {string} filename - Optional filename for download
 */
export async function downloadBlobFromWalrus(blobId, filename = null) {
  try {
    const url = `${WALRUS_AGGREGATOR}/v1/${blobId}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download: ${response.statusText}`);
    }

    const blob = await response.blob();
    
    // Detect file type from content-type
    const contentType = response.headers.get('content-type');
    const extension = getExtensionFromContentType(contentType);
    
    // Create download filename
    const downloadFilename = filename || `walrus-${blobId.slice(0, 8)}.${extension}`;
    
    // Trigger browser download
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = downloadFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(downloadUrl);

    return {
      success: true,
      blobId,
      filename: downloadFilename,
      size: blob.size,
      contentType
    };
  } catch (error) {
    console.error('Download error:', error);
    return {
      success: false,
      blobId,
      error: error.message
    };
  }
}

/**
 * Download multiple blobs as a ZIP file
 * @param {Array} blobIds - Array of blob IDs to download
 * @param {string} zipName - Name for the ZIP file
 */
export async function downloadMultipleBlobsAsZip(blobIds, zipName = 'walrus-files.zip') {
  try {
    // Import JSZip dynamically (you'll need to install it: npm install jszip)
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();

    console.log(`Downloading ${blobIds.length} files...`);

    // Download all blobs
    for (let i = 0; i < blobIds.length; i++) {
      const blobId = blobIds[i];
      try {
        const url = `${WALRUS_AGGREGATOR}/v1/${blobId}`;
        const response = await fetch(url);
        
        if (!response.ok) {
          console.warn(`Failed to download ${blobId}`);
          continue;
        }

        const blob = await response.blob();
        const contentType = response.headers.get('content-type');
        const extension = getExtensionFromContentType(contentType);
        
        // Add to zip with unique filename
        zip.file(`file-${i + 1}-${blobId.slice(0, 8)}.${extension}`, blob);
        
        console.log(`Downloaded ${i + 1}/${blobIds.length}`);
      } catch (err) {
        console.error(`Error downloading ${blobId}:`, err);
      }
    }

    // Generate ZIP file
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    
    // Trigger download
    const downloadUrl = window.URL.createObjectURL(zipBlob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = zipName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(downloadUrl);

    return {
      success: true,
      totalFiles: blobIds.length,
      zipName
    };
  } catch (error) {
    console.error('ZIP download error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get all blob IDs from your database/backend
 * This fetches blob IDs from your stored properties
 */
export async function getAllBlobIdsFromDatabase() {
  try {
    const response = await fetch('/api/properties/list');
    if (!response.ok) {
      throw new Error('Failed to fetch properties');
    }

    const properties = await response.json();
    
    // Extract all blob IDs from all properties
    const allBlobIds = [];
    properties.forEach(property => {
      if (property.walrusBlobIds && Array.isArray(property.walrusBlobIds)) {
        allBlobIds.push(...property.walrusBlobIds);
      }
    });

    return {
      success: true,
      blobIds: allBlobIds,
      totalProperties: properties.length,
      totalBlobs: allBlobIds.length
    };
  } catch (error) {
    console.error('Error fetching blob IDs:', error);
    return {
      success: false,
      error: error.message,
      blobIds: []
    };
  }
}

/**
 * Get blob metadata (size, content-type, etc.)
 */
export async function getBlobMetadata(blobId) {
  try {
    const url = `${WALRUS_AGGREGATOR}/v1/${blobId}`;
    const response = await fetch(url, { method: 'HEAD' });

    if (!response.ok) {
      throw new Error(`Blob not found: ${response.statusText}`);
    }

    return {
      blobId,
      exists: true,
      contentType: response.headers.get('content-type'),
      contentLength: response.headers.get('content-length'),
      lastModified: response.headers.get('last-modified'),
      url
    };
  } catch (error) {
    return {
      blobId,
      exists: false,
      error: error.message
    };
  }
}

/**
 * Get metadata for multiple blobs
 */
export async function getMultipleBlobsMetadata(blobIds) {
  const results = [];
  
  for (const blobId of blobIds) {
    const metadata = await getBlobMetadata(blobId);
    results.push(metadata);
  }

  return results;
}

/**
 * Helper: Get file extension from content-type
 */
function getExtensionFromContentType(contentType) {
  const mimeToExt = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'image/svg+xml': 'svg',
    'application/pdf': 'pdf',
    'text/plain': 'txt',
    'application/json': 'json',
    'video/mp4': 'mp4',
    'video/webm': 'webm'
  };

  return mimeToExt[contentType] || 'bin';
}

/**
 * Export all property data with blob metadata to JSON
 */
export async function exportPropertiesWithBlobs() {
  try {
    const response = await fetch('/api/properties/list');
    if (!response.ok) {
      throw new Error('Failed to fetch properties');
    }

    const properties = await response.json();
    
    // Enrich with blob metadata
    const enrichedProperties = [];
    
    for (const property of properties) {
      const blobMetadata = [];
      
      if (property.walrusBlobIds) {
        for (const blobId of property.walrusBlobIds) {
          const metadata = await getBlobMetadata(blobId);
          blobMetadata.push(metadata);
        }
      }

      enrichedProperties.push({
        ...property,
        blobMetadata
      });
    }

    // Create JSON export
    const exportData = {
      exportDate: new Date().toISOString(),
      totalProperties: enrichedProperties.length,
      properties: enrichedProperties
    };

    // Download as JSON
    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dwello-export-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    return {
      success: true,
      propertiesExported: enrichedProperties.length
    };
  } catch (error) {
    console.error('Export error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Create a backup of all Walrus blobs
 * Downloads everything to a local folder structure
 */
export async function createFullBackup() {
  try {
    const { blobIds } = await getAllBlobIdsFromDatabase();
    
    if (blobIds.length === 0) {
      return {
        success: false,
        error: 'No blobs found to backup'
      };
    }

    // Download all as ZIP
    const result = await downloadMultipleBlobsAsZip(
      blobIds, 
      `dwello-backup-${new Date().toISOString().split('T')[0]}.zip`
    );

    return result;
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get blob IDs from blockchain directly
 * This queries all properties on-chain to get their blob IDs
 */
export async function getAllBlobIdsFromBlockchain() {
  try {
    const { SuiClient, getFullnodeUrl } = await import('@mysten/sui/client');
    
    const client = new SuiClient({
      url: getFullnodeUrl('testnet')
    });

    // Query all House objects from your package
    const packageId = process.env.NEXT_PUBLIC_SUI_PACKAGE_ID;
    
    if (!packageId) {
      throw new Error('Package ID not configured');
    }

    // This is a simplified version - you may need to adjust based on your contract
    const objects = await client.getOwnedObjects({
      filter: {
        StructType: `${packageId}::dwello::House`
      },
      options: {
        showContent: true
      }
    });

    const allBlobIds = [];
    
    for (const obj of objects.data) {
      const content = obj.data?.content;
      if (content?.fields?.image_blob_ids) {
        allBlobIds.push(...content.fields.image_blob_ids);
      }
    }

    return {
      success: true,
      blobIds: allBlobIds,
      totalObjects: objects.data.length,
      totalBlobs: allBlobIds.length
    };
  } catch (error) {
    console.error('Blockchain query error:', error);
    return {
      success: false,
      error: error.message,
      blobIds: []
    };
  }
}


export async function auditBlobSync() {
  const dbResult = await getAllBlobIdsFromDatabase();
  const blockchainResult = await getAllBlobIdsFromBlockchain();

  const dbBlobs = new Set(dbResult.blobIds);
  const blockchainBlobs = new Set(blockchainResult.blobIds);

  const onlyInDb = [...dbBlobs].filter(id => !blockchainBlobs.has(id));
  const onlyInBlockchain = [...blockchainBlobs].filter(id => !dbBlobs.has(id));
  const inBoth = [...dbBlobs].filter(id => blockchainBlobs.has(id));

  return {
    database: {
      total: dbBlobs.size,
      blobs: dbResult.blobIds
    },
    blockchain: {
      total: blockchainBlobs.size,
      blobs: blockchainResult.blobIds
    },
    sync: {
      inBoth: inBoth.length,
      onlyInDatabase: onlyInDb,
      onlyInBlockchain: onlyInBlockchain
    }
  };
}