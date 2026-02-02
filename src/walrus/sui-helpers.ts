/**
 * Sui Transaction Helpers for Dwello
 * Handles creating and publishing properties to Sui blockchain
 */

import { TransactionBlock } from '@mysten/sui/transactions';
import { suiClient } from './client';
import type { Property } from '../types';

// Mainnet package IDs (replace with testnet if needed)
const DWELLO_PACKAGE_ID = process.env.REACT_APP_DWELLO_PACKAGE_ID || '0x1';
const CARETAKER_CAP_ID = process.env.REACT_APP_CARETAKER_CAP_ID || '0x1';

/**
 * Create a house on-chain with metadata
 */
export async function createHouseOnChain(
  property: Property,
  caretakerAddress: string,
  signerAddress: string
) {
  try {
    const tx = new TransactionBlock();

    // Reference the caretaker capability
    const caretakerCap = tx.object(CARETAKER_CAP_ID);

    // Call the create_house function
    tx.moveCall({
      target: `${DWELLO_PACKAGE_ID}::house::create_house`,
      arguments: [
        caretakerCap,
        tx.pure.string(property.houseName),
        tx.pure.string(property.address),
        tx.pure.address(caretakerAddress),
        tx.pure.string(property.country || ''),
        tx.pure.string(property.state || ''),
        tx.pure.string(property.city || ''),
        tx.pure.u64(Math.floor(property.price * 100)), // Store as cents
        tx.pure.u8(property.bedrooms || 0),
        tx.pure.u8(property.bathrooms || 0),
        tx.pure.string(property.propertyType || 'Apartment'),
        tx.pure.u64(parseInt(property.area || '0') || 0),
      ],
    });

    return tx;
  } catch (error) {
    console.error('Error creating house transaction:', error);
    throw new Error(
      `Failed to create house transaction: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Add Walrus blob IDs to a house
 */
export async function addWalrusBlobsToHouse(
  houseId: string,
  blobIds: string[],
  caretakerAddress: string
) {
  try {
    const tx = new TransactionBlock();
    const caretakerCap = tx.object(CARETAKER_CAP_ID);
    const house = tx.object(houseId);

    // Add each blob ID
    for (const blobId of blobIds) {
      tx.moveCall({
        target: `${DWELLO_PACKAGE_ID}::house::add_walrus_blob`,
        arguments: [caretakerCap, house, tx.pure.string(blobId)],
      });
    }

    return tx;
  } catch (error) {
    console.error('Error creating blob transaction:', error);
    throw new Error(
      `Failed to add blobs: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Execute a transaction block
 */
export async function executeTransaction(
  txBlock: TransactionBlock,
  signer: any
): Promise<string> {
  try {
    const result = await signer.signAndExecuteTransactionBlock({
      transactionBlock: txBlock,
      options: {
        showEvents: true,
        showObjectChanges: true,
      },
    });

    return result.digest;
  } catch (error) {
    console.error('Error executing transaction:', error);
    throw new Error(
      `Transaction failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Get house details from on-chain
 */
export async function getHouseDetails(houseId: string) {
  try {
    const obj = await suiClient.getObject({
      id: houseId,
      options: {
        showContent: true,
        showType: true,
      },
    });

    if (obj.data?.type?.includes('::house::House')) {
      return obj.data.content;
    }

    return null;
  } catch (error) {
    console.error('Error fetching house details:', error);
    throw error;
  }
}

/**
 * Get caretaker's properties
 */
export async function getCaretakerProperties(caretakerAddress: string) {
  try {
    const objects = await suiClient.queryEvents({
      query: {
        MoveEventType: `${DWELLO_PACKAGE_ID}::house::HouseCreatedEvent`,
      },
    });

    const properties = objects.data
      .filter((event: any) => {
        const parsedJson = event.parsedJson as any;
        return parsedJson?.caretaker === caretakerAddress;
      })
      .map((event: any) => {
        const parsedJson = event.parsedJson as any;
        return {
          houseId: parsedJson?.house_id,
          name: parsedJson?.name,
          address: parsedJson?.house_address,
          caretaker: parsedJson?.caretaker,
        };
      });

    return properties;
  } catch (error) {
    console.error('Error fetching caretaker properties:', error);
    throw error;
  }
}

/**
 * Publish property metadata to backend
 */
export async function publishPropertyMetadata(
  property: Property,
  apiUrl: string = process.env.REACT_APP_API_URL || 'http://localhost:3001'
): Promise<string> {
  try {
    const response = await fetch(`${apiUrl}/api/properties/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...property,
        timestamp: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.property?.id || '';
  } catch (error) {
    console.error('Error publishing property metadata:', error);
    throw error;
  }
}

/**
 * Link property on-chain with backend metadata
 */
export async function linkPropertyMetadata(
  houseId: string,
  propertyId: string,
  metadata: any,
  apiUrl: string = process.env.REACT_APP_API_URL || 'http://localhost:3001'
): Promise<void> {
  try {
    const response = await fetch(`${apiUrl}/api/properties/create/${propertyId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...metadata,
        suiHouseId: houseId,
        linkedAt: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to link metadata: ${response.statusText}`);
    }
  } catch (error) {
    console.error('Error linking property metadata:', error);
    throw error;
  }
}

/**
 * Get property view statistics
 */
export async function getPropertyStats(houseId: string) {
  try {
    const obj = await suiClient.getObject({
      id: houseId,
      options: {
        showContent: true,
      },
    });

    const content = obj.data?.content as any;
    return {
      views: content?.fields?.total_views || 0,
      createdAt: content?.fields?.created_at || 0,
    };
  } catch (error) {
    console.error('Error fetching property stats:', error);
    throw error;
  }
}

/**
 * Validate property data before submission
 */
export function validatePropertyData(property: Partial<Property>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!property.houseName?.trim()) {
    errors.push('Property name is required');
  }

  if (!property.address?.trim()) {
    errors.push('Address is required');
  }

  if (!property.price || property.price <= 0) {
    errors.push('Valid price is required');
  }

  if (!property.city?.trim()) {
    errors.push('City is required');
  }

  if (!property.state?.trim()) {
    errors.push('State is required');
  }

  if (!property.country?.trim()) {
    errors.push('Country is required');
  }

  if (!property.blobIds || property.blobIds.length === 0) {
    errors.push('At least one image must be uploaded');
  }

  if (property.bedrooms && property.bedrooms < 0) {
    errors.push('Bedrooms cannot be negative');
  }

  if (property.bathrooms && property.bathrooms < 0) {
    errors.push('Bathrooms cannot be negative');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Format property data for display
 */
export function formatPropertyForDisplay(property: Property) {
  return {
    ...property,
    price: new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(property.price),
    bedroomText: `${property.bedrooms} bed${property.bedrooms !== 1 ? 's' : ''}`,
    bathroomText: `${property.bathrooms} bath${property.bathrooms !== 1 ? 's' : ''}`,
    fullAddress: `${property.address}, ${property.city}, ${property.state}, ${property.country}`,
  };
}

/**
 * Calculate property statistics
 */
export function calculatePropertyStats(properties: Property[]) {
  if (properties.length === 0) {
    return {
      totalProperties: 0,
      averagePrice: 0,
      totalViews: 0,
      averageBedrooms: 0,
    };
  }

  const totalPrice = properties.reduce((sum, p) => sum + p.price, 0);
  const totalViews = properties.reduce((sum, p) => sum + (p.views || 0), 0);
  const totalBedrooms = properties.reduce((sum, p) => sum + (p.bedrooms || 0), 0);

  return {
    totalProperties: properties.length,
    averagePrice: totalPrice / properties.length,
    totalViews,
    averageBedrooms: totalBedrooms / properties.length,
  };
}

/**
 * Create URL for property blob resources
 */
export function createBlobUrl(blobId: string, baseUrl?: string): string {
  const aggregatorUrl =
    baseUrl || 'https://aggregator.walrus-testnet.walrus.space';
  return `${aggregatorUrl}/v1/blobs/${encodeURIComponent(blobId)}`;
}

/**
 * Batch fetch multiple properties
 */
export async function fetchPropertiesInBatch(
  houseIds: string[],
  batchSize: number = 5
): Promise<any[]> {
  const results = [];

  for (let i = 0; i < houseIds.length; i += batchSize) {
    const batch = houseIds.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map((id) => getHouseDetails(id))
    );
    results.push(...batchResults);
  }

  return results;
}
