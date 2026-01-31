// Unified type definitions for the entire application
// Import this file in all components to avoid type conflicts

export interface Apartment {
  id: string;
  number: number;
  tenant: string | null;
  possessionDate: string;
  expiryDate: string;
  pricing: string;
  status: 'occupied' | 'vacant';
}

export interface ImageWithAmount {
  blobId: string;
  url: string;
  amount?: number; // Amount associated with this image (in base units)
  fileName?: string;
  uploadedAt?: string;
}

export interface Property {
  // Backend MongoDB fields
  _id?: string;
  id?: string;
  
  // Property basic info
  houseName?: string;
  title?: string;
  address?: string;
  location?: string;
  
  // Location details
  country?: string;
  state?: string;
  city?: string;
  
  // Property details
  bedrooms?: number;
  bathrooms?: number;
  area?: string;
  type?: string;
  propertyType?: string;
  
  // Pricing
  pricing?: string;
  price?: string | number;
  currency?: string;
  period?: string;
  
  // Images and Walrus
  walrusId?: string;
  blobId?: string;
  imageBlobId?: string;
  imageId?: string;
  image?: string;
  imageUrl?: string;
  images?: ImageWithAmount[];
  imagesWithAmounts?: ImageWithAmount[];
  blobIds?: string[];
  
  // Computed fields
  isLegitBlobId?: boolean;
  
  // Apartments (for landlord view)
  apartments?: Apartment[];
  
  // Financial
  totalEarnings?: number;
  totalAmount?: number;
  
  // Caretaker
  caretakerAddress?: string;
  
  // Status
  status?: string;
}

export interface Message {
  id: string;
  sender: 'user' | 'caretaker';
  text: string;
  timestamp: Date;
}

export interface Location {
  country?: string;
  state?: string;
  city?: string;
}

export interface UploadResult {
  blobId: string;
  url: string;
}

// API Response types
export interface ApiPropertyResponse {
  success?: boolean;
  data?: Property[];
  properties?: Property[];
  property?: Property;
  message?: string;
  error?: string;
}