import { useState, useCallback, useRef } from 'react';
import { uploadToWalrus, uploadMultipleToWalrus } from '../walrus/client';
import type { Property } from '../types';
import '../styles/PropertyUpload.css';

interface PropertyUploadProps {
  onSuccess?: (property: Property) => void;
  onError?: (error: string) => void;
}

interface FormData {
  houseName: string;
  address: string;
  price: string;
  bedrooms: string;
  bathrooms: string;
  area: string;
  propertyType: string;
  country: string;
  state: string;
  city: string;
  description: string;
}

const PropertyUpload = ({ onSuccess, onError }: PropertyUploadProps) => {
  const [formData, setFormData] = useState<FormData>({
    houseName: '',
    address: '',
    price: '',
    bedrooms: '',
    bathrooms: '',
    area: '',
    propertyType: 'Apartment',
    country: '',
    state: '',
    city: '',
    description: '',
  });

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const { name, value } = e.target;
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
      setError(null);
    },
    []
  );

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Filter for images and videos only
    const validFiles = files.filter((file) =>
      file.type.startsWith('image/') || file.type.startsWith('video/')
    );

    if (validFiles.length !== files.length) {
      setError(
        `${files.length - validFiles.length} file(s) were skipped. Only images and videos are allowed.`
      );
    }

    setSelectedFiles((prev) => [...prev, ...validFiles]);

    // Create preview URLs
    const newPreviewUrls = validFiles.map((file) => URL.createObjectURL(file));
    setPreviewUrls((prev) => [...prev, ...newPreviewUrls]);
  }, []);

  const removeFile = useCallback(
    (index: number) => {
      setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
      setPreviewUrls((prev) => {
        const url = prev[index];
        URL.revokeObjectURL(url);
        return prev.filter((_, i) => i !== index);
      });
    },
    []
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.add('drag-over');
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.currentTarget.classList.remove('drag-over');
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');

    const files = Array.from(e.dataTransfer.files || []);
    const validFiles = files.filter(
      (file) => file.type.startsWith('image/') || file.type.startsWith('video/')
    );

    if (validFiles.length > 0) {
      setSelectedFiles((prev) => [...prev, ...validFiles]);
      const newPreviewUrls = validFiles.map((file) => URL.createObjectURL(file));
      setPreviewUrls((prev) => [...prev, ...newPreviewUrls]);
      setError(null);
    } else {
      setError('Only images and videos are allowed');
    }
  }, []);

  const validateForm = (): boolean => {
    if (!formData.houseName.trim()) {
      setError('Property name is required');
      return false;
    }
    if (!formData.address.trim()) {
      setError('Address is required');
      return false;
    }
    if (!formData.price || parseFloat(formData.price) <= 0) {
      setError('Valid price is required');
      return false;
    }
    if (selectedFiles.length === 0) {
      setError('At least one image is required');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!validateForm()) return;

    setUploading(true);
    setUploadProgress(0);

    try {
      // Upload images to Walrus
      const walrusResults = await uploadMultipleToWalrus(
        selectedFiles,
        (progress) => setUploadProgress(progress * 0.7) // 70% for uploads
      );

      setUploadProgress(75);

      // Prepare property data
      const propertyData = new FormData();
      propertyData.append('houseName', formData.houseName);
      propertyData.append('address', formData.address);
      propertyData.append('price', formData.price);
      propertyData.append('bedrooms', formData.bedrooms || '0');
      propertyData.append('bathrooms', formData.bathrooms || '0');
      propertyData.append('area', formData.area);
      propertyData.append('propertyType', formData.propertyType);
      propertyData.append('country', formData.country);
      propertyData.append('state', formData.state);
      propertyData.append('city', formData.city);
      propertyData.append('description', formData.description);

      // Add images
      for (const file of selectedFiles) {
        propertyData.append('images', file);
      }

      setUploadProgress(80);

      // Submit to backend API
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiUrl}/api/properties`, {
        method: 'POST',
        body: propertyData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create property');
      }

      const result = await response.json();
      setUploadProgress(100);

      // Reset form
      setFormData({
        houseName: '',
        address: '',
        price: '',
        bedrooms: '',
        bathrooms: '',
        area: '',
        propertyType: 'Apartment',
        country: '',
        state: '',
        city: '',
        description: '',
      });
      setSelectedFiles([]);
      previewUrls.forEach((url) => URL.revokeObjectURL(url));
      setPreviewUrls([]);

      setSuccess('Property uploaded successfully! 🎉');

      if (onSuccess) {
        onSuccess(result.property);
      }

      setTimeout(() => {
        setSuccess(null);
        setUploadProgress(0);
      }, 3000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed';
      setError(message);
      console.error('Upload error:', err);

      if (onError) {
        onError(message);
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="property-upload-container">
      <div className="upload-header">
        <h2>📍 Create New Property Listing</h2>
        <p>Upload images and details securely to Walrus & Sui blockchain</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <form onSubmit={handleSubmit} className="upload-form">
        {/* Property Details Section */}
        <section className="form-section">
          <h3>Property Details</h3>

          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="houseName">Property Name *</label>
              <input
                type="text"
                id="houseName"
                name="houseName"
                value={formData.houseName}
                onChange={handleInputChange}
                placeholder="e.g., Luxury Downtown Apartment"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="price">Price (USD) *</label>
              <input
                type="number"
                id="price"
                name="price"
                value={formData.price}
                onChange={handleInputChange}
                placeholder="0.00"
                step="0.01"
                min="0"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="propertyType">Property Type</label>
              <select
                id="propertyType"
                name="propertyType"
                value={formData.propertyType}
                onChange={handleInputChange}
              >
                <option>Apartment</option>
                <option>House</option>
                <option>Townhouse</option>
                <option>Condo</option>
                <option>Studio</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="bedrooms">Bedrooms</label>
              <input
                type="number"
                id="bedrooms"
                name="bedrooms"
                value={formData.bedrooms}
                onChange={handleInputChange}
                min="0"
                placeholder="0"
              />
            </div>

            <div className="form-group">
              <label htmlFor="bathrooms">Bathrooms</label>
              <input
                type="number"
                id="bathrooms"
                name="bathrooms"
                value={formData.bathrooms}
                onChange={handleInputChange}
                min="0"
                placeholder="0"
              />
            </div>

            <div className="form-group">
              <label htmlFor="area">Area (sq ft)</label>
              <input
                type="text"
                id="area"
                name="area"
                value={formData.area}
                onChange={handleInputChange}
                placeholder="e.g., 1,500"
              />
            </div>
          </div>
        </section>

        {/* Location Section */}
        <section className="form-section">
          <h3>Location</h3>

          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="address">Street Address *</label>
              <input
                type="text"
                id="address"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                placeholder="123 Main Street"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="city">City</label>
              <input
                type="text"
                id="city"
                name="city"
                value={formData.city}
                onChange={handleInputChange}
                placeholder="San Francisco"
              />
            </div>

            <div className="form-group">
              <label htmlFor="state">State/Province</label>
              <input
                type="text"
                id="state"
                name="state"
                value={formData.state}
                onChange={handleInputChange}
                placeholder="California"
              />
            </div>

            <div className="form-group">
              <label htmlFor="country">Country</label>
              <input
                type="text"
                id="country"
                name="country"
                value={formData.country}
                onChange={handleInputChange}
                placeholder="United States"
              />
            </div>
          </div>
        </section>

        {/* Description Section */}
        <section className="form-section">
          <h3>Description</h3>
          <div className="form-group full-width">
            <label htmlFor="description">Property Description</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Describe the property, amenities, features..."
              rows={5}
            />
          </div>
        </section>

        {/* Image Upload Section */}
        <section className="form-section">
          <h3>Images & Media</h3>

          <div
            className="drag-drop-zone"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="drag-drop-content">
              <div className="icon">📸</div>
              <h4>Drag & drop images/videos here</h4>
              <p>or click to browse from your computer</p>
              <small>Max 10 files, 100MB each (JPEG, PNG, WebP, GIF, MP4, WebM)</small>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,video/*"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
          </div>

          {selectedFiles.length > 0 && (
            <div className="preview-grid">
              {previewUrls.map((url, index) => (
                <div key={index} className="preview-item">
                  <div className="preview-image">
                    {selectedFiles[index].type.startsWith('video/') ? (
                      <video src={url} />
                    ) : (
                      <img src={url} alt={`Preview ${index + 1}`} />
                    )}
                    <div className="file-name">{selectedFiles[index].name}</div>
                  </div>
                  <button
                    type="button"
                    className="btn-remove"
                    onClick={() => removeFile(index)}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Upload Progress */}
        {uploading && (
          <div className="progress-section">
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${uploadProgress}%` }} />
            </div>
            <p className="progress-text">Uploading... {uploadProgress}%</p>
          </div>
        )}

        {/* Submit Button */}
        <div className="form-actions">
          <button
            type="submit"
            className="btn btn-primary"
            disabled={uploading || selectedFiles.length === 0}
          >
            {uploading ? `Uploading... ${uploadProgress}%` : 'Create Listing'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default PropertyUpload;
