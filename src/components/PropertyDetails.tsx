import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import CaretakerChat from './CaretakerChat'; // Make sure this path is correct

interface Property {
  id: string;
  houseName: string;
  address: string;
  apartments: Apartment[];
  totalEarnings: number;
  images: string[];
  pricing: string;
}

interface Apartment {
  id: string;
  number: number;
  tenant: string | null;
  possessionDate: string;
  expiryDate: string;
  pricing: string;
  status: 'occupied' | 'vacant';
}

interface PropertyDetailsProps {
  property?: Property;
  onBack?: () => void;
}

const PropertyDetails = ({ property: propProperty, onBack }: PropertyDetailsProps) => {
  const location = useLocation();
  const [showChat, setShowChat] = useState(false);
  
  // Get property from either props or router state
  const property = propProperty || (location.state?.property as Property);
  
  // Handle back navigation
  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      window.history.back();
    }
  };

  // Show error state if no property data
  if (!property) {
    return (
      <div className="property-details-page">
        <div className="details-header">
          <button className="btn-back" onClick={handleBack}>
            <span>←</span>
            <span>Back to Listings</span>
          </button>
        </div>
        <div className="error-state">
          <h2>Property Not Found</h2>
          <p>Please go back and select a property to view details.</p>
        </div>
      </div>
    );
  }

  // Safely calculate apartment statistics
  const apartments = property.apartments || [];
  const occupiedCount = apartments.filter(apt => apt.status === 'occupied').length;
  const vacantCount = apartments.length - occupiedCount;

  return (
    <div className="property-details-page">
      {/* Caretaker Chat Modal */}
      {showChat && (
        <div className="chat-modal-overlay">
          <div className="chat-modal">
            <CaretakerChat 
              caretakerName="Alex Morgan" 
              propertyTitle={property.houseName}
              onClose={() => setShowChat(false)}
            />
          </div>
        </div>
      )}

      <div className="details-header">
        <button className="btn-back" onClick={handleBack}>
          <span>←</span>
          <span>Back to {onBack ? 'Inventory' : 'Listings'}</span>
        </button>
        <div className="header-actions">
          <button className="btn-edit">
            <span>✏️</span>
            <span>Edit</span>
          </button>
          <button className="btn-delete">
            <span>🗑️</span>
            <span>Delete</span>
          </button>
        </div>
      </div>

      <div className="details-content">
        <div className="property-hero">
          <div className="hero-image">
            <div className="placeholder-hero">
              <span className="hero-icon">🏠</span>
            </div>
          </div>
          <div className="hero-info">
            <h1>{property.houseName}</h1>
            <p className="hero-address">{property.address}</p>
            
            {/* Property Features - Similar to the image */}
            <div className="property-features-overview">
              <div className="feature-badge">
                <span className="feature-icon">🛏️</span>
                <span>1 bedroom</span>
              </div>
              <div className="feature-badge">
                <span className="feature-icon">✓</span>
                <span>Verified</span>
              </div>
              <div className="feature-badge">
                <span className="feature-icon">✓</span>
                <span>Secure</span>
              </div>
              <div className="feature-badge">
                <span className="feature-icon">✓</span>
                <span>Available</span>
              </div>
            </div>

            <div className="hero-stats">
              <div className="hero-stat">
                <span className="stat-label">Total Units</span>
                <span className="stat-value">{apartments.length}</span>
              </div>
              <div className="hero-stat">
                <span className="stat-label">Monthly Revenue</span>
                <span className="stat-value">${property.totalEarnings?.toLocaleString() || '0'}</span>
              </div>
              <div className="hero-stat">
                <span className="stat-label">Occupancy</span>
                <span className="stat-value">
                  {apartments.length > 0 
                    ? Math.round((occupiedCount / apartments.length) * 100) 
                    : 0
                  }%
                </span>
              </div>
            </div>

            {/* Action Buttons - Similar to the image layout */}
            <div className="action-buttons">
              <button className="btn-view-details">
                <span>👁️</span>
                <span>View details</span>
              </button>
              
              <button 
                className="btn-caretaker-chat"
                onClick={() => setShowChat(true)}
              >
                <div className="chat-btn-content">
                  <span className="chat-icon">💬</span>
                  <div className="chat-text">
                    <span className="chat-title">Caretaker chat</span>
                    <span className="chat-subtitle">Talk with caretaker</span>
                  </div>
                  <span className="chat-arrow">→</span>
                </div>
              </button>
            </div>

            <div className="blockchain-info-detail">
              <span className="blockchain-badge">🔗 Walrus ID</span>
              <code className="blockchain-id">{property.id}</code>
            </div>
          </div>
        </div>

        {/* Rest of your existing content */}
        <div className="apartments-section">
          <div className="section-header">
            <h2>Apartments</h2>
            <div className="filter-badges">
              <span className="filter-badge all">All ({apartments.length})</span>
              <span className="filter-badge occupied">Occupied ({occupiedCount})</span>
              <span className="filter-badge vacant">Vacant ({vacantCount})</span>
            </div>
          </div>

          <div className="apartments-grid">
            {apartments.length > 0 ? (
              apartments.map(apartment => (
                <div key={apartment.id} className={`apartment-card ${apartment.status}`}>
                  <div className="apartment-header">
                    <div className="apartment-number">
                      <span className="apt-icon">🚪</span>
                      <span>Apartment {apartment.number}</span>
                    </div>
                    <span className={`status-badge ${apartment.status}`}>
                      {apartment.status === 'occupied' ? 'Occupied' : 'Vacant'}
                    </span>
                  </div>

                  <div className="apartment-body">
                    {apartment.status === 'occupied' ? (
                      <>
                        <div className="detail-row">
                          <span className="detail-label">Tenant</span>
                          <span className="detail-value">{apartment.tenant || 'Unknown'}</span>
                        </div>
                        <div className="detail-row">
                          <span className="detail-label">Possession Date</span>
                          <span className="detail-value">{apartment.possessionDate || 'N/A'}</span>
                        </div>
                        <div className="detail-row">
                          <span className="detail-label">Expiry Date</span>
                          <span className="detail-value expiry">{apartment.expiryDate || 'N/A'}</span>
                        </div>
                        <div className="detail-row">
                          <span className="detail-label">Pricing</span>
                          <span className="detail-value pricing">{apartment.pricing || property.pricing}</span>
                        </div>
                      </>
                    ) : (
                      <div className="vacant-info">
                        <p className="vacant-text">Available for Rent</p>
                        <p className="vacant-pricing">{apartment.pricing || property.pricing}</p>
                        <button className="btn-add-tenant">
                          <span>➕</span>
                          <span>Add Tenant</span>
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="apartment-footer">
                    <button className="btn-manage-apt">Manage</button>
                  </div>
                </div>
              ))
            ) : (
              <div className="no-apartments">
                <p>No apartments found for this property.</p>
              </div>
            )}
          </div>
        </div>

        <div className="analytics-section">
          <h2>Property Analytics</h2>
          <div className="analytics-grid">
            <div className="analytics-card">
              <h3>Revenue Trend</h3>
              <div className="chart-placeholder">
                <div className="chart-bars">
                  <div className="bar" style={{ height: '60%' }}></div>
                  <div className="bar" style={{ height: '75%' }}></div>
                  <div className="bar" style={{ height: '90%' }}></div>
                  <div className="bar" style={{ height: '85%' }}></div>
                  <div className="bar" style={{ height: '100%' }}></div>
                </div>
                <p className="chart-label">Last 5 Months</p>
              </div>
            </div>

            <div className="analytics-card">
              <h3>Occupancy Rate</h3>
              <div className="chart-placeholder">
                <div className="donut-chart">
                  <div className="donut-value">
                    {apartments.length > 0 
                      ? Math.round((occupiedCount / apartments.length) * 100) 
                      : 0
                    }%
                  </div>
                </div>
                <p className="chart-label">Current Occupancy</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropertyDetails;