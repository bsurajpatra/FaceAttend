import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getServerUrl, getDefaultServerUrl } from '@/utils/server-url';

// Initialize with default URL from .env, will be updated on first request if manually set URL exists
const defaultBaseURL = getDefaultServerUrl() || 'http://localhost:3000';

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

/**
 * Update the HTTP client base URL dynamically
 * @param url - The server URL to set. If undefined, gets from storage. If null, uses default from .env
 */
export async function updateBaseURL(url?: string | null): Promise<void> {
  try {
    let finalUrl: string;
    
    if (url === null) {
      // Explicitly cleared - use default from .env
      finalUrl = getDefaultServerUrl() || 'http://localhost:3000';
    } else if (url !== undefined) {
      // URL explicitly provided
      finalUrl = url;
    } else {
      // Get from storage, fall back to default
      const storedUrl = await getServerUrl();
      finalUrl = storedUrl || getDefaultServerUrl() || 'http://localhost:3000';
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

// Attach Authorization header from AsyncStorage token and ensure base URL is up to date
http.interceptors.request.use(async (config) => {
  try {
    // Ensure we have the latest server URL (check on each request for flexibility)
    // This is lightweight as AsyncStorage is cached
    const serverUrl = await getServerUrl();
    // Use serverUrl if available (manual or from .env), otherwise use default
    const targetUrl = serverUrl || getDefaultServerUrl() || 'http://localhost:3000';
    
    // Update instance default baseURL if it's different
    // Axios will use this for all requests unless config.baseURL is explicitly set
    if (http.defaults.baseURL !== targetUrl) {
      http.defaults.baseURL = targetUrl;
    }
    
    const token = await AsyncStorage.getItem('token');
    if (token) {
      config.headers = config.headers || {};
      (config.headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }
  } catch {}
  return config;
});

http.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
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


