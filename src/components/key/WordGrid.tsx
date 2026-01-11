import { View } from 'react-native';
import { Text } from '../ui/Text';

interface WordGridProps {
  words: string[];
  hidden?: boolean;
}

export function WordGrid({ words, hidden = false }: WordGridProps) {
  const columns = words.length <= 12 ? 3 : 4;

  return (
    <View className="flex-row flex-wrap justify-center">
      {words.map((word, index) => (
        <View
          key={index}
          className="w-1/3 p-1"
          style={{ width: `${100 / columns}%` }}
        >
          <View className="bg-surface rounded-lg px-3 py-2 flex-row items-center">
            <Text
              variant="caption"
              color="muted"
              className="w-6 text-right mr-2"
            >
              {index + 1}.
            </Text>
            <Text className="flex-1 font-mono">
              {hidden ? '••••••' : word}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}
