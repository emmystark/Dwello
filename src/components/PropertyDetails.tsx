import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { getWalrusBlobUrl } from "../walrus/client";
import bedroomBlobIds from "../walrus/bloblds";
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

  const [propertyImages, setPropertyImages] = useState<string[]>([]);
  const [imageAmounts, setImageAmounts] = useState<(number | undefined)[]>([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [loadingImages, setLoadingImages] = useState(true);
  const [showPayment, setShowPayment] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);
  const [accessExpiresAt, setAccessExpiresAt] = useState<number | null>(null);
  const [isPaying, setIsPaying] = useState(false);

  useEffect(() => {
    if (!property || !account) {
      setHasAccess(false);
      setAccessExpiresAt(null);
      return;
    }

    const propId = property.id || property.walrusId;
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
    const propId = property.id || property.walrusId;
    if (!propId) return;
    const expiresAt = Date.now() + 24 * 60 * 60 * 1000;
    const key = `dwelloAccess_${account}_${propId}`;
    localStorage.setItem(key, JSON.stringify({ expiresAt }));
    setHasAccess(true);
    setAccessExpiresAt(expiresAt);
  };

  const handlePayForAccess = async () => {
    if (!account) {
      alert("Connect your Sui wallet to pay for access.");
      return;
    }
    setShowPayment(true);
  };

  const handleConfirmPayment = async () => {
    if (!property) return;
    if (!account) {
      alert("Connect your Sui wallet to pay for access.");
      return;
    }

    try {
      setIsPaying(true);
      const houseId = property.id || property.walrusId;
      if (!houseId) {
        alert("This property is not linked to an on-chain house ID.");
        return;
      }
      await payforaccess(houseId);
      grantAccessFor24Hours();
      setShowPayment(false);
      alert("Payment successful. Chat unlocked for 24 hours.");
    } catch (error) {
      console.error("Pay for access failed:", error);
      alert("Failed to pay for access. Please try again.");
    } finally {
      setIsPaying(false);
    }
  };

  // Load images from Walrus on component mount
  useEffect(() => {
    const loadImages = async () => {
      if (!property) return;

      setLoadingImages(true);
      const images: string[] = [];
      const amounts: (number | undefined)[] = [];

      try {
        // First, try to load from property's blob IDs
        if (property.blobIds && property.blobIds.length > 0) {
          for (const blobId of property.blobIds) {
            try {
              const url = getWalrusBlobUrl(blobId);
              images.push(url);
              amounts.push(undefined);
            } catch (error) {
              console.error("Failed to load blob:", blobId, error);
            }
          }
        }
        // Then try existing image URLs with amounts
        else if (property.images && property.images.length > 0) {
          for (const img of property.images) {
            // Handle both ImageWithAmount interface and plain URLs
            if (typeof img === 'string') {
              images.push(img);
              amounts.push(undefined);
            } else if (typeof img === 'object' && 'url' in img) {
              images.push(img.url);
              amounts.push(img.amount);
            }
          }
        }
        // Try imageUrl property
        else if (property.imageUrl) {
          images.push(property.imageUrl);
          amounts.push(undefined);
        }
        // Finally, try to load from bedroom blob IDs based on bedrooms count
        else if (property.bedrooms && bedroomBlobIds[property.bedrooms]) {
          const availableBlobIds = bedroomBlobIds[property.bedrooms] || [];
          if (availableBlobIds.length > 0) {
            const firstEntry = availableBlobIds[0];
            const blobId = firstEntry.includes(": ")
              ? firstEntry.split(": ")[1]
              : firstEntry;
            const url = getWalrusBlobUrl(blobId);
            images.push(url);
            amounts.push(undefined);
          }
        }
      } catch (error) {
        console.error("Error loading images:", error);
      } finally {
        setPropertyImages(images);
        setImageAmounts(amounts);
        setLoadingImages(false);
      }
    };

    loadImages();
  }, [property]);

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

  const apartments = property.apartments || [];
  const occupiedCount = apartments.filter(
    (apt) => apt.status === "occupied"
  ).length;
  const vacantCount = apartments.length - occupiedCount;
  const bedrooms = property.bedrooms || 1;
  const bathrooms = property.bathrooms || 1;
  const area = property.area || "100 sqm";

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
        {/* Left Side - Property Info */}
        <div className="property-main-section">
          {/* Hero Section */}
          <div className="property-hero-card">
            <div className="hero-image-section">
              <div className="main-property-image">
                {loadingImages ? (
                  <div className="placeholder-hero">
                    <div className="loading-spinner"></div>
                    <p>Loading images...</p>
                  </div>
                ) : propertyImages.length > 0 ? (
                  <div className="image-container">
                    <img
                      src={propertyImages[selectedImageIndex]}
                      alt={property.houseName || property.title}
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                        const parent = (e.target as HTMLImageElement)
                          .parentElement;
                        if (parent) {
                          parent.innerHTML =
                            '<div class="placeholder-hero"><span class="hero-icon">🏠</span></div>';
                        }
                      }}
                    />
                    {imageAmounts[selectedImageIndex] && imageAmounts[selectedImageIndex]! > 0 && (
                      <div className="image-amount-badge">
                        💰 ${(imageAmounts[selectedImageIndex]! / 1000000).toFixed(2)} USDC
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="placeholder-hero">
                    <span className="hero-icon">🏠</span>
                  </div>
                )}
                <div className="image-badge">Verified</div>
              </div>

              {propertyImages.length > 1 && (
                <div className="thumbnail-gallery">
                  {propertyImages.slice(0, 4).map((img, idx) => (
                    <div
                      key={idx}
                      className={`thumbnail-item ${
                        selectedImageIndex === idx ? "active" : ""
                      }`}
                      onClick={() => setSelectedImageIndex(idx)}
                    >
                      <img
                        src={img}
                        alt={`View ${idx + 1}`}
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                      {imageAmounts[idx] && imageAmounts[idx]! > 0 && (
                        <div className="thumbnail-amount-badge">
                          ${(imageAmounts[idx]! / 1000000).toFixed(2)}
                        </div>
                      )}
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
                {" "}
                {property.address || property.location}
              </p>

              <div className="property-badges">
                <span className="badge">
                  {bedrooms} Bedroom{bedrooms > 1 ? "s" : ""}
                </span>
                <span className="badge verified">Verified</span>
                <span className="badge secure">Secure</span>
                <span className="badge available">Available</span>
              </div>

              <div className="pricing-card">
                <div className="price-main">
                  <span className="price-label">Price</span>
                  <span className="price-amount">
                    {property.currency || ""}
                    {property.price || property.pricing}
                  </span>
                  <span className="price-period">per year</span>
                </div>
                {hasAccess ? (
                  <div className="access-active-badge">
                    <span>✅ Access unlocked for 24 hours</span>
                  </div>
                ) : (
                  <button
                    className="btn-pay-access"
                    onClick={handlePayForAccess}
                  >
                    <span>💳</span>
                    <span>Pay for Access</span>
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

              <div className="blockchain-verification">
                <div className="verification-details">
                  <span className="verification-label">
                    Blockchain Verified
                  </span>
                  <code className="verification-id">
                    {property.id || property.walrusId}
                  </code>
                </div>
              </div>
            </div>
          </div>

          {/* Apartments Section */}
          {apartments.length > 0 && (
            <div className="apartments-section-card">
              <div className="section-header">
                <h2>Available Units</h2>
                <div className="filter-pills">
                  <span className="pill all">All {apartments.length}</span>
                  <span className="pill occupied">
                    Occupied {occupiedCount}
                  </span>
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
                        {apartment.status === "occupied"
                        ? "Occupied"
                          : "Available"
                        }
                      // </span>
                    </div>

                    {apartment.status === "occupied" ? (
                      <div className="unit-info">
                        <div className="info-row">
                          <span className="info-label">👤 Tenant</span>
                          <span className="info-value">{apartment.tenant}</span>
                        </div>
                        <div className="info-row">
                          <span className="info-label">📅 Lease Start</span>
                          <span className="info-value">
                            {apartment.possessionDate}
                          </span>
                        </div>
                        <div className="info-row">
                          <span className="info-label">⏰ Lease End</span>
                          <span className="info-value highlight">
                            {apartment.expiryDate}
                          </span>
                        </div>
                        <div className="info-row">
                          <span className="info-label">💰 Rent</span>
                          <span className="info-value price">
                            {apartment.pricing}
                          </span>
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
        <div
          className="payment-modal-overlay"
          onClick={() => setShowPayment(false)}
        >
          <div className="payment-modal" onClick={(e) => e.stopPropagation()}>
            <button
              className="modal-close"
              onClick={() => setShowPayment(false)}
            >
              ✕
            </button>
            <h2>Pay for Property Access</h2>
            <p className="modal-subtitle">Secure payment via blockchain</p>

            <div className="payment-details">
              <div className="payment-row">
                <span>Property</span>
                <span>{property.houseName || property.title}</span>
              </div>
              <div className="payment-row">
                <span>Access Fee</span>
                <span>0.01 USDC</span>
              </div>
              <div className="payment-row total">
                <span>Total</span>
                <span>0.01 USDC</span>
              </div>
            </div>

            <button
              className="btn-confirm-payment"
              onClick={handleConfirmPayment}
              disabled={isPaying}
            >
              <span>💳</span>
              <span>{isPaying ? "Processing..." : "Confirm Payment"}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PropertyDetails;
