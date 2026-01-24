/**
 * Example: Complete Real Estate Listing Flow
 * Shows how to use PropertyUpload, Walrus, Sui, and PropertyShowcase together
 */

import { useState } from 'react';
import PropertyUpload from './components/PropertyUpload';
import PropertyShowcase from './components/PropertyShowcase';
import type { Property } from './types';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState<'browse' | 'upload'>('browse');
  const [properties, setProperties] = useState<Property[]>([]);

  /**
   * Handle successful property upload
   */
  const handlePropertySuccess = (property: Property) => {
    console.log('✅ Property uploaded successfully:', property);

    // Add to local state (optional)
    setProperties((prev) => [property, ...prev]);

    // Refresh property list
    refreshPropertyList();

    // Show success notification
    showNotification('Property created successfully! 🎉', 'success');

    // Switch to browse tab to see new property
    setTimeout(() => setActiveTab('browse'), 1500);
  };

  /**
   * Handle upload error
   */
  const handleUploadError = (error: string) => {
    console.error('❌ Upload failed:', error);
    showNotification(`Error: ${error}`, 'error');
  };

  /**
   * Refresh property list
   */
  const refreshPropertyList = async () => {
    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiUrl}/api/properties`);
      const data = await response.json();
      setProperties(data.data || []);
    } catch (error) {
      console.error('Failed to refresh properties:', error);
    }
  };

  /**
   * Handle property selection
   */
  const handlePropertySelect = (property: Property) => {
    console.log('👁️ Viewing property:', property);
    // Could navigate to detail page, open contact form, etc.
  };

  /**
   * Show notification
   */
  const showNotification = (message: string, type: 'success' | 'error') => {
    // Could use react-toastify or custom notification
    console.log(`[${type.toUpperCase()}] ${message}`);
  };

  return (
    <div className="app">
      {/* Header */}
      <header className="app-header">
        <div className="header-container">
          <h1>🏠 Dwello - Real Estate on Sui</h1>
          <p>Secure property listings with Walrus & Sui blockchain</p>
        </div>
      </header>

      {/* Tab Navigation */}
      <nav className="app-tabs">
        <button
          className={`tab-button ${activeTab === 'browse' ? 'active' : ''}`}
          onClick={() => setActiveTab('browse')}
        >
          📋 Browse Properties
        </button>
        <button
          className={`tab-button ${activeTab === 'upload' ? 'active' : ''}`}
          onClick={() => setActiveTab('upload')}
        >
          ➕ Create Listing
        </button>
      </nav>

      {/* Content */}
      <main className="app-content">
        {activeTab === 'browse' && (
          <PropertyShowcase
            onPropertySelect={handlePropertySelect}
            filters={{
              minPrice: 0,
              maxPrice: 10000000,
            }}
            sortBy="newest"
          />
        )}

        {activeTab === 'upload' && (
          <PropertyUpload
            onSuccess={handlePropertySuccess}
            onError={handleUploadError}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="app-footer">
        <div className="footer-content">
          <div className="footer-section">
            <h3>About Dwello</h3>
            <p>
              Dwello is a decentralized real estate platform leveraging Sui
              blockchain and Walrus for secure, transparent property listings.
            </p>
          </div>

          <div className="footer-section">
            <h3>Technology</h3>
            <ul>
              <li>✅ Sui Blockchain</li>
              <li>✅ Walrus Protocol</li>
              <li>✅ React + TypeScript</li>
              <li>✅ Move Smart Contracts</li>
            </ul>
          </div>

          <div className="footer-section">
            <h3>Features</h3>
            <ul>
              <li>✅ Secure Image Storage</li>
              <li>✅ On-chain Property Registry</li>
              <li>✅ Caretaker Management</li>
              <li>✅ View Tracking</li>
            </ul>
          </div>

          <div className="footer-section">
            <h3>Resources</h3>
            <ul>
              <li>
                <a href="https://docs.sui.io" target="_blank">
                  Sui Docs
                </a>
              </li>
              <li>
                <a href="https://docs.wal.app" target="_blank">
                  Walrus Docs
                </a>
              </li>
              <li>
                <a href="./INTEGRATION_GUIDE.md">Integration Guide</a>
              </li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <p>&copy; 2024 Dwello. Built on Sui with ❤️</p>
        </div>
      </footer>
    </div>
  );
}

export default App;

/**
 * Advanced Usage Example
 * Shows how to integrate with wallet and Sui transactions
 */

/*
import { useSignAndExecuteTransactionBlock } from '@mysten/dapp-kit';
import { createHouseOnChain, executeTransaction } from './walrus/sui-helpers';

function AdvancedUpload() {
  const { mutate: signAndExecute } = useSignAndExecuteTransactionBlock();

  const handleUploadWithBlockchain = async (property: Property) => {
    try {
      // 1. Upload to backend (which uploads images to Walrus)
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';
      const formData = new FormData();
      
      // Add property data to formData...
      
      const response = await fetch(`${apiUrl}/api/properties`, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      const backendProperty = result.property;

      // 2. Create transaction to record on Sui
      const tx = await createHouseOnChain(
        backendProperty,
        property.caretakerAddress,
        property.caretakerAddress
      );

      // 3. Sign and execute transaction
      signAndExecute(
        { transactionBlock: tx },
        {
          onSuccess: (result) => {
            console.log('✅ Property recorded on Sui:', result.digest);
            // Property is now on-chain with Walrus blob IDs!
          },
          onError: (error) => {
            console.error('❌ Blockchain transaction failed:', error);
          },
        }
      );
    } catch (error) {
      console.error('Error:', error);
    }
  };

  return <PropertyUpload onSuccess={handleUploadWithBlockchain} />;
}
*/

/**
 * Search and Filter Example
 */

/*
function PropertySearch() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    minPrice: 0,
    maxPrice: 1000000,
    bedrooms: 0,
    propertyType: '',
  });

  return (
    <div>
      <input
        type="text"
        placeholder="Search properties..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />

      <PropertyShowcase
        filters={filters}
        sortBy="newest"
        onPropertySelect={(prop) => console.log('Selected:', prop)}
      />
    </div>
  );
}
*/

/**
 * Caretaker Dashboard Example
 */

/*
import { getCaretakerProperties } from './walrus/sui-helpers';

function CaretakerDashboard({ caretakerAddress }: { caretakerAddress: string }) {
  const [myProperties, setMyProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const props = await getCaretakerProperties(caretakerAddress);
        setMyProperties(props);
      } finally {
        setLoading(false);
      }
    })();
  }, [caretakerAddress]);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h2>My Properties ({myProperties.length})</h2>
      {myProperties.map((prop) => (
        <div key={prop.id}>
          <h3>{prop.houseName}</h3>
          <p>{prop.address}</p>
          <p>Price: ${prop.price}</p>
          <p>Views: {prop.views}</p>
        </div>
      ))}
    </div>
  );
}
*/
