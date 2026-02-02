import { useState, useEffect } from 'react';
import type { Property } from '../types';
import { getWalrusBlobUrl } from '../walrus/client';
import { useSui } from '../sui/SuiProviders';  // For fetching if needed
import { useNavigate } from 'react-router-dom';


interface MyInventoryProps {
  properties?: Property[];  // Make optional
  onViewDetails: (property: Property) => void;
}

const MyInventory = ({ properties: propProperties, onViewDetails }: MyInventoryProps) => {
  const [properties, setProperties] = useState<Property[]>(propProperties || []);
  const [imageData, setImageData] = useState<Record<string, string>>({});
  const [loadingImages, setLoadingImages] = useState(false);
  const [loadingProperties, setLoadingProperties] = useState(!propProperties);  // Fetch if not provided
  const [error, setError] = useState<string | null>(null);
  const { account } = useSui();
  

  // Fetch all properties from backend if not passed as props
  useEffect(() => {
  if (!propProperties) {
    const fetchProperties = async () => {
      setLoadingProperties(true);
      setError(null);
      try {
        const url = new URL('http://localhost:3001/api/properties', window.location.origin);  // Use full URL if proxy issues
        if (account) {
          url.searchParams.append('caretakerAddress', account);
        }
        const response = await fetch(url.toString());
        if (!response.ok) {
          throw new Error(`Failed: ${response.statusText}`);
        }
        const data = await response.json();
        if (!data.success) {
          throw new Error(data.error || 'Invalid response');
        }
        setProperties(data.properties);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoadingProperties(false);
      }
    };
    fetchProperties();
  }
}, [propProperties, account]);

  // Load images (existing code)
  useEffect(() => {
    const loadImages = async () => {
      setLoadingImages(true);
      const images: Record<string, string> = {};
      for (const property of properties) {
        if (property.images?.[0]?.blobId) {
          try {
            const response = await fetch(
              `/api/walrus/file/${property.images[0].blobId}`
            );
            if (response.ok) {
              const data = await response.json();
              // Create blob URL from base64 bytes
              if (data.bytes) {
                const binaryString = atob(data.bytes);
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                  bytes[i] = binaryString.charCodeAt(i);
                }
                const blob = new Blob([bytes], { type: data.tags?.mimeType || 'image/jpeg' });
                images[property.id] = URL.createObjectURL(blob);
              }
            }
          } catch (error) {
            console.error(`Failed to load image for ${property.id}:`, error);
            // Fall back to direct URL
            images[property.id] = getWalrusBlobUrl(property.images[0].blobId);
          }
        }
      }
      setImageData(images);
      setLoadingImages(false);
    };

    if (properties.length > 0) {
      loadImages();
    }
  }, [properties]);

  if (loadingProperties) {
    return (
      <div className="my-inventory">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading properties...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="my-inventory">
        <div className="error-state">
          <h3>Error Loading Inventory</h3>
          <p>{error}</p>
          <button onClick={() => window.location.reload()} className="btn-retry">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="my-inventory">
      <div className="inventory-header">
        <div className="inventory-stats">
          <div className="stat-badge">
            <span className="badge-text">{properties.length} Properties</span>
          </div>
          <div className="stat-badge">
            <span className="badge-text">
              {properties.reduce((sum, p) => sum + p.apartments.length, 0)} Total Units
            </span>
          </div>
        </div>
      </div>
      <div className="inventory-grid">
        {properties.map(property => {
          const occupiedCount = property.apartments.filter(apt => apt.status === 'occupied').length;
          const totalUnits = property.apartments.length;
          const occupancyRate = Math.round((occupiedCount / totalUnits) * 100);
          const imageSrc = imageData[property.id] || (property.images?.[0]?.blobId ? getWalrusBlobUrl(property.images[0].blobId) : null);
          return (
            <div key={property.id} className="inventory-card">
              <div className="inventory-image">
                {imageSrc ? (
                  <img
                    src={imageSrc}
                    alt={property.houseName}
                    className="card-image"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : null}
                <div className="placeholder-bg" style={{display: imageSrc ? 'none' : 'flex'}}>
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
          );
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
  );
};

export default MyInventory;