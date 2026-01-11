import { Pressable, PressableProps, ActivityIndicator, Platform } from 'react-native';
import { Text } from './Text';

interface ButtonProps extends Omit<PressableProps, 'children'> {
  title: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
}

export function Button({
  title,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  icon,
  onPress,
  className = '',
  ...props
}: ButtonProps) {
  const baseClasses = 'flex-row items-center justify-center rounded-xl';

  const variantClasses = {
    primary: 'bg-primary-500 active:bg-primary-600',
    secondary: 'bg-surface active:bg-surfaceLight',
    outline: 'border-2 border-primary-500 bg-transparent active:bg-primary-500/10',
    ghost: 'bg-transparent active:bg-surface',
  };

  const sizeClasses = {
    sm: 'px-4 py-2',
    md: 'px-6 py-3',
    lg: 'px-8 py-4',
  };

  const textVariantClasses = {
    primary: 'text-white font-semibold',
    secondary: 'text-text font-semibold',
    outline: 'text-primary-500 font-semibold',
    ghost: 'text-primary-500 font-semibold',
  };

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  };

  const isDisabled = disabled || loading;

  return (
    <Pressable
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${isDisabled ? 'opacity-50' : ''} ${className}`}
      disabled={isDisabled}
      onPress={onPress}
      role="button"
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'primary' ? '#ffffff' : '#0ea5e9'}
          size="small"
        />
      ) : (
        <>
          {icon}
          <Text className={`${textVariantClasses[variant]} ${textSizeClasses[size]} ${icon ? 'ml-2' : ''}`}>
            {title}
          </Text>
        </>
      )}
    </Pressable>
  );
}
