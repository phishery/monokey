import { View, ViewProps, Pressable, PressableProps } from 'react-native';

interface CardProps extends ViewProps {
  variant?: 'default' | 'elevated';
}

export function Card({
  variant = 'default',
  className = '',
  ...props
}: CardProps) {
  const variantClasses = {
    default: 'bg-surface',
    elevated: 'bg-surface shadow-lg shadow-black/25',
  };

  return (
    <View
      className={`rounded-2xl p-4 ${variantClasses[variant]} ${className}`}
      {...props}
    />
  );
}

interface PressableCardProps extends PressableProps {
  variant?: 'default' | 'elevated';
}

export function PressableCard({
  variant = 'default',
  className = '',
  ...props
}: PressableCardProps) {
  const variantClasses = {
    default: 'bg-surface active:bg-surfaceLight',
    elevated: 'bg-surface shadow-lg shadow-black/25 active:bg-surfaceLight',
  };

  return (
    <Pressable
      className={`rounded-2xl p-4 ${variantClasses[variant]} ${className}`}
      {...props}
    />
  );
}
