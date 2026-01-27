import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest, API_CONFIG } from '../lib/api-config';
import type { Property } from '../types';

interface Location {
  country?: string;
  state?: string;
  city?: string;
}

interface PropertyListProps {
  location?: Location;
}

const fetchPropertiesFromBackend = async (location: Location = {}): Promise<Property[]> => {
  try {
    // Fetch all properties from backend API using centralized config
    const data = await apiRequest<any>(API_CONFIG.endpoints.properties.list);
    
    let properties: Property[] = (data.data || data || []).map((p: any) => ({
      ...p,
      title: p.title || p.houseName || 'Property',
      location: p.address || `${p.city}, ${p.state}`,
      price: p.price?.toString() || '0',
      currency: p.currency || '$',
      type: p.propertyType || p.type || 'Property',
    }));

    // Filter by location if provided
    if (location.country || location.state || location.city) {
      const normalize = (value: string | undefined | null) =>
        (value || '').trim().toLowerCase();

      const normCountry = normalize(location.country);
      const normState = normalize(location.state);
      const normCity = normalize(location.city);

      properties = properties.filter((p: any) => {
        const pCountry = normalize(p.country);
        const pState = normalize(p.state);
        const pCity = normalize(p.city);

        if (normCity) {
          return (
            pCountry === normCountry &&
            pState === normState &&
            pCity === normCity
          );
        }

        return pCountry === normCountry && pState === normState;
      });
    }

    return properties;
  } catch (error) {
    console.error('Error fetching properties from backend:', error);
    return [];
  }
};

const PropertyList = ({ location }: PropertyListProps) => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  if (!location) return null;

  useEffect(() => {
    if (!location.city && !location.state) return;

    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const props = await fetchPropertiesFromBackend(location);
        setProperties(props);
      } catch (error) {
        console.error("Error fetching properties:", error);
        setProperties([]);
      } finally {
        setLoading(false);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [location]);

  // Handle property card click to navigate to property details
  const handlePropertyClick = (property: Property) => {
    navigate('/propertydetails', { 
      state: { property } 
    });
  };

  // Handle view details button click
  const handleViewDetails = (property: Property, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click event from firing
    navigate('/propertydetails', { 
      state: { property } 
    });
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p>Searching Walrus blockchain for properties...</p>
      </div>
    );
  }

  if (!location.city && !location.state) return null;

  return (
    <div className="property-list">
      <div className="list-header">
        <h2>Available Properties</h2>
        <p className="location-display">
          {location.city || location.state || "Unknown"}, {location.country || "Unknown"}
        </p>
        <p className="results-count">
          {properties.length} properties verified on Walrus ledger
        </p>
      </div>

      <div className="properties-grid">
        {properties.map((property) => (
          <div 
            key={property.id} 
            className="property-card"
            onClick={() => handlePropertyClick(property)}
            style={{ cursor: 'pointer' }}
          >
            <div className="property-image">
              <div className="placeholder-image">
                <span className="property-type">{property.type}</span>
                {property.imageUrl ? (
                  <img
                    src={property.imageUrl}
                    alt={property.title}
                    className="walrus-image"
                    onLoad={(e) => {
                      (e.target as HTMLImageElement).style.opacity = "1";
                    }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                    style={{ opacity: 0, height:200, width: '140%', transition: "opacity 0.5s" }}
                  />
                ) : (
                  <div className="image-icon">😩</div>
                )}
              </div>

              <div className="property-badge">Verified</div>
            </div>

            <div className="property-details">
              <h3>{property.title}</h3>
              <p className="location"> {property.location}</p>
              <p className="price">
                {property.currency}
                {property.price}
              </p>
              <div className="property-features">
                <span>{property.bedrooms} beds</span>
                <span>{property.bathrooms} baths</span>
                <span>{property.area}</span>
              </div>
              <div className="blockchain-info">
                <span className="walrus-badge">Walrus</span>
                <small title={property.walrusId}>
                  ID: {(property.walrusId || property.id || 'N/A').substring(0, 12)}...
                </small>
              </div>
              
              <button 
                className="view-btn"
                onClick={(e) => handleViewDetails(property, e)}
              >
                View Details
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PropertyList;

