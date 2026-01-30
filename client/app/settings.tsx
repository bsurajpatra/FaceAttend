import React, { useMemo } from 'react';
import { View, Text, Pressable, ScrollView, Switch, Alert, Linking, AppState, StyleSheet, Platform, Image } from 'react-native';
import { router } from 'expo-router';
import { useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

export default function SettingsScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [locationPermission, setLocationPermission] = React.useState<Location.LocationPermissionResponse | null>(null);
  const [mediaPermission, setMediaPermission] = React.useState<ImagePicker.MediaLibraryPermissionResponse | null>(null);
  const insets = useSafeAreaInsets();

  // Check permissions on mount
  React.useEffect(() => {
    const checkPermissions = async () => {
      try {
        const [locPerm, mediaPerm] = await Promise.all([
          Location.getForegroundPermissionsAsync(),
          ImagePicker.getMediaLibraryPermissionsAsync()
        ]);
        setLocationPermission(locPerm);
        setMediaPermission(mediaPerm);
      } catch (error) {
        console.error('Error checking permissions:', error);
      }
    };
    checkPermissions();
  }, []);

  // Refresh permissions when app becomes active
  React.useEffect(() => {
    const handleAppStateChange = async (nextAppState: string) => {
      if (nextAppState === 'active') {
        try {
          const [locPerm, mediaPerm] = await Promise.all([
            Location.getForegroundPermissionsAsync(),
            ImagePicker.getMediaLibraryPermissionsAsync()
          ]);
          setLocationPermission(locPerm);
          setMediaPermission(mediaPerm);
        } catch (error) {
          console.error('Error refreshing permissions:', error);
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, []);

  const requestLocationPermission = async () => {
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(permission);
      if (!permission.granted) {
        Alert.alert('Permission Denied', 'Location access is required for attendance tracking. You can enable it in App Settings.');
      }
    } catch (error) {
      console.error('Error requesting location permission:', error);
      Alert.alert('Error', 'Failed to request location permission.');
    }
  };

  const requestMediaPermission = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      setMediaPermission(permission);
      if (!permission.granted) {
        Alert.alert(
          'Permission Denied',
          'Media library access is required for uploading photos. You can enable it in App Settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Open Settings', onPress: () => {
                try { Linking.openSettings(); } catch (error) { console.error('Failed to open settings:', error); }
              }
            },
          ]
        );
      }
    } catch (error) {
      console.error('Error requesting media library permission:', error);
      Alert.alert('Error', 'Failed to request media library permission.');
    }
  };

  const PermissionRow = ({
    icon,
    title,
    status,
    value,
    onToggle
  }: {
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    status: string;
    value: boolean;
    onToggle: (val: boolean) => void;
  }) => (
    <View style={styles.permissionRow}>
      <View style={styles.permissionInfo}>
        <View style={[styles.iconContainer, value ? styles.iconActive : styles.iconInactive]}>
          <Ionicons name={icon} size={20} color={value ? '#2563EB' : '#94A3B8'} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.permissionTitle}>{title}</Text>
          <Text style={styles.permissionStatus}>
            {status}
          </Text>
        </View>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: '#CBD5E1', true: '#BFDBFE' }}
        thumbColor={value ? '#2563EB' : '#FFFFFF'}
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </Pressable>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>

        {/* Permissions Section */}
        <Text style={styles.sectionHeader}>APP PERMISSIONS</Text>
        <View style={styles.card}>
          <PermissionRow
            icon="camera"
            title="Camera Access"
            status={permission?.granted ? 'Active' : 'Required for attendance'}
            value={!!permission?.granted}
            onToggle={async (next) => {
              if (next) {
                const res = await requestPermission();
                if (!res.granted) {
                  Alert.alert('Permission Denied', 'Camera access is required for attendance.');
                }
              } else {
                Alert.alert('Manage Permission', 'To revoke camera permission, open system Settings.', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Open Settings', onPress: () => Linking.openSettings() }
                ]);
              }
            }}
          />
          <View style={styles.divider} />
          <PermissionRow
            icon="location"
            title="Location Access"
            status={locationPermission?.granted ? 'Active' : 'Tag attendance location'}
            value={!!locationPermission?.granted}
            onToggle={async (next) => {
              if (next) await requestLocationPermission();
              else Alert.alert('Manage Permission', 'To revoke location permission, open system Settings.', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Open Settings', onPress: () => Linking.openSettings() }
              ]);
            }}
          />
          <View style={styles.divider} />
          <PermissionRow
            icon="images"
            title="Media Library"
            status={mediaPermission?.granted ? 'Active' : 'Upload photos'}
            value={!!mediaPermission?.granted}
            onToggle={async (next) => {
              if (next) await requestMediaPermission();
              else Alert.alert('Manage Permission', 'To revoke media permission, open system Settings.', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Open Settings', onPress: () => Linking.openSettings() }
              ]);
            }}
          />
        </View>

        {/* Profile Info Section */}
        <Text style={styles.sectionHeader}>PROFILE & SECURITY</Text>
        <View style={styles.infoCard}>
          <View style={styles.infoIconContainer}>
            <Ionicons name="information-circle" size={24} color="#3B82F6" />
          </View>
          <Text style={styles.infoText}>
            For profile updates or password changes, please visit the{' '}
            <Text style={styles.infoHighlight}>ERP Portal</Text>.
          </Text>
        </View>

      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>FaceAttend App v1.0.0</Text>
        <Text style={styles.footerSubtext}>© {new Date().getFullYear()} FaceAttend System</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    backgroundColor: '#2563EB',
    paddingBottom: 24,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    shadowColor: '#2563EB',
    shadowOpacity: 0.2,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
    zIndex: 10,
  },
  backButton: {
    width: 44,
    height: 44,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    transform: [{ scale: 0.95 }],
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  content: {
    flex: 1,
    padding: 20,
    paddingTop: 30,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 1.5,
    marginBottom: 12,
    marginLeft: 8,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginBottom: 32,
    shadowColor: '#64748B',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  permissionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  permissionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 16,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconActive: {
    backgroundColor: '#EFF6FF',
  },
  iconInactive: {
    backgroundColor: '#F1F5F9',
  },
  permissionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 2,
  },
  permissionStatus: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginLeft: 76,
  },
  infoCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 24,
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  infoIconContainer: {
    width: 48,
    height: 48,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563EB',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
  infoText: {
    flex: 1,
    fontSize: 15,
    color: '#334155',
    lineHeight: 22,
    fontWeight: '500',
  },
  infoHighlight: {
    color: '#2563EB',
    fontWeight: '700',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  footerText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#94A3B8',
    marginBottom: 4,
  },
  footerSubtext: {
    fontSize: 12,
    color: '#CBD5E1',
    fontWeight: '600',
  },
});


