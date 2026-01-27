import { useState } from 'react';
import { uploadMultipleToWalrus, getWalrusBlobUrl } from '../walrus/client';
import { apiRequest, API_CONFIG } from '../lib/api-config';
import { useSui } from '../sui/SuiProviders';
import type { Property, Apartment } from '../types';
import '../styles/AddNewListing.css';
import { useDwelloPayments } from '../payment';

interface AddNewListingProps {
  onAddProperty: (property: Property) => void;
}

const countries = [
  'United States', 'United Kingdom', 'Canada', 'Australia', 'Germany',
  'France', 'Spain', 'Italy', 'Netherlands', 'Switzerland', 'Sweden',
  'Norway', 'Denmark', 'Japan', 'South Korea', 'Singapore', 'Hong Kong',
  'United Arab Emirates', 'Saudi Arabia', 'Nigeria', 'South Africa', 'Kenya',
  'Ghana', 'Egypt', 'Brazil', 'Mexico', 'Argentina', 'Chile', 'India',
  'China', 'Thailand', 'Indonesia', 'Malaysia', 'Philippines', 'New Zealand'
];

const statesByCountry: { [key: string]: string[] } = {
  'United States': [
    'California', 'Texas', 'Florida', 'New York', 'Illinois', 'Pennsylvania',
    'Ohio', 'Georgia', 'North Carolina', 'Michigan', 'Washington', 'Arizona'
  ],
  'United Kingdom': ['England', 'Scotland', 'Wales', 'Northern Ireland'],
  'Canada': ['Ontario', 'Quebec', 'British Columbia', 'Alberta', 'Manitoba'],
  'Nigeria': ['Lagos', 'Abuja (FCT)', 'Kano', 'Rivers', 'Oyo', 'Kaduna', 'Edo'],
  'Australia': ['New South Wales', 'Victoria', 'Queensland', 'Western Australia'],
  'Germany': ['Bavaria', 'Berlin', 'Hamburg', 'Hesse', 'North Rhine-Westphalia'],
  'United Arab Emirates': ['Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman'],
  'France': ['Île-de-France', 'Provence-Alpes-Côte d\'Azur', 'Auvergne-Rhône-Alpes'],
  'India': ['Maharashtra', 'Delhi', 'Karnataka', 'Tamil Nadu', 'Gujarat'],
  'Brazil': ['São Paulo', 'Rio de Janeiro', 'Minas Gerais', 'Bahia'],
};

const citiesByState: { [key: string]: string[] } = {
  'California': ['Los Angeles', 'San Francisco', 'San Diego', 'San Jose', 'Sacramento'],
  'Texas': ['Houston', 'Dallas', 'Austin', 'San Antonio', 'Fort Worth'],
  'New York': ['New York City', 'Buffalo', 'Rochester', 'Yonkers', 'Syracuse'],
  'Florida': ['Miami', 'Orlando', 'Tampa', 'Jacksonville', 'Fort Lauderdale'],
  'England': ['London', 'Manchester', 'Birmingham', 'Liverpool', 'Leeds', 'Bristol'],
  'Scotland': ['Edinburgh', 'Glasgow', 'Aberdeen', 'Dundee'],
  'Ontario': ['Toronto', 'Ottawa', 'Mississauga', 'Hamilton', 'London'],
  'British Columbia': ['Vancouver', 'Victoria', 'Surrey', 'Burnaby', 'Richmond'],
  'Lagos': ['Ikeja', 'Victoria Island', 'Lekki', 'Ikoyi', 'Surulere', 'Yaba'],
  'Abuja (FCT)': ['Central Area', 'Garki', 'Wuse', 'Maitama', 'Asokoro', 'Gwarinpa'],
  'Edo': ['Benin City', 'Benin'],
  'Dubai': ['Downtown Dubai', 'Dubai Marina', 'Jumeirah', 'Business Bay', 'JBR'],
  'Abu Dhabi': ['Abu Dhabi City', 'Al Ain', 'Khalifa City', 'Yas Island'],
  'New South Wales': ['Sydney', 'Newcastle', 'Wollongong', 'Central Coast'],
  'Victoria': ['Melbourne', 'Geelong', 'Ballarat', 'Bendigo'],
  'Bavaria': ['Munich', 'Nuremberg', 'Augsburg', 'Regensburg'],
  'Berlin': ['Mitte', 'Charlottenburg', 'Kreuzberg', 'Friedrichshain'],
};

