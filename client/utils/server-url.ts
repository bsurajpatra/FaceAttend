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
    
    // Robust private network detection (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, and localhost)
    const isLocalOrPrivate = (hostname: string) => {
      return (
        hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname === '10.0.2.2' || // Android emulator
        /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname) ||
        /^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname) ||
        /^172\.(1[6-9]|2[0-9]|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(hostname)
      );
    };

    if (!url) {
      // Fall back to .env
      const raw = process.env.EXPO_PUBLIC_API_URL;
      if (raw) {
        const urls = raw.split(',').map((s) => s.trim()).filter(Boolean);
        url = urls[0] || null;
      }
    }
    
    // Enforce HTTPS only in Production AND for public non-local domains
    if (url && url.startsWith('http://')) {
        try {
            const parsed = new URL(url);
            if (!__DEV__ && !isLocalOrPrivate(parsed.hostname)) {
                return url.replace('http://', 'https://');
            }
        } catch (e) {
            // If URL parsing fails, stick to current behavior for safety or return as is
            if (!__DEV__) return url.replace('http://', 'https://');
        }
    }
    return url;
  } catch (error) {
    console.error('Error getting server URL:', error);
    // Fall back to .env on error
    const raw = process.env.EXPO_PUBLIC_API_URL;
    if (raw) {
      const urls = raw.split(',').map((s) => s.trim()).filter(Boolean);
      const fallbackUrl = urls[0] || null;
      
      // Apply same logic to fallback
      if (fallbackUrl && fallbackUrl.startsWith('http://')) {
          try {
              const parsed = new URL(fallbackUrl);
              const isLocal = parsed.hostname === 'localhost' || /^10\.|^192\.168\.|^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(parsed.hostname);
              if (!__DEV__ && !isLocal) {
                  return fallbackUrl.replace('http://', 'https://');
              }
          } catch {
              if (!__DEV__) return fallbackUrl.replace('http://', 'https://');
          }
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

    // Domain Whitelist Validation (expanded)
    const allowedHostnames = ['localhost', '10.0.2.2', '127.0.0.1'];
    const isLocalNetwork = 
        /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(parsedUrl.hostname) ||
        /^192\.168\.\d{1,3}\.\d{1,3}$/.test(parsedUrl.hostname) ||
        /^172\.(1[6-9]|2[0-9]|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(parsedUrl.hostname);
    
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
    
    // Default URL from .env also follows the same security logic
    if (url && url.startsWith('http://')) {
        try {
            const parsed = new URL(url);
            const isLocal = parsed.hostname === 'localhost' || 
                           parsed.hostname === '127.0.0.1' ||
                           /^10\.|^192\.168\.|^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(parsed.hostname);
            if (!__DEV__ && !isLocal) {
                return url.replace('http://', 'https://');
            }
        } catch {
            if (!__DEV__) return url.replace('http://', 'https://');
        }
    }
    return url;
  }
  return 'http://localhost:3000';
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

