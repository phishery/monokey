export interface AuthState {
  isSetup: boolean;
  isUnlocked: boolean;
  biometricsEnabled: boolean;
  biometricsAvailable: boolean;
  lastUnlockedAt: string | null;
}

export type BiometricType = 'fingerprint' | 'facial' | 'iris' | 'none';
