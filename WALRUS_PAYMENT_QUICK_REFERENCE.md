# Walrus + Payment Integration - Quick Reference

## Overview
This guide provides quick access to the key components and configuration for Walrus blob storage with Sui payment gating on testnet.

---

## 📁 New Files Created

| File | Purpose |
|------|---------|
| [WALRUS_PAYMENT_SETUP.md](WALRUS_PAYMENT_SETUP.md) | Complete step-by-step setup guide |
| [backend/payment-service.js](backend/payment-service.js) | Payment verification & blob validation |
| [src/hooks/usePaymentGate.ts](src/hooks/usePaymentGate.ts) | React hook for payment gating logic |
| [src/components/PaymentGate.tsx](src/components/PaymentGate.tsx) | Main payment gate UI component |
| [src/styles/PaymentGate.css](src/styles/PaymentGate.css) | Styling for payment gate modal |
| [src/components/PropertyDetailViewExamples.tsx](src/components/PropertyDetailViewExamples.tsx) | Integration examples |

---

## ⚙️ Environment Configuration

Add to your `.env` file:

```env
# Walrus
VITE_WALRUS_AGGREGATOR=https://aggregator.walrus-testnet.walrus.space
VITE_WALRUS_PUBLISHER=https://publisher.walrus-testnet.walrus.space

# Payment
VITE_PAYMENT_AMOUNT=10000  # 0.01 USDC (6 decimals)
VITE_PLATFORM_WALLET=0xda140be42f5a8ec39cd1a6f9eb4c48de1054ea0835062812da013bb6ba763f2f

# Backend
PORT=3001
WALRUS_PUBLISHER_URL=https://publisher.walrus-testnet.walrus.space
WALRUS_AGGREGATOR_URL=https://aggregator.walrus-testnet.walrus.space
```

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Up Testnet Wallet
```bash
sui client new
sui client faucet
sui client balance
```

### 3. Deploy Contracts
```bash
cd src/contract
sui client publish --gas-budget 10000000
```

Save the package ID from output.

### 4. Start Backend
```bash
npm run dev
# In another terminal
node backend/server.js
```

### 5. Use in Component
```tsx
import { PaymentGate } from './components/PaymentGate';
import { useCurrentAccount } from '@mysten/dapp-kit';

function PropertyDetail() {
  const account = useCurrentAccount();

  return (
    <PaymentGate
      userAddress={account?.address || null}
      propertyId="prop_123"
      propertyName="Beautiful House"
    >
      {/* Your property details and images here */}
    </PaymentGate>
  );
}
```

---

## 📦 Payment Flow

```
1. User views property listing (public)
   ↓
2. User clicks "View Details"
   ↓
3. Check payment status via `/api/payment-status`
   ↓
4. If not paid → Show PaymentGate overlay
   ↓
5. User clicks "Pay to Unlock"
   ↓
6. Execute payment transaction (70/30 split)
   ↓
7. Emit PaymentMade event on-chain
   ↓
8. Mint AccessPass NFT to user
   ↓
9. Refetch payment status
   ↓
10. Show full details and images
```

---

## 🔑 API Endpoints

### Payment Status
```bash
GET /api/payment-status?userAddress=0x...&propertyId=prop_123
```

### Verify Access
```bash
GET /api/verify-access?userAddress=0x...&propertyId=prop_123&blobId=blob_xyz
```

### Get Property Details (Protected)
```bash
GET /api/properties/:id/details?userAddress=0x...&propertyId=prop_123
```

### Get Property Images (Protected)
```bash
GET /api/properties/:id/images?userAddress=0x...&propertyId=prop_123
```

### Check Caretaker Status
```bash
GET /api/is-caretaker/:address
```

---

## 🎨 Component Usage Examples

### Basic Wrapping
```tsx
<PaymentGate
  userAddress={userAddress}
  propertyId={propertyId}
  propertyName="Luxury Apartment"
>
  <PropertyDetails />
</PaymentGate>
```

### With Callbacks
```tsx
<PaymentGate
  userAddress={userAddress}
  propertyId={propertyId}
  propertyName="House"
  onPaymentSuccess={() => {
    console.log('Payment successful!');
    refetchProperty();
  }}
  onPaymentError={(error) => {
    toast.error(`Payment failed: ${error}`);
  }}
>
  <PropertyDetails />
</PaymentGate>
```

