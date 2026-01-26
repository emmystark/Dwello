# Walrus + Payment Setup - Developer Checklist

Use this checklist to track your progress through the setup process.

---

## 🔧 Prerequisites Setup

- [ ] **Install Sui CLI**
  ```bash
  brew install sui
  sui --version
  ```

- [ ] **Install Walrus CLI**
  ```bash
  cargo install walrus-cli --locked
  walrus --version
  ```

- [ ] **Create Testnet Wallet**
  ```bash
  sui client new
  # Select "Testnet"
  ```

- [ ] **Get Testnet SUI**
  ```bash
  sui client faucet
  sui client balance
  # Verify you have at least 0.1 SUI
  ```

- [ ] **Request Testnet USDC** (via faucet or bridge)
  - Navigate to testnet faucet
  - Request USDC
  - Verify balance: `sui client balance --coin-type <USDC_TYPE>`

---

## 📁 Project Setup

- [ ] **Install Dependencies**
  ```bash
  npm install
  ```

- [ ] **Copy Environment Template**
  ```bash
  cp .env.example .env
  ```

- [ ] **Update .env File**
  - [ ] `VITE_WALRUS_AGGREGATOR=https://aggregator.walrus-testnet.walrus.space`
  - [ ] `VITE_WALRUS_PUBLISHER=https://publisher.walrus-testnet.walrus.space`
  - [ ] `VITE_PAYMENT_AMOUNT=10000`
  - [ ] `VITE_PLATFORM_WALLET=<your_platform_wallet>`
  - [ ] `PORT=3001`

---

## 📦 Smart Contract Deployment

- [ ] **Review Smart Contracts**
  - [ ] Read `src/contract/sources/payment.move`
  - [ ] Read `src/contract/sources/house.move`
  - [ ] Understand payment split (70/30)
  - [ ] Understand AccessPass NFT mechanism

- [ ] **Publish Contracts to Testnet**
  ```bash
  cd src/contract
  sui client publish --gas-budget 10000000
  ```

- [ ] **Save Contract IDs**
  - [ ] Package ID: `0x...`
  - [ ] House Module ID: `0x...`
  - [ ] Payment Module ID: `0x...`
  - [ ] CaretakerEarnings Table ID: `0x...` (shared object)

- [ ] **Update Environment Variables**
  ```env
  VITE_PACKAGE_ID=0x...
  VITE_CARETAKER_EARNINGS_TABLE_ID=0x...
  ```

- [ ] **Verify Deployment**
  ```bash
  sui client objects
  # Look for published objects
  ```

---

## 🚀 Backend Setup

- [ ] **Verify Payment Service**
  - [ ] Check `backend/payment-service.js` exists
  - [ ] Review all exported functions
  - [ ] Understand SUI RPC integration

- [ ] **Verify API Routes**
  - [ ] Check `backend/api.js` has payment routes
  - [ ] Verify middleware functions
  - [ ] Check endpoint list matches documentation

- [ ] **Start Backend Server**
  ```bash
  npm run dev
  # In another terminal
  node backend/server.js
  # Should see: 🚀 API server running on http://localhost:3001
  ```

- [ ] **Test Backend Health**
  ```bash
  curl http://localhost:3001/api/health
  # Should return 200 with status: "ok"
  ```

---

## 🎨 Frontend Setup

- [ ] **Verify React Hooks**
  - [ ] Check `src/hooks/usePaymentGate.ts` exists
  - [ ] Review `usePaymentGate()` implementation
  - [ ] Review `usePaymentTransaction()` implementation

- [ ] **Verify Components**
  - [ ] Check `src/components/PaymentGate.tsx` exists
  - [ ] Review component props
  - [ ] Check styling is imported

- [ ] **Verify Styles**
  - [ ] Check `src/styles/PaymentGate.css` exists
  - [ ] Verify all CSS classes
  - [ ] Test responsive design

- [ ] **Verify Walrus Client**
  - [ ] Check `src/walrus/client.ts` updated
  - [ ] Verify payment functions exist
  - [ ] Check TypeScript interfaces

- [ ] **Start Frontend Dev Server**
  ```bash
  npm run dev
  # Should start on http://localhost:5173 (or similar)
  ```

---

## 🧪 Testing - Image Upload

- [ ] **Test Walrus Upload (Browser)**
  - [ ] Navigate to property upload component
  - [ ] Select test image
  - [ ] Click upload
  - [ ] Should see blob ID in response
  - [ ] Verify image URL works

- [ ] **Test Walrus Upload (API)**
  ```bash
  curl -X PUT "https://publisher.walrus-testnet.walrus.space/v1/blobs?epochs=3&deletable=true" \
    --data-binary "@test-image.jpg"
  # Should return blob_id
  ```

