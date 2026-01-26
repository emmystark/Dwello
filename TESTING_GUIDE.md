# Quick Start - Testing Caretaker Properties

## Prerequisites
✅ Backend is running: `node backend/api.js` (currently running on localhost:3001)
✅ Frontend dependencies installed: `npm install`
✅ Code changes applied and committed

## Step 1: Add Your Wallet to Caretaker Whitelist
Edit `src/walrus/caretakers.txt` and add your wallet address:
```
0xf6cfc32ba3753c4b2fd9748d092c3f9a72bdd98bca02928ce125eca34e8e8472
```

## Step 2: Start Frontend Development Server
```bash
npm run dev
```
Open http://localhost:5173 in your browser

## Step 3: Connect Wallet & Switch to Caretaker Portal
1. Click "Connect Wallet" button
2. Connect your Sui testnet wallet
3. Click "Caretaker Portal" button
4. Should see dashboard with tabs: Dashboard, My Inventory, Add New Listing

## Step 4: Upload a Test Property
1. Click "Add New Listing" tab
2. Fill required fields:
   - **House Name**: e.g., "Beautiful Apartment"
   - **Address**: e.g., "123 Main Street"
   - **Price**: e.g., "5000"
   - **Country**: Select from dropdown (e.g., Nigeria)
   - **State**: Select from dropdown (e.g., Lagos)
   - **City**: Select from dropdown (e.g., Ikeja)
   - **Bedrooms**: e.g., "3"
   - **Bathrooms**: e.g., "2"
3. Click to upload images or drag & drop
4. Click "Upload to Walrus" button
5. Click "Add to Blockchain" button

## Step 5: Verify Property Appears
✅ In Caretaker Dashboard:
- Go to "My Inventory" tab
- Property should appear immediately with uploaded images

✅ In Customer View:
- Click "Customer View" to return to user mode
- Select same location (Nigeria > Lagos > Ikeja)
- Property should appear in the property list

## Wallet Balance Display
When wallet is connected, you'll see:
- **Wallet Address**: Short format (0x1234...5678)
- **SUI Balance**: Updates every 10 seconds from testnet RPC
- Shows in header when connected

## What to Check

### Backend Endpoints
```bash
# Check all properties
curl http://localhost:3001/api/properties | jq .

# Check your properties as caretaker
curl http://localhost:3001/api/caretaker/0xf6cfc32ba3753c4b2fd9748d092c3f9a72bdd98bca02928ce125eca34e8e8472/properties | jq .
```

### Expected Results
- After upload: Properties have `caretakerAddress` field
- Properties visible in both caretaker and customer views
- Images from Walrus load correctly
- Location filtering works

## Troubleshooting

**Backend Error: Cannot find package 'multer'**
→ Run: `npm install`

**Backend not responding**
→ Check if running: `lsof -i :3001`
→ Restart: `node backend/api.js`

**Properties not showing on frontend**
→ Check browser console for errors
→ Verify wallet address is in caretakers.txt
→ Ensure location filters match uploaded property location

**Images not loading**
→ Walrus network might be down, check:
→ https://walrus-testnet.walrus.space/v1/blobs/{blobId}

**Wallet not connecting**
→ Install Sui testnet wallet: https://sui.io/
→ Make sure you have testnet selected
→ Add to `SUI_ADMINS` if needed in contract

## Success Indicators
✅ Can connect wallet
✅ Can upload property from caretaker dashboard
✅ Property appears in "My Inventory" immediately after upload
✅ Property appears in customer property list after location selection
✅ Wallet balance displays and updates
✅ Images load from Walrus storage
✅ Can switch between customer and caretaker views

## Need Help?
- Check `CARETAKER_PROPERTIES_FIX.md` for technical details
- Review backend logs: `tail -f /tmp/backend.log`
- Test endpoints with curl commands above
