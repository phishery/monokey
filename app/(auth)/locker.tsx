import { useState, useEffect } from 'react';
import { View, TextInput, Pressable, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { Text } from '../../src/components/ui/Text';
import { mnemonicToSeed } from '../../src/services/bip39';
import {
  encrypt,
  decrypt,
  deriveFileKey,
  generateIV,
  base64ToUint8Array,
  uint8ArrayToBase64,
} from '../../src/services/crypto';
import { sha256 } from '@noble/hashes/sha2.js';

// Backend API URL - use env var in production, localhost for dev
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';

const BackIcon = () => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="#f8fafc" strokeWidth={2}>
    <Path d="m15 18-6-6 6-6" />
  </Svg>
);

const LockIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#f8fafc" strokeWidth={2}>
    <Path d="M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2z" />
    <Path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </Svg>
);

export default function LockerScreen() {
  const { mnemonic } = useLocalSearchParams<{ mnemonic: string }>();
  const router = useRouter();

  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [fileKey, setFileKey] = useState<Uint8Array | null>(null);
  const [lockerId, setLockerId] = useState<string | null>(null);

  useEffect(() => {
    if (mnemonic) {
      initializeLocker();
    }
  }, [mnemonic]);

  const initializeLocker = async () => {
    setIsLoading(true);
    try {
      // Derive encryption key from mnemonic
      const seed = await mnemonicToSeed(mnemonic, '');
      const key = deriveFileKey(seed);
      setFileKey(key);

      // Create locker ID from seed hash (hex string)
      const seedHash = sha256(seed);
      const id = Array.from(seedHash).map(b => b.toString(16).padStart(2, '0')).join('');
      setLockerId(id);

      // Try to load existing content from server
      try {
        const response = await fetch(`${API_URL}/locker/${id}`);
        const data = await response.json();

        if (data.content) {
          // Content format: "iv:ciphertext"
          const [storedIV, storedCiphertext] = data.content.split(':');
          if (storedIV && storedCiphertext) {
            try {
              const decrypted = await decrypt(
                storedCiphertext,
                key,
                base64ToUint8Array(storedIV)
              );
              setContent(decrypted);
            } catch (e) {
              // Wrong key or corrupted data - start fresh
              console.log('Could not decrypt - wrong key or new locker');
              setContent('');
            }
          }
        }
      } catch (fetchError) {
        console.log('Server unavailable, starting with empty content');
        setContent('');
      }
    } catch (error) {
      console.error('Failed to initialize:', error);
      Alert.alert('Error', 'Failed to initialize vault');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!fileKey || !lockerId) return;

    setIsSaving(true);
    try {
      const iv = await generateIV();
      const ivBytes = base64ToUint8Array(iv);
      const encrypted = await encrypt(content, fileKey, ivBytes);

      // Store as "iv:ciphertext" format
      const serverContent = `${iv}:${encrypted}`;

      await fetch(`${API_URL}/locker/${lockerId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: serverContent }),
      });
    } catch (error) {
      console.error('Failed to save:', error);
      Alert.alert('Error', 'Failed to save content');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLock = async () => {
    await handleSave();
    router.replace('/(auth)/home');
  };

  if (!mnemonic) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center">
        <Text color="error">No seed phrase provided</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-4 border-b border-border">
        <View className="flex-row items-center">
          <Pressable onPress={handleLock} className="p-2 -ml-2">
            <BackIcon />
          </Pressable>
          <Text variant="subtitle" className="ml-2">
            Your Vault
          </Text>
        </View>

        <View className="flex-row items-center">
          {isSaving && (
            <Text variant="caption" color="muted" className="mr-3">
              Saving...
            </Text>
          )}
          <Pressable onPress={handleLock} className="flex-row items-center bg-surface px-3 py-2 rounded-lg">
            <LockIcon />
            <Text className="ml-2">Lock</Text>
          </Pressable>
        </View>
      </View>

      {/* Editor */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <Text color="muted">Unlocking...</Text>
          </View>
        ) : (
          <TextInput
            className="flex-1 p-6 text-text text-base"
            placeholder="Start typing your secure content..."
            placeholderTextColor="#64748b"
            value={content}
            onChangeText={setContent}
            onBlur={handleSave}
            multiline
            textAlignVertical="top"
            autoCapitalize="sentences"
            autoCorrect
          />
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
