# Environment Setup (.env) Reference

## Quick Setup

### Step 1: Create .env file

```bash
cd /Users/iboro/Downloads/Dwello
touch .env
```

### Step 2: Add Configuration

Copy and paste this template:

```env
# Server Configuration
PORT=3001
NODE_ENV=development

# Walrus Configuration (Testnet)
WALRUS_AGGREGATOR_URL=https://aggregator.walrus-testnet.walrus.space
WALRUS_PUBLISHER_URL=https://publisher.walrus-testnet.walrus.space

# Sui Configuration
SUI_NETWORK=testnet
SUI_RPC_URL=https://fullnode.testnet.sui.io

# Walrus Signer - IMPORTANT
# Get your Ed25519 private key in base64 format
# See BACKEND_SETUP.md for how to generate/get this key
WALRUS_PRIVATE_KEY=your_base64_encoded_key_here
```

### Step 3: Get Your Private Key

#### Option A: Generate New Test Key (If you have Sui CLI)

```bash
# Generate new address
sui client new-address ed25519

# Export the private key in base64
# Check ~/.sui/sui_config/sui.keystore and convert to base64
```

#### Option B: Use Existing Key

If you already have a keypair in base64:
1. Copy the private key
2. Paste it into WALRUS_PRIVATE_KEY
3. Make sure it's in base64 format

#### Option C: Development (Temporary)

```env
# Leave empty for auto-generated keypair (development only)
WALRUS_PRIVATE_KEY=

# The backend will generate a temporary keypair on startup
# Output will show the address like: 0x1234...
```

⚠️ **This is NOT for production** - always use a proper key in production.

### Step 4: Save and Restart

```bash
# Save .env file
# Then restart backend:
npm run dev

# Expected output:
# [Walrus] ✅ Connected to aggregator
# [Server] ✅ Server running on http://localhost:3001
```

## Environment Variables Explained

### Server

| Variable | Default | Purpose |
|----------|---------|---------|
| `PORT` | 3001 | Backend server port |
| `NODE_ENV` | development | Environment (development/production) |

### Walrus

| Variable | Default | Purpose |
|----------|---------|---------|
| `WALRUS_AGGREGATOR_URL` | Required | Walrus aggregator endpoint (testnet) |
| `WALRUS_PUBLISHER_URL` | Required | Walrus publisher endpoint (testnet) |
| `WALRUS_PRIVATE_KEY` | (auto-generated) | Ed25519 private key in base64 for signing |

### Sui

| Variable | Default | Purpose |
|----------|---------|---------|
| `SUI_NETWORK` | testnet | Sui network (testnet/mainnet) |
| `SUI_RPC_URL` | Required | Sui RPC endpoint for gas payment |

## Common Issues

### Missing WALRUS_PRIVATE_KEY

**Error**: `Failed to initialize signer`

**Solution**:
1. Generate or get your Ed25519 private key
2. Convert to base64: `echo -n "key_bytes" | base64`
3. Add to .env: `WALRUS_PRIVATE_KEY=base64_result`
4. Restart backend

### Invalid Base64 Format

**Error**: `Failed to decode WALRUS_PRIVATE_KEY`

**Solution**:
```bash
# Make sure key is valid base64
echo -n "your_key_here" | base64 -d | wc -c

# Should output: 32 (for Ed25519 keys)
```

### Walrus Connection Failed

**Error**: `Failed to connect to aggregator`

**Solution**:
1. Check URLs are correct (testnet URLs below)
2. Test connectivity: `curl https://aggregator.walrus-testnet.walrus.space/health`
3. Check internet connection
4. Verify NODE_ENV is development/testnet

## Testnet URLs

```
Aggregator: https://aggregator.walrus-testnet.walrus.space
Publisher: https://publisher.walrus-testnet.walrus.space
Sui RPC: https://fullnode.testnet.sui.io
```

## Production Setup

```env
# Production environment
PORT=3001
NODE_ENV=production

# Use secure key storage (Vault, AWS Secrets Manager, etc.)
WALRUS_PRIVATE_KEY=your_production_key_from_vault

# Production URLs (if using mainnet)
WALRUS_AGGREGATOR_URL=https://aggregator.walrus.space
WALRUS_PUBLISHER_URL=https://publisher.walrus.space
SUI_RPC_URL=https://fullnode.mainnet.sui.io
```

## Security Best Practices

✅ **DO**:
- Keep .env in .gitignore
- Use unique key for each environment
- Rotate keys regularly
- Store key in secure vault in production
- Use HTTPS in production
- Validate all inputs

❌ **DON'T**:
- Commit .env to git
- Share private key
- Use same key across environments
- Use weak key generation
- Leave development .env in production
- Hardcode keys in code

## Verification

After setup, verify everything works:

```bash
# 1. Start backend
npm run dev

# 2. In another terminal, test endpoints:
curl http://localhost:3001/health

# 3. Test Walrus connectivity:
curl http://localhost:3001/api/walrus/verify/test

# 4. Check logs for errors
```

## Support

Need help?
1. Check BACKEND_SETUP.md for detailed guide
2. Review logs for error messages
3. Verify URLs and keys are correct
4. Check internet connectivity to Walrus/Sui networks
