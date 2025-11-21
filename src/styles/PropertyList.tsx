import { useState, useEffect } from 'react'

interface Property {
  id: string
  title: string
  location: string
  price: string
  currency: string
  bedrooms: number
  bathrooms: number
  area: string
  type: string
  walrusId: string
}

interface PropertyListProps {
  location: any
}

const generateMockProperties = (location: any): Property[] => {
  const { country, state, city } = location
  
  const currencyMap: { [key: string]: string } = {
    'United States': '$',
    'United Kingdom': '£',
    'Canada': 'CAD$',
    'Australia': 'AUD$',
    'Germany': '€',
    'France': '€',
    'Spain': '€',
    'Italy': '€',
    'Nigeria': '₦',
    'United Arab Emirates': 'AED',
    'Japan': '¥',
    'India': '₹',
    'Brazil': 'R$',
  }

  const currency = currencyMap[country] || '$'
  
  const priceRanges: { [key: string]: [number, number] } = {
    'United States': [250000, 2000000],
    'United Kingdom': [200000, 1500000],
    'Nigeria': [15000000, 120000000],
    'United Arab Emirates': [500000, 5000000],
    'Germany': [180000, 900000],
    'Australia': [350000, 2500000],
    'Canada': [300000, 1800000],
    'France': [200000, 1200000],
  }

  const [minPrice, maxPrice] = priceRanges[country] || [100000, 1000000]

  const propertyTypes = ['Apartment', 'House', 'Villa', 'Condo', 'Townhouse', 'Duplex', 'Penthouse']
  
  const properties: Property[] = []
  
  for (let i = 0; i < 8; i++) {
    const bedrooms = Math.floor(Math.random() * 4) + 1
    const bathrooms = Math.floor(Math.random() * 3) + 1
    const sqm = Math.floor(Math.random() * 200) + 50
    const price = Math.floor(Math.random() * (maxPrice - minPrice) + minPrice)
    const type = propertyTypes[Math.floor(Math.random() * propertyTypes.length)]
    
    properties.push({
      id: `prop_${i + 1}_${Date.now()}`,
      title: `${bedrooms} Bedroom ${type}`,
      location: `${city || state}, ${country}`,
      price: price.toLocaleString(),
      currency,
      bedrooms,
      bathrooms,
      area: `${sqm} sqm`,
      type,
      walrusId: `walrus_${Math.random().toString(36).substring(2, 15)}`
    })
  }
  
  return properties
}

const PropertyList = ({ location }: PropertyListProps) => {
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!location.city && !location.state) return
    
    setLoading(true)
    
    // Simulate blockchain query
    const timer = setTimeout(() => {
      const mockProperties = generateMockProperties(location)
      setProperties(mockProperties)
      setLoading(false)
    }, 1500)

    return () => clearTimeout(timer)
  }, [location])

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p>🔍 Searching Walrus blockchain for properties...</p>
      </div>
    )
  }

  if (!location.city && !location.state) {
    return null
  }

  return (
    <div className="property-list">
      <div className="list-header">
        <h2>Available Properties</h2>
        <p className="location-display">
          📍 {location.city || location.state}, {location.country}
        </p>
        <p className="results-count">
          ✓ {properties.length} properties verified on Walrus ledger
        </p>
      </div>
      
      <div className="properties-grid">
        {properties.map((property) => (
          <div key={property.id} className="property-card">
            <div className="property-image">
              <div className="placeholder-image">
                <span className="property-type">{property.type}</span>
                <div className="image-icon">🏠</div>
              </div>
              <div className="property-badge">✓ Verified</div>
            </div>
            
            <div className="property-details">
              <h3>{property.title}</h3>
              <p className="location">{property.location}</p>
              <p className="price">
                {property.currency}{property.price}
              </p>
              
              <div className="property-features">
                <span>🛏️ {property.bedrooms} beds</span>
                <span>🚿 {property.bathrooms} baths</span>
                <span>📐 {property.area}</span>
              </div>
              
              <div className="blockchain-info">
                <span className="walrus-badge">🔗 Walrus</span>
                <small title={property.walrusId}>
                  ID: {property.walrusId.substring(0, 12)}...
                </small>
              </div>
              
              <button className="view-btn">View Details</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default PropertyList