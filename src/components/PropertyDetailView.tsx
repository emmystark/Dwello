import { useState } from 'react'
import CaretakerChat from './CaretakerChat'
import '../styles/PropertyDetail.css'

interface PropertyDetailViewProps {
  property: {
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
  onBack: () => void
}

const PropertyDetailView = ({ property, onBack }: PropertyDetailViewProps) => {
  const [selectedImage, setSelectedImage] = useState(0)
  const [showChat, setShowChat] = useState(false)

  // Mock images - replace with actual property images
  const images = [
    'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=800',
    'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800',
    'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800',
    'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800'
  ]

  const caretakerFee = '5%' // Mock caretaker fee
  const caretakerName = 'John Property Manager'

  return (
    <div className="property-detail-view">
      <div className="detail-view-header">
        <button className="btn-back-detail" onClick={onBack}>
          <span>←</span>
          <span>Back to Listings</span>
        </button>
        <div className="header-actions-detail">
          <button className="btn-favorite">
            <span>❤️</span>
            <span>Save</span>
          </button>
          <button className="btn-share">
            <span>📤</span>
            <span>Share</span>
          </button>
        </div>
      </div>

      <div className="detail-view-content">
        <div className="content-main">
          {/* Image Gallery */}
          <div className="image-gallery">
            <div className="main-image">
              <div className="image-placeholder">
                <span className="placeholder-icon">🏠</span>
                <p className="placeholder-text">Property Image</p>
              </div>
              <div className="image-badge verified">✓ Verified on Chain</div>
            </div>
            
            <div className="thumbnail-grid">
              {[1, 2, 3, 4].map((_, index) => (
                <div
                  key={index}
                  className={`thumbnail ${selectedImage === index ? 'active' : ''}`}
                  onClick={() => setSelectedImage(index)}
                >
                  <div className="thumbnail-placeholder">
                    <span className="thumb-icon">🖼️</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Property Information */}
          <div className="property-info-section">
            <div className="property-header-info">
              <div className="property-title-group">
                <h1>{property.title}</h1>
                <span className="property-type-badge">{property.type}</span>
              </div>
              <p className="property-location-detail">📍 {property.location}</p>
            </div>

            <div className="price-section">
              <div className="main-price">
                <span className="price-label">Price</span>
                <span className="price-amount">{property.currency}{property.price}</span>
                <span className="price-period">per year</span>
              </div>
              <div className="caretaker-fee">
                <span className="fee-label">Caretaker Fee</span>
                <span className="fee-amount">{caretakerFee}</span>
              </div>
            </div>

            <div className="property-features-detail">
              <div className="feature-item">
                <div className="feature-icon">🛏️</div>
                <div className="feature-text">
                  <span className="feature-value">{property.bedrooms}</span>
                  <span className="feature-label">Bedrooms</span>
                </div>
              </div>
              <div className="feature-item">
                <div className="feature-icon">🚿</div>
                <div className="feature-text">
                  <span className="feature-value">{property.bathrooms}</span>
                  <span className="feature-label">Bathrooms</span>
                </div>
              </div>
              <div className="feature-item">
                <div className="feature-icon">📐</div>
                <div className="feature-text">
                  <span className="feature-value">{property.area}</span>
                  <span className="feature-label">Area</span>
                </div>
              </div>
            </div>

            <div className="description-section">
              <h3>About This Property</h3>
              <p>
                Beautiful {property.bedrooms}-bedroom {property.type.toLowerCase()} located in the heart of {property.location}. 
                This property features modern amenities, spacious rooms, and is perfect for families or professionals. 
                The unit is well-maintained and ready for immediate occupancy.
              </p>
              <ul className="amenities-list">
                <li>✓ Modern Kitchen</li>
                <li>✓ High-Speed Internet</li>
                <li>✓ 24/7 Security</li>
                <li>✓ Parking Space</li>
                <li>✓ Nearby Shopping Centers</li>
                <li>✓ Public Transportation Access</li>
              </ul>
            </div>

            <div className="blockchain-section">
              <h3>🔗 Blockchain Verification</h3>
              <div className="blockchain-details">
                <div className="blockchain-item">
                  <span className="blockchain-label">Walrus ID:</span>
                  <code className="blockchain-value">{property.walrusId}</code>
                </div>
                <div className="blockchain-item">
                  <span className="blockchain-label">Status:</span>
                  <span className="status-verified">✓ Verified on Sui Network</span>
                </div>
                <div className="blockchain-item">
                  <span className="blockchain-label">Last Updated:</span>
                  <span className="blockchain-value">2 hours ago</span>
                </div>
              </div>
            </div>

            <div className="caretaker-info-section">
              <h3>Property Caretaker</h3>
              <div className="caretaker-card">
                <div className="caretaker-avatar">👤</div>
                <div className="caretaker-details">
                  <h4>{caretakerName}</h4>
                  <p className="caretaker-title">Licensed Property Manager</p>
                  <div className="caretaker-stats">
                    <span>⭐ 4.8 Rating</span>
                    <span>•</span>
                    <span>📋 15 Properties</span>
                  </div>
                </div>
                <button 
                  className="btn-contact-caretaker"
                  onClick={() => setShowChat(true)}
                >
                  <span>💬</span>
                  <span>Contact</span>
                </button>
              </div>
            </div>

            <div className="action-buttons-detail">
              <button className="btn-schedule">
                <span>📅</span>
                <span>Schedule Viewing</span>
              </button>
              <button className="btn-apply">
                <span>📝</span>
                <span>Apply Now</span>
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar Chat */}
        <div className={`chat-sidebar ${showChat ? 'open' : ''}`}>
          {showChat ? (
            <CaretakerChat 
              caretakerName={caretakerName}
              propertyTitle={property.title}
              onClose={() => setShowChat(false)}
            />
          ) : (
            <div className="chat-prompt">
              <div className="prompt-icon-chat">💬</div>
              <h3>Have Questions?</h3>
              <p>Chat with the property caretaker</p>
              <button 
                className="btn-start-chat"
                onClick={() => setShowChat(true)}
              >
                Start Chat
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default PropertyDetailView