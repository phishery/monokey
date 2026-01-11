import { View, Pressable } from 'react-native';
import { Text } from '../ui/Text';
import * as Haptics from 'expo-haptics';
import Svg, { Path } from 'react-native-svg';

interface PinPadProps {
  pin: string;
  onPinChange: (pin: string) => void;
  maxLength?: number;
  onComplete?: (pin: string) => void;
}

const DeleteIcon = () => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="#f8fafc" strokeWidth={2}>
    <Path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z" />
    <Path d="m18 9-6 6M12 9l6 6" />
  </Svg>
);

export function PinPad({ pin, onPinChange, maxLength = 6, onComplete }: PinPadProps) {
  const handlePress = async (digit: string) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (pin.length < maxLength) {
      const newPin = pin + digit;
      onPinChange(newPin);
      if (newPin.length === maxLength && onComplete) {
        onComplete(newPin);
      }
    }
  };

  const handleDelete = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPinChange(pin.slice(0, -1));
  };

  const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'delete'];

  return (
    <View className="w-full max-w-xs">
      {/* PIN Dots */}
      <View className="flex-row justify-center mb-12 gap-4">
        {Array.from({ length: maxLength }).map((_, i) => (
          <View
            key={i}
            className={`w-4 h-4 rounded-full ${
              i < pin.length ? 'bg-primary-500' : 'bg-surface border border-border'
            }`}
          />
        ))}
      </View>

      {/* Number Pad */}
      <View className="flex-row flex-wrap justify-center">
        {digits.map((digit, index) => {
          if (digit === '') {
            return <View key={index} className="w-20 h-20 m-2" />;
          }

          if (digit === 'delete') {
            return (
              <Pressable
                key={index}
                onPress={handleDelete}
                className="w-20 h-20 m-2 items-center justify-center rounded-full active:bg-surface"
              >
                <DeleteIcon />
              </Pressable>
            );
          }

          return (
            <Pressable
              key={index}
              onPress={() => handlePress(digit)}
              className="w-20 h-20 m-2 items-center justify-center rounded-full bg-surface active:bg-surfaceLight"
            >
              <Text className="text-3xl font-semibold text-text">{digit}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
