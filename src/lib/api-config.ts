/**
 * API Configuration
 * Centralized API endpoint management for frontend-backend communication
 */

export const API_CONFIG = {
  // Base URL from environment or default to localhost
  baseUrl: import.meta.env.VITE_API_URL || 'http://localhost:3001',

  // API endpoints
  endpoints: {
    // Properties
    properties: {
      list: '/api/properties',
      create: '/api/properties',
      get: (id: string) => `/api/properties/${id}`,
      update: (id: string) => `/api/properties/${id}`,
      delete: (id: string) => `/api/properties/${id}`,
      byCaretaker: (address: string) => `/api/caretaker/${address}/properties`,
    },

    // Payment verification
    payment: {
      status: '/api/payment-status',
      verify: '/api/verify-access',
    },

    // Chat/Messages
    messages: {
      send: '/api/messages',
      get: (propertyId: string) => `/api/messages/${propertyId}`,
      list: '/api/messages',
    },

    // User operations
    user: {
      profile: '/api/user/profile',
      savedProperties: '/api/user/saved',
      paymentHistory: '/api/user/payments',
    },

    // Health check
    health: '/api/health',
  },

  // Walrus configuration
  walrus: {
    publisher: import.meta.env.VITE_WALRUS_PUBLISHER_URL ||
      'https://publisher.walrus-testnet.walrus.space',
    aggregator: import.meta.env.VITE_WALRUS_AGGREGATOR_URL ||
      'https://aggregator.walrus-testnet.walrus.space',
  },

  // Sui network configuration
  sui: {
    network: import.meta.env.VITE_SUI_NETWORK || 'testnet',
    rpc: import.meta.env.VITE_SUI_RPC || 'https://fullnode.testnet.sui.io',
  },

  // Payment configuration
  payment: {
    amount: parseInt(import.meta.env.VITE_PAYMENT_AMOUNT || '10000'),
    usdcType: import.meta.env.VITE_USDC_TYPE ||
      '0xa1ec7fc00a6f40db9693ad1415d0c193ad3906494428cf252621037bd7117e29::usdc::USDC',
  },
};

/**
 * Build full API URL
 */
export const getApiUrl = (endpoint: string): string => {
  return `${API_CONFIG.baseUrl}${endpoint}`;
};

/**
 * Make API request with proper error handling
 */
export interface ApiRequestOptions extends RequestInit {
  retries?: number;
  timeout?: number;
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const {
    retries = 3,
    timeout = 30000,
    ...fetchOptions
  } = options;

  const url = getApiUrl(endpoint);

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        // Try to parse error message from response
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const contentType = response.headers.get('content-type');
          if (contentType?.includes('application/json')) {
            const errorData = await response.json();
            errorMessage = errorData.error || errorData.message || errorMessage;
          } else {
            const text = await response.text();
            errorMessage = text || errorMessage;
          }
        } catch {
          // If response isn't JSON, use status text
        }

        const error = new Error(errorMessage);
        (error as any).status = response.status;
        throw error;
      }

      // Handle empty responses and invalid JSON
      const contentType = response.headers.get('content-type');
      if (!contentType?.includes('application/json')) {
        const text = await response.text();
        if (!text) {
          return {} as T;
        }
        throw new Error('Response is not JSON');
      }

      const text = await response.text();
      if (!text) {
        return {} as T;
      }

      try {
        return JSON.parse(text) as T;
      } catch (e) {
        throw new Error(`Failed to parse JSON response: ${e instanceof Error ? e.message : String(e)}`);
      }
    } catch (error) {
      const isLastAttempt = attempt === retries;
      const isNetworkError =
        error instanceof TypeError &&
        (error.message.includes('Failed to fetch') ||
          error.message.includes('AbortError'));

      // Retry on network errors, don't retry on HTTP errors
      if (isNetworkError && !isLastAttempt) {
        console.warn(`Request failed (attempt ${attempt}/${retries}), retrying...`);
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
        continue;
      }

      throw error;
    }
  }

  throw new Error('Max retries exceeded');
}

/**
 * Common API response wrapper
 */
export interface ApiResponse<T = any> {
  success?: boolean;
  data?: T;
  property?: T;
  error?: string;
  message?: string;
}

/**
 * Health check
 */
export async function checkApiHealth(): Promise<boolean> {
  try {
    await apiRequest(API_CONFIG.endpoints.health, { timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}
