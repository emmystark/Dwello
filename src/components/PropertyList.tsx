import { useNavigate } from "react-router-dom";
import { useProperties } from '../hooks/useProperties';

const PropertyList = () => {
  const navigate = useNavigate();
  const { properties, loading, error } = useProperties();

  const handlePropertyClick = (property: any) => {
    navigate('/propertydetails', { 
      state: { property } 
    });
  };

  // LOADING STATE
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '60px 20px',
        minHeight: '400px'
      }}>
        <div style={{
          border: '4px solid #f3f3f3',
          borderTop: '4px solid #2196f3',
          borderRadius: '50%',
          width: '50px',
          height: '50px',
          animation: 'spin 1s linear infinite',
          marginBottom: '20px'
        }}></div>
        <p style={{ fontSize: '18px', color: '#666' }}>
          Loading properties from Walrus blockchain...
        </p>
        <p style={{ fontSize: '14px', color: '#999', marginTop: '10px' }}>
          Fetching from backend at http://localhost:3001
        </p>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // ERROR STATE
  if (error) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center' }}>
        <div style={{ fontSize: '64px', marginBottom: '20px' }}>⚠️</div>
        <h3 style={{ fontSize: '24px', marginBottom: '10px', color: '#d32f2f' }}>
          Error Loading Properties
        </h3>
        <p style={{ marginBottom: '20px', color: '#666' }}>{error}</p>
        <p style={{ fontSize: '14px', color: '#999', marginBottom: '20px' }}>
          Make sure your backend is running at http://localhost:3001
        </p>
        <button 
          onClick={() => window.location.reload()}
          style={{
            padding: '10px 20px',
            backgroundColor: '#2196f3',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '16px'
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  // EMPTY STATE
  if (properties.length === 0) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center' }}>
        <div style={{ fontSize: '64px', marginBottom: '20px' }}>🏘️</div>
        <h3 style={{ fontSize: '24px', marginBottom: '10px' }}>No Properties Found</h3>
        <p style={{ color: '#666', marginBottom: '20px' }}>
          No properties have been uploaded to the database yet.
        </p>
        <p style={{ fontSize: '14px', color: '#999' }}>
          Use the /api/properties/create endpoint to add properties
        </p>
      </div>
    );
  }

  // MAIN DISPLAY
  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '40px', textAlign: 'center' }}>
        <h2 style={{ fontSize: '36px', marginBottom: '10px', fontWeight: 'bold' }}>
          All Available Listings on Walrus
        </h2>
        <p style={{ fontSize: '18px', color: '#666', marginBottom: '5px' }}>
          {properties.length} properties stored on the blockchain
        </p>
        <p style={{ fontSize: '14px', color: '#999' }}>
          {properties.filter(p => p.isLegitBlobId).length} with verified Walrus images
        </p>
      </div>

      {/* Properties Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
        gap: '24px'
      }}>
        {properties.map((property) => {
          // Using the EXACT working pattern
          const isLegitBlobId = property.isLegitBlobId;
          
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
              {/* Image Section - EXACT WORKING PATTERN */}
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
                      onLoad={() => console.log('✅ Image loaded:', property.title, property.blobId)}
                      onError={() => console.error('❌ Image failed:', property.title, property.blobId)}
                    />
                  </div>
                ) : (
                  <div style={{
                    width: '100%',
                    height: '220px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#f5f5f5',
                    gap: '10px'
                  }}>
                    <div style={{ fontSize: '48px' }}>🏠</div>
                    <p style={{ fontSize: '12px', color: '#999' }}>No Walrus image</p>
                  </div>
                )}

                {/* Verified Badge */}
                <div style={{
                  position: 'absolute',
                  top: '10px',
                  right: '10px',
                  backgroundColor: isLegitBlobId ? '#4caf50' : '#ff9800',
                  color: 'white',
                  padding: '6px 12px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                }}>
                  {isLegitBlobId ? '✓ Verified' : 'Listed'}
                </div>

                {/* Property Type Badge */}
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
                  fontWeight: 'bold',
                  color: '#333'
                }}>
                  {property.title}
                </h3>
                
                <p style={{ 
                  fontSize: '14px', 
                  color: '#666',
                  marginBottom: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <span>📍</span>
                  <span>{property.location}</span>
                </p>
                
                <p style={{ 
                  fontSize: '24px',
                  fontWeight: 'bold',
                  color: '#2196f3',
                  marginBottom: '12px'
                }}>
                  {property.currency}{property.price}
                  {property.period && (
                    <span style={{ 
                      fontSize: '14px', 
                      fontWeight: 'normal',
                      color: '#666' 
                    }}>
                      {' '}/ {property.period}
                    </span>
                  )}
                </p>
                
                {(property.bedrooms || property.bathrooms || property.area) && (
                  <div style={{ 
                    display: 'flex', 
                    gap: '16px',
                    fontSize: '14px',
                    color: '#666',
                    marginBottom: '16px',
                    flexWrap: 'wrap'
                  }}>
                    {property.bedrooms && <span>🛏️ {property.bedrooms}</span>}
                    {property.bathrooms && <span>🚿 {property.bathrooms}</span>}
                    {property.area && <span>📐 {property.area}</span>}
                  </div>
                )}
                
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
                    <span style={{ fontSize: '14px' }}>🔗</span>
                    <span 
                      title={`Walrus Blob ID: ${property.blobId}`}
                      style={{ 
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        fontFamily: 'monospace'
                      }}
                    >
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
                    cursor: 'pointer',
                    transition: 'background-color 0.2s'
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

      {/* Test Image at Bottom - Proves Walrus works */}
      <div style={{ 
        marginTop: '60px', 
        padding: '30px',
        backgroundColor: '#f5f5f5',
        borderRadius: '12px',
        textAlign: 'center'
      }}>
        <h3 style={{ marginBottom: '15px', color: '#666' }}>
          Walrus Connection Test
        </h3>
        <p style={{ fontSize: '14px', color: '#999', marginBottom: '20px' }}>
          This image should always load if Walrus is working
        </p>
        <div className="image-container" style={{ 
          maxWidth: '600px', 
          margin: '0 auto',
          border: '2px solid #e0e0e0',
          borderRadius: '8px',
          overflow: 'hidden'
        }}>
          <img
            src="https://aggregator.walrus-testnet.walrus.space/v1/blobs/tZRqOg3dwMN5bDSn4U4OWIzFTByeoeeZI9BLqpHw62I"
            alt="Walrus Test Image"
            className="display-image"
            style={{ 
              width: '100%',
              height: 'auto',
              display: 'block'
            }}
            onLoad={() => console.log('✅ Test image loaded - Walrus is working!')}
            onError={() => console.error('❌ Test image failed - Walrus might be down')}
          />
        </div>
      </div>
    </div>
  );
};

export default PropertyList;