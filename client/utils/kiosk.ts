import { NativeModules, Platform } from 'react-native';

const { KioskModule } = NativeModules;

export interface KioskInterface {
    startKioskMode: () => Promise<boolean>;
    stopKioskMode: () => Promise<boolean>;
    isKioskModeEnabled: () => Promise<boolean>;
    isDeviceOwner: () => Promise<boolean>;
}

const Kiosk: KioskInterface = {
    startKioskMode: async () => {
        if (Platform.OS !== 'android') return false;
        try {
            return await KioskModule.startKioskMode();
        } catch (e) {
            console.error('Failed to start kiosk mode', e);
            return false;
        }
    },
    stopKioskMode: async () => {
        if (Platform.OS !== 'android') return false;
        try {
            return await KioskModule.stopKioskMode();
        } catch (e) {
            console.error('Failed to stop kiosk mode', e);
            return false;
        }
    },
    isKioskModeEnabled: async () => {
        if (Platform.OS !== 'android') return false;
        try {
            return await KioskModule.isKioskModeEnabled();
        } catch (e) {
            console.error('Failed to check kiosk mode', e);
            return false;
        }
    },
    isDeviceOwner: async () => {
        if (Platform.OS !== 'android') return false;
        try {
            return await KioskModule.isDeviceOwner();
        } catch (e) {
            console.error('Failed to check device owner status', e);
            return false;
        }
    }
};

export default Kiosk;