const AddNewListing = ({ onAddProperty }: AddNewListingProps) => {
  const { account } = useSui();
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

  const [availableStates, setAvailableStates] = useState<string[]>([]);
  const [availableCities, setAvailableCities] = useState<string[]>([]);

  const [apartments, setApartments] = useState<Partial<Apartment>[]>([
    { number: 1, tenant: null, status: 'vacant', pricing: '' },
  ]);

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedBlobIds, setUploadedBlobIds] = useState<string[]>([]);
  const { createHouseAndGetId } = useDwelloPayments();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'country') {
      const states = statesByCountry[value] || [];
      setAvailableStates(states);
      setFormData((prev) => ({ ...prev, country: value, state: '', city: '' }));
      setAvailableCities([]);
    } else if (name === 'state') {
      const cities = citiesByState[value] || [];
      setAvailableCities(cities);
      setFormData((prev) => ({ ...prev, state: value, city: '' }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
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
      // Upload to backend which handles Walrus SDK upload
      const uploadPromises = selectedFiles.map(async (file, index) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('title', formData.get('houseName') || `Image ${index + 1}`);
        formData.append('caretakerAddress', account);

        const response = await fetch('/api/walrus/upload', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Upload failed');
        }

        const data = await response.json();
        setUploadProgress(Math.round(((index + 1) / selectedFiles.length) * 100));
        return data;
      });

      const results = await Promise.all(uploadPromises);
      const blobIds = results.map((r) => r.blobId);
      setUploadedBlobIds(blobIds);

      alert(`Successfully uploaded ${results.length} files to Walrus!`);
    } catch (error) {
      console.error('Upload failed:', error);
      alert(`Upload failed: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleUploadToWalrusOld = async () => {
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
      // Try to create house on-chain, but fallback to local ID if it fails
      let houseId = `prop_${Date.now()}`;
      try {
        houseId = await createHouseAndGetId(
          formData.houseName,
          formData.address,
          formData.country,
          formData.state,
          formData.city,
          formData.pricing,
          formData.bedrooms,
          formData.bathrooms,
        ) || houseId;
      } catch (onChainError) {
        console.warn('On-chain house creation failed, using local ID:', onChainError);
        // Continue with local property ID instead of failing
      }

      const imageUrls = uploadedBlobIds.map((blobId) => getWalrusBlobUrl(blobId));

      const bedrooms = parseInt(formData.bedrooms || '1', 10);
      const bathrooms = parseInt(formData.bathrooms || '1', 10);

      const imagesWithAmounts = uploadedBlobIds.map((blobId) => ({
        blobId,
        url: getWalrusBlobUrl(blobId),
        amount: 0,
        uploadedAt: new Date().toISOString(),
      }));

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
        images: imagesWithAmounts,
        blobIds: uploadedBlobIds,
        title: `${bedrooms} Bedroom Apartment`,
        location: `${formData.city || formData.state}, ${formData.country}`,
        bedrooms,
        bathrooms,
        area: '100 sqm',
        type: 'Apartment',
        price: formData.pricing,
        currency: '',
        imageUrl: imagesWithAmounts[0]?.url || '',
      };

      onAddProperty(newProperty);

      // Send property to backend API
      try {
        const backendPayload = {
          houseName: formData.houseName,
          address: formData.address,
          price: formData.pricing,
          bedrooms: bedrooms.toString(),
          bathrooms: bathrooms.toString(),
          area: '100 sqm',
          propertyType: 'Apartment',
          country: formData.country,
          state: formData.state,
          city: formData.city,
          description: `${bedrooms} bedroom, ${bathrooms} bathroom apartment`,
          caretakerAddress: account,
          imagesWithAmounts: imagesWithAmounts,
          blobIds: uploadedBlobIds,
        };

        const apiResult = await apiRequest<any>(
          API_CONFIG.endpoints.properties.create,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(backendPayload),
          }
        );

        if (!apiResult?.success && !apiResult?.property) {
          throw new Error(apiResult?.error || 'Backend save failed');
        }

        console.log('Property saved to backend:', apiResult);
      } catch (backendError) {
        console.error('Failed to save property to backend:', backendError);
        // Don't fail the whole operation if backend save fails
      }

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

      alert('Property successfully added!');
    } catch (error) {
      console.error('Failed to add property:', error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      alert(`Failed to add property: ${errorMsg}`);
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
            <h2>Add New Property</h2>
            <p>Fill in the details to list your property on the blockchain</p>
          </div>
          <div className="blockchain-indicator">
            <span>Walrus Storage</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="listing-form">
          {/* Property Information */}
          <div className="form-section">
            <div className="section-title">
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
                  placeholder="e.g., $25,000"
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
                <select
                  name="country"
                  value={formData.country}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">Select Country</option>
                  {countries.map((country) => (
                    <option key={country} value={country}>
                      {country}
                    </option>
                  ))}
                </select>
              </div>

              {formData.country && availableStates.length > 0 && (
                <div className="form-group">
                  <label>State / Region *</label>
                  <select
                    name="state"
                    value={formData.state}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Select State/Region</option>
                    {availableStates.map((state) => (
                      <option key={state} value={state}>
                        {state}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {formData.state && availableCities.length > 0 && (
                <div className="form-group">
                  <label>City / Area *</label>
                  <select
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Select City/Area</option>
                    {availableCities.map((city) => (
                      <option key={city} value={city}>
                        {city}
                      </option>
                    ))}
                  </select>
                </div>
              )}
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
                  <div className="upload-icon"></div>
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
                          <span>Upload to Walrus</span>
                        </>
                      )}
                    </button>
                  )}

                  {uploadedBlobIds.length > 0 && (
                    <div className="upload-success">
                      <span className="success-icon"></span>
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
              <h3>Apartments Details</h3>
            </div>

            <div className="apartments-list">
              {apartments.map((apt, index) => (
                <div key={index} className="apartment-item">
                  <div className="apartment-header">
                    <h4>
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
              <span>Cancel</span>
            </button>
            <button 
              type="submit" 
              className="btn-submit"
              disabled={uploading || (selectedFiles.length > 0 && uploadedBlobIds.length === 0)}
            >
              <span>Add to Blockchain</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddNewListing;