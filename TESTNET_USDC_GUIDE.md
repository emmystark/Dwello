# Getting Testnet USDC - Complete Guide

## 🎯 Overview

To test the payment system on Sui testnet, you need fake USDC. Here are all the ways to get it:

---

## Option 1: Sui Testnet Faucet (Easiest) ✨

### Step 1: Get Testnet SUI First
```bash
# Go to Sui testnet faucet
# URL: https://faucet.testnet.sui.io/

# Or use CLI:
sui client faucet
```

### Step 2: Swap SUI to USDC on a Testnet Bridge

Use one of these testnet bridges/DEXs:

#### **Turbos (Recommended)**
- URL: https://app.turbos.finance/
- Network: Select **Testnet**
- Steps:
  1. Connect wallet with testnet SUI
  2. Navigate to Swap section
  3. Swap SUI → USDC
  4. Get ~1000 USDC per SUI (rates vary)

#### **Cetus Protocol**
- URL: https://www.cetus.zone/
- Network: Select **Testnet**
- Steps:
  1. Connect wallet
  2. Find SUI/USDC pool
  3. Swap SUI for USDC

---

## Option 2: Get USDC from Faucet Directly

Some testnet faucets provide USDC tokens directly:

### Sui Testnet Faucet + USDC Module

If the standard faucet has USDC:
```bash
# Check available coins at faucet UI
# https://faucet.testnet.sui.io/
# Look for "Request Tokens" dropdown
```

---

## Option 3: Deploy Your Own USDC Token (Advanced) 🚀

If you can't find testnet USDC, create a test coin:

### Step 1: Create Test Coin Move Module

Create `test_usdc.move`:

```move
module test::test_usdc {
    use sui::coin;
    use sui::transfer;
    use std::option;
    use sui::tx_context::TxContext;

    struct TEST_USDC has drop {}

    fun init(witness: TEST_USDC, ctx: &mut TxContext) {
        let (treasury, metadata) = coin::create_currency(
            witness,
            6,  // decimals
            b"USDC",
            b"Test USDC",
            b"Test USDC for Dwello",
            option::none(),
            ctx,
        );

        transfer::public_freeze_object(metadata);
        transfer::public_transfer(treasury, tx_context::sender(ctx));
    }
}
```

### Step 2: Mint Tokens

```bash
# Publish the module
sui client publish --path path/to/test --gas-budget 10000000

# Get the Treasury Cap from the transaction output
# Then mint tokens using the Treasury Cap
```

---

## Option 4: Use Existing Testnet USDC Contract

The testnet already has a USDC contract you can request from:

### Contract Info
- **Type:** `0xa1ec7fc00a6f40db9693ad1415d0c193ad3906494428cf252621037bd7117e29::usdc::USDC`
- **Network:** Sui Testnet

### Get USDC:
1. Go to https://testnet.stats.sui.io/
2. Click "Faucet"
3. Look for "USDC" in the dropdown
4. Request tokens

---

## Verifying You Have USDC

### Via CLI:
```bash
# Check your balance
sui client balance --coin-type 0xa1ec7fc00a6f40db9693ad1415d0c193ad3906494428cf252621037bd7117e29::usdc::USDC

# Or check all coins
sui client balance

# Expected output:
# Showing coins for address: 0x...
# ╭────────────────────────────────────────────────────────────────────────╮
# │ coin                       │ balance │ coin_type                      │
# ├────────────────────────────────────────────────────────────────────────┤
# │ [Object ID]                │ 1000000 │ 0xa1ec7fc00a6f40db9693ad... │
# ╰────────────────────────────────────────────────────────────────────────╯
```

### Via Sui Explorer:
1. Go to https://testnet.suiscan.xyz/
2. Search for your wallet address
3. Look for USDC in the "Coins" section

---

## 💡 Payment Testing Setup

### 1. Ensure You Have:
- [ ] Testnet SUI (for gas fees)
- [ ] Testnet USDC (for payment testing)
- [ ] Connected wallet showing testnet network

### 2. Check Dwello Configuration:

In `.env`:
```env
# Confirm testnet settings
VITE_SUI_NETWORK=testnet
VITE_SUI_FULL_NODE=https://fullnode.testnet.sui.io
VITE_PAYMENT_AMOUNT=10000  # 0.01 USDC base units (6 decimals)
```

### 3. Test Payment:

1. Upload property with images & amounts
2. Connect wallet to dapp
3. Click "View Details" → "Pay to Unlock"
4. Confirm transaction in wallet
5. Payment processed!

---

## 🔄 Payment Flow with Testnet USDC

```
┌─────────────────────────────────────────┐
│ 1. Get Testnet SUI                      │
│    sui client faucet                    │
└──────────────────┬──────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│ 2. Swap SUI → USDC                      │
│    Use Turbos / Cetus                   │
└──────────────────┬──────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│ 3. Verify USDC Balance                  │
│    sui client balance --coin-type ...   │
└──────────────────┬──────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│ 4. Create Property with Images          │
│    Add amounts per image                │
└──────────────────┬──────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│ 5. Connect Wallet to Dwello             │
│    Sign in with testnet wallet          │
└──────────────────┬──────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│ 6. Execute Payment                      │
│    Click "Pay to Unlock"                │
│    Sign transaction                     │
└──────────────────┬──────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│ 7. View Unlocked Content                │
│    See images with amounts              │
│    Message caretaker in chat            │
└─────────────────────────────────────────┘
```

---

## 🐛 Troubleshooting

### "No USDC coins available"
**Solution:** Swap SUI to USDC on Turbos or Cetus testnet

### "Transaction failed: insufficient funds"
**Solution:** 
- Get more testnet SUI: `sui client faucet`
- Get more testnet USDC: Swap more SUI

### "USDC type not found"
**Solution:** Use correct USDC type:
```
0xa1ec7fc00a6f40db9693ad1415d0c193ad3906494428cf252621037bd7117e29::usdc::USDC
```

### "Coin not visible in wallet UI"
**Solution:** 
- Refresh wallet
- Check correct network is selected
- Try `sui client balance` in CLI

---

## 📊 Testnet USDC Info

| Property | Value |
|----------|-------|
| Network | Sui Testnet |
| Decimals | 6 |
| Type | 0xa1ec7fc00a6f40db9693ad... |
| Faucet | Turbos / Cetus / Direct |
| Min for testing | 0.01 USDC |

---

## ⚡ Quick Start Commands

```bash
# 1. Get SUI
sui client faucet

# 2. Check balance
sui client balance

# 3. List all coins
sui client objects

# 4. Check specific coin type
sui client balance --coin-type 0xa1ec7fc00a6f40db9693ad1415d0c193ad3906494428cf252621037bd7117e29::usdc::USDC

# 5. View on explorer
# https://testnet.suiscan.xyz/address/YOUR_ADDRESS
```

---

## 🔐 Important Notes

⚠️ **Testnet Only!**
- These are NOT real tokens
- Testnet resets periodically
- All tokens have NO value
- Use for testing ONLY

✅ **For Production:**
- Use mainnet USDC
- Real SUI gas fees apply
- Real money involved
- Follow security best practices

---

## 📞 Still Need Help?

1. **Check Sui Discord:** https://discord.gg/sui
2. **Sui Docs:** https://docs.sui.io/
3. **Testnet Status:** https://testnet.stats.sui.io/
4. **Block Explorer:** https://testnet.suiscan.xyz/

---

**Last Updated:** 24 January 2026  
**Status:** Ready for Testing ✅
