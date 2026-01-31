import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

// HARDCODED TEST DATA - Replace with your real data later
const MOCK_PROPERTIES = [
  {
    id: "1",
    title: "Luxury Apartment",
    location: "London, England",
    price: "500000",
    currency: "$",
    type: "Apartment",
    bedrooms: 3,
    bathrooms: 2,
    area: "1200 sq ft",
    blobId: "tZRqOg3dwMN5bDSn4U4OWIzFTByeoeeZI9BLqpHw62I"
  },
  {
    id: "2",
    title: "Modern Villa",
    location: "Toronto, Canada",
    price: "750000",
    currency: "$",
    type: "Villa",
    bedrooms: 4,
    bathrooms: 3,
    area: "2500 sq ft",
    blobId: "enMxo73vqQhxUhjkBO8qabglFVw337aoUAv0NOMGcIc"
  },
  {
    id: "3",
    title: "Cozy Studio",
    location: "Port Harcourt, Nigeria",
    price: "250000",
    currency: "$",
    type: "Studio",
    bedrooms: 1,
    bathrooms: 1,
    area: "600 sq ft",
    blobId: "sF1s6XpMehQr5kjvd7qm8wTqVqmn8mKepHzVoGe6sOg"
  },
  {
    id: "4",
    title: "Family House",
    location: "Paris, France",
    price: "600000",
    currency: "$",
    type: "House",
    bedrooms: 5,
    bathrooms: 4,
    area: "3000 sq ft",
    blobId: "es0GR3ydVkcXgbam23R_uU1Kw6cx-fYarb79FBH_KW0"
  }
];

const PropertyList = () => {
  const navigate = useNavigate();

  const handlePropertyClick = (property: any) => {
    navigate('/propertydetails', { 
      state: { property } 
    });
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '40px', textAlign: 'center' }}>
        <h2 style={{ fontSize: '36px', marginBottom: '10px', fontWeight: 'bold' }}>
          All Available Listings on Walrus
        </h2>
        <p style={{ fontSize: '18px', color: '#666' }}>
          {MOCK_PROPERTIES.length} properties stored on the blockchain
        </p>
      </div>

      {/* Properties Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
        gap: '24px'
      }}>
        {MOCK_PROPERTIES.map((property) => {
          const isLegitBlobId = property.blobId && property.blobId !== 'null' && property.blobId !== 'placeholder blob id';
          
          return (
            <div 
              key={property.id}
              onClick={() => handlePropertyClick(property)}
              style={{ 
                cursor: 'pointer',
                border: '1px solid #e0e0e0',
                borderRadius: '12px',
                overflow: 'hidden',
                backgroundColor: 'white',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                transition: 'transform 0.2s, box-shadow 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
              }}
            >
              {/* Image Section - EXACTLY like your working code */}
              <div style={{ position: 'relative' }}>
                {isLegitBlobId ? (
                  <div className="image-container">
                    <img
                      src={`https://aggregator.walrus-testnet.walrus.space/v1/blobs/${property.blobId}`}
                      alt={property.title}
                      className="display-image"
                      style={{ 
                        width: '100%',
                        height: '220px',
                        objectFit: 'cover',
                        display: 'block'
                      }}
                    />
                  </div>
                ) : (
                  <div style={{
                    width: '100%',
                    height: '220px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#f5f5f5',
                    fontSize: '48px'
                  }}>
                    🏠
                  </div>
                )}

                {/* Badges */}
                <div style={{
                  position: 'absolute',
                  top: '10px',
                  right: '10px',
                  backgroundColor: isLegitBlobId ? '#4caf50' : '#ff9800',
                  color: 'white',
                  padding: '6px 12px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: 'bold'
                }}>
                  {isLegitBlobId ? '✓ Verified' : 'Listed'}
                </div>

                <div style={{
                  position: 'absolute',
                  top: '10px',
                  left: '10px',
                  backgroundColor: 'rgba(0,0,0,0.7)',
                  color: 'white',
                  padding: '6px 12px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: 'bold'
                }}>
                  {property.type}
                </div>
              </div>

              {/* Details Section */}
              <div style={{ padding: '20px' }}>
                <h3 style={{ 
                  fontSize: '20px', 
                  marginBottom: '8px',
                  fontWeight: 'bold'
                }}>
                  {property.title}
                </h3>
                
                <p style={{ 
                  fontSize: '14px', 
                  color: '#666',
                  marginBottom: '12px'
                }}>
                  📍 {property.location}
                </p>
                
                <p style={{ 
                  fontSize: '24px',
                  fontWeight: 'bold',
                  color: '#2196f3',
                  marginBottom: '12px'
                }}>
                  {property.currency}{property.price}
                </p>
                
                <div style={{ 
                  display: 'flex', 
                  gap: '16px',
                  fontSize: '14px',
                  color: '#666',
                  marginBottom: '16px'
                }}>
                  <span>🛏️ {property.bedrooms}</span>
                  <span>🚿 {property.bathrooms}</span>
                  <span>📐 {property.area}</span>
                </div>
                
                {isLegitBlobId && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '11px',
                    color: '#999',
                    marginBottom: '16px',
                    padding: '10px',
                    backgroundColor: '#f8f8f8',
                    borderRadius: '6px'
                  }}>
                    <span>🔗</span>
                    <span style={{ 
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      fontFamily: 'monospace'
                    }}>
                      {property.blobId.substring(0, 20)}...
                    </span>
                  </div>
                )}
                
                <button 
                  style={{
                    width: '100%',
                    padding: '12px',
                    backgroundColor: '#2196f3',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '15px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1976d2'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#2196f3'}
                >
                  View Details →
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Test Image at Bottom */}
      {/* <div style={{ marginTop: '60px', textAlign: 'center' }}>
        <h3 style={{ marginBottom: '20px' }}>Test Image Display</h3>
        <div className="image-container" style={{ maxWidth: '600px', margin: '0 auto' }}>
          <img
            src="https://aggregator.walrus-testnet.walrus.space/v1/blobs/tZRqOg3dwMN5bDSn4U4OWIzFTByeoeeZI9BLqpHw62I"
            alt="Display Image"
            className="display-image"
            style={{ 
              width: '100%',
              height: 'auto',
              display: 'block',
              borderRadius: '8px'
            }}
          />
        </div>
      </div> */}
    </div>
  );
};

export default PropertyList;