import React, { useMemo } from 'react';
import { SafeAreaView, View, Text, Pressable, ScrollView, Switch, Alert, Linking, AppState } from 'react-native';
import { router } from 'expo-router';
import { useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';

export default function SettingsScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [locationPermission, setLocationPermission] = React.useState<Location.LocationPermissionResponse | null>(null);
  const [mediaPermission, setMediaPermission] = React.useState<ImagePicker.MediaLibraryPermissionResponse | null>(null);
  const [permissionsExpanded, setPermissionsExpanded] = React.useState(false);

  // Check location permission on component mount
  React.useEffect(() => {
    const checkLocationPermission = async () => {
      try {
        const permission = await Location.getForegroundPermissionsAsync();
        setLocationPermission(permission);
      } catch (error) {
        console.error('Error checking location permission:', error);
      }
    };
    checkLocationPermission();
  }, []);

  // Check media library permission on component mount
  React.useEffect(() => {
    const checkMediaPermission = async () => {
      try {
        const permission = await ImagePicker.getMediaLibraryPermissionsAsync();
        setMediaPermission(permission);
      } catch (error) {
        console.error('Error checking media library permission:', error);
      }
    };
    checkMediaPermission();
  }, []);

  // Refresh permissions when app becomes active (user returns from settings)
  React.useEffect(() => {
    const handleAppStateChange = async (nextAppState: string) => {
      if (nextAppState === 'active') {
        // Refresh all permissions when app becomes active
        try {
          const [locationPerm, mediaPerm] = await Promise.all([
            Location.getForegroundPermissionsAsync(),
            ImagePicker.getMediaLibraryPermissionsAsync()
          ]);
          setLocationPermission(locationPerm);
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
            { text: 'Open Settings', onPress: () => { 
              try { 
                Linking.openSettings(); 
              } catch (error) {
                console.error('Failed to open settings:', error);
              }
            }},
          ]
        );
      }
    } catch (error) {
      console.error('Error requesting media library permission:', error);
      Alert.alert('Error', 'Failed to request media library permission.');
    }
  };

  const onLogout = async () => {
    try {
      // Clear token and any user session if needed
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
    } catch {}
    try {
      // @ts-ignore
      router.replace('/');
    } catch {}
  };

  const ActionButton = ({ title, onPress }: { title: string; onPress: () => void }) => (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({ backgroundColor: 'white', paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 12, opacity: pressed ? 0.95 : 1 })}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827' }}>{title}</Text>
    </Pressable>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
      {/* Header */}
      <View style={{ backgroundColor: 'white', paddingTop: 50, paddingBottom: 16, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#E5E7EB', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => ({ paddingVertical: 8, paddingHorizontal: 12, borderRadius: 6, opacity: pressed ? 0.7 : 1 })}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Text style={{ fontSize: 16, color: '#EF4444', fontWeight: '600' }}>← Back</Text>
        </Pressable>
        <Text style={{ fontSize: 20, fontWeight: '700', color: '#111827' }}>Settings</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={{ flex: 1, padding: 16 }}>
        <ActionButton title="Edit Profile" onPress={() => {
          try {
            // @ts-ignore
            router.push('/edit-profile');
          } catch {}
        }} />
        <ActionButton title="Change Password" onPress={() => {
          try {
            // @ts-ignore
            router.push('/change-password');
          } catch {}
        }} />
        <ActionButton title="Manage Students" onPress={() => {
          try {
            // @ts-ignore
            router.push('/manage-students');
          } catch {}
        }} />

        {/* Permissions Tab */}
        <View style={{ backgroundColor: 'white', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 12, overflow: 'hidden' }}>
          {/* Permissions Header - Toggle */}
          <Pressable
            onPress={() => setPermissionsExpanded(!permissionsExpanded)}
            style={({ pressed }) => ({
              paddingVertical: 14,
              paddingHorizontal: 16,
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              opacity: pressed ? 0.95 : 1
            })}
            accessibilityRole="button"
            accessibilityLabel="Toggle Permissions"
          >
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827' }}>Permissions</Text>
              <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>
                Camera, Location, Media Library
              </Text>
            </View>
            <Text style={{ fontSize: 20, color: '#6B7280' }}>
              {permissionsExpanded ? '▼' : '▶'}
            </Text>
          </Pressable>

          {/* Permissions Content - Collapsible */}
          {permissionsExpanded && (
            <View style={{ borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingTop: 12 }}>
              {/* Camera Permission Toggle */}
              <View style={{ paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ flex: 1, paddingRight: 12 }}>
                    <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827' }}>Camera Permission</Text>
                    <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>
                      {permission?.granted ? 'Granted' : 'Not granted'}
                    </Text>
                  </View>
                  <Switch
                    value={!!permission?.granted}
                    onValueChange={async (next) => {
                      if (next) {
                        const res = await requestPermission();
                        if (!res.granted) {
                          Alert.alert('Permission Denied', 'Camera access is required for attendance. You can enable it in App Settings.');
                        }
                      } else {
                        Alert.alert(
                          'Manage Permission',
                          'To revoke camera permission, open your system App Settings.',
                          [
                            { text: 'Cancel', style: 'cancel' },
                            { text: 'Open Settings', onPress: () => { try { Linking.openSettings(); } catch {} } },
                          ]
                        );
                      }
                    }}
                  />
                </View>
              </View>

              {/* Location Permission */}
              <View style={{ paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ flex: 1, paddingRight: 12 }}>
                    <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827' }}>Location Permission</Text>
                    <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>
                      {locationPermission?.granted ? 'Granted' : 'Not granted'}
                    </Text>
                  </View>
                  <Switch
                    value={!!locationPermission?.granted}
                    onValueChange={async (next) => {
                      if (next) {
                        await requestLocationPermission();
                      } else {
                        Alert.alert(
                          'Manage Permission',
                          'To revoke location permission, open your system App Settings.',
                          [
                            { text: 'Cancel', style: 'cancel' },
                            { text: 'Open Settings', onPress: () => { try { Linking.openSettings(); } catch {} } },
                          ]
                        );
                      }
                    }}
                  />
                </View>
              </View>

              {/* Media Library Permission */}
              <View style={{ paddingVertical: 14, paddingHorizontal: 16 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ flex: 1, paddingRight: 12 }}>
                    <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827' }}>Media Library Permission</Text>
                    <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>
                      {mediaPermission?.granted ? 'Granted' : 'Not granted'}
                    </Text>
                  </View>
                  <Switch
                    value={!!mediaPermission?.granted}
                    onValueChange={async (next) => {
                      if (next) {
                        await requestMediaPermission();
                      } else {
                        Alert.alert(
                          'Manage Permission',
                          'To revoke media library permission, open your system App Settings.',
                          [
                            { text: 'Cancel', style: 'cancel' },
                            { text: 'Open Settings', onPress: () => { try { Linking.openSettings(); } catch {} } },
                          ]
                        );
                      }
                    }}
                  />
                </View>
              </View>
            </View>
          )}
        </View>

        <View style={{ marginTop: 24, borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingTop: 16 }}>
        <Pressable
            onPress={onLogout}
            style={({ pressed }) => ({
            backgroundColor: pressed ? '#DC2626' : '#EF4444', // solid red with press effect
            paddingVertical: 14,
            paddingHorizontal: 16,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: '#DC2626',
            opacity: pressed ? 0.9 : 1,
            })}
            accessibilityRole="button"
            accessibilityLabel="Logout"
        >
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#FFFFFF', textAlign: 'center' }}>
            Logout
            </Text>
        </Pressable>
        </View>

      </ScrollView>

      {/* Footer */}
      <View style={{ padding: 12, alignItems: 'center' }}>
        <Text style={{ color: '#9CA3AF', fontSize: 12 }}>FaceAttend © {new Date().getFullYear()}</Text>
      </View>
    </SafeAreaView>
  );
}


