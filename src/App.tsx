import { useEffect, useState } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import LocationSelector from './components/LocationSelector'
import PropertyList from './components/PropertyList'
import PropertyDetails from './components/PropertyDetails'
import CaretakerDashboard from './components/Caretaker/CaretakerDashboard'
import { useSui } from './sui/SuiProviders'
import './styles/App.css'
import caretakerWhitelistRaw from './walrus/caretakers.txt?raw'

interface Location {
  country?: string
  state?: string
  city?: string
}

function AppContent() {
  const [selectedLocation, setSelectedLocation] = useState<Location>({})
  const [viewMode, setViewMode] = useState<'customer' | 'caretaker'>('customer')
  const { isConnected, connect, disconnect, account } = useSui()
  const [showWalletMenu, setShowWalletMenu] = useState(false)
  const [isCaretakerAllowed, setIsCaretakerAllowed] = useState(false)

  useEffect(() => {
    if (!account) {
      setIsCaretakerAllowed(false)
      return
    }

    const allowed = caretakerWhitelistRaw
      .split(/\r?\n/)
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
      .includes(account.toLowerCase())

    setIsCaretakerAllowed(allowed)
  }, [account])

  const handleLocationSelect = (location: Location) => {
    setSelectedLocation(location)
  }

  const handleToggleView = () => {
    if (viewMode === 'customer') {
      if (!isConnected) {
        alert('Please connect your Sui wallet first.')
        return
      }
      if (!isCaretakerAllowed) {
        alert('This wallet address is not registered as a caretaker.')
        return
      }
      setViewMode('caretaker')
    } else {
      setViewMode('customer')
    }
  }

  const handleDisconnect = () => {
    disconnect()
    setViewMode('customer')
    setShowWalletMenu(false)
  }

  if (viewMode === 'caretaker') {
    return <CaretakerDashboard />
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <a href=".">
          <img src="./logo.png" style={{ height: '80px', width: '110px' }} alt="logo" />
          </a>
        </div>
        <div className="header-actions-group">
          <button 
            className="mode-switch"
            onClick={handleToggleView}
          >
            {viewMode === 'customer' ? 'Caretaker Portal' : '👤 Customer View'}
          </button>
          <div className="wallet-button-wrapper">
            <button 
              className={`connect-btn ${isConnected ? 'connected' : ''}`}
              onClick={() => {
                if (!isConnected) {
                  connect()
                } else {
                  setShowWalletMenu((prev) => !prev)
                }
              }}
            >
              {isConnected ? '✓ Connected' : 'Connect Wallet'}
            </button>
            {isConnected && showWalletMenu && (
              <div className="wallet-dropdown">
                <button className="wallet-dropdown-item" onClick={handleDisconnect}>
                  Disconnect Wallet
                </button>
              </div>
            )}
          </div>
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