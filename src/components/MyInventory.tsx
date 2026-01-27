import type { Property } from '../types'
import { getWalrusBlobUrl } from '../walrus/client'

interface MyInventoryProps {
  properties: Property[]
  onViewDetails: (property: Property) => void
}

const MyInventory = ({ properties, onViewDetails }: MyInventoryProps) => {
  return (
    <div className="my-inventory">
      <div className="inventory-header">
        <div className="inventory-stats">
          <div className="stat-badge">
            {/* <span className="badge-icon">🏢</span> */}
            <span className="badge-text">{properties.length} Properties</span>
          </div>
          <div className="stat-badge">
            {/* <span className="badge-icon">🏠</span> */}
            <span className="badge-text">
              {properties.reduce((sum, p) => sum + p.apartments.length, 0)} Total Units
            </span>
          </div>
        </div>
      </div>

      <div className="inventory-grid">
        {properties.map(property => {
          const occupiedCount = property.apartments.filter(apt => apt.status === 'occupied').length
          const totalUnits = property.apartments.length
          const occupancyRate = Math.round((occupiedCount / totalUnits) * 100)

          return (
            <div key={property.id} className="inventory-card">
              <div className="inventory-image">
                {property.images && property.images.length > 0 && property.images[0]?.blobId ? (
                  <img 
                    src={getWalrusBlobUrl(property.images[0].blobId)} 
                    alt={property.houseName}
                    className="card-image"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : null}
                <div className="placeholder-bg" style={{display: (property.images && property.images.length > 0 && property.images[0]?.blobId) ? 'none' : 'flex'}}>
                  <span className="building-icon">🏢</span>
                </div>
                <div className="occupancy-badge">
                  {occupancyRate}% Occupied
                </div>
              </div>

              <div className="inventory-details">
                <h3 className="property-name">{property.houseName}</h3>
                <p className="property-address"> {property.address}</p>

                <div className="property-stats">
                  <div className="stat-item">
                    <span className="stat-label">Units</span>
                    <span className="stat-value">{totalUnits}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Occupied</span>
                    <span className="stat-value">{occupiedCount}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Vacant</span>
                    <span className="stat-value">{totalUnits - occupiedCount}</span>
                  </div>
                </div>

                <div className="property-earnings">
                  <span className="earnings-label">Monthly Earnings</span>
                  {/* <span className="earnings-value">${property.totalEarnings.toLocaleString()}</span> */}
                 
                </div>

                <div className="property-actions">
                  <button 
                    className="btn-view-details"
                    onClick={() => onViewDetails(property)}
                  >
                    View Details
                  </button>
                  <button className="btn-manage">
                    <span>⚙️</span>
                    <span>Manage</span>
                  </button>
                </div>

                <div className="blockchain-badge">
                  <span>🔗 Walrus</span>
                  <small>ID: {property.id}</small>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {properties.length === 0 && (
        <div className="empty-inventory">
          <div className="empty-icon">🏢</div>
          <h3>No Properties Yet</h3>
          <p>Start by adding your first property to the inventory</p>
          <button className="btn-add-first">
            <span>➕</span>
            <span>Add Your First Property</span>
          </button>
        </div>
      )}
    </div>
  )
}

export default MyInventory