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

  const [propertyImages, setPropertyImages] = useState<string[]>([]);
  const [imageAmounts, setImageAmounts] = useState<(number | undefined)[]>([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [loadingImages, setLoadingImages] = useState(true);
  const [showPayment, setShowPayment] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);
  const [accessExpiresAt, setAccessExpiresAt] = useState<number | null>(null);
  const [isPaying, setIsPaying] = useState(false);

  // Access management
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

  // FIXED: Load images from Walrus with retry logic
  useEffect(() => {
    const loadMediaWithRetry = async (
      blobId: string,
      retries = 3
    ): Promise<string | null> => {
      try {
        // Generate Walrus URL from blob ID
        const url = getWalrusImageUrl(blobId);
        if (!url) {
          console.error(`Invalid blob ID: ${blobId}`);
          return null;
        }

        // Check if blob is accessible
        const res = await fetch(url, { method: "HEAD" });
        if (res.ok) {
          console.log(`✅ Blob accessible: ${blobId}`);
          return url;
        }
        throw new Error("Not ready");
      } catch (error) {
        if (retries > 0) {
          console.log(`⏳ Retrying blob ${blobId} (${retries} attempts left)...`);
          await new Promise((resolve) => setTimeout(resolve, 2000));
          return loadMediaWithRetry(blobId, retries - 1);
        }
        console.error(`❌ Failed to load blob after retries: ${blobId}`);
        return null;
      }
    };

    const loadMedia = async () => {
      if (!property) return;
      setLoadingImages(true);
      const mediaUrls: string[] = [];
      const amounts: (number | undefined)[] = [];

      try {
        console.log("Loading property images...");
        console.log("Property data:", {
          blobIds: property.blobIds,
          walrusId: property.walrusId,
          imageUrl: property.imageUrl,
          images: property.images,
        });

        // Priority 1: Use blobIds array (best option)
        if (property.blobIds && property.blobIds.length > 0) {
          console.log(`Loading ${property.blobIds.length} blob IDs...`);
          for (const blobId of property.blobIds) {
            if (isValidBlobId(blobId)) {
              const url = await loadMediaWithRetry(blobId);
              if (url) {
                mediaUrls.push(url);
                amounts.push(undefined);
              }
            } else {
              console.warn(`Invalid blob ID: ${blobId}`);
            }
          }
        }
        // Priority 2: Use single walrusId
        else if (property.walrusId && isValidBlobId(property.walrusId)) {
          console.log(`Loading single Walrus ID: ${property.walrusId}`);
          const url = await loadMediaWithRetry(property.walrusId);
          if (url) {
            mediaUrls.push(url);
            amounts.push(undefined);
          }
        }
        // Priority 3: Use images array with amounts
        else if (property.images && property.images.length > 0) {
          console.log(`Loading ${property.images.length} images from array...`);
          for (const img of property.images) {
            if (typeof img === "string") {
              // If it's a blob ID, convert to URL
              if (isValidBlobId(img)) {
                const url = await loadMediaWithRetry(img);
                if (url) {
                  mediaUrls.push(url);
                  amounts.push(undefined);
                }
              } else {
                mediaUrls.push(img);
                amounts.push(undefined);
              }
            } else if (typeof img === "object" && "url" in img) {
              mediaUrls.push(img.url);
              amounts.push(img.amount);
            }
          }
        }
        // Priority 4: Use single imageUrl
        else if (property.imageUrl) {
          console.log(`Loading single image URL: ${property.imageUrl}`);
          // Check if imageUrl is a blob ID or already a full URL
          if (isValidBlobId(property.imageUrl)) {
            const url = await loadMediaWithRetry(property.imageUrl);
            if (url) {
              mediaUrls.push(url);
              amounts.push(undefined);
            }
          } else {
            mediaUrls.push(property.imageUrl);
            amounts.push(undefined);
          }
        }

        console.log(`✅ Loaded ${mediaUrls.length} images successfully`);
      } catch (error) {
        console.error("Error loading media:", error);
      } finally {
        setPropertyImages(mediaUrls);
        setImageAmounts(amounts);
        setLoadingImages(false);
      }
    };

    loadMedia();
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

  // Detect if media is video
  const isVideo = (url: string) => {
    return (
      url.endsWith(".mp4") ||
      url.endsWith(".webm") ||
      url.endsWith(".ogg") ||
      url.includes("/video/")
    );
  };

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
                {loadingImages ? (
                  <div className="placeholder-hero">
                    <div className="loading-spinner"></div>
                    <p>Loading media from Walrus...</p>
                  </div>
                ) : propertyImages.length > 0 ? (
                  <div className="image-container">
                    {isVideo(propertyImages[selectedImageIndex]) ? (
                      <video
                        src={propertyImages[selectedImageIndex]}
                        controls
                        autoPlay
                        muted
                        loop
                        onError={(e) => {
                          (e.target as HTMLVideoElement).style.display = "none";
                          const parent = (e.target as HTMLVideoElement)
                            .parentElement;
                          if (parent) {
                            parent.innerHTML =
                              '<div class="placeholder-hero"><span class="hero-icon">🏠</span></div>';
                          }
                        }}
                      />
                    ) : (
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
                    )}
                    {imageAmounts[selectedImageIndex] &&
                      imageAmounts[selectedImageIndex]! > 0 && (
                        <div className="image-amount-badge">
                          💰 $
                          {(imageAmounts[selectedImageIndex]! / 1000000).toFixed(
                            2
                          )}{" "}
                          USDC
                        </div>
                      )}
                  </div>
                ) : (
                  <div className="placeholder-hero">
                    <span className="hero-icon">🏠</span>
                  </div>
                )}
                <div className="image-badge">
                  {isValidBlobId(property.walrusId) ? "✓ Verified" : "Listed"}
                </div>
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
                      {isVideo(img) ? (
                        <video
                          src={img}
                          muted
                          onError={(e) => {
                            (e.target as HTMLVideoElement).style.display = "none";
                          }}
                        />
                      ) : (
                        <img
                          src={img}
                          alt={`View ${idx + 1}`}
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                      )}
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
                📍 {property.address || property.location}
              </p>

              <div className="property-badges">
                <span className="badge">
                  {bedrooms} Bedroom{bedrooms > 1 ? "s" : ""}
                </span>
                {isValidBlobId(property.walrusId) && (
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

              {isValidBlobId(property.walrusId) && (
                <div className="blockchain-verification">
                  <div className="verification-details">
                    <span className="verification-label">
                      🔗 Walrus Blockchain Verified
                    </span>
                    <code
                      className="verification-id"
                      title={property.walrusId}
                    >
                      {property.walrusId?.substring(0, 24)}...
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
                          : "Available"}
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