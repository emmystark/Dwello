// test-api.js
// Example script to test the API endpoints

import fetch from 'node-fetch';
import FormData from 'form-data';
import fs from 'fs';

const API_BASE = 'http://localhost:3001/api';
const TEST_WALLET = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1'; // Example address

async function testHealthCheck() {
  console.log('\n🔍 Testing health check...');
  const response = await fetch(`${API_BASE}/health`);
  const data = await response.json();
  console.log('✅ Health check:', data);
  return data;
}

async function testFileUpload(filePath) {
  console.log('\n📤 Testing file upload...');
  
  const formData = new FormData();
  formData.append('file', fs.createReadStream(filePath));
  formData.append('title', 'Test Property Image');
  formData.append('caretakerAddress', TEST_WALLET);

  const response = await fetch(`${API_BASE}/walrus/upload`, {
    method: 'POST',
    body: formData,
  });

  const data = await response.json();
  console.log('✅ Upload result:', data);
  return data;
}

async function testCreateProperty(blobId, imageUrl) {
  console.log('\n🏠 Testing property creation...');
  
  const propertyData = {
    houseName: 'Test Luxury Apartment',
    address: '123 Test Street, Blockchain District',
    price: '50000',
    bedrooms: '3',
    bathrooms: '2',
    area: '150 sqm',
    propertyType: 'Apartment',
    country: 'United States',
    state: 'California',
    city: 'Los Angeles',
    description: 'Beautiful test property with ocean views',
    caretakerAddress: TEST_WALLET,
    imagesWithAmounts: [
      {
        blobId: blobId,
        url: imageUrl,
        amount: 0,
        uploadedAt: new Date().toISOString(),
      }
    ],
    blobIds: [blobId],
  };

  const response = await fetch(`${API_BASE}/properties/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(propertyData),
  });

  const data = await response.json();
  console.log('✅ Property created:', data);
  return data;
}

async function testGetProperties() {
  console.log('\n📋 Testing get properties...');
  
  const response = await fetch(`${API_BASE}/properties?caretakerAddress=${TEST_WALLET}`);
  const data = await response.json();
  console.log(`✅ Found ${data.count} properties`);
  return data;
}

async function testGetSingleProperty(propertyId) {
  console.log('\n🔍 Testing get single property...');
  
  const response = await fetch(`${API_BASE}/properties/${propertyId}`);
  const data = await response.json();
  console.log('✅ Property details:', data);
  return data;
}

async function testUpdateProperty(propertyId) {
  console.log('\n✏️ Testing property update...');
  
  const updateData = {
    price: '55000',
    description: 'Updated: Now with renovated kitchen!',
  };

  const response = await fetch(`${API_BASE}/properties/${propertyId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updateData),
  });

  const data = await response.json();
  console.log('✅ Property updated:', data);
  return data;
}

// Main test runner
async function runTests() {
  try {
    console.log('🧪 Starting API tests...');
    console.log('=====================================\n');

    // 1. Health check
    await testHealthCheck();

    // 2. File upload (requires a test image)
    // Uncomment if you have a test image file
    // const uploadResult = await testFileUpload('./test-image.jpg');
    // const blobId = uploadResult.blobId;
    // const imageUrl = uploadResult.url;

    // For testing without actual file upload
    const blobId = 'test-blob-id-12345';
    const imageUrl = 'https://aggregator.walrus-testnet.walrus.space/v1/test-blob-id-12345';

    // 3. Create property
    const propertyResult = await testCreateProperty(blobId, imageUrl);
    const propertyId = propertyResult.property.id || propertyResult.property._id;

    // 4. Get all properties
    await testGetProperties();

    // 5. Get single property
    await testGetSingleProperty(propertyId);

    // 6. Update property
    await testUpdateProperty(propertyId);

    // 7. Get updated property
    await testGetSingleProperty(propertyId);

    console.log('\n=====================================');
    console.log('✅ All tests completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error);
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests();
}

export { runTests, testHealthCheck, testFileUpload, testCreateProperty };