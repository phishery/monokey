import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import * as LocalAuthentication from 'expo-local-authentication';

interface AuthStore {
  isSetup: boolean;
  isUnlocked: boolean;
  biometricsEnabled: boolean;
  biometricsAvailable: boolean;
  isLoading: boolean;

  initialize: () => Promise<void>;
  setupPin: (pin: string) => Promise<void>;
  verifyPin: (pin: string) => Promise<boolean>;
  changePin: (oldPin: string, newPin: string) => Promise<boolean>;
  enableBiometrics: (enabled: boolean) => Promise<void>;
  authenticateWithBiometrics: () => Promise<boolean>;
  unlock: () => void;
  lock: () => void;
}

const PIN_HASH_KEY = 'monokey_pin_hash';
const BIOMETRICS_ENABLED_KEY = 'monokey_biometrics_enabled';

async function hashPin(pin: string): Promise<string> {
  const digest = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    pin + 'monokey_salt_v1'
  );
  return digest;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  isSetup: false,
  isUnlocked: false,
  biometricsEnabled: false,
  biometricsAvailable: false,
  isLoading: true,

  initialize: async () => {
    try {
      const pinHash = await SecureStore.getItemAsync(PIN_HASH_KEY);
      const biometricsEnabled = await SecureStore.getItemAsync(BIOMETRICS_ENABLED_KEY);
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      set({
        isSetup: !!pinHash,
        biometricsEnabled: biometricsEnabled === 'true',
        biometricsAvailable: hasHardware && isEnrolled,
        isLoading: false,
      });
    } catch (error) {
      console.error('Failed to initialize auth:', error);
      set({ isLoading: false });
    }
  },

  setupPin: async (pin: string) => {
    const hash = await hashPin(pin);
    await SecureStore.setItemAsync(PIN_HASH_KEY, hash);
    set({ isSetup: true, isUnlocked: true });
  },

  verifyPin: async (pin: string) => {
    const storedHash = await SecureStore.getItemAsync(PIN_HASH_KEY);
    if (!storedHash) return false;

    const inputHash = await hashPin(pin);
    return storedHash === inputHash;
  },

  changePin: async (oldPin: string, newPin: string) => {
    const isValid = await get().verifyPin(oldPin);
    if (!isValid) return false;

    const hash = await hashPin(newPin);
    await SecureStore.setItemAsync(PIN_HASH_KEY, hash);
    return true;
  },

  enableBiometrics: async (enabled: boolean) => {
    await SecureStore.setItemAsync(BIOMETRICS_ENABLED_KEY, enabled ? 'true' : 'false');
    set({ biometricsEnabled: enabled });
  },

  authenticateWithBiometrics: async () => {
    if (!get().biometricsAvailable || !get().biometricsEnabled) {
      return false;
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Unlock Monokey',
      cancelLabel: 'Use PIN',
      disableDeviceFallback: true,
    });

    if (result.success) {
      set({ isUnlocked: true });
      return true;
    }

    return false;
  },

  unlock: () => set({ isUnlocked: true }),
  lock: () => set({ isUnlocked: false }),
}));
