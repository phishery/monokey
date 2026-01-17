// Import polyfills first
import '../src/polyfills';

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import '../global.css';

export default function RootLayout() {
  return (
    <>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#ffffff' },
          animation: 'fade',
        }}
      />
      <StatusBar style="dark" />
    </>
  );
}
