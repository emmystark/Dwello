import { useState, useEffect } from 'react';
import { apiRequest, API_CONFIG } from '../lib/api-config';

export interface FetchedProperty {
  id: string;
  title: string;
  location: string;
  price: string;
  currency: string;
  type: string;
  bedrooms?: number;
  bathrooms?: number;
  area?: string;
  blobId: string;
  isLegitBlobId: boolean;
  // Additional fields from backend
  country?: string;
  state?: string;
  city?: string;
  period?: string;
}

export function useProperties() {
  const [properties, setProperties] = useState<FetchedProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProperties = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log('🔍 Fetching properties from backend...');
        console.log('📍 API URL:', API_CONFIG.baseUrl + API_CONFIG.endpoints.properties.list);
        
        // Fetch from /api/properties endpoint
        const response = await apiRequest<any>(API_CONFIG.endpoints.properties.list);
        
        console.log('📦 Backend Response:', response);
        console.log('📦 Response Type:', typeof response);
        console.log('📦 Is Array?', Array.isArray(response));
        
        // The backend returns an array directly or { properties: [...] }
        let rawProperties: any[] = [];
        
        if (Array.isArray(response)) {
          console.log('✅ Response is directly an array');
          rawProperties = response;
        } else if (response && typeof response === 'object') {
          console.log('📦 Response keys:', Object.keys(response));
          
          // Check common response formats
          if (Array.isArray(response.properties)) {
            console.log('✅ Found array in response.properties');
            rawProperties = response.properties;
          } else if (Array.isArray(response.data)) {
            console.log('✅ Found array in response.data');
            rawProperties = response.data;
          } else if (response.success && Array.isArray(response.properties)) {
            console.log('✅ Found array in response.properties (with success flag)');
            rawProperties = response.properties;
          } else {
            // Search all keys for an array
            for (const key of Object.keys(response)) {
              if (Array.isArray(response[key])) {
                console.log(`✅ Found array in response.${key}`);
                rawProperties = response[key];
                break;
              }
            }
          }
        }
        
        console.log('📊 Raw Properties Count:', rawProperties.length);
        
        if (rawProperties.length === 0) {
          console.warn('⚠️ No properties found in database');
          setProperties([]);
          setLoading(false);
          return;
        }
        
        console.log('📄 Sample Property:', rawProperties[0]);
        
        // Map backend data to frontend format
        const mapped: FetchedProperty[] = rawProperties.map((p: any, index: number) => {
          // Extract blob ID from various possible fields
          // Based on your backend: walrusId, blobId, imageBlobId, etc.
          const blobId = p.walrusId || p.blobId || p.imageBlobId || p.imageId || p.image || '';
          
          // Validate blob ID
          const isLegit = blobId && 
                         typeof blobId === 'string' &&
                         blobId !== 'null' && 
                         blobId !== 'undefined' &&
                         blobId !== 'placeholder blob id' && 
                         blobId.length > 10;
          
          console.log(`\n🏠 Property ${index + 1}:`);
          console.log('  Title:', p.title || p.houseName || p.name);
          console.log('  Blob ID:', blobId || 'NONE');
          console.log('  Valid:', isLegit ? '✅' : '❌');
          
          const mapped: FetchedProperty = {
            id: p._id || p.id || `property-${index}`,
            title: p.title || p.houseName || p.name || 'Untitled Property',
            location: p.address || p.location || `${p.city || 'Unknown'}, ${p.state || ''}`.trim(),
            price: (p.price || p.pricing || '0').toString(),
            currency: p.currency || '$',
            type: p.propertyType || p.type || 'Property',
            bedrooms: p.bedrooms,
            bathrooms: p.bathrooms,
            area: p.area,
            blobId,
            isLegitBlobId: isLegit,
            country: p.country,
            state: p.state,
            city: p.city,
            period: p.period,
          };
          
          return mapped;
        });
        
        console.log('\n✅ Successfully Mapped Properties:');
        console.log('📊 Total:', mapped.length);
        console.log('🖼️ With Valid Images:', mapped.filter(p => p.isLegitBlobId).length);
        console.log('📋 Sample Mapped:', mapped[0]);
        
        setProperties(mapped);
      } catch (err: any) {
        console.error('❌ ERROR FETCHING PROPERTIES:');
        console.error('Error:', err);
        console.error('Message:', err.message);
        console.error('Stack:', err.stack);
        
        setError(err.message || 'Failed to fetch properties from backend');
      } finally {
        setLoading(false);
      }
    };

    fetchProperties();
  }, []);

  return { properties, loading, error };
}