# Walrus + Payment Integration Setup Guide for Dwello (Testnet)

This guide walks you through setting up Walrus blob storage with payment gates on Sui testnet. Users will need to pay a fee to unlock access to property details and images.

---

## Table of Contents
1. [Prerequisites & Environment Setup](#prerequisites--environment-setup)
2. [Configure Testnet](#configure-testnet)
3. [Update Move Smart Contracts](#update-move-smart-contracts)
4. [Backend Payment Validation](#backend-payment-validation)
5. [Frontend Integration](#frontend-integration)
6. [Testing Payment Flow](#testing-payment-flow)
7. [Deployment Checklist](#deployment-checklist)

---

## Prerequisites & Environment Setup

### 1. Install Sui CLI & Tools

```bash
# Install Sui CLI (if not already installed)
brew install sui

# Verify installation
sui --version

# Install Walrus CLI
cargo install walrus-cli --locked

# Verify Walrus
walrus --version
```

### 2. Install Required NPM Packages

Your `package.json` already has most dependencies. Ensure these are installed:

```bash
npm install
```

Required packages already in your project:
- `@mysten/sui` - Sui SDK
- `@mysten/walrus` - Walrus SDK
- `@mysten/dapp-kit` - Dapp Kit for wallet integration
- `express` - Backend server
- `multer` - File upload handling

### 3. Set Up Sui Testnet Wallet

```bash
# Create a testnet keystore (if you don't have one)
sui client new

# Select "Testnet" as your network

# Check your testnet address
sui client active-address

# Request testnet SUI from the faucet
sui client faucet

# Verify you have testnet SUI
sui client balance
```

### 4. Create `.env` File

Create `/Users/iboro/Downloads/Dwello/.env`:

```env
# Sui Network
VITE_SUI_NETWORK=testnet
VITE_SUI_FULL_NODE=https://fullnode.testnet.sui.io

# Walrus (Testnet)
VITE_WALRUS_AGGREGATOR=https://aggregator.walrus-testnet.walrus.space
VITE_WALRUS_PUBLISHER=https://publisher.walrus-testnet.walrus.space

# Payment Configuration
VITE_PAYMENT_AMOUNT=10000  # 0.01 USDC (6 decimals)
VITE_PLATFORM_WALLET=0xda140be42f5a8ec39cd1a6f9eb4c48de1054ea0835062812da013bb6ba763f2f

# Backend Server
BACKEND_URL=http://localhost:3001
PORT=3001

# Feature Flags
VITE_ENABLE_PAYMENT_GATE=true
VITE_ENABLE_WALRUS_STORAGE=true
```

### 5. Get USDC on Testnet

For testing payments, you need testnet USDC:

```bash
# Option 1: Use the faucet (if available)
# Go to https://faucet.testnet.sui.io and request USDC

# Option 2: Create a test coin (manual process)
# You'll need to deploy a test USDC contract or use existing testnet one
```

---

## Configure Testnet

### 1. Create `sui.env` in `/Users/iboro/Downloads/Dwello`

```bash
# Add this to .gitignore
echo "sui.env" >> .gitignore
```

### 2. Publish Your Move Package to Testnet

From the project root:

```bash
# Navigate to contract directory
cd src/contract

# Publish the package
sui client publish --gas-budget 5000000

# Save the PACKAGE_ID and CONTRACT_IDS from the output
# You'll use these in environment variables
```

After publishing, create an environment file to track your package:

Create `/Users/iboro/Downloads/Dwello/src/contract/.env`:

```env
# Contract IDs from deployment
PACKAGE_ID=<your_published_package_id>
HOUSE_MODULE_ID=<house_module_id>
PAYMENT_MODULE_ID=<payment_module_id>
CARETAKER_EARNINGS_MODULE_ID=<caretaker_earnings_module_id>

# Shared objects
CARETAKER_EARNINGS_TABLE_ID=<shared_table_object_id>
```

---

## Update Move Smart Contracts

### 1. Enhanced Payment Module with Walrus Integration

The key concepts:
- **AccessPass**: NFT proving user paid for property access
- **Walrus Blob IDs**: Store references to property images
- **Payment Split**: 70% platform, 30% caretaker earnings

Your current `payment.move` is well-structured. Ensure it's properly deployed and you have the `CARETAKER_EARNINGS` shared object ID.

### 2. Check House Module for Walrus Support

Your `house.move` already has `walrus_blob_ids` field. Verify the latest version has:

```move
public struct House has key {
    id: UID,
    // ... other fields ...
    walrus_blob_ids: vector<String>,  // ✓ Walrus support
    created_at: u64,
    // ...
}

public entry fun add_walrus_blob(
    _: &CaretakerCap,
    house: &mut House,
    blob_id: String,
    _ctx: &mut TxContext
) {
    vector::push_back(&mut house.walrus_blob_ids, blob_id);
}
```

### 3. Deploy Contracts to Testnet

```bash
# From src/contract directory
sui client publish --gas-budget 10000000

# Copy the package ID and object IDs output
# This will be needed in your frontend config
```

---

## Backend Payment Validation

### 1. Create Payment Verification Service

Create `/Users/iboro/Downloads/Dwello/backend/payment-service.js`:

```javascript
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import fetch from 'node-fetch';

const suiClient = new SuiClient({
  url: getFullnodeUrl('testnet'),
});

/**
 * Verify user has paid for property access
 * Checks if user holds AccessPass NFT for the house
 */
export async function verifyPayment(userAddress, houseId) {
  try {
    // Query user's objects to find AccessPass
    const objects = await suiClient.getOwnedObjects({
      owner: userAddress,
    });

    // Check if user has an AccessPass for this houseId
    for (const obj of objects.data) {
      const objData = await suiClient.getObject({
        id: obj.data.objectId,
        options: {
          showType: true,
          showContent: true,
        },
      });

      if (objData.data.type?.includes('AccessPass')) {
        const content = objData.data.content;
        if (content && content.fields.house_id === houseId) {
          return {
            hasPaid: true,
            accessPass: objData.data.objectId,
            amount: content.fields.amount,
          };
        }
      }
    }

    return { hasPaid: false };
  } catch (error) {
    console.error('Payment verification error:', error);
    throw error;
  }
}

/**
 * Get caretaker earnings from shared object
 */
export async function getCaretakerEarnings(caretakerAddress, earningsTableId) {
  try {
    const tableData = await suiClient.getObject({
      id: earningsTableId,
      options: {
        showContent: true,
      },
    });

    return tableData.data.content;
  } catch (error) {
    console.error('Error fetching caretaker earnings:', error);
    throw error;
  }
}

/**
 * Validate Walrus blob storage reference
 */
export async function validateWalrusBlob(blobId) {
  const aggregatorUrl = 'https://aggregator.walrus-testnet.walrus.space';
  
  try {
    const response = await fetch(`${aggregatorUrl}/v1/blobs/${blobId}`);
    return response.ok;
  } catch (error) {
    console.error('Walrus validation error:', error);
    return false;
  }
}
```

### 2. Add Payment Verification to API Routes

Update `backend/api.js` to add validation middleware:

```javascript
// Add this near the top with other imports
import { verifyPayment, validateWalrusBlob } from './payment-service.js';

// Add middleware to verify payment before accessing property details
async function requirePayment(req, res, next) {
  const { userAddress, propertyId } = req.query;

  if (!userAddress || !propertyId) {
    return res.status(400).json({
      error: 'Missing userAddress or propertyId',
    });
  }

  try {
    const paymentStatus = await verifyPayment(userAddress, propertyId);
    
    if (!paymentStatus.hasPaid) {
      return res.status(403).json({
        error: 'Payment required',
        message: 'User must pay fee to access this property',
        paymentRequired: true,
      });
    }

    // Store payment info in request for downstream handlers
    req.paymentVerified = true;
    req.accessPass = paymentStatus.accessPass;
    next();
  } catch (error) {
    res.status(500).json({
      error: 'Payment verification failed',
      details: error.message,
    });
  }
}

// Add a route to check payment status
app.get('/api/payment-status', async (req, res) => {
  const { userAddress, propertyId } = req.query;

  if (!userAddress || !propertyId) {
    return res.status(400).json({ error: 'Missing parameters' });
  }

  try {
    const status = await verifyPayment(userAddress, propertyId);
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Protect property details route with payment check
app.get('/api/properties/:id/details', requirePayment, (req, res) => {
  // Return full property details only if payment verified
  const propertyId = req.params.id;
  
  // Your existing property details logic here
  res.json({
    propertyId,
    // ... property data
    accessVerified: true,
  });
});

// Protected Walrus blob route
app.get('/api/walrus/blob/:blobId', requirePayment, async (req, res) => {
  const { blobId } = req.params;
  
  try {
    const isValid = await validateWalrusBlob(blobId);
    
    if (!isValid) {
      return res.status(404).json({ error: 'Blob not found' });
    }

    // Forward to Walrus or return blob metadata
    res.json({
      blobId,
      url: `https://aggregator.walrus-testnet.walrus.space/v1/blobs/${blobId}`,
      accessible: true,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

---

## Frontend Integration

### 1. Enhance Walrus Client

Update `src/walrus/client.ts`:

```typescript
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { supabase } from '../lib/supabase';

const WALRUS_AGGREGATOR_URL = 'https://aggregator.walrus-testnet.walrus.space';
const WALRUS_PUBLISHER_URL = 'https://publisher.walrus-testnet.walrus.space';

export const suiClient = new SuiClient({
  url: getFullnodeUrl('testnet'),
});

export interface UploadResult {
  blobId: string;
  url: string;
}

export interface PaymentStatus {
  hasPaid: boolean;
  accessPass?: string;
  amount?: string;
}

/**
 * Check if user has paid for property access
 */
export const checkPaymentStatus = async (
  userAddress: string,
  propertyId: string
): Promise<PaymentStatus> => {
  try {
    const response = await fetch(
      `/api/payment-status?userAddress=${userAddress}&propertyId=${propertyId}`
    );
    return await response.json();
  } catch (error) {
    console.error('Payment status check failed:', error);
    return { hasPaid: false };
  }
};

/**
 * Get Walrus blob URL from blob ID
 * Checks payment status first
 */
export const getWalrusBlobUrl = async (
  blobId: string,
  userAddress?: string,
  propertyId?: string
): Promise<string | null> => {
  if (!blobId) {
    throw new Error('Blob ID is required');
  }

  // If user/property provided, verify payment
  if (userAddress && propertyId) {
    const paymentStatus = await checkPaymentStatus(userAddress, propertyId);
    if (!paymentStatus.hasPaid) {
      console.warn('User has not paid for this property');
      return null;
    }
  }

  return `${WALRUS_AGGREGATOR_URL}/v1/blobs/${blobId}`;
};

/**
 * Upload file to Walrus storage
 */
export const uploadToWalrus = async (file: File): Promise<UploadResult> => {
  try {
    const url = `${WALRUS_PUBLISHER_URL}/v1/blobs?epochs=3&deletable=true`;
    const response = await fetch(url, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': file.type || 'application/octet-stream',
      },
    });

    if (!response.ok) {
      let extra = '';
      try {
        const text = await response.text();
        extra = text ? ` Body: ${text}` : '';
      } catch {
        // ignore
      }
      throw new Error(`Upload failed: HTTP ${response.status} ${response.statusText}.${extra}`);
    }

    const result = await response.json();
    const blobId =
      result.blob_id ??
      result.blobId ??
      result.id ??
      result.cid ??
      result.hash ??
      result.newlyCreated?.blobObject?.blobId ??
      result.alreadyCertified?.blobId;

    if (!blobId) {
      throw new Error('No blob ID returned from Walrus');
    }

    return {
      blobId,
      url: `${WALRUS_AGGREGATOR_URL}/v1/blobs/${blobId}`,
    };
  } catch (error) {
    console.error('Walrus upload error:', error);
    throw error;
  }
};

/**
 * Upload multiple files to Walrus with payment gating
 */
export const uploadMultipleToWalrus = async (
  files: File[],
  propertyId: string,
  onProgress?: (progress: number) => void
): Promise<UploadResult[]> => {
  const results: UploadResult[] = [];

  for (let i = 0; i < files.length; i++) {
    try {
      const result = await uploadToWalrus(files[i]);
      results.push(result);

      if (onProgress) {
        onProgress(Math.round(((i + 1) / files.length) * 100));
      }
    } catch (error) {
      console.error(`Failed to upload file ${files[i].name}:`, error);
      throw error;
    }
  }

  return results;
};
```

### 2. Create Payment Hook

Create `src/hooks/usePaymentGate.ts`:

```typescript
import { useState, useEffect } from 'react';
import { checkPaymentStatus, PaymentStatus } from '../walrus/client';

export const usePaymentGate = (userAddress: string | null, propertyId: string) => {
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>({ hasPaid: false });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkPayment = async () => {
      if (!userAddress || !propertyId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const status = await checkPaymentStatus(userAddress, propertyId);
        setPaymentStatus(status);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Payment check failed');
        setPaymentStatus({ hasPaid: false });
      } finally {
        setLoading(false);
      }
    };

    checkPayment();
  }, [userAddress, propertyId]);

  return { paymentStatus, loading, error };
};
```

### 3. Create Payment Gate Component

Create `src/components/PaymentGate.tsx`:

```typescript
import React from 'react';
import { usePaymentGate } from '../hooks/usePaymentGate';
import { useSignAndExecuteTransactionBlock } from '@mysten/dapp-kit';
import '../styles/PaymentGate.css';

interface PaymentGateProps {
  userAddress: string | null;
  propertyId: string;
  propertyName: string;
  amount: number; // In base units (e.g., 10000 for 0.01 USDC)
  onPaymentSuccess: () => void;
  children: React.ReactNode;
}

export const PaymentGate: React.FC<PaymentGateProps> = ({
  userAddress,
  propertyId,
  propertyName,
  amount,
  onPaymentSuccess,
  children,
}) => {
  const { paymentStatus, loading } = usePaymentGate(userAddress || '', propertyId);
  const { mutate: signAndExecute } = useSignAndExecuteTransactionBlock();
  const [processingPayment, setProcessingPayment] = React.useState(false);

  if (!userAddress) {
    return (
      <div className="payment-gate-container">
        <div className="payment-gate-message">
          <h3>Connect Wallet</h3>
          <p>Please connect your wallet to view this property.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="payment-gate-loading">Checking access...</div>;
  }

  if (paymentStatus.hasPaid) {
    return <>{children}</>;
  }

  const handlePayment = async () => {
    if (processingPayment) return;

    setProcessingPayment(true);

    try {
      // This is a placeholder - actual transaction building depends on your payment module
      console.log(`Initiating payment of ${amount} base units for property ${propertyId}`);
      
      // In a real implementation:
      // 1. Build transaction to call payment.move::pay_for_access
      // 2. Sign with user's wallet
      // 3. Execute transaction
      // 4. Wait for confirmation
      // 5. Call onPaymentSuccess()
      
      // Simulate payment
      await new Promise(resolve => setTimeout(resolve, 2000));
      onPaymentSuccess();
    } catch (error) {
      console.error('Payment failed:', error);
      alert('Payment failed. Please try again.');
    } finally {
      setProcessingPayment(false);
    }
  };

  return (
    <div className="payment-gate-container">
      <div className="payment-gate-overlay">
        <div className="payment-gate-modal">
          <h2>Access Required</h2>
          <p className="property-name">View details for {propertyName}</p>
          
          <div className="payment-info">
            <p>Fee: <strong>{(amount / 1_000_000).toFixed(2)} USDC</strong></p>
            <p className="fee-description">
              This gives you instant access to all photos and property details.
              70% goes to platform, 30% to the property caretaker.
            </p>
          </div>

          <button 
            className="pay-button"
            onClick={handlePayment}
            disabled={processingPayment}
          >
            {processingPayment ? 'Processing...' : 'Pay to Unlock'}
          </button>

          <div className="payment-blurred-content">
            <p>Content is blurred until payment is made →</p>
          </div>
        </div>
      </div>

      {/* Blurred content behind payment gate */}
      <div className="payment-gated-content blurred">
        {children}
      </div>
    </div>
  );
};
```

Create `src/styles/PaymentGate.css`:

```css
.payment-gate-container {
  position: relative;
  min-height: 400px;
}

.payment-gate-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.payment-gate-modal {
  background: white;
  border-radius: 12px;
  padding: 40px;
  max-width: 500px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  text-align: center;
}

.payment-gate-modal h2 {
  margin: 0 0 10px 0;
  color: #333;
  font-size: 24px;
}

.property-name {
  color: #666;
  font-size: 16px;
  margin-bottom: 20px;
}

.payment-info {
  background: #f5f5f5;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 20px;
  text-align: left;
}

.payment-info p {
  margin: 10px 0;
  color: #555;
}

.payment-info strong {
  color: #333;
  font-size: 18px;
}

.fee-description {
  font-size: 14px;
  color: #888;
  margin-top: 10px !important;
}

.pay-button {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 12px 40px;
  font-size: 16px;
  border-radius: 8px;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  font-weight: 600;
  width: 100%;
  margin-bottom: 20px;
}

.pay-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 5px 20px rgba(102, 126, 234, 0.4);
}

.pay-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.payment-blurred-content {
  padding: 20px;
  background: #f9f9f9;
  border-radius: 8px;
  color: #999;
}

.payment-gated-content.blurred {
  filter: blur(4px);
  pointer-events: none;
  opacity: 0.3;
}

.payment-gate-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  font-size: 16px;
  color: #666;
}

.payment-gate-message {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  text-align: center;
  color: #666;
}

.payment-gate-message h3 {
  margin-bottom: 10px;
  color: #333;
}
```

---

## Testing Payment Flow

### 1. Start Backend Server

```bash
# From project root
npm run dev
# In another terminal
node backend/server.js
```

### 2. Test Upload Flow

1. Navigate to property upload page
2. Select property details and images
3. Images upload to Walrus → returns blob IDs
4. Store blob IDs on-chain via `add_walrus_blob` transaction

### 3. Test Payment Gate

1. Navigate to a property listing (without access)
2. Click "View Details"
3. Payment gate appears with fee amount
4. Click "Pay to Unlock"
5. Sign transaction with wallet
6. After successful payment, details and images appear

### 4. Verify Payment On-Chain

```bash
# Check user's objects for AccessPass
sui client objects

# Look for AccessPass type in the output
# Verify it contains the correct house_id
```

---

## Deployment Checklist

### Before Mainnet:

- [ ] Test payment flow end-to-end on testnet
- [ ] Verify Walrus blob storage is working
- [ ] Test all payment validation routes
- [ ] Verify AccessPass NFT is minted correctly
- [ ] Check caretaker earnings are recorded
- [ ] Test with multiple users and properties
- [ ] Verify payment split (70/30) is correct
- [ ] Check error handling for failed payments
- [ ] Test wallet connectivity and signing
- [ ] Verify environment variables are set correctly

### Configuration Updates for Mainnet:

```env
# Update these when moving to mainnet
VITE_SUI_NETWORK=mainnet
VITE_SUI_FULL_NODE=https://fullnode.mainnet.sui.io
VITE_WALRUS_AGGREGATOR=https://aggregator.walrus.space
VITE_WALRUS_PUBLISHER=https://publisher.walrus.space
VITE_PLATFORM_WALLET=<your_mainnet_platform_address>
```

---

## Troubleshooting

### Issue: Walrus upload returns no blob ID

**Solution**: Check response structure from Walrus API. Update blob ID extraction logic in `client.ts`.

### Issue: Payment verification fails

**Solution**: 
1. Verify AccessPass NFT was created
2. Check caretaker_earnings shared object exists
3. Confirm USDC is available in user's wallet

### Issue: Images don't load after payment

**Solution**:
1. Verify blob ID was stored on-chain via `add_walrus_blob`
2. Check Walrus blob still exists (not expired)
3. Verify network URLs in environment variables

### Issue: Transaction fails with "Insufficient Gas"

**Solution**: Increase gas budget in transaction:
```typescript
const result = await signAndExecuteTransactionBlock({
  transactionBlock: txb,
  options: {
    showObjectChanges: true,
    showEffects: true,
  },
});
```

---

## Next Steps

1. ✅ Set up testnet environment and deploy contracts
2. ✅ Implement backend payment validation
3. ✅ Create PaymentGate component
4. ✅ Test end-to-end flow
5. → Integrate into PropertyDetailView component
6. → Add admin dashboard for earnings
7. → Implement withdrawal mechanism for caretakers
8. → Set up monitoring and analytics