### Using Hook
```tsx
const { paymentStatus, loading, error, refetch } = usePaymentGate(
  userAddress,
  propertyId
);

if (loading) return <Spinner />;
if (error) return <Error msg={error} />;
if (paymentStatus.hasPaid) return <FullContent />;
return <PaymentGate>...</PaymentGate>;
```

---

## 🛠️ Key Functions

### Walrus Client (src/walrus/client.ts)
```typescript
// Upload file to Walrus
uploadToWalrus(file): Promise<UploadResult>

// Get blob URL (safe for public access)
getWalrusBlobUrl(blobId): string

// Check payment status
checkPaymentStatus(userAddress, propertyId): Promise<PaymentStatus>

// Get gated blob (checks payment first)
getGatedBlobUrl(blobId, userAddress, propertyId): Promise<string | null>

// Verify both payment and blob
verifyPaymentAndBlob(userAddress, propertyId, blobId): Promise<PaymentVerification>
```

### Payment Service (backend/payment-service.js)
```javascript
// Verify on-chain payment
verifyPayment(userAddress, houseId)

// Validate Walrus blob exists
validateWalrusBlob(blobId)

// Check if user is caretaker
isCaretaker(userAddress)

// Get caretaker's properties
getCaretakerProperties(caretakerAddress)
```

---

## 💰 Payment Details

| Component | Amount | Percentage |
|-----------|--------|-----------|
| Total Fee | 0.01 USDC | 100% |
| Platform | 0.007 USDC | 70% |
| Caretaker | 0.003 USDC | 30% |

**Note:** All amounts are in base units (multiply by 1,000,000 for display)

---

## 🔐 Smart Contract Details

### Payment Module
- **Function:** `pay_for_access()`
- **Inputs:** Coin<USDC>, House reference, CaretakerEarnings object
- **Outputs:** AccessPass NFT
- **Events:** PaymentMade

### House Module
- **Field:** `walrus_blob_ids: vector<String>`
- **Function:** `add_walrus_blob(blob_id: String)`
- **Function:** `get_walrus_blobs(): &vector<String>`

---

## 🧪 Testing Checklist

- [ ] Upload images to Walrus - verify blob IDs returned
- [ ] Add blob IDs to house on-chain
- [ ] Make test payment with USDC on testnet
- [ ] Verify AccessPass NFT minted
- [ ] Check caretaker earnings recorded
- [ ] Verify payment gate blocks content
- [ ] Verify content shows after payment
- [ ] Test multiple users on same property
- [ ] Test payment split (70/30)
- [ ] Check blob validation works

---

## 🐛 Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| Walrus upload returns no blob ID | Check Walrus API response format, update extraction logic |
| Payment verification fails | Verify AccessPass NFT was created, check caretaker_earnings object |
| Images don't load after payment | Verify blob ID on-chain, check blob hasn't expired |
| Insufficient gas error | Increase gas budget: 5000000 - 10000000 |
| Wallet not connecting | Ensure wallet is installed and on testnet |
| Blob 404 errors | Walrus blob may have expired (keep epochs >= 3) |

---

## 📚 Additional Resources

- [Walrus Documentation](https://docs.wal.app/)
- [Sui Documentation](https://docs.sui.io/)
- [Move Language Guide](https://move-language.github.io/)
- [Sui Blockchain Explorer](https://explorer.sui.io/)

---

## 🚢 Deployment Checklist

**Before Mainnet:**
- [ ] Test all payment flows end-to-end
- [ ] Verify AccessPass NFT structure
- [ ] Test caretaker earnings tracking
- [ ] Check payment split calculations
- [ ] Verify blob storage persistence
- [ ] Test error handling
- [ ] Load test payment processing
- [ ] Audit smart contracts
- [ ] Set up monitoring
- [ ] Update to mainnet URLs and wallet

---

## 📞 Support

For issues or questions:
1. Check [WALRUS_PAYMENT_SETUP.md](WALRUS_PAYMENT_SETUP.md) for detailed guide
2. Review component examples in [PropertyDetailViewExamples.tsx](src/components/PropertyDetailViewExamples.tsx)
3. Check backend payment service implementation in [payment-service.js](backend/payment-service.js)
4. Review test output and console logs for debugging

---

Last Updated: 24 January 2026
