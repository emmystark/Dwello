import { useState } from 'react';
import { apiRequest, API_CONFIG } from '../lib/api-config';

// Your available Walrus Blob IDs
const AVAILABLE_BLOB_IDS = [
  'tZRqOg3dwMN5bDSn4U4OWIzFTByeoeeZI9BLqpHw62I',
  'enMxo73vqQhxUhjkBO8qabglFVw337aoUAv0NOMGcIc',
  'sF1s6XpMehQr5kjvd7qm8wTqVqmn8mKepHzVoGe6sOg',
  'es0GR3ydVkcXgbam23R_uU1Kw6cx-fYarb79FBH_KW0',
  'EY_uNCkTjJc3hlIcisdS3ILHjeG68rz8cQzUn-6gOZc'
];

const AddProperty = () => {
  const [formData, setFormData] = useState({
    title: '',
    walrusId: AVAILABLE_BLOB_IDS[0],
    price: '',
    currency: '$',
    address: '',
    city: '',
    state: '',
    country: 'Nigeria',
    bedrooms: '',
    bathrooms: '',
    area: '',
    type: 'Apartment',
    period: 'month'
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    
    try {
      const propertyData = {
        ...formData,
        price: parseInt(formData.price) || 0,
        bedrooms: formData.bedrooms ? parseInt(formData.bedrooms) : undefined,
        bathrooms: formData.bathrooms ? parseInt(formData.bathrooms) : undefined,
      };

      console.log('Creating property:', propertyData);

      const response = await apiRequest(API_CONFIG.endpoints.properties.create, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(propertyData)
      });
      
      console.log('Response:', response);
      
      setMessage({ type: 'success', text: 'Property added successfully!' });
      
      // Reset form
      setFormData({
        title: '',
        walrusId: AVAILABLE_BLOB_IDS[0],
        price: '',
        currency: '$',
        address: '',
        city: '',
        state: '',
        country: 'Nigeria',
        bedrooms: '',
        bathrooms: '',
        area: '',
        type: 'Apartment',
        period: 'month'
      });
    } catch (error: any) {
      console.error('Error adding property:', error);
      setMessage({ type: 'error', text: error.message || 'Error adding property' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '700px', margin: '40px auto', padding: '30px' }}>
      <h1 style={{ fontSize: '32px', marginBottom: '10px' }}>Add New Property</h1>
      <p style={{ color: '#666', marginBottom: '30px' }}>
        Add a property with a Walrus image to the blockchain
      </p>
      
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Title */}
        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
            Property Title *
          </label>
          <input
            type="text"
            placeholder="e.g., Luxury Apartment"
            value={formData.title}
            onChange={(e) => setFormData({...formData, title: e.target.value})}
            required
            style={inputStyle}
          />
        </div>

        {/* Walrus Blob ID */}
        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
            Walrus Image (Blob ID) *
          </label>
          <select
            value={formData.walrusId}
            onChange={(e) => setFormData({...formData, walrusId: e.target.value})}
            required
            style={inputStyle}
          >
            {AVAILABLE_BLOB_IDS.map((id, index) => (
              <option key={id} value={id}>
                Image {index + 1}: {id.substring(0, 20)}...
              </option>
            ))}
          </select>
          <small style={{ color: '#999', fontSize: '12px' }}>
            Selected: {formData.walrusId}
          </small>
        </div>

        {/* Price and Currency */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '15px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
              Price *
            </label>
            <input
              type="number"
              placeholder="e.g., 500000"
              value={formData.price}
              onChange={(e) => setFormData({...formData, price: e.target.value})}
              required
              style={inputStyle}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
              Currency
            </label>
            <select
              value={formData.currency}
              onChange={(e) => setFormData({...formData, currency: e.target.value})}
              style={inputStyle}
            >
              <option value="$">$ USD</option>
              <option value="₦">₦ NGN</option>
              <option value="€">€ EUR</option>
              <option value="£">£ GBP</option>
            </select>
          </div>
        </div>

        {/* Address */}
        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
            Address
          </label>
          <input
            type="text"
            placeholder="e.g., 123 Ocean Drive"
            value={formData.address}
            onChange={(e) => setFormData({...formData, address: e.target.value})}
            style={inputStyle}
          />
        </div>

        {/* Location */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
              City *
            </label>
            <input
              type="text"
              placeholder="e.g., Lagos"
              value={formData.city}
              onChange={(e) => setFormData({...formData, city: e.target.value})}
              required
              style={inputStyle}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
              State
            </label>
            <input
              type="text"
              placeholder="e.g., Lagos State"
              value={formData.state}
              onChange={(e) => setFormData({...formData, state: e.target.value})}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
              Country
            </label>
            <input
              type="text"
              placeholder="e.g., Nigeria"
              value={formData.country}
              onChange={(e) => setFormData({...formData, country: e.target.value})}
              style={inputStyle}
            />
          </div>
        </div>

        {/* Property Details */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
              Bedrooms
            </label>
            <input
              type="number"
              placeholder="e.g., 3"
              value={formData.bedrooms}
              onChange={(e) => setFormData({...formData, bedrooms: e.target.value})}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
              Bathrooms
            </label>
            <input
              type="number"
              placeholder="e.g., 2"
              value={formData.bathrooms}
              onChange={(e) => setFormData({...formData, bathrooms: e.target.value})}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
              Area
            </label>
            <input
              type="text"
              placeholder="e.g., 1200 sq ft"
              value={formData.area}
              onChange={(e) => setFormData({...formData, area: e.target.value})}
              style={inputStyle}
            />
          </div>
        </div>

        {/* Type and Period */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
              Property Type
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({...formData, type: e.target.value})}
              style={inputStyle}
            >
              <option value="Apartment">Apartment</option>
              <option value="House">House</option>
              <option value="Villa">Villa</option>
              <option value="Studio">Studio</option>
              <option value="Condo">Condo</option>
              <option value="Townhouse">Townhouse</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
              Period
            </label>
            <select
              value={formData.period}
              onChange={(e) => setFormData({...formData, period: e.target.value})}
              style={inputStyle}
            >
              <option value="month">Month</option>
              <option value="year">Year</option>
              <option value="week">Week</option>
              <option value="day">Day</option>
            </select>
          </div>
        </div>

        {/* Submit Button */}
        <button 
          type="submit"
          disabled={loading}
          style={{
            padding: '15px',
            fontSize: '16px',
            fontWeight: 'bold',
            backgroundColor: loading ? '#ccc' : '#2196f3',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: loading ? 'not-allowed' : 'pointer',
            marginTop: '10px'
          }}
        >
          {loading ? 'Adding Property...' : 'Add Property to Blockchain'}
        </button>
      </form>

      {/* Success/Error Message */}
      {message && (
        <div style={{
          marginTop: '20px',
          padding: '15px',
          borderRadius: '6px',
          backgroundColor: message.type === 'success' ? '#e8f5e9' : '#ffebee',
          color: message.type === 'success' ? '#2e7d32' : '#c62828',
          border: `1px solid ${message.type === 'success' ? '#4caf50' : '#f44336'}`
        }}>
          {message.text}
        </div>
      )}

      {/* Preview */}
      <div style={{
        marginTop: '40px',
        padding: '20px',
        backgroundColor: '#f5f5f5',
        borderRadius: '8px'
      }}>
        <h3 style={{ marginBottom: '15px' }}>Image Preview</h3>
        <img
          src={`https://aggregator.walrus-testnet.walrus.space/v1/blobs/${formData.walrusId}`}
          alt="Selected Walrus Image"
          style={{
            width: '100%',
            maxHeight: '300px',
            objectFit: 'contain',
            borderRadius: '6px',
            border: '2px solid #e0e0e0'
          }}
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      </div>
    </div>
  );
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px',
  fontSize: '15px',
  border: '1px solid #ddd',
  borderRadius: '6px',
  fontFamily: 'inherit'
};

export default AddProperty;