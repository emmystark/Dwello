import { useState } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import LocationSelector from './components/LocationSelector'
import PropertyList from './components/PropertyList'
import PropertyDetails from './components/PropertyDetails'
import CaretakerDashboard from './components/CaretakerDashboard'
import { useSui } from './sui/SuiProviders'
import './styles/App.css'

interface Location {
  country?: string
  state?: string
  city?: string
}

function AppContent() {
  const [selectedLocation, setSelectedLocation] = useState<Location>({})
  const [viewMode, setViewMode] = useState<'customer' | 'caretaker'>('customer')
  const { isConnected, connect } = useSui()

  const handleLocationSelect = (location: Location) => {
    setSelectedLocation(location)
  }

  if (viewMode === 'caretaker') {
    return <CaretakerDashboard />
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <a href=".">
            <img src="./logo.png" alt="logo"/>
          </a>
        </div>
        <div className="header-actions-group">
          <button 
            className="mode-switch"
            onClick={() => setViewMode(viewMode === 'customer' ? 'caretaker' : 'customer')}
          >
            {viewMode === 'customer' ? 'Caretaker Portal' : '👤 Customer View'}
          </button>
          <button 
            className={`connect-btn ${isConnected ? 'connected' : ''}`}
            onClick={connect}
          >
            {isConnected ? '✓ Connected' : 'Connect Wallet'}
          </button>
        </div>
      </header>

      <main className="app-main">
        {!isConnected ? (
          <div className="connect-prompt">
            <div className="prompt-icon"></div>
            <h2>Connect Your Sui Wallet</h2>
            <p>Connect your wallet to start exploring properties worldwide</p>
            <p className="prompt-subtext">Secure blockchain-verified real estate listings</p>
            <button className="connect-btn-large" onClick={connect}>
              Connect Wallet
            </button>
          </div>
        ) : (
          <>
            <LocationSelector 
              onLocationSelect={handleLocationSelect}
              selectedLocation={selectedLocation}
            />
            
            {(selectedLocation.city || selectedLocation.state) && (
              <PropertyList location={selectedLocation} />
            )}
          </>
        )}
      </main>

      <footer className="app-footer">
        <p>Built on Sui Network • Data stored on Walrus</p>
      </footer>
    </div>
  )
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<AppContent />} />
        <Route path="/propertydetails" element={<PropertyDetails />} />
        {/* Add other routes as needed */}
      </Routes>
    </Router>
  )
}

export default App