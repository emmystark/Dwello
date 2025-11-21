interface Property {
  id: string
  houseName: string
  address: string
  apartments: Apartment[]
  totalEarnings: number
  images: string[]
  pricing: string
}

interface Apartment {
  id: string
  number: number
  tenant: string | null
  possessionDate: string
  expiryDate: string
  pricing: string
  status: 'occupied' | 'vacant'
}

interface PropertyDetailsProps {
  property: Property
  onBack: () => void
}

const PropertyDetails = ({ property, onBack }: PropertyDetailsProps) => {
  const occupiedCount = property.apartments.filter(apt => apt.status === 'occupied').length
  const vacantCount = property.apartments.length - occupiedCount

  return (
    <div className="property-details-page">
      <div className="details-header">
        <button className="btn-back" onClick={onBack}>
          <span>←</span>
          <span>Back to Inventory</span>
        </button>
        <div className="header-actions">
          <button className="btn-edit">
            <span></span>
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
              <span className="hero-icon"></span>
            </div>
          </div>
          <div className="hero-info">
            <h1>{property.houseName}</h1>
            <p className="hero-address">{property.address}</p>
            <div className="hero-stats">
              <div className="hero-stat">
                <span className="stat-label">Total Units</span>
                <span className="stat-value">{property.apartments.length}</span>
              </div>
              <div className="hero-stat">
                <span className="stat-label">Monthly Revenue</span>
                <span className="stat-value">${property.totalEarnings.toLocaleString()}</span>
              </div>
              <div className="hero-stat">
                <span className="stat-label">Occupancy</span>
                <span className="stat-value">
                  {Math.round((occupiedCount / property.apartments.length) * 100)}%
                </span>
              </div>
            </div>
            <div className="blockchain-info-detail">
              <span className="blockchain-badge">🔗 Walrus ID</span>
              <code className="blockchain-id">{property.id}</code>
            </div>
          </div>
        </div>

        <div className="apartments-section">
          <div className="section-header">
            <h2>Apartments</h2>
            <div className="filter-badges">
              <span className="filter-badge all">All ({property.apartments.length})</span>
              <span className="filter-badge occupied">Occupied ({occupiedCount})</span>
              <span className="filter-badge vacant">Vacant ({vacantCount})</span>
            </div>
          </div>

          <div className="apartments-grid">
            {property.apartments.map(apartment => (
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
                        <span className="detail-value">{apartment.tenant}</span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">Possession Date</span>
                        <span className="detail-value">{apartment.possessionDate}</span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">Expiry Date</span>
                        <span className="detail-value expiry">{apartment.expiryDate}</span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">Pricing</span>
                        <span className="detail-value pricing">{apartment.pricing}</span>
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
            ))}
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
                    {Math.round((occupiedCount / property.apartments.length) * 100)}%
                  </div>
                </div>
                <p className="chart-label">Current Occupancy</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PropertyDetails