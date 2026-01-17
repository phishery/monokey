import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '../src/components/ui/Text';
import { validateMnemonic } from '../src/services/bip39';

// Decode URL-safe base64 to mnemonic
const decodeKey = (encoded: string): string => {
  try {
    // Restore base64 padding and characters
    let base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) base64 += '=';
    return atob(base64);
  } catch {
    return '';
  }
};

export default function OpenScreen() {
  const params = useLocalSearchParams<{
    key?: string;
    view?: string;
    write?: string;
    v?: string;  // encoded view
    w?: string;  // encoded write
  }>();
  const router = useRouter();
  const [status, setStatus] = useState('Opening your vault...');

  useEffect(() => {
    // Small delay to ensure router is ready
    const timer = setTimeout(() => {
      try {
        // Handle encoded view-only access (new format: ?v=base64)
        if (params.v) {
          const mnemonic = decodeKey(params.v);
          if (validateMnemonic(mnemonic)) {
            router.replace({ pathname: '/(auth)/locker', params: { viewMnemonic: mnemonic } });
          } else {
            setStatus('Invalid view key. Redirecting...');
            router.replace('/(auth)/home');
          }
          return;
        }

        // Handle encoded write access (new format: ?w=base64)
        if (params.w) {
          const mnemonic = decodeKey(params.w);
          if (validateMnemonic(mnemonic)) {
            router.replace({ pathname: '/(auth)/locker', params: { writeMnemonic: mnemonic } });
          } else {
            setStatus('Invalid write key. Redirecting...');
            router.replace('/(auth)/home');
          }
          return;
        }

        // Legacy: handle old-style view param (words with hyphens)
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

        // Legacy: handle old-style write param (words with hyphens)
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

        // Legacy: handle old-style key param (treat as write access)
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
        setStatus('Error opening vault. Redirecting...');
        router.replace('/(auth)/home');
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [params.key, params.view, params.write, params.v, params.w, router]);

  return (
    <SafeAreaView className="flex-1 bg-background items-center justify-center">
      <Text color="muted">{status}</Text>
    </SafeAreaView>
  );
}
