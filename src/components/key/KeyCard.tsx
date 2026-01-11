import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { PressableCard } from '../ui/Card';
import { Text } from '../ui/Text';
import type { KeySummary } from '../../types/key';
import Svg, { Path, Circle } from 'react-native-svg';

interface KeyCardProps {
  keyData: KeySummary;
}

const KeyIcon = () => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" strokeWidth={2}>
    <Path d="m21 2-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4" />
  </Svg>
);

const ChevronRight = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth={2}>
    <Path d="m9 18 6-6-6-6" />
  </Svg>
);

export function KeyCard({ keyData }: KeyCardProps) {
  const router = useRouter();

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <PressableCard
      className="mb-3"
      onPress={() => router.push(`/(auth)/key/${keyData.id}`)}
    >
      <View className="flex-row items-center">
        <View className="w-12 h-12 rounded-full bg-primary-500/10 items-center justify-center mr-4">
          <KeyIcon />
        </View>

        <View className="flex-1">
          <Text variant="subtitle" className="mb-1">
            {keyData.name}
          </Text>
          <View className="flex-row items-center">
            <Text variant="caption" color="muted">
              {keyData.wordCount} words
            </Text>
            {keyData.hasPassphrase && (
              <>
                <Text variant="caption" color="muted" className="mx-1">
                  •
                </Text>
                <Text variant="caption" color="muted">
                  passphrase
                </Text>
              </>
            )}
            <Text variant="caption" color="muted" className="mx-1">
              •
            </Text>
            <Text variant="caption" color="muted">
              {formatDate(keyData.createdAt)}
            </Text>
          </View>
        </View>

        <ChevronRight />
      </View>
    </PressableCard>
  );
}
