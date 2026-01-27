// lib/suiBlockchain.js
// Frontend integration with Sui blockchain for property payments and NFT minting

import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { ConnectButton, useCurrentAccount, useSignAndExecuteTransaction } from '@mysten/dapp-kit';

// Initialize Sui client
const suiClient = new SuiClient({
  url: getFullnodeUrl('testnet'),
});

// Contract addresses - UPDATE THESE after deployment
const CONTRACT_CONFIG = {
  packageId: process.env.NEXT_PUBLIC_SUI_PACKAGE_ID || '0xYOUR_PACKAGE_ID',
  moduleName: 'dwello',
  earningsTableId: process.env.NEXT_PUBLIC_EARNINGS_TABLE_ID || '0xYOUR_EARNINGS_TABLE',
};

/**
 * Create a new property listing on-chain
 */
export async function createPropertyListing({
  title,
  description,
  price,
  location,
  walrusBlobIds, // Array of Walrus blob IDs for images
  caretakerAddress,
  signAndExecute,
}) {
  try {
    const tx = new Transaction();

    // Call smart contract to create property
    tx.moveCall({
      target: `${CONTRACT_CONFIG.packageId}::${CONTRACT_CONFIG.moduleName}::create_house`,
      arguments: [
        tx.pure.string(title),
        tx.pure.string(description),
        tx.pure.u64(price),
        tx.pure.string(location),
        tx.pure.vector('string', walrusBlobIds),
        tx.pure.address(caretakerAddress),
      ],
    });

    // Execute transaction
    const result = await signAndExecute({
      transaction: tx,
    });

    console.log('Property created:', result);

    // Extract created object ID from effects
    const createdObjects = result.effects?.created || [];
    const houseObject = createdObjects.find(obj => 
      obj.owner?.AddressOwner === caretakerAddress
    );

    return {
      success: true,
      digest: result.digest,
      houseId: houseObject?.reference?.objectId,
      walrusBlobIds,
      transaction: result,
    };
  } catch (error) {
    console.error('Property creation error:', error);
    throw new Error(`Failed to create property: ${error.message}`);
  }
}

/**
 * Purchase property access (mints AccessPass NFT)
 */
export async function purchasePropertyAccess({
  houseId,
  price,
  buyerAddress,
  signAndExecute,
}) {
  try {
    const tx = new Transaction();

    // Split coin for payment
    const [coin] = tx.splitCoins(tx.gas, [tx.pure.u64(price)]);

    // Call purchase function
    tx.moveCall({
      target: `${CONTRACT_CONFIG.packageId}::${CONTRACT_CONFIG.moduleName}::purchase_access`,
      arguments: [
        tx.object(houseId),
        coin,
        tx.object(CONTRACT_CONFIG.earningsTableId),
      ],
    });

    // Execute transaction
    const result = await signAndExecute({
      transaction: tx,
    });

    console.log('Access purchased:', result);

    // Find AccessPass NFT in created objects
    const createdObjects = result.effects?.created || [];
    const accessPass = createdObjects.find(obj =>
      obj.owner?.AddressOwner === buyerAddress
    );

    return {
      success: true,
      digest: result.digest,
      accessPassId: accessPass?.reference?.objectId,
      houseId,
      amount: price,
      transaction: result,
    };
  } catch (error) {
    console.error('Purchase error:', error);
    throw new Error(`Failed to purchase access: ${error.message}`);
  }
}

/**
 * Verify user has paid for property access
 */
export async function verifyPropertyAccess(userAddress, houseId) {
  try {
    if (!userAddress || !houseId) {
      return { hasPaid: false, error: 'Missing parameters' };
    }

    // Get all objects owned by user
    const objects = await suiClient.getOwnedObjects({
      owner: userAddress,
      options: {
        showType: true,
        showContent: true,
      },
    });

    // Check for AccessPass NFT for this property
    for (const obj of objects.data) {
      if (!obj.data?.type) continue;

      if (obj.data.type.includes('AccessPass')) {
        const details = await suiClient.getObject({
          id: obj.data.objectId,
          options: {
            showContent: true,
          },
        });

        const content = details.data?.content;
        if (content?.fields) {
          const passHouseId = content.fields.house_id;
          
          if (passHouseId === houseId || passHouseId?.id === houseId) {
            return {
              hasPaid: true,
              accessPassId: obj.data.objectId,
              amount: content.fields.amount,
              timestamp: content.fields.timestamp,
            };
          }
        }
      }
    }

    return { hasPaid: false };
  } catch (error) {
    console.error('Verification error:', error);
    return { hasPaid: false, error: error.message };
  }
}

