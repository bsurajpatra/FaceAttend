import * as Device from 'expo-device';
import * as Application from 'expo-application';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

export async function getDeviceId(): Promise<string> {
    let deviceId = await AsyncStorage.getItem('deviceId');

    if (!deviceId) {
        if (Platform.OS === 'android') {
            deviceId = await Application.getAndroidId();
        } else if (Platform.OS === 'ios') {
            deviceId = await Application.getIosIdForVendorAsync();
        }

        // Fallback to random UUID if IDs are null
        if (!deviceId) {
            deviceId = Crypto.randomUUID();
        }

        await AsyncStorage.setItem('deviceId', deviceId);
    }

    return deviceId;
}

export function getDeviceName(): string {
    return Device.deviceName || Device.modelName || 'Unknown Device';
}
