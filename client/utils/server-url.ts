import AsyncStorage from '@react-native-async-storage/async-storage';

const SERVER_URL_KEY = 'manual_server_url';

/**
 * Get the server URL from AsyncStorage (manually set) or fall back to .env
 */
export async function getServerUrl(): Promise<string | null> {
  try {
    let url: string | null = null;
    
    // Only allow dynamic AsyncStorage overrides in development environments for security reasons.
    // In production, fallback securely to the baked-in Hardcoded .env URLs.
    if (__DEV__) {
      const manualUrl = await AsyncStorage.getItem(SERVER_URL_KEY);
      if (manualUrl) {
        url = manualUrl;
      }
    }
    
    if (!url) {
      // Fall back to .env
      const raw = process.env.EXPO_PUBLIC_API_URL;
      if (raw) {
        const urls = raw.split(',').map((s) => s.trim()).filter(Boolean);
        url = urls[0] || null;
      }
    }
    
    // Enforce HTTPS
    if (url && url.startsWith('http://')) {
      return url.replace('http://', 'https://');
    }
    return url;
  } catch (error) {
    console.error('Error getting server URL:', error);
    // Fall back to .env on error
    const raw = process.env.EXPO_PUBLIC_API_URL;
    if (raw) {
      const urls = raw.split(',').map((s) => s.trim()).filter(Boolean);
      const fallbackUrl = urls[0] || null;
      if (fallbackUrl && fallbackUrl.startsWith('http://')) {
        return fallbackUrl.replace('http://', 'https://');
      }
      return fallbackUrl;
    }
    return null;
  }
}

/**
 * Set the server URL in AsyncStorage
 */
export async function setServerUrl(url: string): Promise<void> {
  try {
    if (!__DEV__) {
      throw new Error('Changing server URL is not permitted in production builds for security reasons.');
    }
    
    // Validate URL format
    if (!url || !url.trim()) {
      throw new Error('Server URL cannot be empty');
    }
    
    // Strict URL validation
    let parsedUrl;
    try {
      parsedUrl = new URL(url);
    } catch {
      throw new Error('Invalid URL format');
    }

    // Domain Whitelist Validation
    const allowedHostnames = ['localhost', '10.0.2.2', '127.0.0.1'];
    const isLocalNetwork = /^192\.168\.\d{1,3}\.\d{1,3}$/.test(parsedUrl.hostname);
    
    // If your infrastructure scales, you can add your staging domains here
    // const isStagingDomain = parsedUrl.hostname.endsWith('.your-company-staging.com');

    if (!allowedHostnames.includes(parsedUrl.hostname) && !isLocalNetwork) {
      throw new Error('Target hostname is not in the trusted whitelist. Only local network/trusted domains are permitted.');
    }

    // Protocol Whitelist
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      throw new Error('Invalid protocol: Only HTTP/HTTPS protocols are allowed.');
    }
    
    await AsyncStorage.setItem(SERVER_URL_KEY, url.trim());
  } catch (error) {
    console.error('Error setting server URL:', error);
    throw error;
  }
}

/**
 * Clear the manually set server URL (fall back to .env)
 */
export async function clearServerUrl(): Promise<void> {
  try {
    await AsyncStorage.removeItem(SERVER_URL_KEY);
  } catch (error) {
    console.error('Error clearing server URL:', error);
    throw error;
  }
}

/**
 * Get the default server URL from .env
 */
export function getDefaultServerUrl(): string | null {
  const raw = process.env.EXPO_PUBLIC_API_URL;
  if (raw) {
    const urls = raw.split(',').map((s) => s.trim()).filter(Boolean);
    const url = urls[0] || null;
    if (url && url.startsWith('http://')) {
      return url.replace('http://', 'https://');
    }
    return url;
  }
  return 'https://localhost:3000';
}

/**
 * Check if a manual server URL is set in AsyncStorage
 */
export async function hasManualServerUrl(): Promise<boolean> {
  try {
    if (!__DEV__) return false;
    const manualUrl = await AsyncStorage.getItem(SERVER_URL_KEY);
    return manualUrl !== null;
  } catch (error) {
    console.error('Error checking manual server URL:', error);
    return false;
  }
}

