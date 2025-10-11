import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const raw = process.env.EXPO_PUBLIC_API_URL;
const CANDIDATE_BASE_URLS = raw
  ? raw.split(',').map((s) => s.trim()).filter(Boolean)
  : ['http://localhost:3000'];

const initialBaseURL = CANDIDATE_BASE_URLS[0];

export const http: AxiosInstance = axios.create({
  baseURL: initialBaseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach Authorization header from AsyncStorage token
http.interceptors.request.use(async (config) => {
  try {
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