- [ ] **Verify Blob Exists**
  ```bash
  curl -I "https://aggregator.walrus-testnet.walrus.space/v1/blobs/<BLOB_ID>"
  # Should return 200
  ```

---

## 💰 Testing - Payment Flow

- [ ] **Test Payment Status Check (Not Paid)**
  ```bash
  curl "http://localhost:3001/api/payment-status?userAddress=0x...&propertyId=prop_123"
  # Should return hasPaid: false
  ```

- [ ] **Create Test Property (in Move)**
  ```bash
  sui client call --package <PACKAGE_ID> --module house --function create_house ...
  # Create a test house
  ```

- [ ] **Execute Payment (in Move)**
  ```bash
  # Use wallet to call payment.move::pay_for_access
  # Send 0.01 USDC
  ```

- [ ] **Verify AccessPass Created**
  ```bash
  sui client objects
  # Look for AccessPass object
  ```

- [ ] **Test Payment Status Check (After Payment)**
  ```bash
  curl "http://localhost:3001/api/payment-status?userAddress=0x...&propertyId=<HOUSE_ID>"
  # Should return hasPaid: true
  ```

---

## 🎯 Testing - Component Integration

- [ ] **Test Payment Gate - No Wallet**
  - [ ] Navigate to component
  - [ ] Should show "Connect Wallet" message
  - [ ] Should show lock icon

- [ ] **Test Payment Gate - Wallet Connected, No Payment**
  - [ ] Connect wallet
  - [ ] Navigate to property detail
  - [ ] Should show payment modal
  - [ ] Check fee breakdown (0.007 + 0.003)
  - [ ] Verify all fields populated

- [ ] **Test Payment Gate - After Payment**
  - [ ] Click "Pay to Unlock"
  - [ ] Sign transaction with wallet
  - [ ] Wait for confirmation
  - [ ] Should show content
  - [ ] Verify no overlay

- [ ] **Test Hook - usePaymentGate**
  - [ ] Check loading state
  - [ ] Check payment verification
  - [ ] Check refetch function
  - [ ] Monitor console for errors

---

## 📊 Testing - Backend API

- [ ] **Test Payment Status Endpoint**
  - [ ] Valid payment: returns hasPaid: true
  - [ ] No payment: returns hasPaid: false
  - [ ] Missing params: returns 400 error
  - [ ] Invalid address: handles gracefully

- [ ] **Test Access Verification**
  - [ ] With valid payment: returns accessGranted: true
  - [ ] Without payment: returns accessGranted: false
  - [ ] With invalid blob: returns blobValid: false
  - [ ] Handles errors gracefully

- [ ] **Test Protected Routes**
  - [ ] `/api/properties/:id/details` requires payment
  - [ ] `/api/properties/:id/images` requires payment
  - [ ] `/api/walrus/blob/:blobId` requires payment
  - [ ] Unauthorized requests return 403

- [ ] **Test Caretaker Routes**
  - [ ] `/api/is-caretaker/:address` works
  - [ ] `/api/caretaker/:address/properties-onchain` works
  - [ ] Returns correct data

---

## 🔍 Debugging Checklist

- [ ] **Payment Verification Fails**
  - [ ] Check wallet address is correct
  - [ ] Verify AccessPass was minted
  - [ ] Check caretaker_earnings object exists
  - [ ] Review browser console logs
  - [ ] Review backend server logs

- [ ] **Walrus Upload Fails**
  - [ ] Check Walrus publisher URL
  - [ ] Verify network connectivity
  - [ ] Check file size (< 100MB)
  - [ ] Check file format
  - [ ] Review response from Walrus

- [ ] **Component Doesn't Show**
  - [ ] Verify imports are correct
  - [ ] Check CSS is imported
  - [ ] Verify parent component renders
  - [ ] Check browser console for errors
  - [ ] Verify z-index doesn't conflict

- [ ] **Backend Server Won't Start**
  - [ ] Check PORT is not in use: `lsof -i :3001`
  - [ ] Verify Node.js is installed
  - [ ] Check .env file exists
  - [ ] Review error message in console

- [ ] **Transaction Fails**
  - [ ] Check wallet has enough SUI for gas
  - [ ] Verify USDC balance
  - [ ] Check contract is deployed
  - [ ] Verify object IDs are correct
  - [ ] Check network is testnet

---

## 📈 Performance Testing

- [ ] **Load Test - Image Upload**
  - [ ] Upload 10 images sequentially
  - [ ] Verify all blob IDs returned
  - [ ] Check upload speed (target: < 5s per image)

