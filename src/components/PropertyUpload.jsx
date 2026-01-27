// components/PropertyUpload.jsx
// Component for caretakers to upload properties with Walrus + Sui integration

import React, { useState } from 'react';
import { useCurrentAccount, useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { uploadMultipleToWalrus, getWalrusUrl } from '../lib/walrusUpload';
import { createPropertyListing } from '../lib/suiBlockchain';

export default function PropertyUpload() {
  const currentAccount = useCurrentAccount();
  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    location: '',
  });
  const [images, setImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // Handle form input changes
  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  // Handle image selection
  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files);
    
    if (files.length > 5) {
      setError('Maximum 5 images allowed');
      return;
    }

    setImages(files);
    
    // Create previews
    const previews = files.map(file => URL.createObjectURL(file));
    setImagePreviews(previews);
    setError(null);
  };

  // Remove image from selection
  const removeImage = (index) => {
    const newImages = images.filter((_, i) => i !== index);
    const newPreviews = imagePreviews.filter((_, i) => i !== index);
    setImages(newImages);
    setImagePreviews(newPreviews);
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setResult(null);

    // Validation
    if (!currentAccount?.address) {
      setError('Please connect your Sui wallet first');
      return;
    }

    if (!formData.title || !formData.price || !formData.location) {
      setError('Please fill in all required fields');
      return;
    }

    if (images.length === 0) {
      setError('Please select at least one image');
      return;
    }

    setUploading(true);
    setUploadProgress('Uploading images to Walrus...');

    try {
      // Step 1: Upload images to Walrus
      const walrusResults = await uploadMultipleToWalrus(images, true);
      
      const failedUploads = walrusResults.filter(r => !r.success);
      if (failedUploads.length > 0) {
        throw new Error(`Failed to upload ${failedUploads.length} images`);
      }

      const blobIds = walrusResults.map(r => r.blobId);
      console.log('Images uploaded to Walrus:', blobIds);

      // Step 2: Create property on Sui blockchain
      setUploadProgress('Creating property on blockchain...');
      
      const propertyResult = await createPropertyListing({
        title: formData.title,
        description: formData.description,
        price: parseInt(formData.price),
        location: formData.location,
        walrusBlobIds: blobIds,
        caretakerAddress: currentAccount.address,
        signAndExecute: signAndExecuteTransaction,
      });

      console.log('Property created:', propertyResult);

      // Success!
      setResult({
        houseId: propertyResult.houseId,
        digest: propertyResult.digest,
        blobIds,
        imageUrls: blobIds.map(id => getWalrusUrl(id)),
      });

      // Reset form
      setFormData({ title: '', description: '', price: '', location: '' });
      setImages([]);
      setImagePreviews([]);
      setUploadProgress('');

    } catch (err) {
      console.error('Upload error:', err);
      setError(err.message || 'Failed to create property');
      setUploadProgress('');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <h1 style={{ fontSize: '24px', marginBottom: '20px' }}>List New Property</h1>

      {!currentAccount ? (
        <div style={{ 
          padding: '20px', 
          backgroundColor: '#fee', 
          borderRadius: '8px',
          marginBottom: '20px' 
        }}>
          <p style={{ color: '#c00', marginBottom: '10px' }}>
            Connect your Sui wallet to list properties
          </p>
          {/* Add ConnectButton from @mysten/dapp-kit here */}
        </div>
      ) : (
        <div style={{ 
          padding: '15px', 
          backgroundColor: '#efe', 
          borderRadius: '8px',
          marginBottom: '20px' 
        }}>
          <p style={{ color: '#060', fontSize: '14px' }}>
            Connected: {currentAccount.address.slice(0, 8)}...{currentAccount.address.slice(-6)}
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Title */}
        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
            Property Title *
          </label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleInputChange}
            placeholder="e.g., Modern 3BR Apartment in Victoria Island"
            required
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid #ddd',
              fontSize: '14px',
            }}
          />
        </div>

        {/* Description */}
        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
            Description
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            placeholder="Describe the property, amenities, and features..."
            rows={4}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid #ddd',
              fontSize: '14px',
              fontFamily: 'inherit',
            }}
          />
        </div>

        {/* Price and Location */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
              Price (MIST) *
            </label>
            <input
              type="number"
              name="price"
              value={formData.price}
              onChange={handleInputChange}
              placeholder="100000000"
              required
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid #ddd',
                fontSize: '14px',
              }}
            />
            <p style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
              1 SUI = 1,000,000,000 MIST
            </p>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
              Location *
            </label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleInputChange}
              placeholder="e.g., Lagos, Nigeria"
              required
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid #ddd',
                fontSize: '14px',
              }}
            />
          </div>
        </div>

        {/* Image Upload */}
        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
            Property Images * (Max 5)
          </label>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageSelect}
            disabled={uploading}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '8px',
              border: '2px dashed #3b82f6',
              backgroundColor: '#eff6ff',
              cursor: uploading ? 'not-allowed' : 'pointer',
            }}
          />

          {/* Image Previews */}
          {imagePreviews.length > 0 && (
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', 
              gap: '10px',
              marginTop: '15px'
            }}>
              {imagePreviews.map((preview, index) => (
                <div key={index} style={{ position: 'relative' }}>
                  <img
                    src={preview}
                    alt={`Preview ${index + 1}`}
                    style={{
                      width: '100%',
                      height: '150px',
                      objectFit: 'cover',
                      borderRadius: '8px',
                      border: '2px solid #ddd',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    disabled={uploading}
                    style={{
                      position: 'absolute',
                      top: '5px',
                      right: '5px',
                      backgroundColor: '#ef4444',
                      color: 'white',
                      border: 'none',
                      borderRadius: '50%',
                      width: '24px',
                      height: '24px',
                      cursor: uploading ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upload Progress */}
        {uploadProgress && (
          <div style={{
            padding: '15px',
            backgroundColor: '#fef3c7',
            borderRadius: '8px',
            color: '#92400e',
            fontSize: '14px',
            textAlign: 'center',
          }}>
            {uploadProgress}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div style={{
            padding: '15px',
            backgroundColor: '#fee',
            borderRadius: '8px',
            color: '#c00',
            fontSize: '14px',
          }}>
            {error}
          </div>
        )}

        {/* Success Result */}
        {result && (
          <div style={{
            padding: '20px',
            backgroundColor: '#d1fae5',
            borderRadius: '8px',
            color: '#065f46',
          }}>
            <h3 style={{ marginBottom: '10px', fontSize: '16px' }}>
              ✓ Property Listed Successfully!
            </h3>
            <p style={{ fontSize: '13px', marginBottom: '8px' }}>
              <strong>Property ID:</strong> {result.houseId}
            </p>
            <p style={{ fontSize: '13px', marginBottom: '8px' }}>
              <strong>Transaction:</strong> {result.digest}
            </p>
            <p style={{ fontSize: '13px', marginBottom: '8px' }}>
              <strong>Images:</strong> {result.blobIds.length} uploaded to Walrus
            </p>
            <div style={{ marginTop: '10px' }}>
              <a
                href={`https://suiscan.xyz/testnet/tx/${result.digest}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#059669', textDecoration: 'underline' }}
              >
                View on Sui Explorer →
              </a>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={uploading || !currentAccount}
          style={{
            padding: '15px',
            backgroundColor: uploading || !currentAccount ? '#9ca3af' : '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: uploading || !currentAccount ? 'not-allowed' : 'pointer',
            transition: 'background-color 0.2s',
          }}
        >
          {uploading ? 'Uploading...' : 'List Property'}
        </button>
      </form>
    </div>
  );
}