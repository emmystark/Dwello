interface Property {
    id: string
    houseName: string
    address: string
    apartments: Apartment[]
    totalEarnings: number
  }
  
  interface Apartment {
    id: string
    number: number
    tenant: string | null
    status: 'occupied' | 'vacant'
  }
  
  interface DashboardOverviewProps {
    properties: Property[]
    totalEarnings: number
  }
  
  const DashboardOverview = ({ properties, totalEarnings }: DashboardOverviewProps) => {
    const totalProperties = properties.length
    const totalApartments = properties.reduce((sum, prop) => sum + prop.apartments.length, 0)
    const occupiedApartments = properties.reduce(
      (sum, prop) => sum + prop.apartments.filter(apt => apt.status === 'occupied').length, 
      0
    )
    const vacantApartments = totalApartments - occupiedApartments
    const occupancyRate = totalApartments > 0 ? Math.round((occupiedApartments / totalApartments) * 100) : 0
  
    return (
      <div className="dashboard-overview">
        <div className="stats-grid">
          <div className="stat-card earnings">
            <div className="stat-icon">💰</div>
            <div className="stat-content">
              <p className="stat-label">Monthly Earnings</p>
              <h2 className="stat-value">${totalEarnings.toLocaleString()}</h2>
              <p className="stat-change positive">+12% from last month</p>
            </div>
          </div>
  
          <div className="stat-card properties">
            <div className="stat-icon">🏢</div>
            <div className="stat-content">
              <p className="stat-label">Total Properties</p>
              <h2 className="stat-value">{totalProperties}</h2>
              <p className="stat-subtext">{totalApartments} apartments</p>
            </div>
          </div>
  
          <div className="stat-card occupied">
            <div className="stat-icon">✅</div>
            <div className="stat-content">
              <p className="stat-label">Occupied Units</p>
              <h2 className="stat-value">{occupiedApartments}</h2>
              <p className="stat-subtext">{occupancyRate}% occupancy rate</p>
            </div>
          </div>
  
          <div className="stat-card vacant">
            <div className="stat-icon">🏚️</div>
            <div className="stat-content">
              <p className="stat-label">Vacant Units</p>
              <h2 className="stat-value">{vacantApartments}</h2>
              <p className="stat-subtext">Available for rent</p>
            </div>
          </div>
        </div>
  
        <div className="overview-sections">
          <div className="recent-activity">
            <h3>Recent Activity</h3>
            <div className="activity-list">
              <div className="activity-item">
                <div className="activity-icon new">➕</div>
                <div className="activity-details">
                  <p className="activity-title">New tenant added</p>
                  <p className="activity-desc">James Michael - Afasa Lounges Apt 1</p>
                  <p className="activity-time">2 hours ago</p>
                </div>
              </div>
              
              <div className="activity-item">
                <div className="activity-icon payment">💵</div>
                <div className="activity-details">
                  <p className="activity-title">Payment received</p>
                  <p className="activity-desc">$25,000 from Beverly Homes</p>
                  <p className="activity-time">1 day ago</p>
                </div>
              </div>
              
              <div className="activity-item">
                <div className="activity-icon expiry">⚠️</div>
                <div className="activity-details">
                  <p className="activity-title">Lease expiring soon</p>
                  <p className="activity-desc">Apartment 2 - 30 days remaining</p>
                  <p className="activity-time">3 days ago</p>
                </div>
              </div>
            </div>
          </div>
  
          <div className="quick-actions">
            <h3>Quick Actions</h3>
            <div className="action-buttons">
              <button className="action-btn">
                <span className="action-icon">➕</span>
                <span>Add New Property</span>
              </button>
              <button className="action-btn">
                <span className="action-icon">👤</span>
                <span>Add Tenant</span>
              </button>
              <button className="action-btn">
                <span className="action-icon">📊</span>
                <span>View Reports</span>
              </button>
              <button className="action-btn">
                <span className="action-icon">💳</span>
                <span>Record Payment</span>
              </button>
            </div>
          </div>
        </div>
  
        <div className="properties-summary">
          <h3>Properties Summary</h3>
          <div className="summary-table">
            <div className="table-header">
              <div>Property Name</div>
              <div>Address</div>
              <div>Units</div>
              <div>Occupied</div>
              <div>Earnings</div>
            </div>
            {properties.map(property => (
              <div key={property.id} className="table-row">
                <div className="property-name">{property.houseName}</div>
                <div className="property-address">{property.address}</div>
                <div>{property.apartments.length}</div>
                <div>{property.apartments.filter(apt => apt.status === 'occupied').length}</div>
                <div className="earnings-cell">${property.totalEarnings.toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }
  
  export default DashboardOverview