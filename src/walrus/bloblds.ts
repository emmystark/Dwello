/**
 * Walrus Blob Storage Management for Dwello
 * Manages property image/media blobs stored on Walrus protocol
 */

import b1 from './1bedroom.txt?raw'
import b3 from './3bedroom.txt?raw'
import b4 from './4bedroom.txt?raw'

interface BlobMetadata {
  blobId: string;
  fileName: string;
  mimeType: string;
  uploadedAt: string;
  size?: number;
}

interface PropertyBlobs {
  propertyId: string;
  blobs: BlobMetadata[];
  primaryImageBlobId: string;
  totalSize: number;
}

const parseSimple = (raw: string) =>
  raw
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean)

const parseKeyed = (raw: string) => {
  const map: Record<string, string> = {}
  raw
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean)
    .forEach((line) => {
      const [key, value] = line.split(':').map((s) => s.trim())
      if (key && value) {
        map[key.toLowerCase()] = value
      }
    })
  return map
}

// Structured access to bedroom-specific blobs
export const bedroomBlobIds: Record<number, string[]> = {
  1: parseSimple(b1),
  2: [],
  3: [],
  4: [],
}

// Export a helper map for named fields from 3- and 4-bedroom configs
export const bedroomLayouts = (() => {
  const three = parseKeyed(b3)
  const four = parseKeyed(b4)

  // Populate numeric bedroomBlobIds using the required fields
  if (three.house) {
    bedroomBlobIds[3] = [three.house]
  }
  if (four.house) {
    bedroomBlobIds[4] = [four.house]
  }
  if (three['kitchenandlivingroom']) {
    bedroomBlobIds[2] = [three['kitchenandlivingroom']]
  }

  return {
    three,
    four,
  }
})()

// Blob storage registry (in-memory; use backend DB in production)
const blobRegistry = new Map<string, PropertyBlobs>()

/**
 * Register property blobs
 */
export function registerPropertyBlobs(
  propertyId: string,
  blobs: BlobMetadata[],
  primaryImageBlobId?: string
): PropertyBlobs {
  const totalSize = blobs.reduce((sum, b) => sum + (b.size || 0), 0)
  const propertyBlobs: PropertyBlobs = {
    propertyId,
    blobs,
    primaryImageBlobId: primaryImageBlobId || blobs[0]?.blobId || '',
    totalSize,
  }

  blobRegistry.set(propertyId, propertyBlobs)
  return propertyBlobs
}

/**
 * Get property blobs
 */
export function getPropertyBlobs(propertyId: string): PropertyBlobs | null {
  return blobRegistry.get(propertyId) || null
}

/**
 * Add blob to property
 */
export function addBlobToProperty(
  propertyId: string,
  blob: BlobMetadata
): PropertyBlobs | null {
  const propertyBlobs = blobRegistry.get(propertyId)
  if (!propertyBlobs) return null

  propertyBlobs.blobs.push(blob)
  propertyBlobs.totalSize += blob.size || 0

  blobRegistry.set(propertyId, propertyBlobs)
  return propertyBlobs
}

/**
 * Remove blob from property
 */
export function removeBlobFromProperty(
  propertyId: string,
  blobId: string
): PropertyBlobs | null {
  const propertyBlobs = blobRegistry.get(propertyId)
  if (!propertyBlobs) return null

  const blob = propertyBlobs.blobs.find((b) => b.blobId === blobId)
  if (blob) {
    propertyBlobs.totalSize -= blob.size || 0
  }

  propertyBlobs.blobs = propertyBlobs.blobs.filter((b) => b.blobId !== blobId)

  // If removed blob was primary, set new primary
  if (propertyBlobs.primaryImageBlobId === blobId) {
    propertyBlobs.primaryImageBlobId = propertyBlobs.blobs[0]?.blobId || ''
  }

  blobRegistry.set(propertyId, propertyBlobs)
  return propertyBlobs
}

/**
 * Export property blobs for backup/sharing
 */
export function exportPropertyBlobsMetadata(propertyId: string): string {
  const propertyBlobs = blobRegistry.get(propertyId)
  if (!propertyBlobs) return ''

  return JSON.stringify(propertyBlobs, null, 2)
}

/**
 * Import property blobs from metadata
 */
export function importPropertyBlobsMetadata(
  metadata: string
): PropertyBlobs | null {
  try {
    const propertyBlobs = JSON.parse(metadata) as PropertyBlobs
    blobRegistry.set(propertyBlobs.propertyId, propertyBlobs)
    return propertyBlobs
  } catch (error) {
    console.error('Failed to import blob metadata:', error)
    return null
  }
}

/**
 * Clear all blobs for a property
 */
export function clearPropertyBlobs(propertyId: string): void {
  blobRegistry.delete(propertyId)
}

/**
 * Get storage statistics
 */
export function getStorageStats(): {
  totalProperties: number
  totalBlobs: number
  totalSize: number
} {
  let totalBlobs = 0
  let totalSize = 0

  blobRegistry.forEach((propertyBlobs) => {
    totalBlobs += propertyBlobs.blobs.length
    totalSize += propertyBlobs.totalSize
  })

  return {
    totalProperties: blobRegistry.size,
    totalBlobs,
    totalSize,
  }
}

export { BlobMetadata, PropertyBlobs }

export default bedroomBlobIds