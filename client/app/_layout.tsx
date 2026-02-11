import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { KioskProvider } from '@/contexts/KioskContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { SocketProvider } from '@/contexts/SocketContext';
import { GlobalCaptureModal } from '@/components/GlobalCaptureModal';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <AuthProvider>
      <KioskProvider>
        <SocketProvider>
          <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
            <Stack>
              <Stack.Screen name="index" options={{ headerShown: false }} />
              <Stack.Screen name="take-attendance" options={{ headerShown: false }} />
              <Stack.Screen name="settings" options={{ headerShown: false }} />
              <Stack.Screen name="timetable" options={{ headerShown: false }} />
            </Stack>
            <GlobalCaptureModal />
            <StatusBar style="auto" />
          </ThemeProvider>
        </SocketProvider>
      </KioskProvider>
    </AuthProvider>
  );
}
