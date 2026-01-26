// Example: How to use PaymentGate in PropertyDetailView
// This file shows how to integrate the payment gating system

import React, { useState } from 'react';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { PaymentGate } from './PaymentGate';
import { usePaymentGate } from '../hooks/usePaymentGate';

interface PropertyDetailViewProps {
  propertyId: string;
  property: {
    id: string;
    name: string;
    address: string;
    price: number;
    description: string;
    images: Array<{ blobId: string; url: string }>;
    bedrooms: number;
    bathrooms: number;
    area: string;
  };
}

/**
 * Example 1: Basic Payment Gate
 * Wraps property details and images with payment requirement
 */
export const PropertyDetailViewBasic: React.FC<PropertyDetailViewProps> = ({
  propertyId,
  property,
}) => {
  const account = useCurrentAccount();

  return (
    <PaymentGate
      userAddress={account?.address || null}
      propertyId={propertyId}
      propertyName={property.name}
    >
      <div className="property-detail-content">
        <h1>{property.name}</h1>
        <p className="address">{property.address}</p>
        <p className="price">${property.price.toLocaleString()}</p>

        <div className="details-grid">
          <div className="detail-item">
            <span className="label">Bedrooms</span>
            <span className="value">{property.bedrooms}</span>
          </div>
          <div className="detail-item">
            <span className="label">Bathrooms</span>
            <span className="value">{property.bathrooms}</span>
          </div>
          <div className="detail-item">
            <span className="label">Area</span>
            <span className="value">{property.area}</span>
          </div>
        </div>

        <p className="description">{property.description}</p>

        <div className="images-gallery">
          {property.images.map((image) => (
            <img
              key={image.blobId}
              src={image.url}
              alt="Property"
              className="gallery-image"
            />
          ))}
        </div>
      </div>
    </PaymentGate>
  );
};

/**
 * Example 2: Advanced - Conditional Content Based on Payment
 * Shows different content based on payment status
 */
export const PropertyDetailViewAdvanced: React.FC<PropertyDetailViewProps> = ({
  propertyId,
  property,
}) => {
  const account = useCurrentAccount();
  const { paymentStatus, loading } = usePaymentGate(account?.address || null, propertyId);

  if (loading) {
    return <div className="loading">Checking access...</div>;
  }

  return (
    <div className="property-detail-view">
      {/* Public content - always visible */}
      <div className="property-public-info">
        <h1>{property.name}</h1>
        <p className="address">{property.address}</p>
        <p className="price">${property.price.toLocaleString()}</p>
      </div>

      {/* Gated content - requires payment */}
      {paymentStatus.hasPaid ? (
        // User has paid - show full details
        <div className="property-full-details">
          <div className="details-grid">
            <div className="detail-item">
              <span className="label">Bedrooms</span>
              <span className="value">{property.bedrooms}</span>
            </div>
            <div className="detail-item">
              <span className="label">Bathrooms</span>
              <span className="value">{property.bathrooms}</span>
            </div>
            <div className="detail-item">
              <span className="label">Area</span>
              <span className="value">{property.area}</span>
            </div>
          </div>

          <p className="description">{property.description}</p>

          <div className="images-gallery">
            {property.images.map((image) => (
              <img
                key={image.blobId}
                src={image.url}
                alt="Property"
                className="gallery-image"
              />
            ))}
          </div>

          <div className="contact-section">
            <h3>Contact Caretaker</h3>
            <button className="contact-button">Message</button>
            <button className="call-button">Schedule Tour</button>
          </div>
        </div>
      ) : account?.address ? (
        // User not paid - show payment gate
        <PaymentGate
          userAddress={account.address}
          propertyId={propertyId}
          propertyName={property.name}
          onPaymentSuccess={() => {
            console.log('Payment successful! Content unlocked.');
          }}
          onPaymentError={() => {
            console.error('Payment error:');
          }}
        >
          <div className="property-full-details">
            {/* Same content as above - will be shown after payment */}
          </div>
        </PaymentGate>
      ) : (
        // User not connected
        <PaymentGate
          userAddress={null}
          propertyId={propertyId}
          propertyName={property.name}
        >
          <div></div>
        </PaymentGate>
      )}
    </div>
  );
};

/**
 * Example 3: Manual Payment Check
 * Use the usePaymentGate hook for more control
 */
export const PropertyDetailViewManual: React.FC<PropertyDetailViewProps> = ({
  propertyId,
  property,
}) => {
  const account = useCurrentAccount();
  const { paymentStatus, loading, error, refetch } = usePaymentGate(
    account?.address || null,
    propertyId
  );
  const [showCheckAccessButton, setShowCheckAccessButton] = useState(false);

  const handleCheckAccess = async () => {
    setShowCheckAccessButton(true);
    await refetch();
  };

  return (
    <div className="property-detail-manual">
      <div className="property-header">
        <h1>{property.name}</h1>
        <p className="price">${property.price.toLocaleString()}</p>
      </div>

      {loading && <div className="loading">Checking access...</div>}

      {error && <div className="error-message">Error: {error}</div>}

      {!loading && !paymentStatus.hasPaid && account?.address && (
        <div className="access-control-panel">
          <div className="access-status">
            <h3>🔒 Content Locked</h3>
            <p>Pay to view full property details and images</p>
          </div>

          <div className="access-actions">
            {showCheckAccessButton && (
              <button className="check-access-btn" onClick={handleCheckAccess}>
                ✓ Check Access Again
              </button>
            )}

            <PaymentGate
              userAddress={account.address}
              propertyId={propertyId}
              propertyName={property.name}
              showFeeBreakdown={true}
              onPaymentSuccess={async () => {
                console.log('Payment successful!');
                await refetch();
              }}
            >
              <div></div>
            </PaymentGate>
          </div>
        </div>
      )}

      {!loading && paymentStatus.hasPaid && (
        <div className="access-granted-badge">
          <span>✓ Access Granted</span>
        </div>
      )}

      {/* Content - visible or hidden based on payment */}
      <div className={paymentStatus.hasPaid ? 'content-visible' : 'content-hidden'}>
        <p className="description">{property.description}</p>

        <div className="images-gallery">
          {property.images.map((image) => (
            <img
              key={image.blobId}
              src={image.url}
              alt="Property"
              className="gallery-image"
            />
          ))}
        </div>

        <div className="details-section">
          <h3>Property Details</h3>
          <div className="details-grid">
            <div className="detail-item">
              <span className="label">Bedrooms</span>
              <span className="value">{property.bedrooms}</span>
            </div>
            <div className="detail-item">
              <span className="label">Bathrooms</span>
              <span className="value">{property.bathrooms}</span>
            </div>
            <div className="detail-item">
              <span className="label">Area</span>
              <span className="value">{property.area}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Example 4: Integration with existing PropertyDetailView
 * Minimal changes to existing component
 */
export const PropertyDetailViewIntegration: React.FC<PropertyDetailViewProps> = ({
  propertyId,
  property,
}) => {
  const account = useCurrentAccount();

  return (
    <PaymentGate
      userAddress={account?.address || null}
      propertyId={propertyId}
      propertyName={property.name}
    >
      {/* Your existing PropertyDetailView component here */}
      <div className="property-detail-content">
        {/* Just wrap your existing component! */}
      </div>
    </PaymentGate>
  );
};
