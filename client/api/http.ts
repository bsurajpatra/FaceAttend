import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSecureItem } from '@/utils/secure-storage';
import { getServerUrl, getDefaultServerUrl } from '@/utils/server-url';
import { initializeSslPinning } from 'react-native-ssl-public-key-pinning';

// --- SSL Certificate Pinning Setup ---
// Native-level pinning configuration intercepts all traffic (including Axios).
// Defends against MITM attacks using fraudulent certificates.
try {
  if (!__DEV__) {
    initializeSslPinning({
      'your-production-server.com': {
        includeSubdomains: true,
        publicKeyHashes: [
          'INSERT_PRIMARY_PUBLIC_KEY_HASH_HERE',
          'INSERT_BACKUP_PUBLIC_KEY_HASH_HERE'
        ]
      }
    });
    console.log('🔒 SSL Pinning globally enforced for production');
  }
} catch (err) {
  console.error('Failed to initialize SSL pinning:', err);
}

// Initialize with default URL from .env, will be updated on first request if manually set URL exists
const defaultBaseURL = getDefaultServerUrl() || '';

export const http: AxiosInstance = axios.create({
  baseURL: defaultBaseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Initialize base URL on module load (if manually set URL exists in AsyncStorage)
(async () => {
  try {
    const url = await getServerUrl();
    if (url && url !== defaultBaseURL) {
      http.defaults.baseURL = url;
    }
  } catch (error) {
    console.error('Error initializing server URL:', error);
  }
})();

// Global unauth handler
let unauthHandler: (() => void) | null = null;
export const setUnauthHandler = (handler: () => void) => {
  unauthHandler = handler;
};

/**
 * Update the HTTP client base URL dynamically
 * @param url - The server URL to set. If undefined, gets from storage. If null, uses default from .env
 */
export async function updateBaseURL(url?: string | null): Promise<void> {
  try {
    let finalUrl: string;

    if (url === null) {
      // Explicitly cleared - use default from .env
      finalUrl = getDefaultServerUrl() || '';
    } else if (url !== undefined) {
      // URL explicitly provided
      finalUrl = url;
    } else {
      // Get from storage, fall back to default
      const storedUrl = await getServerUrl();
      finalUrl = storedUrl || getDefaultServerUrl() || '';
    }

    http.defaults.baseURL = finalUrl;
  } catch (error) {
    console.error('Error updating base URL:', error);
  }
}

// Get candidate base URLs from .env for fallback retry logic
const raw = process.env.EXPO_PUBLIC_API_URL;
const CANDIDATE_BASE_URLS = raw
  ? raw.split(',').map((s) => s.trim()).filter(Boolean)
  : [defaultBaseURL];

import { getDeviceId, getDeviceName } from '@/utils/device';

// Attach Authorization header from AsyncStorage token and ensure base URL is up to date
http.interceptors.request.use(async (config) => {
  try {
    // Ensure we have the latest server URL (check on each request for flexibility)
    // This is lightweight as AsyncStorage is cached
    const serverUrl = await getServerUrl();
    // Use serverUrl if available (manual or from .env), otherwise use default
    const targetUrl = serverUrl || getDefaultServerUrl() || '';

    // Update instance default baseURL if it's different
    // Axios will use this for all requests unless config.baseURL is explicitly set
    if (http.defaults.baseURL !== targetUrl) {
      http.defaults.baseURL = targetUrl;
    }

    config.headers = config.headers || {};

    const token = await getSecureItem('token');
    if (token) {
      (config.headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }

    // Add device headers
    const deviceId = await getDeviceId();
    const deviceName = getDeviceName();
    (config.headers as Record<string, string>)['X-Device-Id'] = deviceId;
    (config.headers as Record<string, string>)['X-Device-Name'] = deviceName;
    (config.headers as Record<string, string>)['X-Platform'] = 'Mobile';

  } catch (error) {
    console.warn('Error in request interceptor:', error);
  }
  return config;
});

http.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    // Intercept 401 Unauthorized globally
    if (error.response?.status === 401) {
      if (unauthHandler) unauthHandler();
    }

    const config = error.config as (AxiosRequestConfig & { _retryIndex?: number });

    const isNetworkLevel = !error.response;
    if (!config || !isNetworkLevel || CANDIDATE_BASE_URLS.length <= 1) {
      throw error;
    }

    const currentIndex = typeof config._retryIndex === 'number' ? config._retryIndex : 0;
    const nextIndex = currentIndex + 1;
    if (nextIndex >= CANDIDATE_BASE_URLS.length) {
      throw error;
    }

    const nextBaseURL = CANDIDATE_BASE_URLS[nextIndex];
    const retryConfig: AxiosRequestConfig & { _retryIndex: number } = {
      ...config,
      baseURL: nextBaseURL,
      _retryIndex: nextIndex,
      headers: config.headers,
    };

    return http.request(retryConfig);
  }
);


