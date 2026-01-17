import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '../src/components/ui/Text';
import { validateMnemonic } from '../src/services/bip39';

export default function OpenScreen() {
  const { key } = useLocalSearchParams<{ key: string }>();
  const router = useRouter();
  const [status, setStatus] = useState('Opening your locker...');

  useEffect(() => {
    // Small delay to ensure router is ready
    const timer = setTimeout(() => {
      try {
        if (key) {
          // Convert dashes back to spaces
          const mnemonic = key.replace(/-/g, ' ');

          if (validateMnemonic(mnemonic)) {
            // Valid mnemonic - go directly to locker
            router.replace({ pathname: '/(auth)/locker', params: { mnemonic } });
          } else {
            setStatus('Invalid key. Redirecting...');
            router.replace('/(auth)/home');
          }
        } else {
          setStatus('No key provided. Redirecting...');
          router.replace('/(auth)/home');
        }
      } catch (error) {
        console.error('Open error:', error);
        setStatus('Error opening locker. Redirecting...');
        router.replace('/(auth)/home');
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [key, router]);

  return (
    <SafeAreaView className="flex-1 bg-background items-center justify-center">
      <Text color="muted">{status}</Text>
    </SafeAreaView>
  );
}
