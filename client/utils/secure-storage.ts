import * as Keychain from 'react-native-keychain';

export const getSecureItem = async (key: string): Promise<string | null> => {
  try {
    const result = await Keychain.getGenericPassword({ service: key });
    return result ? result.password : null;
  } catch (error) {
    console.warn(`Error reading secure item ${key}:`, error);
    return null;
  }
};

export const setSecureItem = async (key: string, value: string): Promise<void> => {
  try {
    await Keychain.setGenericPassword('secureData', value, { service: key });
  } catch (error) {
    console.error(`Error saving secure item ${key}:`, error);
  }
};

export const removeSecureItem = async (key: string): Promise<void> => {
  try {
    await Keychain.resetGenericPassword({ service: key });
  } catch (error) {
    console.error(`Error removing secure item ${key}:`, error);
  }
};
