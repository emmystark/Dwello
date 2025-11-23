import { useState } from 'react';
import { uploadMultipleToWalrus, getWalrusBlobUrl } from '../walrus/client';
import type { Property, Apartment } from '../types';
import '../styles/AddNewListing.css';
import { useDwelloPayments } from '../payment';

interface AddNewListingProps {
  onAddProperty: (property: Property) => void;
}

const AddNewListing = ({ onAddProperty }: AddNewListingProps) => {
  const [formData, setFormData] = useState({
    houseName: '',
    address: '',
    pricing: '',
    numberOfApartments: 1,
    country: '',
    state: '',
    city: '',
    bedrooms: '',
    bathrooms: '',
  });

  const [apartments, setApartments] = useState<Partial<Apartment>[]>([
    { number: 1, tenant: null, status: 'vacant', pricing: '' },
  ]);

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedBlobIds, setUploadedBlobIds] = useState<string[]>([]);
  const { createHouseAndGetId } = useDwelloPayments();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleApartmentCountChange = (count: number) => {
    const newApartments: Partial<Apartment>[] = [];
    for (let i = 0; i < count; i++) {
      newApartments.push(
        apartments[i] || {
          number: i + 1,
          tenant: null,
          status: 'vacant',
          pricing: formData.pricing,
        }
      );
    }
    setApartments(newApartments);
    setFormData((prev) => ({ ...prev, numberOfApartments: count }));
  };

  const updateApartment = (index: number, field: string, value: any) => {
    const newApartments = [...apartments];
    newApartments[index] = { ...newApartments[index], [field]: value };
    setApartments(newApartments);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Filter for images and videos only
    const validFiles = files.filter((file) =>
      file.type.startsWith('image/') || file.type.startsWith('video/')
    );

    setSelectedFiles((prev) => [...prev, ...validFiles]);

    // Create preview URLs
    const newPreviewUrls = validFiles.map((file) => URL.createObjectURL(file));
    setPreviewUrls((prev) => [...prev, ...newPreviewUrls]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviewUrls((prev) => {
      const url = prev[index];
      URL.revokeObjectURL(url);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleUploadToWalrus = async () => {
    if (selectedFiles.length === 0) {
      alert('Please select files to upload');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const results = await uploadMultipleToWalrus(
        selectedFiles,
        (progress) => setUploadProgress(progress)
      );

      const blobIds = results.map((r) => r.blobId);
      setUploadedBlobIds(blobIds);

      alert(`Successfully uploaded ${results.length} files to Walrus!`);
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Failed to upload files to Walrus. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Upload files if not already uploaded
    if (selectedFiles.length > 0 && uploadedBlobIds.length === 0) {
      alert('Please upload images to Walrus first');
      return;
    }

    try {
      const houseId = await createHouseAndGetId(
        formData.houseName,
        formData.address,
        formData.country,
        formData.state,
        formData.city,
        formData.pricing,
        formData.bedrooms,
        formData.bathrooms,
      );

      const imageUrls = uploadedBlobIds.map((blobId) => getWalrusBlobUrl(blobId));

      const bedrooms = parseInt(formData.bedrooms || '1', 10);
      const bathrooms = parseInt(formData.bathrooms || '1', 10);

      const newProperty: Property = {
        id: houseId || `prop_${Date.now()}`,
        houseName: formData.houseName,
        address: formData.address,
        pricing: formData.pricing,
        apartments: apartments.map((apt, idx) => ({
          id: `apt_${Date.now()}_${idx}`,
          number: apt.number || idx + 1,
          tenant: apt.tenant || null,
          possessionDate: apt.possessionDate || '',
          expiryDate: apt.expiryDate || '',
          pricing: apt.pricing || formData.pricing,
          status: apt.status || 'vacant',
        })),
        totalEarnings: 0,
        images: imageUrls,
        blobIds: uploadedBlobIds,
        title: `${bedrooms} Bedroom Apartment`,
        location: `${formData.city || formData.state}, ${formData.country}`,
        bedrooms,
        bathrooms,
        area: '100 sqm',
        type: 'Apartment',
        price: formData.pricing,
        currency: '',
        imageUrl: imageUrls[0],
      };

      onAddProperty(newProperty);

      try {
        const raw = localStorage.getItem('dwelloListings');
        const stored = raw ? JSON.parse(raw) : [];

        let currency = '';
        let price = formData.pricing;
        const match = formData.pricing.match(/^([^0-9\s]+)\s*(.+)$/);
        if (match) {
          currency = match[1];
          price = match[2];
        }

        const publicListing = {
          id: houseId || newProperty.id,
          country: formData.country,
          state: formData.state,
          city: formData.city,
          title: `${bedrooms} Bedroom Apartment`,
          location: `${formData.city || formData.state}, ${formData.country}`,
          price,
          currency,
          bedrooms,
          bathrooms,
          area: '100 sqm',
          type: 'Apartment',
          walrusId: houseId || newProperty.id,
          imageUrl: imageUrls[0],
        };

        stored.push(publicListing);
        localStorage.setItem('dwelloListings', JSON.stringify(stored));
      } catch (storageError) {
        console.warn('Failed to store public listing:', storageError);
      }

      alert('Property successfully added to the blockchain.');
    } catch (error) {
      console.error('Failed to create house on-chain:', error);
      alert('Failed to create house on-chain. Please try again.');
      return;
    }

    // Reset form
    setFormData({
      houseName: '',
      address: '',
      pricing: '',
      numberOfApartments: 1,
      country: '',
      state: '',
      city: '',
      bedrooms: '',
      bathrooms: '',
    });
    setApartments([{ number: 1, tenant: null, status: 'vacant', pricing: '' }]);
    setSelectedFiles([]);
    setPreviewUrls([]);
    setUploadedBlobIds([]);
    setUploadProgress(0);
  };

  return (
    <div className="add-new-listing">
      <div className="form-container">
        <div className="form-header">
          <div className="header-content">
            <h2>🏠 Add New Property</h2>
            <p>Fill in the details to list your property on the blockchain</p>
          </div>
          <div className="blockchain-indicator">
            <span className="blockchain-icon">🔗</span>
            <span>Walrus Storage</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="listing-form">
          {/* Property Information */}
          <div className="form-section">
            <div className="section-title">
              <span className="section-icon">📝</span>
              <h3>Property Information</h3>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label>House Name *</label>
                <input
                  type="text"
                  name="houseName"
                  value={formData.houseName}
                  onChange={handleInputChange}
                  placeholder="e.g., Afasa Lounges"
                  required
                />
              </div>

              <div className="form-group">
                <label>Address *</label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  placeholder="e.g., No 15 Ogbowodeci"
                  required
                />
              </div>

              <div className="form-group">
                <label>Default Pricing (per year) *</label>
                <input
                  type="number"
                  name="pricing"
                  value={formData.pricing}
                  onChange={handleInputChange}
                  placeholder="e.g., 25,000"
                  required
                />
              </div>

              <div className="form-group">
                <label>Number of Apartments *</label>
                <div className="number-selector">
                  <button
                    type="button"
                    onClick={() =>
                      handleApartmentCountChange(
                        Math.max(1, formData.numberOfApartments - 1)
                      )
                    }
                    className="btn-decrease"
                  >
                    −
                  </button>
                  <span className="number-display">
                    {formData.numberOfApartments}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      handleApartmentCountChange(formData.numberOfApartments + 1)
                    }
                    className="btn-increase"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label>Country *</label>
                <input
                  type="text"
                  name="country"
                  value={formData.country}
                  onChange={handleInputChange}
                  placeholder="e.g., Nigeria"
                  required
                />
              </div>

              <div className="form-group">
                <label>State / Region *</label>
                <input
                  type="text"
                  name="state"
                  value={formData.state}
                  onChange={handleInputChange}
                  placeholder="e.g., Lagos"
                  required
                />
              </div>

              <div className="form-group">
                <label>City / Area *</label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleInputChange}
                  placeholder="e.g., Ikeja"
                  required
                />
              </div>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label>Bedrooms *</label>
                <input
                  type="number"
                  name="bedrooms"
                  value={formData.bedrooms}
                  onChange={handleInputChange}
                  min={1}
                  placeholder="e.g., 3"
                  required
                />
              </div>
              <div className="form-group">
                <label>Bathrooms *</label>
                <input
                  type="number"
                  name="bathrooms"
                  value={formData.bathrooms}
                  onChange={handleInputChange}
                  min={1}
                  placeholder="e.g., 2"
                  required
                />
              </div>
            </div>
          </div>

          {/* Image Upload */}
          <div className="form-section">
            <div className="section-title">
              <span className="section-icon">📸</span>
              <h3>Property Images</h3>
            </div>

            <div className="upload-section">
              <input
                type="file"
                multiple
                accept="image/*,video/*"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
                id="file-upload"
              />
              
              <label htmlFor="file-upload" className="upload-area">
                <div className="upload-content">
                  <div className="upload-icon">📸</div>
                  <p className="upload-title">Click to upload or drag and drop</p>
                  <p className="upload-subtitle">PNG, JPG, MP4 up to 10MB each</p>
                  <div className="upload-button">
                    <span>Browse Files</span>
                  </div>
                </div>
              </label>

              {/* Preview Selected Files */}
              {previewUrls.length > 0 && (
                <div className="preview-section">
                  <h4>Selected Files ({previewUrls.length})</h4>
                  <div className="preview-grid">
                    {previewUrls.map((url, index) => (
                      <div key={index} className="preview-item">
                        <img src={url} alt={`Preview ${index + 1}`} />
                        <button
                          type="button"
                          className="remove-preview"
                          onClick={() => removeFile(index)}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>

                  {uploadedBlobIds.length === 0 && (
                    <button
                      type="button"
                      className="btn-upload-walrus"
                      onClick={handleUploadToWalrus}
                      disabled={uploading}
                    >
                      {uploading ? (
                        <>
                          <span className="spinner-small"></span>
                          <span>Uploading... {uploadProgress}%</span>
                        </>
                      ) : (
                        <>
                          <span>🔗</span>
                          <span>Upload to Walrus</span>
                        </>
                      )}
                    </button>
                  )}

                  {uploadedBlobIds.length > 0 && (
                    <div className="upload-success">
                      <span className="success-icon">✓</span>
                      <span>Successfully uploaded {uploadedBlobIds.length} files to Walrus</span>
                    </div>
                  )}

                  {uploading && (
                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Apartments Details */}
          <div className="form-section">
            <div className="section-title">
              <span className="section-icon">🏢</span>
              <h3>Apartments Details</h3>
            </div>

            <div className="apartments-list">
              {apartments.map((apt, index) => (
                <div key={index} className="apartment-item">
                  <div className="apartment-header">
                    <h4>
                      <span className="apt-icon">🚪</span>
                      Apartment {index + 1}
                    </h4>
                    <button
                      type="button"
                      className={`status-toggle ${apt.status}`}
                      onClick={() =>
                        updateApartment(
                          index,
                          'status',
                          apt.status === 'vacant' ? 'occupied' : 'vacant'
                        )
                      }
                    >
                      {apt.status === 'vacant' ? '○ Vacant' : '✓ Occupied'}
                    </button>
                  </div>

                  <div className="apartment-fields">
                    {apt.status === 'occupied' && (
                      <>
                        <input
                          type="text"
                          placeholder="Tenant Name"
                          value={apt.tenant || ''}
                          onChange={(e) =>
                            updateApartment(index, 'tenant', e.target.value)
                          }
                        />
                        <input
                          type="text"
                          placeholder="Possession Date (e.g., Jan 1st 2025)"
                          value={apt.possessionDate || ''}
                          onChange={(e) =>
                            updateApartment(index, 'possessionDate', e.target.value)
                          }
                        />
                        <input
                          type="text"
                          placeholder="Expiry Date (e.g., Jan 1st 2026)"
                          value={apt.expiryDate || ''}
                          onChange={(e) =>
                            updateApartment(index, 'expiryDate', e.target.value)
                          }
                        />
                      </>
                    )}
                    <input
                      type="text"
                      placeholder="Pricing (optional, defaults to property pricing)"
                      value={apt.pricing || ''}
                      onChange={(e) =>
                        updateApartment(index, 'pricing', e.target.value)
                      }
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Form Actions */}
          <div className="form-actions">
            <button type="button" className="btn-cancel">
              <span>✕</span>
              <span>Cancel</span>
            </button>
            <button 
              type="submit" 
              className="btn-submit"
              disabled={uploading || (selectedFiles.length > 0 && uploadedBlobIds.length === 0)}
            >
              <span>🔗</span>
              <span>Add to Blockchain</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddNewListing;