import { useState, useEffect } from 'react';
import { View, TextInput, Pressable, Alert, KeyboardAvoidingView, Platform, ScrollView, Modal, useWindowDimensions, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import QRCode from 'react-native-qrcode-svg';
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

const ShareIcon = ({ color = "#0ea5e9" }: { color?: string }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
    <Path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
    <Path d="M16 6l-4-4-4 4" />
    <Path d="M12 2v13" />
  </Svg>
);

const CopyIcon = ({ color = "#0ea5e9" }: { color?: string }) => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
    <Path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    <Path d="M15 2H9a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1z" />
  </Svg>
);

const CloseIcon = () => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth={2}>
    <Path d="M18 6L6 18" />
    <Path d="M6 6l12 12" />
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

// Encode mnemonic to URL-safe base64
const encodeKey = (mnemonicStr: string) => {
  if (Platform.OS === 'web') {
    return btoa(mnemonicStr).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  // For native, use a simple encoding
  return Buffer.from(mnemonicStr).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

export default function LockerScreen() {
  const params = useLocalSearchParams<{
    mnemonic?: string;
    viewMnemonic?: string;
    writeMnemonic?: string;
    isNew?: string;
  }>();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWideScreen = width >= 900;

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
  const [showShareModal, setShowShareModal] = useState(false);

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
      Alert.alert('Error', 'Failed to initialize vault');
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
        window.alert('Vault saved successfully!');
      } else {
        Alert.alert('Saved', 'Your vault has been saved.');
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

  // Generate share URLs
  const baseUrl = Platform.OS === 'web' ? window.location.origin : 'https://monokey.onrender.com';
  const writeMnemonicStr = params.writeMnemonic || params.mnemonic || '';
  const viewMnemonicStr = params.viewMnemonic || '';

  const writeUrl = writeMnemonicStr ? `${baseUrl}/open?w=${encodeKey(writeMnemonicStr)}` : '';
  const viewUrl = viewMnemonicStr ? `${baseUrl}/open?v=${encodeKey(viewMnemonicStr)}` : '';

  const copyToClipboard = (text: string, label: string) => {
    if (Platform.OS === 'web') {
      navigator.clipboard.writeText(text).then(() => {
        window.alert(`${label} copied to clipboard!`);
      }).catch(() => {
        window.prompt(`Copy this ${label}:`, text);
      });
    } else {
      Alert.alert('Copied', `${label} copied to clipboard`);
    }
  };

  // Share Panel Component (used in both modal and side rail)
  const SharePanel = ({ inModal = false }: { inModal?: boolean }) => (
    <ScrollView
      style={{
        flex: 1,
        backgroundColor: '#f8fafc',
        borderLeftWidth: inModal ? 0 : 1,
        borderLeftColor: '#e2e8f0',
      }}
      contentContainerStyle={{ padding: 20 }}
    >
      {inModal && (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <Text variant="subtitle">Share Vault</Text>
          <Pressable onPress={() => setShowShareModal(false)} style={{ padding: 4 }}>
            <CloseIcon />
          </Pressable>
        </View>
      )}

      {!inModal && (
        <Text variant="subtitle" style={{ marginBottom: 16 }}>Share Vault</Text>
      )}

      {/* Full Access Section - only show if we have write mnemonic */}
      {writeMnemonicStr && canEdit && (
        <View style={{ marginBottom: 24 }}>
          <View style={{ backgroundColor: '#fef2f2', padding: 10, borderRadius: 8, marginBottom: 12 }}>
            <Text style={{ color: '#dc2626', fontWeight: '700', fontSize: 13, textAlign: 'center' }}>
              FULL ACCESS (Keep Private!)
            </Text>
          </View>

          <View style={{ alignItems: 'center', marginBottom: 12 }}>
            <View style={{ backgroundColor: 'white', padding: 12, borderRadius: 12, borderWidth: 2, borderColor: '#fecaca' }}>
              <QRCode value={writeUrl} size={120} backgroundColor="white" color="black" />
            </View>
          </View>

          <TouchableOpacity
            onPress={() => copyToClipboard(writeUrl, 'Full Access link')}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 10,
              backgroundColor: '#fef2f2',
              borderRadius: 8,
              gap: 6,
            }}
          >
            <CopyIcon color="#dc2626" />
            <Text style={{ color: '#dc2626', fontSize: 13, fontWeight: '600' }}>Copy Full Access Link</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* View-Only Section - only show if we have view mnemonic */}
      {viewMnemonicStr && (
        <View style={{ marginBottom: 24 }}>
          <View style={{ backgroundColor: '#f0fdf4', padding: 10, borderRadius: 8, marginBottom: 12 }}>
            <Text style={{ color: '#16a34a', fontWeight: '700', fontSize: 13, textAlign: 'center' }}>
              VIEW-ONLY (Safe to Share)
            </Text>
          </View>

          <View style={{ alignItems: 'center', marginBottom: 12 }}>
            <View style={{ backgroundColor: 'white', padding: 12, borderRadius: 12, borderWidth: 2, borderColor: '#bbf7d0' }}>
              <QRCode value={viewUrl} size={120} backgroundColor="white" color="black" />
            </View>
          </View>

          <TouchableOpacity
            onPress={() => copyToClipboard(viewUrl, 'View-Only link')}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 10,
              backgroundColor: '#f0fdf4',
              borderRadius: 8,
              gap: 6,
            }}
          >
            <CopyIcon color="#16a34a" />
            <Text style={{ color: '#16a34a', fontSize: 13, fontWeight: '600' }}>Copy View-Only Link</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Info text */}
      <View style={{ backgroundColor: '#f1f5f9', padding: 12, borderRadius: 8 }}>
        <Text style={{ color: '#64748b', fontSize: 11, textAlign: 'center' }}>
          {canEdit
            ? "Share the View-Only link to let others see your content without editing."
            : "You have view-only access to this vault."}
        </Text>
      </View>
    </ScrollView>
  );

  // Check if we have any shareable links
  const hasShareableLinks = writeMnemonicStr || viewMnemonicStr;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-4 border-b border-border">
        <View className="flex-row items-center flex-1">
          <Pressable onPress={accessMode === 'view' ? handleBack : handleSaveAndLock} className="p-2 -ml-2">
            <BackIcon />
          </Pressable>
          <Text variant="subtitle" className="ml-2">
            Your Vault
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
          {/* Share button - only on mobile/narrow screens */}
          {hasShareableLinks && !isWideScreen && (
            <Pressable
              onPress={() => setShowShareModal(true)}
              style={{
                backgroundColor: '#f1f5f9',
                paddingHorizontal: 12,
                paddingVertical: 10,
                borderRadius: 8,
              }}
            >
              <ShareIcon />
            </Pressable>
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

      {/* Main content area with optional side rail */}
      <View style={{ flex: 1, flexDirection: 'row' }}>
        {/* Editor */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          {isLoading ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <Text color="muted">Unlocking...</Text>
            </View>
          ) : (
            <TextInput
              style={{
                flex: 1,
                padding: 24,
                fontSize: 16,
                textAlignVertical: 'top',
                backgroundColor: !canEdit ? '#f8fafc' : undefined,
              }}
              placeholder={canEdit ? "Start typing your secure content..." : "This vault is view-only"}
              placeholderTextColor="#64748b"
              value={content}
              onChangeText={canEdit ? setContent : undefined}
              editable={canEdit}
              multiline
              autoCapitalize="sentences"
              autoCorrect
            />
          )}
        </KeyboardAvoidingView>

        {/* Side rail for wide screens */}
        {isWideScreen && hasShareableLinks && (
          <View style={{ width: 280 }}>
            <SharePanel />
          </View>
        )}
      </View>

      {/* Share Modal for mobile/narrow screens */}
      <Modal
        visible={showShareModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowShareModal(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }}>
          <SharePanel inModal />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