/**
 * Get property details from blockchain
 */
export async function getPropertyDetails(houseId) {
  try {
    const house = await suiClient.getObject({
      id: houseId,
      options: {
        showContent: true,
        showOwner: true,
      },
    });

    if (!house.data?.content) {
      throw new Error('Property not found');
    }

    const fields = house.data.content.fields;

    return {
      id: houseId,
      title: fields.title,
      description: fields.description,
      price: fields.price,
      location: fields.location,
      walrusBlobIds: fields.image_blob_ids,
      caretaker: fields.caretaker,
      owner: house.data.owner,
    };
  } catch (error) {
    console.error('Error fetching property:', error);
    throw new Error(`Failed to get property: ${error.message}`);
  }
}

/**
 * Get caretaker earnings
 */
export async function getCaretakerEarnings(caretakerAddress) {
  try {
    const tableData = await suiClient.getObject({
      id: CONTRACT_CONFIG.earningsTableId,
      options: {
        showContent: true,
      },
    });

    if (!tableData.data?.content) {
      throw new Error('Earnings table not found');
    }

    // Parse earnings for specific caretaker
    const fields = tableData.data.content.fields;
    const earnings = fields.earnings || {};
    
    return {
      total: earnings[caretakerAddress] || 0,
      caretakerAddress,
      tableId: CONTRACT_CONFIG.earningsTableId,
    };
  } catch (error) {
    console.error('Error fetching earnings:', error);
    return { total: 0, error: error.message };
  }
}

/**
 * Get all properties listed by a caretaker
 */
export async function getCaretakerProperties(caretakerAddress) {
  try {
    const objects = await suiClient.getOwnedObjects({
      owner: caretakerAddress,
      options: {
        showType: true,
        showContent: true,
      },
    });

    const properties = [];

    for (const obj of objects.data) {
      if (obj.data?.type?.includes('House')) {
        const details = await suiClient.getObject({
          id: obj.data.objectId,
          options: {
            showContent: true,
          },
        });

        if (details.data?.content?.fields) {
          properties.push({
            id: obj.data.objectId,
            ...details.data.content.fields,
          });
        }
      }
    }

    return properties;
  } catch (error) {
    console.error('Error fetching properties:', error);
    return [];
  }
}

/**
 * Check if address is a caretaker
 */
export async function isCaretaker(address) {
  try {
    const objects = await suiClient.getOwnedObjects({
      owner: address,
      options: {
        showType: true,
      },
    });

    for (const obj of objects.data) {
      if (obj.data?.type?.includes('CaretakerCap')) {
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error('Error checking caretaker status:', error);
    return false;
  }
}

/**
 * Withdraw caretaker earnings
 */
export async function withdrawEarnings({
  caretakerAddress,
  amount,
  signAndExecute,
}) {
  try {
    const tx = new Transaction();

    tx.moveCall({
      target: `${CONTRACT_CONFIG.packageId}::${CONTRACT_CONFIG.moduleName}::withdraw_earnings`,
      arguments: [
        tx.object(CONTRACT_CONFIG.earningsTableId),
        tx.pure.u64(amount),
      ],
    });

    const result = await signAndExecute({
      transaction: tx,
    });

    return {
      success: true,
      digest: result.digest,
      amount,
      transaction: result,
    };
  } catch (error) {
    console.error('Withdrawal error:', error);
    throw new Error(`Failed to withdraw: ${error.message}`);
  }
}

// Export config for use in components
export { CONTRACT_CONFIG };