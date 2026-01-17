import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '../src/components/ui/Text';
import { validateMnemonic } from '../src/services/bip39';

export default function OpenScreen() {
  const params = useLocalSearchParams<{ key?: string; view?: string; write?: string }>();
  const router = useRouter();
  const [status, setStatus] = useState('Opening your locker...');

  useEffect(() => {
    // Small delay to ensure router is ready
    const timer = setTimeout(() => {
      try {
        // Handle view-only access
        if (params.view) {
          const mnemonic = params.view.replace(/-/g, ' ');
          if (validateMnemonic(mnemonic)) {
            router.replace({ pathname: '/(auth)/locker', params: { viewMnemonic: mnemonic } });
          } else {
            setStatus('Invalid view key. Redirecting...');
            router.replace('/(auth)/home');
          }
          return;
        }

        // Handle full (write) access
        if (params.write) {
          const mnemonic = params.write.replace(/-/g, ' ');
          if (validateMnemonic(mnemonic)) {
            router.replace({ pathname: '/(auth)/locker', params: { writeMnemonic: mnemonic } });
          } else {
            setStatus('Invalid write key. Redirecting...');
            router.replace('/(auth)/home');
          }
          return;
        }

        // Legacy support: handle old-style key param (treat as write access)
        if (params.key) {
          const mnemonic = params.key.replace(/-/g, ' ');
          if (validateMnemonic(mnemonic)) {
            router.replace({ pathname: '/(auth)/locker', params: { mnemonic } });
          } else {
            setStatus('Invalid key. Redirecting...');
            router.replace('/(auth)/home');
          }
          return;
        }

        setStatus('No key provided. Redirecting...');
        router.replace('/(auth)/home');
      } catch (error) {
        console.error('Open error:', error);
        setStatus('Error opening locker. Redirecting...');
        router.replace('/(auth)/home');
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [params.key, params.view, params.write, router]);

  return (
    <SafeAreaView className="flex-1 bg-background items-center justify-center">
      <Text color="muted">{status}</Text>
    </SafeAreaView>
  );
}
