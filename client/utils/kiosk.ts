import { NativeModules, Platform } from 'react-native';

const { KioskModule } = NativeModules;

if (Platform.OS === 'android' && !KioskModule) {
    console.warn('KioskModule is not available. This usually means you are running in Expo Go. Kiosk mode will not work as expected.');
}

export interface KioskInterface {
    startKioskMode: () => Promise<boolean>;
    stopKioskMode: () => Promise<boolean>;
    isKioskModeEnabled: () => Promise<boolean>;
    isDeviceOwner: () => Promise<boolean>;
    checkOverlayPermission: () => Promise<boolean>;
    requestOverlayPermission: () => Promise<boolean>;
    isAvailable: () => boolean;
}

const Kiosk: KioskInterface = {
    isAvailable: () => {
        return Platform.OS === 'android' && !!KioskModule;
    },
    startKioskMode: async () => {
        if (!Kiosk.isAvailable()) return false;
        try {
            return await KioskModule.startKioskMode();
        } catch (e) {
            console.error('Failed to start kiosk mode', e);
            return false;
        }
    },
    stopKioskMode: async () => {
        if (!Kiosk.isAvailable()) return false;
        try {
            return await KioskModule.stopKioskMode();
        } catch (e) {
            console.error('Failed to stop kiosk mode', e);
            return false;
        }
    },
    isKioskModeEnabled: async () => {
        if (!Kiosk.isAvailable()) return false;
        try {
            return await KioskModule.isKioskModeEnabled();
        } catch (e) {
            console.error('Failed to check kiosk mode', e);
            return false;
        }
    },
    isDeviceOwner: async () => {
        if (!Kiosk.isAvailable()) return false;
        try {
            return await KioskModule.isDeviceOwner();
        } catch (e) {
            console.error('Failed to check device owner status', e);
            return false;
        }
    },
    checkOverlayPermission: async () => {
        if (!Kiosk.isAvailable()) return true;
        try {
            return await KioskModule.checkOverlayPermission();
        } catch (e) {
            console.error('Failed to check overlay permission', e);
            return true;
        }
    },
    requestOverlayPermission: async () => {
        if (!Kiosk.isAvailable()) return true;
        try {
            return await KioskModule.requestOverlayPermission();
        } catch (e) {
            console.error('Failed to request overlay permission', e);
            return false;
        }
    }
};

export default Kiosk;
