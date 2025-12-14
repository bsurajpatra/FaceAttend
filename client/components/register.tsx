import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, ActivityIndicator } from 'react-native';
import { styles } from './styles/register-styles';

type RegisterProps = {
  onSubmit?: (data: { name: string; email: string; username: string; password: string; confirmPassword: string }) => Promise<void> | void;
  onLoginPress?: () => void;
  isSubmitting?: boolean;
  errorMessage?: string | null;
};

export default function Register({ onSubmit, onLoginPress, isSubmitting = false, errorMessage = null }: RegisterProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSubmit = async () => {
    if (onSubmit) {
      onSubmit({ name, email, username, password, confirmPassword });
      return;
    }

    // Basic validation
    if (!name || !email || !username || !password || !confirmPassword) {
      return;
    }

    if (password !== confirmPassword) {
      return;
    }

    // Here you would call registerApi
    console.log('Register data:', { name, email, username, password });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create Account</Text>

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Full Name</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Enter your full name"
          autoCapitalize="words"
          autoCorrect={false}
          style={styles.input}
          editable={!isSubmitting}
          returnKeyType="next"
        />
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="Enter your email"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          style={styles.input}
          editable={!isSubmitting}
          returnKeyType="next"
        />
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Username</Text>
        <TextInput
          value={username}
          onChangeText={setUsername}
          placeholder="Choose a username"
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
          placeholder="Create a password"
          secureTextEntry
          style={styles.input}
          editable={!isSubmitting}
          returnKeyType="next"
        />
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Confirm Password</Text>
        <TextInput
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="Confirm your password"
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
        accessibilityLabel="Create Account"
      >
        {isSubmitting ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text style={styles.buttonText}>Create Account</Text>
        )}
      </Pressable>

      <View style={styles.linksRow}>
        <Pressable
          onPress={onLoginPress}
          style={({ pressed }) => [styles.linkButton, pressed && styles.linkButtonPressed]}
          accessibilityRole="button"
          accessibilityLabel="Back to Login"
        >
          <Text style={styles.linkText}>Already have an account? Login</Text>
        </Pressable>
      </View>
    </View>
  );
}
