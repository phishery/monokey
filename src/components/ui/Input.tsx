import { TextInput, TextInputProps, View } from 'react-native';
import { Text } from './Text';
import { forwardRef } from 'react';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<TextInput, InputProps>(({
  label,
  error,
  hint,
  className = '',
  ...props
}, ref) => {
  return (
    <View className="w-full">
      {label && (
        <Text variant="label" color="muted" className="mb-2">
          {label}
        </Text>
      )}
      <TextInput
        ref={ref}
        className={`bg-surface border ${error ? 'border-red-500' : 'border-border'} rounded-xl px-4 py-3 text-text text-base ${className}`}
        placeholderTextColor="#64748b"
        {...props}
      />
      {error && (
        <Text variant="caption" color="error" className="mt-1">
          {error}
        </Text>
      )}
      {hint && !error && (
        <Text variant="caption" color="muted" className="mt-1">
          {hint}
        </Text>
      )}
    </View>
  );
});

Input.displayName = 'Input';
