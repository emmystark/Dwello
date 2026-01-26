import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';

const suiClient = new SuiClient({
  url: getFullnodeUrl('testnet'),
});

/**
 * Verify user has paid for property access
 * Checks if user holds AccessPass NFT for the house
 */
export async function verifyPayment(userAddress, houseId) {
  try {
    if (!userAddress || !houseId) {
      throw new Error('userAddress and houseId are required');
    }

    // Query user's objects
    const objects = await suiClient.getOwnedObjects({
      owner: userAddress,
      options: {
        showType: true,
        showContent: true,
      },
    });

    // Check if user has an AccessPass for this houseId
    for (const obj of objects.data) {
      if (!obj.data?.type) continue;

      // Check if this is an AccessPass object
      if (obj.data.type.includes('AccessPass')) {
        const details = await suiClient.getObject({
          id: obj.data.objectId,
          options: {
            showType: true,
            showContent: true,
          },
        });

        const content = details.data?.content;
        if (content && content.fields) {
          const passHouseId = content.fields.house_id;
          
          // Compare house IDs (handle both formats)
          if (passHouseId === houseId || passHouseId?.id === houseId) {
            return {
              hasPaid: true,
              accessPass: details.data.objectId,
              amount: content.fields.amount,
              user: content.fields.user,
              timestamp: new Date().toISOString(),
            };
          }
        }
      }
    }

    return { 
      hasPaid: false,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Payment verification error:', error);
    throw new Error(`Payment verification failed: ${error.message}`);
  }
}

/**
 * Get caretaker earnings from shared object
 */
export async function getCaretakerEarnings(caretakerAddress, earningsTableId) {
  try {
    if (!caretakerAddress || !earningsTableId) {
      throw new Error('caretakerAddress and earningsTableId are required');
    }

    const tableData = await suiClient.getObject({
      id: earningsTableId,
      options: {
        showType: true,
        showContent: true,
      },
    });

    if (!tableData.data) {
      throw new Error('Earnings table not found');
    }

    return {
      tableId: earningsTableId,
      caretaker: caretakerAddress,
      data: tableData.data.content,
    };
  } catch (error) {
    console.error('Error fetching caretaker earnings:', error);
    throw new Error(`Failed to get caretaker earnings: ${error.message}`);
  }
}

/**
 * Validate Walrus blob storage reference
 */
export async function validateWalrusBlob(blobId) {
  const aggregatorUrl = process.env.WALRUS_AGGREGATOR || 
    'https://aggregator.walrus-testnet.walrus.space';
  
  try {
    if (!blobId) {
      return { valid: false, error: 'No blob ID provided' };
    }

    const response = await fetch(`${aggregatorUrl}/v1/blobs/${blobId}`, {
      method: 'HEAD',
    });

    return {
      valid: response.ok,
      blobId,
      status: response.status,
      url: response.ok ? `${aggregatorUrl}/v1/blobs/${blobId}` : null,
    };
  } catch (error) {
    console.error('Walrus validation error:', error);
    return {
      valid: false,
      blobId,
      error: error.message,
    };
  }
}

/**
 * Get object details from on-chain
 */
export async function getObjectDetails(objectId) {
  try {
    const obj = await suiClient.getObject({
      id: objectId,
      options: {
        showType: true,
        showContent: true,
        showOwner: true,
        showPreviousTransaction: true,
      },
    });

    return obj.data;
  } catch (error) {
    console.error('Error fetching object:', error);
    throw new Error(`Failed to get object details: ${error.message}`);
  }
}

/**
 * Get transaction details
 */
export async function getTransactionDetails(txDigest) {
  try {
    const tx = await suiClient.getTransactionBlock({
      digest: txDigest,
      options: {
        showInput: true,
        showEffects: true,
        showEvents: true,
      },
    });

    return tx;
  } catch (error) {
    console.error('Error fetching transaction:', error);
    throw new Error(`Failed to get transaction details: ${error.message}`);
  }
}

/**
 * Query payment events for a house
 */
export async function getPaymentEventsForHouse(houseId) {
  try {
    const events = await suiClient.queryEvents({
      query: {
        MoveEventType: '0x*::payment::PaymentMade',
      },
    });

    const relevantEvents = events.data.filter((event) => {
      const fields = event.parsedJson;
      return fields && fields.house_id === houseId;
    });

    return relevantEvents;
  } catch (error) {
    console.error('Error querying payment events:', error);
    return [];
  }
}

/**
 * Get multiple Walrus blobs metadata
 */
export async function validateMultipleBlobs(blobIds) {
  const results = [];
  
  for (const blobId of blobIds) {
    try {
      const validation = await validateWalrusBlob(blobId);
      results.push(validation);
    } catch (error) {
      results.push({
        valid: false,
        blobId,
        error: error.message,
      });
    }
  }

  return results;
}

/**
 * Check if a user is a caretaker (has CaretakerCap)
 */
export async function isCaretaker(userAddress) {
  try {
    if (!userAddress) {
      return false;
    }

    const objects = await suiClient.getOwnedObjects({
      owner: userAddress,
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
 * Get all properties created by a caretaker
 */
export async function getCaretakerProperties(caretakerAddress) {
  try {
    if (!caretakerAddress) {
      throw new Error('caretakerAddress is required');
    }

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

        if (details.data?.content) {
          properties.push({
            objectId: obj.data.objectId,
            content: details.data.content,
          });
        }
      }
    }

    return properties;
  } catch (error) {
    console.error('Error fetching caretaker properties:', error);
    return [];
  }
}

/**
 * Verify payment and blob access together
 */
export async function verifyPaymentAndBlob(userAddress, houseId, blobId) {
  try {
    const paymentStatus = await verifyPayment(userAddress, houseId);
    const blobStatus = await validateWalrusBlob(blobId);

    return {
      paymentVerified: paymentStatus.hasPaid,
      blobValid: blobStatus.valid,
      accessGranted: paymentStatus.hasPaid && blobStatus.valid,
      details: {
        payment: paymentStatus,
        blob: blobStatus,
      },
    };
  } catch (error) {
    console.error('Verification error:', error);
    return {
      paymentVerified: false,
      blobValid: false,
      accessGranted: false,
      error: error.message,
    };
  }
}
