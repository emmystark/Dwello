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
  
  export interface Property {
    id: string;
    houseName: string;
    address: string;
    apartments: Apartment[];
    totalEarnings: number;
    images?: string[];
    blobIds?: string[];
    pricing: string;
    // Additional fields for customer view
    title?: string;
    location?: string;
    bedrooms?: number;
    bathrooms?: number;
    area?: string;
    type?: string;
    walrusId?: string;
    price?: string;
    currency?: string;
    imageUrl?: string;
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