import { Text as RNText, TextProps as RNTextProps } from 'react-native';

interface TextProps extends RNTextProps {
  variant?: 'body' | 'title' | 'subtitle' | 'caption' | 'label';
  color?: 'primary' | 'secondary' | 'muted' | 'error' | 'success';
}

export function Text({
  variant = 'body',
  color = 'primary',
  className = '',
  ...props
}: TextProps) {
  const variantClasses = {
    body: 'text-base',
    title: 'text-2xl font-bold',
    subtitle: 'text-lg font-semibold',
    caption: 'text-sm',
    label: 'text-xs font-medium uppercase tracking-wide',
  };

  const colorClasses = {
    primary: 'text-text',
    secondary: 'text-slate-300',
    muted: 'text-muted',
    error: 'text-red-500',
    success: 'text-green-500',
  };

  return (
    <RNText
      className={`${variantClasses[variant]} ${colorClasses[color]} ${className}`}
      {...props}
    />
  );
}
