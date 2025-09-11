import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, ActivityIndicator } from 'react-native';
import { styles } from '@/components/styles/login-styles';

type LoginProps = {
  onSubmit?: (credentials: { username: string; password: string }) => Promise<void> | void;
  onRegisterPress?: () => void;
  onForgotPasswordPress?: () => void;
  isSubmitting?: boolean;
  errorMessage?: string | null;
};

export default function Login({ onSubmit, onRegisterPress, onForgotPasswordPress, isSubmitting = false, errorMessage = null }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = () => {
    onSubmit?.({ username, password });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Login</Text>

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Username</Text>
        <TextInput
          value={username}
          onChangeText={setUsername}
          placeholder="Enter username"
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.input}
          editable={!isSubmitting}
          returnKeyType="next"
        />
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Password</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="Enter password"
          secureTextEntry
          style={styles.input}
          editable={!isSubmitting}
          returnKeyType="done"
          onSubmitEditing={handleSubmit}
        />
      </View>

      {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

      <Pressable
        onPress={handleSubmit}
        style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
        disabled={isSubmitting}
        accessibilityRole="button"
        accessibilityLabel="Login"
      >
        {isSubmitting ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text style={styles.buttonText}>Login</Text>
        )}
      </Pressable>

      <View style={styles.linksRow}>
        <Pressable
          onPress={onRegisterPress}
          style={({ pressed }) => [styles.linkButton, pressed && styles.linkButtonPressed]}
          accessibilityRole="button"
          accessibilityLabel="Register"
        >
          <Text style={styles.linkText}>Register</Text>
        </Pressable>
        <Pressable
          onPress={onForgotPasswordPress}
          style={({ pressed }) => [styles.linkButton, pressed && styles.linkButtonPressed]}
          accessibilityRole="button"
          accessibilityLabel="Forgot password"
        >
          <Text style={styles.linkText}>Forgot password</Text>
        </Pressable>
      </View>
    </View>
  );
}


