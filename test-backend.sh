#!/bin/bash
# Test script to populate backend with sample properties for testing

API_URL="http://localhost:3001"
WALLET_ADDRESS="0xf6cfc32ba3753c4b2fd9748d092c3f9a72bdd98bca02928ce125eca34e8e8472"

echo "Testing backend endpoints..."
echo ""

# Test 1: Health check
echo "1. Health check:"
curl -s "$API_URL/api/health" | jq .
echo ""

# Test 2: Get all properties (should be empty)
echo "2. Getting all properties (before upload):"
curl -s "$API_URL/api/properties" | jq '.data | length'
echo ""

# Test 3: Get caretaker properties for the wallet
echo "3. Getting caretaker properties:"
curl -s "$API_URL/api/caretaker/$WALLET_ADDRESS/properties" | jq '.data | length'
echo ""

echo "Backend is ready! Upload properties via the frontend to test."
echo "Wallet address for testing: $WALLET_ADDRESS"
