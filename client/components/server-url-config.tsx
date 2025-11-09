import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { setServerUrl, getServerUrl, clearServerUrl, getDefaultServerUrl, hasManualServerUrl } from '@/utils/server-url';
import { updateBaseURL } from '@/api/http';

interface ServerUrlConfigProps {
  visible: boolean;
  onClose: () => void;
}

export const ServerUrlConfig: React.FC<ServerUrlConfigProps> = ({ visible, onClose }) => {
  const [serverUrl, setServerUrlInput] = useState('');
  const [currentUrl, setCurrentUrl] = useState<string | null>(null);
  const [hasManualUrl, setHasManualUrl] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingCurrent, setIsLoadingCurrent] = useState(true);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  // Load current server URL when modal opens
  useEffect(() => {
    if (visible) {
      loadCurrentUrl();
    }
  }, [visible]);

  // Animate modal appearance
  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.8,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const loadCurrentUrl = async () => {
    setIsLoadingCurrent(true);
    try {
      const url = await getServerUrl();
      const isManual = await hasManualServerUrl();
      setCurrentUrl(url);
      setHasManualUrl(isManual);
      // Only show manual URL in input, not the .env fallback
      setServerUrlInput(isManual ? (url || '') : '');
    } catch (error) {
      console.error('Error loading current URL:', error);
    } finally {
      setIsLoadingCurrent(false);
    }
  };

  const handleSave = async () => {
    if (!serverUrl.trim()) {
      Alert.alert('Error', 'Please enter a server URL');
      return;
    }

    // Validate URL format
    try {
      new URL(serverUrl.trim());
    } catch {
      Alert.alert('Error', 'Please enter a valid URL (e.g., http://localhost:3000 or https://api.example.com)');
      return;
    }

    setIsLoading(true);
    try {
      await setServerUrl(serverUrl.trim());
      await updateBaseURL(serverUrl.trim());
      setCurrentUrl(serverUrl.trim());
      setHasManualUrl(true);
      Alert.alert('Success', 'Server URL updated successfully', [
        { text: 'OK', onPress: onClose }
      ]);
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to save server URL');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = async () => {
    Alert.alert(
      'Clear Server URL',
      'This will remove the manually set server URL and use the default from .env file. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            setIsLoading(true);
            try {
              await clearServerUrl();
              // Pass null to updateBaseURL to force it to use default from .env
              await updateBaseURL(null);
              const defaultUrl = getDefaultServerUrl();
              setCurrentUrl(defaultUrl);
              setHasManualUrl(false);
              setServerUrlInput('');
              Alert.alert('Success', 'Server URL cleared. Using URLs from .env', [
                { text: 'OK', onPress: onClose }
              ]);
            } catch (error: any) {
              Alert.alert('Error', error?.message || 'Failed to clear server URL');
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleCancel = () => {
    // Reset to current manual URL (if any)
    setServerUrlInput(hasManualUrl ? (currentUrl || '') : '');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleCancel}
    >
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.container}
        >
          <Animated.View
            style={[
              styles.modal,
              {
                transform: [{ scale: scaleAnim }],
              },
            ]}
          >
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Server URL Configuration</Text>
              <Text style={styles.subtitle}>
                Configure the server URL for API requests
              </Text>
            </View>

            {/* Current URL Display */}
            {isLoadingCurrent ? (
              <View style={styles.currentUrlContainer}>
                <ActivityIndicator size="small" color="#666" />
              </View>
            ) : (
              <View style={styles.currentUrlContainer}>
                <Text style={styles.currentUrlLabel}>Current URL:</Text>
                <Text style={styles.currentUrlText} numberOfLines={2}>
                  {hasManualUrl ? (currentUrl || 'Not set') : (getDefaultServerUrl() || 'Not set')}
                </Text>
              </View>
            )}

            {/* Server URL Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Server URL</Text>
              <TextInput
                style={styles.input}
                value={serverUrl}
                onChangeText={setServerUrlInput}
                placeholder="https://api.example.com"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                editable={!isLoading}
                returnKeyType="done"
                onSubmitEditing={handleSave}
              />
              <Text style={styles.hint}>
                Enter the server URL (e.g., http://localhost:3000 or https://api.example.com)
              </Text>
            </View>

            {/* Buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.button, styles.clearButton]}
                onPress={handleClear}
                disabled={isLoading || !hasManualUrl}
              >
                <Text style={styles.clearButtonText}>Clear</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={handleCancel}
                disabled={isLoading}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.button,
                  styles.saveButton,
                  isLoading && styles.disabledButton,
                ]}
                onPress={handleSave}
                disabled={isLoading}
              >
                <Text style={styles.saveButtonText}>
                  {isLoading ? 'Saving...' : 'Save'}
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    marginBottom: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  currentUrlContainer: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    minHeight: 50,
    justifyContent: 'center',
  },
  currentUrlLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  currentUrlText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 2,
    borderColor: '#e1e1e1',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
    color: '#333',
    marginBottom: 8,
  },
  hint: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  clearButton: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e1e1e1',
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e1e1e1',
  },
  saveButton: {
    backgroundColor: '#EF4444',
  },
  disabledButton: {
    backgroundColor: '#ccc',
    opacity: 0.6,
  },
  clearButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#DC2626',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
});

