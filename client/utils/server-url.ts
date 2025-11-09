import AsyncStorage from '@react-native-async-storage/async-storage';

const SERVER_URL_KEY = 'manual_server_url';

/**
 * Get the server URL from AsyncStorage (manually set) or fall back to .env
 */
export async function getServerUrl(): Promise<string | null> {
  try {
    // First check AsyncStorage for manually set URL
    const manualUrl = await AsyncStorage.getItem(SERVER_URL_KEY);
    if (manualUrl) {
      return manualUrl;
    }
    
    // Fall back to .env
    const raw = process.env.EXPO_PUBLIC_API_URL;
    if (raw) {
      const urls = raw.split(',').map((s) => s.trim()).filter(Boolean);
      return urls[0] || null;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting server URL:', error);
    // Fall back to .env on error
    const raw = process.env.EXPO_PUBLIC_API_URL;
    if (raw) {
      const urls = raw.split(',').map((s) => s.trim()).filter(Boolean);
      return urls[0] || null;
    }
    return null;
  }
}

/**
 * Set the server URL in AsyncStorage
 */
export async function setServerUrl(url: string): Promise<void> {
  try {
    // Validate URL format
    if (!url || !url.trim()) {
      throw new Error('Server URL cannot be empty');
    }
    
    // Basic URL validation
    try {
      new URL(url);
    } catch {
      throw new Error('Invalid URL format');
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
    return urls[0] || null;
  }
  return 'http://localhost:3000';
}

/**
 * Check if a manual server URL is set in AsyncStorage
 */
export async function hasManualServerUrl(): Promise<boolean> {
  try {
    const manualUrl = await AsyncStorage.getItem(SERVER_URL_KEY);
    return manualUrl !== null;
  } catch (error) {
    console.error('Error checking manual server URL:', error);
    return false;
  }
}

