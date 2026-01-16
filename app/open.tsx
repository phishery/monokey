import { useEffect } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '../src/components/ui/Text';
import { validateMnemonic } from '../src/services/bip39';

export default function OpenScreen() {
  const { key } = useLocalSearchParams<{ key: string }>();
  const router = useRouter();

  useEffect(() => {
    if (key) {
      // Convert dashes back to spaces
      const mnemonic = key.replace(/-/g, ' ');

      if (validateMnemonic(mnemonic)) {
        // Valid mnemonic - go directly to locker
        router.replace({ pathname: '/(auth)/locker', params: { mnemonic } });
      } else {
        // Invalid - go to home
        router.replace('/(auth)/home');
      }
    } else {
      // No key provided - go to home
      router.replace('/(auth)/home');
    }
  }, [key]);

  return (
    <SafeAreaView className="flex-1 bg-background items-center justify-center">
      <Text color="muted">Opening your locker...</Text>
    </SafeAreaView>
  );
}
