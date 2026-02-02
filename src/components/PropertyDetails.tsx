import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { getWalrusImageUrl, isValidBlobId } from "../lib/walrus-utils";
import type { Property } from "../types";
import "../styles/PropertyDetails.css";
import { useDwelloPayments } from "../payment";
import { useSui } from "../sui/SuiProviders";
import CaretakerChatSection from "./CaretakerChatSection";

interface PropertyDetailsProps {
  property?: Property;
  onBack?: () => void;
}

const PropertyDetails = ({
  property: propProperty,
  onBack,
}: PropertyDetailsProps) => {
  const location = useLocation();
  const property = propProperty || (location.state?.property as Property);
  const { account } = useSui();
  const { payforaccess } = useDwelloPayments();

  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [showPayment, setShowPayment] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);
  const [accessExpiresAt, setAccessExpiresAt] = useState<number | null>(null);
  const [isPaying, setIsPaying] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [userBalance, setUserBalance] = useState<number>(0);  // In SUI (mist units)
  // Access management - check localStorage for existing access
  useEffect(() => {
    if (!property || !account) {
      setHasAccess(false);
      setAccessExpiresAt(null);
      return;
    }

    const propId = property.id || property.walrusId || property.blobId;
    if (!propId) {
      setHasAccess(false);
      setAccessExpiresAt(null);
      return;
    }

    const key = `dwelloAccess_${account}_${propId}`;
    try {
      const raw = localStorage.getItem(key);
      if (!raw) {
        setHasAccess(false);
        setAccessExpiresAt(null);
        return;
      }
      const parsed = JSON.parse(raw) as { expiresAt?: number };
      if (
        parsed.expiresAt &&
        typeof parsed.expiresAt === "number" &&
        parsed.expiresAt > Date.now()
      ) {
        setHasAccess(true);
        setAccessExpiresAt(parsed.expiresAt);
      } else {
        localStorage.removeItem(key);
        setHasAccess(false);
        setAccessExpiresAt(null);
      }
    } catch {
      setHasAccess(false);
      setAccessExpiresAt(null);
    }
  }, [property, account]);

  // Access expiration timer
  useEffect(() => {
    if (!accessExpiresAt) return;

    const now = Date.now();
    const remaining = accessExpiresAt - now;
    if (remaining <= 0) {
      setHasAccess(false);
      setAccessExpiresAt(null);
      return;
    }

    const timeout = setTimeout(() => {
      setHasAccess(false);
      setAccessExpiresAt(null);
    }, remaining);

    return () => clearTimeout(timeout);
  }, [accessExpiresAt]);

  const grantAccessFor24Hours = () => {
    if (!property || !account) return;
    const propId = property.id || property.walrusId || property.blobId;
    if (!propId) return;
    const expiresAt = Date.now() + 24 * 60 * 60 * 1000;
    const key = `dwelloAccess_${account}_${propId}`;
    localStorage.setItem(key, JSON.stringify({ expiresAt }));
    setHasAccess(true);
    setAccessExpiresAt(expiresAt);
  };

  const handlePayForAccess = async () => {
    if (!account) {
      setPaymentError("Please connect your Sui wallet to pay for access.");
      setShowPayment(true);
      return;
    }
    setPaymentError(null);
    setShowPayment(true);
  };

  const handleConfirmPayment = async () => {
    if (!property) return;
    if (!account) {
      setPaymentError("Connect your Sui wallet to pay for access.");
      return;
    }

    try {
      setIsPaying(true);
      setPaymentError(null);
      
      // Get house ID from property
      const houseId = property.id || property.walrusId || property.blobId;
      if (!houseId) {
        throw new Error("This property is not linked to an on-chain house ID.");
      }

      console.log("Processing payment for property:", houseId);
      
      // Call the payment function - this will deduct USDC from wallet
      await payforaccess(houseId);
      
      // Grant access after successful payment
      grantAccessFor24Hours();
      setShowPayment(false);
      
      console.log("Payment successful - access granted for 24 hours");
    } catch (error: any) {
      console.error("Payment failed:", error);
      setPaymentError(
        error?.message || "Failed to process payment. Please try again."
      );
    } finally {
      setIsPaying(false);
    }
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      window.history.back();
    }
  };

  if (!property) {
    return (
      <div className="property-details-page">
        <div className="error-state">
          <h2>Property Not Found</h2>
          <button onClick={handleBack} className="btn-back">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // Get property images - INHERIT from PropertyList logic
  const getPropertyImages = (): string[] => {
    const images: string[] = [];
    
    // Priority 1: Use blobIds array
    if (property.blobIds && property.blobIds.length > 0) {
      property.blobIds.forEach(blobId => {
        if (isValidBlobId(blobId)) {
          images.push(`https://aggregator.walrus-testnet.walrus.space/v1/blobs/${blobId}`);
        }
      });
    }
    // Priority 2: Use single blobId
    else if (property.blobId && isValidBlobId(property.blobId)) {
      images.push(`https://aggregator.walrus-testnet.walrus.space/v1/blobs/${property.blobId}`);
    }
    // Priority 3: Use walrusId
    else if (property.walrusId && isValidBlobId(property.walrusId)) {
      images.push(`https://aggregator.walrus-testnet.walrus.space/v1/blobs/${property.walrusId}`);
    }
    // Priority 4: Use images array
    else if (property.images && property.images.length > 0) {
      property.images.forEach(img => {
        if (typeof img === "string") {
          if (isValidBlobId(img)) {
            images.push(`https://aggregator.walrus-testnet.walrus.space/v1/blobs/${img}`);
          } else {
            images.push(img);
          }
        } else if (typeof img === "object" && "url" in img) {
          images.push(img.url);
        }
      });
    }
    // Priority 5: Use single imageUrl
    else if (property.imageUrl) {
      if (isValidBlobId(property.imageUrl)) {
        images.push(`https://aggregator.walrus-testnet.walrus.space/v1/blobs/${property.imageUrl}`);
      } else {
        images.push(property.imageUrl);
      }
    }
    
    return images;
  };

  const propertyImages = getPropertyImages();
  const apartments = property.apartments || [];
  const occupiedCount = apartments.filter(apt => apt.status === "occupied").length;
  const vacantCount = apartments.length - occupiedCount;
  const bedrooms = property.bedrooms || 1;
  const bathrooms = property.bathrooms || 1;
  const area = property.area || "100 sqm";

  // Check if property has valid Walrus blob
  const hasValidBlobId = isValidBlobId(property.blobId) || 
                         isValidBlobId(property.walrusId) || 
                         property.isLegitBlobId;

  return (
    <div className="property-details-page">
      <div className="details-header">
        <button className="btn-back" onClick={handleBack}>
          <span>←</span>
          <span>Back to {onBack ? "Inventory" : "Listings"}</span>
        </button>
        <div className="header-actions">
          <button className="btn-save">
            <span>❤️</span>
            <span>Save</span>
          </button>
          <button className="btn-share">
            <span>📤</span>
            <span>Share</span>
          </button>
        </div>
      </div>

      <div className="details-layout">
        <div className="property-main-section">
          <div className="property-hero-card">
            <div className="hero-image-section">
              <div className="main-property-image">
                {propertyImages.length > 0 ? (
                  <div className="image-container">
                    <img
                      src={propertyImages[selectedImageIndex]}
                      alt={property.houseName || property.title}
                      onLoad={() => console.log('✅ Image loaded:', propertyImages[selectedImageIndex])}
                      onError={(e) => {
                        console.error('❌ Image failed:', propertyImages[selectedImageIndex]);
                        (e.target as HTMLImageElement).style.display = "none";
                        const parent = (e.target as HTMLImageElement).parentElement;
                        if (parent) {
                          parent.innerHTML = '<div class="placeholder-hero"><span class="hero-icon">🏠</span></div>';
                        }
                      }}
                    />
                  </div>
                ) : (
                  <div className="placeholder-hero">
                    <span className="hero-icon">🏠</span>
                    <p style={{ marginTop: '10px', color: '#999' }}>No image available</p>
                  </div>
                )}
                <div className="image-badge">
                  {hasValidBlobId ? "✓ Verified" : "Listed"}
                </div>
              </div>

              {propertyImages.length > 1 && (
                <div className="thumbnail-gallery">
                  {propertyImages.slice(0, 4).map((img, idx) => (
                    <div
                      key={idx}
                      className={`thumbnail-item ${selectedImageIndex === idx ? "active" : ""}`}
                      onClick={() => setSelectedImageIndex(idx)}
                    >
                      <img
                        src={img}
                        alt={`View ${idx + 1}`}
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="hero-content">
              <h1 className="property-title">
                {property.houseName || property.title}
              </h1>
              <p className="property-location">
                📍 {property.address || property.location}
              </p>

              <div className="property-badges">
                <span className="badge">
                  {bedrooms} Bedroom{bedrooms > 1 ? "s" : ""}
                </span>
                {hasValidBlobId && (
                  <span className="badge verified">✓ Verified</span>
                )}
                <span className="badge secure">Secure</span>
                <span className="badge available">Available</span>
              </div>

              <div className="pricing-card">
                <div className="price-main">
                  <span className="price-label">Price</span>
                  <span className="price-amount">
                    {property.currency || "$"}
                    {property.price || property.pricing}
                  </span>
                  <span className="price-period">
                    {property.period || "per year"}
                  </span>
                </div>
                {hasAccess ? (
                  <div className="access-active-badge">
                    <span>✅ Chat Access Active</span>
                    <span style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                      Expires: {new Date(accessExpiresAt!).toLocaleString()}
                    </span>
                  </div>
                ) : (
                  <button
                    className="btn-pay-access"
                    onClick={handlePayForAccess}
                    disabled={!account}
                  >
                    <span>💳</span>
                    <span>{account ? "Unlock Chat - 0.01 USDC" : "Connect Wallet"}</span>
                  </button>
                )}
              </div>

              <div className="property-stats-grid">
                <div className="stat-item">
                  <span className="stat-icon">🏢</span>
                  <span className="stat-value">{apartments.length || 1}</span>
                  <span className="stat-label">Total Units</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Bedrooms</span>
                  <span className="stat-value">{bedrooms}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Bathrooms</span>
                  <span className="stat-value">{bathrooms}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Area</span>
                  <span className="stat-value">{area}</span>
                </div>
              </div>

              {hasValidBlobId && (
                <div className="blockchain-verification">
                  <div className="verification-details">
                    <span className="verification-label">
                      🔗 Walrus Blockchain Verified
                    </span>
                    <code className="verification-id" title={property.blobId || property.walrusId}>
                      {(property.blobId || property.walrusId)?.substring(0, 24)}...
                    </code>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Apartments Section */}
          {apartments.length > 0 && (
            <div className="apartments-section-card">
              <div className="section-header">
                <h2>Available Units</h2>
                <div className="filter-pills">
                  <span className="pill all">All {apartments.length}</span>
                  <span className="pill occupied">Occupied {occupiedCount}</span>
                  <span className="pill vacant">Vacant {vacantCount}</span>
                </div>
              </div>

              <div className="apartments-grid">
                {apartments.map((apartment) => (
                  <div
                    key={apartment.id}
                    className={`apartment-unit ${apartment.status}`}
                  >
                    <div className="unit-header">
                      <div className="unit-number">
                        <span className="unit-icon">🚪</span>
                        <span>Unit {apartment.number}</span>
                      </div>
                      <span className={`status-pill ${apartment.status}`}>
                        {apartment.status === "occupied" ? "Occupied" : "Available"}
                      </span>
                    </div>

                    {apartment.status === "occupied" ? (
                      <div className="unit-info">
                        <div className="info-row">
                          <span className="info-label">👤 Tenant</span>
                          <span className="info-value">{apartment.tenant}</span>
                        </div>
                        <div className="info-row">
                          <span className="info-label">📅 Lease Start</span>
                          <span className="info-value">{apartment.possessionDate}</span>
                        </div>
                        <div className="info-row">
                          <span className="info-label">⏰ Lease End</span>
                          <span className="info-value highlight">{apartment.expiryDate}</span>
                        </div>
                        <div className="info-row">
                          <span className="info-label">💰 Rent</span>
                          <span className="info-value price">{apartment.pricing}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="unit-vacant">
                        <p className="vacant-text">Ready for Move-In</p>
                        <p className="vacant-price">
                          {apartment.pricing || property.pricing}
                        </p>
                        <button className="btn-apply-unit">Apply Now</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Side - Chat Section */}
        <CaretakerChatSection
          caretakerName="Property Manager"
          propertyTitle={property?.title || property?.houseName || "Property"}
          isPaymentVerified={hasAccess}
          onClose={() => setShowPayment(false)}
        />
      </div>

      {/* Payment Modal */}
     
    {showPayment && (
      <div className="payment-modal-overlay" onClick={() => setShowPayment(false)}>
        <div className="payment-modal" onClick={(e) => e.stopPropagation()}>
          <button className="modal-close" onClick={() => setShowPayment(false)}>
            ✕
          </button>
          <h2>Unlock Chat Access</h2>
          <p className="modal-subtitle">Secure blockchain payment via Sui</p>
          {paymentError && (
            <div className="payment-error">
              <span>⚠️</span>
              <span>{paymentError}</span>
            </div>
          )}
          <div className="payment-details">
            <div className="payment-row">
              <span>Property</span>
              <span>{property.houseName || property.title}</span>
            </div>
            <div className="payment-row">
              <span>Chat Access Fee</span>
              <span>0.01 SUI</span>
            </div>
            <div className="payment-row">
              <span>Duration</span>
              <span>24 hours</span>
            </div>
            <div className="payment-row total">
              <span>Total Payment</span>
              <span className="total-amount">0.01 SUI</span>
            </div>
            <div className="payment-row balance">
              <span>Your Balance</span>
              <span>{userBalance.toFixed(4)} SUI</span>
            </div>
          </div>
          {!account && (
            <div className="wallet-warning">
              <span>⚠️</span>
              <span>Please connect your Sui wallet to continue</span>
            </div>
          )}
          <button
            className="btn-confirm-payment"
            onClick={handleConfirmPayment}
            disabled={isPaying || !account || userBalance < 0.01}
          >
            <span>💳</span>
            <span>
              {isPaying
                ? "Processing Payment..."
                : !account
                ? "Connect Wallet First"
                : userBalance < 0.0001
                ? "Insufficient Balance"
                : "Confirm & Pay 0.01 SUI"}
            </span>
          </button>
          <p className="payment-info">
            Payment will be deducted from your connected wallet address.
            Chat access will be granted immediately upon successful payment.
          </p>
        </div>
      </div>
    )}
    </div>
  );
};

export default PropertyDetails;