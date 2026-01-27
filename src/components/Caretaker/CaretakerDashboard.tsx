import { useState, useEffect } from 'react'
import DashboardOverview from './DashboardOverview'
import MyInventory from '../MyInventory'
import AddNewListing from '../AddNewListing'
import PropertyDetails from '../PropertyDetails'
import { apiRequest, API_CONFIG } from '../../lib/api-config'
import { useSui } from '../../sui/SuiProviders'
import type { Property } from '../../types'
import '../../styles/Dashboard.css'

const CaretakerDashboard = () => {
  const { account } = useSui()
  const [activeTab, setActiveTab] = useState<'overview' | 'inventory' | 'addNew'>('overview')
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null)
  const [properties, setProperties] = useState<Property[]>([])
  const [refreshKey, setRefreshKey] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(6)

  // Fetch caretaker's properties from API
  const fetchProperties = async () => {
    if (!account) {
      return
    }

    try {
      const endpoint = API_CONFIG.endpoints.properties.byCaretaker(account)
      const data = await apiRequest<any>(endpoint)
      setProperties((data.data || data || []) as Property[])
    } catch (err) {
      console.error('Failed to fetch caretaker properties:', err)
      setProperties([])
    }
  }

  useEffect(() => {
    fetchProperties()
  }, [account, refreshKey])

  const totalMonthlyEarnings = properties.reduce((sum, prop) => sum + prop.totalEarnings, 0)

  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentProperties = properties.slice(indexOfFirstItem, indexOfLastItem)
  const totalPages = Math.ceil(properties.length / itemsPerPage)

  const handleAddProperty = (newProperty: Property) => {
    setProperties([newProperty, ...properties])
    setActiveTab('inventory')
    // Trigger a refresh after a short delay to sync with backend
    setTimeout(() => {
      setRefreshKey(prev => prev + 1)
    }, 2000)
  }

  const handleViewDetails = (property: Property) => {
    setSelectedProperty(property)
  }

  const handleBackToInventory = () => {
    setSelectedProperty(null)
  }

  if (selectedProperty) {
    return (
      <PropertyDetails 
        property={selectedProperty} 
        onBack={handleBackToInventory}
      />
    )
  }

  return (
    <div className="caretaker-dashboard">
      <div className="dashboard-sidebar">
        <div className="sidebar-header">
          <div className="logo">
            <span className="logo-icon"></span>
            <h2>Caretaker</h2>
          </div>
        </div>

        <nav className="sidebar-nav">
          <button 
            className={`nav-item ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            <span className="nav-icon"></span>
            <span>Dashboard</span>
          </button>
          
          <button 
            className={`nav-item ${activeTab === 'inventory' ? 'active' : ''}`}
            onClick={() => setActiveTab('inventory')}
          >
            <span className="nav-icon"></span>
            <span>My Inventory</span>
          </button>
          
          <button 
            className={`nav-item ${activeTab === 'addNew' ? 'active' : ''}`}
            onClick={() => setActiveTab('addNew')}
          >
            <span className="nav-icon"></span>
            <span>Add New Listing</span>
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="earnings-widget">
            <p className="widget-label">Monthly Earnings</p>
            <h3 className="widget-value">${totalMonthlyEarnings.toLocaleString()}</h3>
            <p className="widget-subtext"> Total Revenue</p>
          </div>
        </div>
      </div>

      <div className="dashboard-content">
        <div className="content-header">
          <h1>
            {activeTab === 'overview' && 'Dashboard Overview'}
            {activeTab === 'inventory' && 'My Inventory'}
            {activeTab === 'addNew' && 'Add New Listing'}
          </h1>
          <div className="header-actions">
            {/* <button className="notification-btn">
              <span>🔔</span>
              <span className="notification-badge">3</span>
            </button> */}
            <div className="user-profile">
              <div className="avatar">👤</div>
            </div>
          </div>
        </div>

        <div className="content-body">
          {activeTab === 'overview' && (
            <DashboardOverview 
              properties={properties} 
              totalEarnings={totalMonthlyEarnings}
            />
          )}
          
          {activeTab === 'inventory' && (
            <>
              <MyInventory 
                properties={currentProperties}
                onViewDetails={handleViewDetails}
              />
              {totalPages > 1 && (
                <div className="pagination">
                  <button className="page-btn" disabled={currentPage === 1} onClick={() => setCurrentPage(1)}>First</button>
                  <button className="page-btn" disabled={currentPage === 1} onClick={() => setCurrentPage(currentPage - 1)}>Prev</button>
                  <span className="page-info">Page {currentPage} of {totalPages}</span>
                  <button className="page-btn" disabled={currentPage === totalPages} onClick={() => setCurrentPage(currentPage + 1)}>Next</button>
                  <button className="page-btn" disabled={currentPage === totalPages} onClick={() => setCurrentPage(totalPages)}>Last</button>
                </div>
              )}
            </>
          )}
          
          {activeTab === 'addNew' && (
            <AddNewListing onAddProperty={handleAddProperty} />
          )}
        </div>
      </div>
    </div>
  )
}

export default CaretakerDashboard