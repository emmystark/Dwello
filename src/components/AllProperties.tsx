import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest, API_CONFIG } from '../lib/api-config';
import { getWalrusImageUrl, isValidBlobId } from '../lib/walrus-utils';
import type { Property } from '../types';
import '../styles/AllProperties.css';

const AGGREGATOR_URL = 'https://aggregator.walrus-testnet.walrus.space'; // or your aggregator URL

const AllProperties = () => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [filteredProperties, setFilteredProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [imageLoadErrors, setImageLoadErrors] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'price-low' | 'price-high'>('recent');
  const navigate = useNavigate();

  // Fetch all properties
  useEffect(() => {
    const fetchAllProperties = async () => {
      try {
        setLoading(true);
        const data = await apiRequest<any>(API_CONFIG.endpoints.properties.list);
        
        const props: Property[] = (data.data || data || []).map((p: any) => {
          const blobId = p.walrusId || p.blobId || p.imageBlobId;
          const isLegitBlobId = blobId && blobId !== 'null' && blobId !== 'placeholder blob id';
          
          return {
            ...p,
            title: p.title || p.houseName || 'Property',
            location: p.address || `${p.city}, ${p.state}`,
            price: p.price?.toString() || '0',
            currency: p.currency || '$',
            type: p.propertyType || p.type || 'Property',
            imageUrl: isLegitBlobId ? `${AGGREGATOR_URL}/v1/blobs/${blobId}` : null,
            walrusId: blobId,
            blobIds: p.blobIds || (blobId ? [blobId] : []),
            isLegitBlobId,
          };
        });

        console.log('Loaded all properties:', props.length);
        setProperties(props);
        setFilteredProperties(props);
      } catch (error) {
        console.error('Error fetching all properties:', error);
        setProperties([]);
        setFilteredProperties([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAllProperties();
  }, []);

  // Filter and sort properties
  useEffect(() => {
    let filtered = [...properties];

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(p => 
        p.title.toLowerCase().includes(term) ||
        p.location.toLowerCase().includes(term) ||
        (p.city && p.city.toLowerCase().includes(term)) ||
        (p.state && p.state.toLowerCase().includes(term)) ||
        (p.country && p.country.toLowerCase().includes(term))
      );
    }

    // Apply sorting
    switch (sortBy) {
      case 'price-low':
        filtered.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
        break;
      case 'price-high':
        filtered.sort((a, b) => parseFloat(b.price) - parseFloat(a.price));
        break;
      case 'recent':
      default:
        // Keep original order (most recent first)
        break;
    }

    setFilteredProperties(filtered);
  }, [searchTerm, sortBy, properties]);

  const handlePropertyClick = (property: Property) => {
    navigate('/propertydetails', { state: { property } });
  };

  const handleViewDetails = (property: Property, e: React.MouseEvent) => {
    e.stopPropagation();
    navigate('/propertydetails', { state: { property } });
  };

  const handleImageError = (property: Property, e: React.SyntheticEvent<HTMLImageElement>) => {
    console.error(`Failed to load image for property ${property.id}`, property.walrusId);
    setImageLoadErrors(prev => new Set(prev).add(property.id));
  };

  const handleImageLoad = (property: Property) => {
    console.log(`✅ Loaded image for property ${property.id}`);
  };

  if (loading) {
    return (
      <div className="all-properties-page">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading all properties from Walrus blockchain...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="all-properties-page">
      {/* Header Section */}
      <div className="page-header">
        <div className="header-content">
          <h1>All Properties</h1>
          <p className="subtitle">Browse all verified properties on the Walrus blockchain</p>
        </div>
        
        <div className="header-stats">
          <div className="stat-box">
            <span className="stat-number">{properties.length}</span>
            <span className="stat-label">Total Properties</span>
          </div>
          <div className="stat-box">
            <span className="stat-number">{filteredProperties.length}</span>
            <span className="stat-label">Showing</span>
          </div>
        </div>
      </div>

      {/* Filters Section */}
      <div className="filters-section">
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search by location, city, or property name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          {searchTerm && (
            <button 
              className="clear-search"
              onClick={() => setSearchTerm('')}
            >
              ✕
            </button>
          )}
        </div>

        <div className="sort-section">
          <label>Sort by:</label>
          <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value as any)}
            className="sort-select"
          >
            <option value="recent">Most Recent</option>
            <option value="price-low">Price: Low to High</option>
            <option value="price-high">Price: High to Low</option>
          </select>
        </div>
      </div>

      {/* Properties Grid */}
      {filteredProperties.length > 0 ? (
        <div className="properties-grid">
          {filteredProperties.map((property) => {
            const hasImageError = imageLoadErrors.has(property.id);
            const shouldShowImage = property.isLegitBlobId && !hasImageError;
            
            return (
              <div 
                key={property.id} 
                className="property-card"
                onClick={() => handlePropertyClick(property)}
              >
                <div className="property-image">
                  <div className="image-wrapper">
                    <span className="property-type">{property.type}</span>
                    
                    {shouldShowImage ? (
                      <img
                        src={property.imageUrl}
                        alt={property.title}
                        className="walrus-image"
                        onLoad={() => handleImageLoad(property)}
                        onError={(e) => handleImageError(property, e)}
                      />
                    ) : (
                      <div className="image-placeholder">
                        {hasImageError ? '🖼️' : '🏠'}
                      </div>
                    )}
                  </div>

                  <div className="property-badge">
                    {property.isLegitBlobId ? '✓ Verified' : 'Listed'}
                  </div>
                </div>

                <div className="property-info">
                  <h3 className="property-title">{property.title}</h3>
                  <p className="property-location">📍 {property.location}</p>
                  
                  <div className="price-section">
                    <span className="price">
                      {property.currency}{property.price}
                    </span>
                    {property.period && (
                      <span className="period">/ {property.period}</span>
                    )}
                  </div>
                  
                  <div className="property-features">
                    {property.bedrooms && <span>🛏️ {property.bedrooms}</span>}
                    {property.bathrooms && <span>🚿 {property.bathrooms}</span>}
                    {property.area && <span>📐 {property.area}</span>}
                  </div>
                  
                  {property.isLegitBlobId && (
                    <div className="blockchain-info">
                      <span className="walrus-badge">🔗</span>
                      <small className="blob-id" title={`Blob ID: ${property.walrusId}`}>
                        {property.walrusId.substring(0, 12)}...
                      </small>
                    </div>
                  )}
                  
                  <button 
                    className="view-details-btn"
                    onClick={(e) => handleViewDetails(property, e)}
                  >
                    View Details →
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="empty-state">
          <span className="empty-icon">🏘️</span>
          <h2>No properties found</h2>
          {searchTerm ? (
            <>
              <p>No properties match your search: "{searchTerm}"</p>
              <button 
                className="clear-filters-btn"
                onClick={() => setSearchTerm('')}
              >
                Clear Search
              </button>
            </>
          ) : (
            <p>No properties have been listed yet</p>
          )}
        </div>
      )}
    </div>
  );
};

export default AllProperties;