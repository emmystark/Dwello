import { useState, useEffect } from 'react';
import { getWalrusBlobUrl } from '../walrus/client';
import type { Property } from '../types';
import '../styles/PropertyShowcase.css';

interface PropertyShowcaseProps {
  onPropertySelect?: (property: Property) => void;
  filters?: {
    minPrice?: number;
    maxPrice?: number;
    bedrooms?: number;
    propertyType?: string;
  };
  sortBy?: 'newest' | 'price-low' | 'price-high' | 'popular';
}

const PropertyShowcase = ({
  onPropertySelect,
  filters,
  sortBy = 'newest',
}: PropertyShowcaseProps) => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [filteredProperties, setFilteredProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [displayMode, setDisplayMode] = useState<'grid' | 'list'>('grid');

  const ITEMS_PER_PAGE = 12;
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

  // Fetch properties
  useEffect(() => {
    fetchProperties();
  }, [page]);

  const fetchProperties = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `${API_URL}/api/properties?page=${page}&limit=${ITEMS_PER_PAGE}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch properties');
      }

      const data = await response.json();
      setProperties(data.data || []);
      setTotalPages(data.pagination?.pages || 1);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load properties';
      setError(message);
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Apply filters and sorting
  useEffect(() => {
    let filtered = [...properties];

    // Apply filters
    if (filters) {
      if (filters.minPrice !== undefined) {
        filtered = filtered.filter((p) => p.price >= filters.minPrice!);
      }
      if (filters.maxPrice !== undefined) {
        filtered = filtered.filter((p) => p.price <= filters.maxPrice!);
      }
      if (filters.bedrooms !== undefined && filters.bedrooms > 0) {
        filtered = filtered.filter((p) => p.bedrooms >= filters.bedrooms!);
      }
      if (filters.propertyType) {
        filtered = filtered.filter(
          (p) => p.propertyType?.toLowerCase() === filters.propertyType!.toLowerCase()
        );
      }
    }

    // Apply sorting
    switch (sortBy) {
      case 'price-low':
        filtered.sort((a, b) => a.price - b.price);
        break;
      case 'price-high':
        filtered.sort((a, b) => b.price - a.price);
        break;
      case 'popular':
        filtered.sort((a, b) => (b.views || 0) - (a.views || 0));
        break;
      case 'newest':
      default:
        filtered.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
    }

    setFilteredProperties(filtered);
  }, [properties, filters, sortBy]);

  const handlePropertyClick = (property: Property) => {
    setSelectedProperty(property);
    if (onPropertySelect) {
      onPropertySelect(property);
    }
  };

  const formatPrice = (price: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const renderImageGallery = (property: Property) => {
    const primaryImage = property.primaryImage?.url || property.images?.[0]?.url;

    if (!primaryImage) {
      return (
        <div className="property-image-placeholder">
          <div className="placeholder-icon">📷</div>
        </div>
      );
    }

    return (
      <div className="property-image">
        <img
          src={primaryImage}
          alt={property.houseName}
          onError={(e) => {
            const img = e.currentTarget as HTMLImageElement;
            img.style.display = 'none';
          }}
          loading="lazy"
        />
        {property.images && property.images.length > 1 && (
          <div className="image-count">
            +{property.images.length - 1}
          </div>
        )}
      </div>
    );
  };

  const PropertyCard = ({ property }: { property: Property }) => (
    <div
      className="property-card"
      onClick={() => handlePropertyClick(property)}
    >
      <div className="card-image-container">
        {renderImageGallery(property)}
        <div className="card-badges">
          {property.featured && <span className="badge badge-featured">Featured</span>}
          {property.propertyType && (
            <span className="badge badge-type">{property.propertyType}</span>
          )}
        </div>
      </div>

      <div className="card-content">
        <h3 className="property-name">{property.houseName}</h3>

        <p className="property-address">
          📍 {property.city && `${property.city}, `}
          {property.state && `${property.state}, `}
          {property.country}
        </p>

        <div className="property-specs">
          {property.bedrooms > 0 && (
            <span className="spec">🛏️ {property.bedrooms} bed{property.bedrooms !== 1 ? 's' : ''}</span>
          )}
          {property.bathrooms > 0 && (
            <span className="spec">🚿 {property.bathrooms} bath{property.bathrooms !== 1 ? 's' : ''}</span>
          )}
          {property.area && <span className="spec">📐 {property.area}</span>}
        </div>

        {property.description && (
          <p className="property-description">
            {property.description.substring(0, 100)}
            {property.description.length > 100 ? '...' : ''}
          </p>
        )}

        <div className="card-footer">
          <div className="price">{formatPrice(property.price)}</div>
          <div className="views">👁️ {property.views || 0} views</div>
        </div>
      </div>
    </div>
  );

  const PropertyListItem = ({ property }: { property: Property }) => (
    <div
      className="property-list-item"
      onClick={() => handlePropertyClick(property)}
    >
      <div className="list-image">
        {renderImageGallery(property)}
      </div>

      <div className="list-content">
        <div className="list-header">
          <h3>{property.houseName}</h3>
          <div className="list-price">{formatPrice(property.price)}</div>
        </div>

        <p className="list-address">
          📍 {property.address}
          {property.city && `, ${property.city}`}
          {property.state && `, ${property.state}`}
        </p>

        <div className="list-specs">
          {property.bedrooms > 0 && (
            <span>🛏️ {property.bedrooms} bed{property.bedrooms !== 1 ? 's' : ''}</span>
          )}
          {property.bathrooms > 0 && (
            <span>🚿 {property.bathrooms} bath{property.bathrooms !== 1 ? 's' : ''}</span>
          )}
          {property.area && <span>📐 {property.area}</span>}
          <span>{property.propertyType}</span>
        </div>

        {property.description && (
          <p className="list-description">{property.description}</p>
        )}
      </div>

      <div className="list-actions">
        <button className="btn-view">View Details →</button>
      </div>
    </div>
  );

  return (
    <div className="property-showcase">
      {/* Header */}
      <div className="showcase-header">
        <div className="header-content">
          <h2>Discover Properties</h2>
          <p>Browse available properties secured by Walrus & Sui</p>
        </div>

        <div className="header-controls">
          <div className="view-toggle">
            <button
              className={`toggle-btn ${displayMode === 'grid' ? 'active' : ''}`}
              onClick={() => setDisplayMode('grid')}
            >
              ⊞ Grid
            </button>
            <button
              className={`toggle-btn ${displayMode === 'list' ? 'active' : ''}`}
              onClick={() => setDisplayMode('list')}
            >
              ☰ List
            </button>
          </div>

          <select
            className="sort-select"
            value={sortBy}
            onChange={(e) => {}}
          >
            <option value="newest">Newest First</option>
            <option value="price-low">Price: Low to High</option>
            <option value="price-high">Price: High to Low</option>
            <option value="popular">Most Popular</option>
          </select>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="error-container">
          <div className="error-message">❌ {error}</div>
          <button className="btn btn-secondary" onClick={fetchProperties}>
            Try Again
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="loading-container">
          <div className="spinner" />
          <p>Loading properties...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredProperties.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">🏠</div>
          <h3>No properties found</h3>
          <p>Try adjusting your filters or check back soon for new listings.</p>
        </div>
      )}

      {/* Properties Grid/List */}
      {!loading && filteredProperties.length > 0 && (
        <>
          <div className={`properties-container properties-${displayMode}`}>
            {filteredProperties.map((property) =>
              displayMode === 'grid' ? (
                <PropertyCard key={property.id} property={property} />
              ) : (
                <PropertyListItem key={property.id} property={property} />
              )
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="pagination">
              <button
                className="btn-nav"
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
              >
                ← Previous
              </button>

              <div className="page-info">
                Page {page} of {totalPages}
              </div>

              <button
                className="btn-nav"
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}

      {/* Property Detail Modal */}
      {selectedProperty && (
        <PropertyDetailModal
          property={selectedProperty}
          onClose={() => setSelectedProperty(null)}
        />
      )}
    </div>
  );
};

// Property Detail Modal Component
interface PropertyDetailModalProps {
  property: Property;
  onClose: () => void;
}

const PropertyDetailModal = ({ property, onClose }: PropertyDetailModalProps) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const images = property.images || [];
  const currentImage = images[currentImageIndex]?.url || property.primaryImage?.url;

  const handlePrevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
  };

  const handleNextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
  };

  const formatPrice = (price: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>
          ✕
        </button>

        <div className="modal-body">
          {/* Image Gallery */}
          <div className="modal-image-section">
            {currentImage ? (
              <>
                <img src={currentImage} alt={property.houseName} />
                {images.length > 1 && (
                  <>
                    <button className="nav-btn prev" onClick={handlePrevImage}>
                      ❮
                    </button>
                    <button className="nav-btn next" onClick={handleNextImage}>
                      ❯
                    </button>
                    <div className="image-counter">
                      {currentImageIndex + 1} / {images.length}
                    </div>
                  </>
                )}
              </>
            ) : (
              <div className="image-placeholder">📷 No images</div>
            )}
          </div>

          {/* Details Section */}
          <div className="modal-details-section">
            <div className="detail-header">
              <h2>{property.houseName}</h2>
              <div className="detail-price">{formatPrice(property.price)}</div>
            </div>

            <p className="detail-address">
              📍 {property.address}
              {property.city && `, ${property.city}`}
              {property.state && `, ${property.state}`}
              {property.country && `, ${property.country}`}
            </p>

            <div className="detail-specs">
              {property.bedrooms > 0 && (
                <div className="spec-item">
                  <span className="spec-icon">🛏️</span>
                  <div>
                    <div className="spec-label">Bedrooms</div>
                    <div className="spec-value">{property.bedrooms}</div>
                  </div>
                </div>
              )}

              {property.bathrooms > 0 && (
                <div className="spec-item">
                  <span className="spec-icon">🚿</span>
                  <div>
                    <div className="spec-label">Bathrooms</div>
                    <div className="spec-value">{property.bathrooms}</div>
                  </div>
                </div>
              )}

              {property.area && (
                <div className="spec-item">
                  <span className="spec-icon">📐</span>
                  <div>
                    <div className="spec-label">Area</div>
                    <div className="spec-value">{property.area}</div>
                  </div>
                </div>
              )}

              {property.propertyType && (
                <div className="spec-item">
                  <span className="spec-icon">🏠</span>
                  <div>
                    <div className="spec-label">Type</div>
                    <div className="spec-value">{property.propertyType}</div>
                  </div>
                </div>
              )}
            </div>

            {property.description && (
              <div className="detail-description">
                <h3>Description</h3>
                <p>{property.description}</p>
              </div>
            )}

            {property.blobIds && property.blobIds.length > 0 && (
              <div className="detail-walrus-info">
                <h3>🔐 Secure Storage</h3>
                <p className="walrus-badge">
                  Stored securely on Walrus Protocol ({property.blobIds.length} file{property.blobIds.length !== 1 ? 's' : ''})
                </p>
              </div>
            )}

            <div className="detail-actions">
              <button className="btn btn-primary">Contact Caretaker</button>
              <button className="btn btn-secondary" onClick={onClose}>
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropertyShowcase;
