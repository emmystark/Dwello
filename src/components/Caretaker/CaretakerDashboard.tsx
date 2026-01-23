import { useState } from 'react'
import DashboardOverview from './DashboardOverview'
import MyInventory from '../MyInventory'
import AddNewListing from '../AddNewListing'
import PropertyDetails from '../PropertyDetails'
import type { Property } from '../../types'
import '../../styles/Dashboard.css'

const CaretakerDashboard = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'inventory' | 'addNew'>('overview')
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null)
  
  // Mock data - will be replaced with Walrus/Sui blockchain data
  const [properties, setProperties] = useState<Property[]>([
    {
      id: 'prop_1',
      houseName: 'Afasa Lounges',
      address: 'No 15 Ogbowodeci',
      apartments: [
        {
          id: 'apt_1',
          number: 1,
          tenant: 'James Michael',
          possessionDate: 'Jan 1st 2025',
          expiryDate: 'Jan 1st 2026',
          pricing: '$25,000',
          status: 'occupied'
        },
        {
          id: 'apt_2',
          number: 2,
          tenant: null,
          possessionDate: '',
          expiryDate: '',
          pricing: '$25,000',
          status: 'vacant'
        }
      ],
      totalEarnings: 25000,
      images: [],
      pricing: '$25,000/year'
    },
    {
      id: 'prop_2',
      houseName: 'Beverly Homes',
      address: '15 Main Street, CA',
      apartments: [
        {
          id: 'apt_3',
          number: 1,
          tenant: 'Sarah Johnson',
          possessionDate: 'Mar 1st 2025',
          expiryDate: 'Mar 1st 2026',
          pricing: '$30,000',
          status: 'occupied'
        },
        {
          id: 'apt_4',
          number: 2,
          tenant: 'Mike Brown',
          possessionDate: 'Feb 15th 2025',
          expiryDate: 'Feb 15th 2026',
          pricing: '$30,000',
          status: 'occupied'
        }
      ],
      totalEarnings: 60000,
      images: [],
      pricing: '$30,000/year'
    }
  ])

  const totalMonthlyEarnings = properties.reduce((sum, prop) => sum + prop.totalEarnings, 0)

  const handleAddProperty = (newProperty: Property) => {
    setProperties([...properties, newProperty])
    setActiveTab('inventory')
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
            <MyInventory 
              properties={properties}
              onViewDetails={handleViewDetails}
            />
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