import { useState, useEffect } from 'react';
import { View, TextInput, Pressable, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
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
  generateContentKey,
  encryptKey,
  decryptKey,
} from '../../src/services/crypto';
import { sha256 } from '@noble/hashes/sha2.js';

// API endpoint - uses backend server (never expose Upstash credentials to client)
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://monokey-api.onrender.com';

const BackIcon = () => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="#0f172a" strokeWidth={2}>
    <Path d="m15 18-6-6 6-6" />
  </Svg>
);

const LockIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth={2}>
    <Path d="M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2z" />
    <Path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </Svg>
);

type AccessMode = 'write' | 'view' | 'new';

interface LockerData {
  type: 'write';
  contentIv: string;
  encryptedContent: string;
  keyIv: string;
  encryptedContentKey: string;
  viewLockerId?: string;
}

interface ViewRefData {
  type: 'view';
  writeRef: string;
  keyIv: string;
  encryptedContentKey: string;
}

export default function LockerScreen() {
  const params = useLocalSearchParams<{
    mnemonic?: string;
    viewMnemonic?: string;
    writeMnemonic?: string;
    isNew?: string;
  }>();
  const router = useRouter();

  const [content, setContent] = useState('');
  const [originalContent, setOriginalContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [accessMode, setAccessMode] = useState<AccessMode>('new');
  const [contentKey, setContentKey] = useState<Uint8Array | null>(null);
  const [writeLockerId, setWriteLockerId] = useState<string | null>(null);
  const [viewLockerId, setViewLockerId] = useState<string | null>(null);
  const [userKey, setUserKey] = useState<Uint8Array | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Determine which mnemonic we're working with
  const mnemonic = params.mnemonic || params.writeMnemonic;
  const isNewLocker = params.isNew === 'true';

  useEffect(() => {
    if (mnemonic || params.viewMnemonic) {
      initializeLocker();
    }
  }, [mnemonic, params.viewMnemonic]);

  useEffect(() => {
    setHasUnsavedChanges(content !== originalContent);
  }, [content, originalContent]);

  const generateLockerId = (seed: Uint8Array): string => {
    const seedHash = sha256(seed);
    return Array.from(seedHash).map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const initializeLocker = async () => {
    setIsLoading(true);
    try {
      // New locker with both view and write mnemonics
      if (isNewLocker && params.viewMnemonic && params.writeMnemonic) {
        const viewSeed = await mnemonicToSeed(params.viewMnemonic, '');
        const writeSeed = await mnemonicToSeed(params.writeMnemonic, '');

        const viewId = generateLockerId(viewSeed);
        const writeId = generateLockerId(writeSeed);

        setViewLockerId(viewId);
        setWriteLockerId(writeId);

        const writeKey = deriveFileKey(writeSeed);
        setUserKey(writeKey);

        // Generate new content key
        const newContentKey = await generateContentKey();
        setContentKey(newContentKey);

        setAccessMode('new');
        setContent('');
        setOriginalContent('');
      }
      // Opening with write mnemonic (full access)
      else if (mnemonic) {
        const seed = await mnemonicToSeed(mnemonic, '');
        const lockerId = generateLockerId(seed);
        const key = deriveFileKey(seed);
        setUserKey(key);

        // Fetch as write locker
        const writeResponse = await fetch(`${API_URL}/api/locker/write/${lockerId}`);
        const writeData = await writeResponse.json();

        if (writeData.result) {
          // Found write locker - full access
          const lockerData: LockerData = JSON.parse(writeData.result);
          setWriteLockerId(lockerId);
          setAccessMode('write');

          // Decrypt content key
          const decryptedContentKey = await decryptKey(
            lockerData.encryptedContentKey,
            key,
            base64ToUint8Array(lockerData.keyIv)
          );
          setContentKey(decryptedContentKey);

          // Decrypt content
          const decryptedContent = await decrypt(
            lockerData.encryptedContent,
            decryptedContentKey,
            base64ToUint8Array(lockerData.contentIv)
          );
          setContent(decryptedContent);
          setOriginalContent(decryptedContent);
        } else {
          // No locker found for this write key
          console.log('No locker found for this write key');
          setAccessMode('write');
          setWriteLockerId(lockerId);
          setContentKey(await generateContentKey());
          setContent('');
          setOriginalContent('');
        }
      }
      // Opening with view mnemonic only (view-only access)
      else if (params.viewMnemonic) {
        const seed = await mnemonicToSeed(params.viewMnemonic, '');
        const lockerId = generateLockerId(seed);
        const key = deriveFileKey(seed);
        setUserKey(key);

        // Fetch view reference
        const viewResponse = await fetch(`${API_URL}/api/locker/view/${lockerId}`);
        const viewData = await viewResponse.json();

        if (viewData.result) {
          // Found view reference - view-only access
          const viewRefData: ViewRefData = JSON.parse(viewData.result);
          setAccessMode('view');
          setWriteLockerId(viewRefData.writeRef);

          // Decrypt content key with view key
          const decryptedContentKey = await decryptKey(
            viewRefData.encryptedContentKey,
            key,
            base64ToUint8Array(viewRefData.keyIv)
          );
          setContentKey(decryptedContentKey);

          // Fetch actual content from write locker
          const contentResponse = await fetch(`${API_URL}/api/locker/write/${viewRefData.writeRef}`);
          const contentData = await contentResponse.json();

          if (contentData.result) {
            const lockerData: LockerData = JSON.parse(contentData.result);
            const decryptedContent = await decrypt(
              lockerData.encryptedContent,
              decryptedContentKey,
              base64ToUint8Array(lockerData.contentIv)
            );
            setContent(decryptedContent);
            setOriginalContent(decryptedContent);
          }
        } else {
          // No locker found for this view key
          console.log('No locker found for this view key');
          setAccessMode('view');
          setContent('');
          setOriginalContent('');
        }
      }
    } catch (error) {
      console.error('Failed to initialize:', error);
      Alert.alert('Error', 'Failed to initialize locker');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!contentKey || !writeLockerId || accessMode === 'view') return;

    setIsSaving(true);
    try {
      // Encrypt content with content key
      const contentIv = await generateIV();
      const contentIvBytes = base64ToUint8Array(contentIv);
      const encryptedContent = await encrypt(content, contentKey, contentIvBytes);

      // For new lockers, also set up the view reference
      if (accessMode === 'new' && viewLockerId && userKey && params.viewMnemonic) {
        // Encrypt content key with write key
        const { encryptedKey: writeEncryptedKey, iv: writeKeyIv } = await encryptKey(contentKey, userKey);

        // Get view key and encrypt content key with it
        const viewSeed = await mnemonicToSeed(params.viewMnemonic, '');
        const viewKey = deriveFileKey(viewSeed);
        const { encryptedKey: viewEncryptedKey, iv: viewKeyIv } = await encryptKey(contentKey, viewKey);

        // Store write locker
        const writeLockerData: LockerData = {
          type: 'write',
          contentIv,
          encryptedContent,
          keyIv: writeKeyIv,
          encryptedContentKey: writeEncryptedKey,
          viewLockerId,
        };

        await fetch(`${API_URL}/api/locker/write/${writeLockerId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: JSON.stringify(writeLockerData) }),
        });

        // Store view reference
        const viewRefData: ViewRefData = {
          type: 'view',
          writeRef: writeLockerId,
          keyIv: viewKeyIv,
          encryptedContentKey: viewEncryptedKey,
        };

        await fetch(`${API_URL}/api/locker/view/${viewLockerId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: JSON.stringify(viewRefData) }),
        });

        setAccessMode('write');
      } else if (accessMode === 'write' && userKey) {
        // Update existing write locker
        const { encryptedKey, iv: keyIv } = await encryptKey(contentKey, userKey);

        const writeLockerData: LockerData = {
          type: 'write',
          contentIv,
          encryptedContent,
          keyIv,
          encryptedContentKey: encryptedKey,
          viewLockerId: viewLockerId || undefined,
        };

        await fetch(`${API_URL}/api/locker/write/${writeLockerId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: JSON.stringify(writeLockerData) }),
        });
      }

      setOriginalContent(content);
      setHasUnsavedChanges(false);

      if (Platform.OS === 'web') {
        window.alert('Locker saved successfully!');
      } else {
        Alert.alert('Saved', 'Your locker has been saved.');
      }
    } catch (error) {
      console.error('Failed to save:', error);
      Alert.alert('Error', 'Failed to save content');
    } finally {
      setIsSaving(false);
    }
  };

  const handleBack = () => {
    router.replace('/(auth)/home');
  };

  const handleSaveAndLock = async () => {
    if (hasUnsavedChanges) {
      // Save first, then lock
      setIsSaving(true);
      try {
        // Encrypt content with content key
        const contentIv = await generateIV();
        const contentIvBytes = base64ToUint8Array(contentIv);
        const encryptedContent = await encrypt(content, contentKey!, contentIvBytes);

        // For new lockers, also set up the view reference
        if (accessMode === 'new' && viewLockerId && userKey && params.viewMnemonic) {
          // Encrypt content key with write key
          const { encryptedKey: writeEncryptedKey, iv: writeKeyIv } = await encryptKey(contentKey!, userKey);

          // Get view key and encrypt content key with it
          const viewSeed = await mnemonicToSeed(params.viewMnemonic, '');
          const viewKey = deriveFileKey(viewSeed);
          const { encryptedKey: viewEncryptedKey, iv: viewKeyIv } = await encryptKey(contentKey!, viewKey);

          // Store write locker
          const writeLockerData: LockerData = {
            type: 'write',
            contentIv,
            encryptedContent,
            keyIv: writeKeyIv,
            encryptedContentKey: writeEncryptedKey,
            viewLockerId,
          };

          await fetch(`${API_URL}/api/locker/write/${writeLockerId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data: JSON.stringify(writeLockerData) }),
          });

          // Store view reference
          const viewRefData: ViewRefData = {
            type: 'view',
            writeRef: writeLockerId!,
            keyIv: viewKeyIv,
            encryptedContentKey: viewEncryptedKey,
          };

          await fetch(`${API_URL}/api/locker/view/${viewLockerId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data: JSON.stringify(viewRefData) }),
          });
        } else if (accessMode === 'write' && userKey) {
          // Update existing write locker
          const { encryptedKey, iv: keyIv } = await encryptKey(contentKey!, userKey);

          const writeLockerData: LockerData = {
            type: 'write',
            contentIv,
            encryptedContent,
            keyIv,
            encryptedContentKey: encryptedKey,
            viewLockerId: viewLockerId || undefined,
          };

          await fetch(`${API_URL}/api/locker/write/${writeLockerId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data: JSON.stringify(writeLockerData) }),
          });
        }

        // Navigate home after successful save
        router.replace('/(auth)/home');
      } catch (error) {
        console.error('Failed to save:', error);
        Alert.alert('Error', 'Failed to save content');
        setIsSaving(false);
      }
    } else {
      // No changes, just lock
      router.replace('/(auth)/home');
    }
  };

  if (!mnemonic && !params.viewMnemonic) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center">
        <Text color="error">No seed phrase provided</Text>
      </SafeAreaView>
    );
  }

  const canEdit = accessMode === 'write' || accessMode === 'new';

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-4 border-b border-border">
        <View className="flex-row items-center flex-1">
          <Pressable onPress={accessMode === 'view' ? handleBack : handleSaveAndLock} className="p-2 -ml-2">
            <BackIcon />
          </Pressable>
          <Text variant="subtitle" className="ml-2">
            Your Locker
          </Text>
          {accessMode === 'view' && (
            <View style={{ backgroundColor: '#f59e0b', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, marginLeft: 8 }}>
              <Text style={{ color: 'white', fontSize: 12, fontWeight: '600' }}>VIEW ONLY</Text>
            </View>
          )}
        </View>

        <View className="flex-row items-center" style={{ gap: 8 }}>
          {isSaving && (
            <Text variant="caption" color="muted">
              Saving...
            </Text>
          )}
          {canEdit && (
            <Pressable
              onPress={handleSaveAndLock}
              disabled={isSaving}
              style={{
                backgroundColor: hasUnsavedChanges ? '#22c55e' : '#0ea5e9',
                paddingHorizontal: 16,
                paddingVertical: 10,
                borderRadius: 8,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                opacity: isSaving ? 0.7 : 1,
              }}
            >
              <LockIcon />
              <Text style={{ color: 'white', fontWeight: '600' }}>
                {hasUnsavedChanges ? 'Save & Lock' : 'Lock'}
              </Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* Warning banner for edit mode */}
      {canEdit && hasUnsavedChanges && (
        <View style={{ backgroundColor: '#fef3c7', padding: 12, borderBottomWidth: 1, borderBottomColor: '#fcd34d' }}>
          <Text style={{ color: '#92400e', fontSize: 13, textAlign: 'center' }}>
            You have unsaved changes. Tap "Save & Lock" to store your content.
          </Text>
        </View>
      )}

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
            placeholder={canEdit ? "Start typing your secure content..." : "This locker is view-only"}
            placeholderTextColor="#64748b"
            value={content}
            onChangeText={canEdit ? setContent : undefined}
            editable={canEdit}
            multiline
            textAlignVertical="top"
            autoCapitalize="sentences"
            autoCorrect
            style={!canEdit ? { backgroundColor: '#f8fafc' } : undefined}
          />
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
