import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from 'axios';

const raw = process.env.EXPO_PUBLIC_API_URL;
const CANDIDATE_BASE_URLS = raw
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const initialBaseURL = CANDIDATE_BASE_URLS[0];

export const http: AxiosInstance = axios.create({
  baseURL: initialBaseURL,
  headers: {
    'Content-Type': 'application/json',
  },
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