- [ ] **Load Test - Payment Check**
  - [ ] Call payment-status 100 times
  - [ ] Measure response time (target: < 1s)
  - [ ] Check for rate limiting

- [ ] **Stress Test - Component**
  - [ ] Render 50 PaymentGate components
  - [ ] Check performance in DevTools
  - [ ] Verify memory usage

---

## 📱 Responsive Design Testing

- [ ] **Desktop (1920x1080)**
  - [ ] Payment modal displays correctly
  - [ ] All buttons clickable
  - [ ] Fee breakdown readable

- [ ] **Tablet (768x1024)**
  - [ ] Payment modal responsive
  - [ ] Text readable
  - [ ] Touch targets >= 44x44px

- [ ] **Mobile (375x812)**
  - [ ] Payment modal fits screen
  - [ ] No horizontal scroll
  - [ ] Buttons easily tappable
  - [ ] Fee breakdown stacked nicely

---

## 🔐 Security Checklist

- [ ] **Private Keys**
  - [ ] Private keys not in .env (use .gitignore)
  - [ ] Never commit .env file
  - [ ] Use environment variables for secrets

- [ ] **API Security**
  - [ ] Verify payment server-side
  - [ ] Validate all inputs
  - [ ] Use HTTPS in production
  - [ ] Add rate limiting

- [ ] **Smart Contracts**
  - [ ] Review access controls
  - [ ] Check for arithmetic overflow
  - [ ] Verify payment split logic
  - [ ] Test edge cases

---

## 📝 Documentation

- [ ] **Read Setup Guide**
  - [ ] Read WALRUS_PAYMENT_SETUP.md (entire)
  - [ ] Understand all sections
  - [ ] Note any custom configurations

- [ ] **Read Quick Reference**
  - [ ] Read WALRUS_PAYMENT_QUICK_REFERENCE.md
  - [ ] Bookmark API endpoints
  - [ ] Save function signatures

- [ ] **Review Examples**
  - [ ] Review PropertyDetailViewExamples.tsx
  - [ ] Understand 4 different approaches
  - [ ] Choose best fit for your use case

- [ ] **Check Code Comments**
  - [ ] Review JSDoc comments
  - [ ] Understand function purposes
  - [ ] Review inline comments

---

## 🚢 Pre-Production Deployment

- [ ] **Code Review**
  - [ ] Review payment-service.js
  - [ ] Review PaymentGate component
  - [ ] Review API routes
  - [ ] Check error handling

- [ ] **Test Coverage**
  - [ ] All payment flows tested
  - [ ] All edge cases tested
  - [ ] Error scenarios tested
  - [ ] Performance acceptable

- [ ] **Security Audit**
  - [ ] Smart contracts reviewed
  - [ ] No obvious vulnerabilities
  - [ ] API inputs validated
  - [ ] Private keys secured

- [ ] **Configuration Review**
  - [ ] All env vars set
  - [ ] URLs correct for network
  - [ ] Payment amounts correct
  - [ ] Gas budgets sufficient

- [ ] **Documentation Complete**
  - [ ] Setup guide complete
  - [ ] API documented
  - [ ] Integration examples provided
  - [ ] Troubleshooting guide written

---

## 🎉 Final Verification

- [ ] **Full End-to-End Flow**
  1. [ ] Start backend server
  2. [ ] Start frontend dev server
  3. [ ] Connect wallet to app
  4. [ ] Create/upload property with images
  5. [ ] View property (payment gate shows)
  6. [ ] Execute payment (sign in wallet)
  7. [ ] Verify AccessPass minted
  8. [ ] Verify content unlocked
  9. [ ] Verify caretaker earnings recorded

- [ ] **Smoke Tests**
  - [ ] All pages load without errors
  - [ ] No console errors
  - [ ] All buttons clickable
  - [ ] All forms submittable

---

## 📚 Resources

| Resource | Link |
|----------|------|
| Walrus Docs | https://docs.wal.app/ |
| Sui Docs | https://docs.sui.io/ |
| Move Guide | https://move-language.github.io/ |
| Sui Explorer | https://explorer.sui.io/ |
| GitHub Repo | https://github.com/emmystark/Dwello.git |

---

## ✅ Completion Status

- [ ] All prerequisites installed
- [ ] Environment configured
- [ ] Contracts deployed
- [ ] Backend running
- [ ] Frontend running
- [ ] Payment flow tested
- [ ] Component integrated
- [ ] Documentation reviewed
- [ ] Ready for production

**Status:** ________________

**Date Completed:** ________________

**Notes:**
```
[Add any notes or issues encountered]



```

---

**Last Updated:** 24 January 2026
