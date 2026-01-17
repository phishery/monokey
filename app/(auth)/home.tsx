import { useState, useRef, useEffect } from 'react';
import { View, ScrollView, TextInput, TouchableOpacity, Pressable, Alert, Platform, Text as RNText, StyleSheet, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import QRCode from 'react-native-qrcode-svg';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Text } from '../../src/components/ui/Text';
import { Button } from '../../src/components/ui/Button';
import { Card } from '../../src/components/ui/Card';
import { WordGrid } from '../../src/components/key/WordGrid';
import { WebQRScanner } from '../../src/components/qr/WebQRScanner';
import { generateMnemonic, generateDualMnemonic, validateMnemonic, getWordList } from '../../src/services/bip39';

const MonokeyLogo = require('../../assets/monokey.png');

// Simple button using TouchableOpacity which works on web
const SimpleButton = ({ onPress, title, variant = 'primary' }: { onPress: () => void; title: string; variant?: 'primary' | 'outline' }) => {
  const isPrimary = variant === 'primary';
  return (
    <TouchableOpacity
      onPress={() => {
        console.log('SimpleButton pressed:', title);
        onPress();
      }}
      activeOpacity={0.7}
      style={{
        backgroundColor: isPrimary ? '#0ea5e9' : 'transparent',
        borderWidth: isPrimary ? 0 : 2,
        borderColor: '#0ea5e9',
        paddingVertical: 16,
        paddingHorizontal: 32,
        borderRadius: 12,
        alignItems: 'center',
      }}
    >
      <RNText style={{ color: isPrimary ? 'white' : '#0ea5e9', fontWeight: '600', fontSize: 18 }}>
        {title}
      </RNText>
    </TouchableOpacity>
  );
};


const BackIcon = () => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="#0f172a" strokeWidth={2}>
    <Path d="m15 18-6-6 6-6" />
  </Svg>
);

const ScanIcon = () => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" strokeWidth={2}>
    <Path d="M3 7V5a2 2 0 0 1 2-2h2" />
    <Path d="M17 3h2a2 2 0 0 1 2 2v2" />
    <Path d="M21 17v2a2 2 0 0 1-2 2h-2" />
    <Path d="M7 21H5a2 2 0 0 1-2-2v-2" />
    <Path d="M7 12h10" />
  </Svg>
);

const UploadIcon = () => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" strokeWidth={2}>
    <Path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <Path d="M17 8l-5-5-5 5" />
    <Path d="M12 3v12" />
  </Svg>
);

const CopyIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" strokeWidth={2}>
    <Path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    <Path d="M15 2H9a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1z" />
  </Svg>
);

const PrintIcon = () => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" strokeWidth={2}>
    <Path d="M6 9V2h12v7" />
    <Path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
    <Path d="M6 14h12v8H6z" />
  </Svg>
);

type Mode = 'home' | 'create' | 'enter' | 'scan';

let wordList: string[] = [];
try {
  wordList = getWordList();
  console.log('WordList loaded:', wordList.length, 'words');
} catch (e) {
  console.error('Failed to load wordlist:', e);
}

export default function HomeScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('home');
  const [viewWords, setViewWords] = useState<string[]>([]);
  const [writeWords, setWriteWords] = useState<string[]>([]);
  const [enteredWords, setEnteredWords] = useState<string[]>(Array(12).fill(''));
  const [activeWordIndex, setActiveWordIndex] = useState<number | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [scanned, setScanned] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  const handleScan = () => {
    setScanned(false);
    setMode('scan');
  };

  // Decode URL-safe base64 to mnemonic
  const decodeKey = (encoded: string): string => {
    try {
      let base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
      while (base64.length % 4) base64 += '=';
      return atob(base64);
    } catch {
      return '';
    }
  };

  // Helper to parse QR data and navigate to locker
  const parseAndNavigateFromQR = (data: string): boolean => {
    // Check for encoded view-only key (new format: ?v=base64)
    const vMatch = data.match(/[?&]v=([^&]+)/);
    if (vMatch) {
      const mnemonic = decodeKey(vMatch[1]);
      if (validateMnemonic(mnemonic)) {
        router.push({ pathname: '/(auth)/locker', params: { viewMnemonic: mnemonic } });
        return true;
      }
    }

    // Check for encoded write key (new format: ?w=base64)
    const wMatch = data.match(/[?&]w=([^&]+)/);
    if (wMatch) {
      const mnemonic = decodeKey(wMatch[1]);
      if (validateMnemonic(mnemonic)) {
        router.push({ pathname: '/(auth)/locker', params: { writeMnemonic: mnemonic } });
        return true;
      }
    }

    // Legacy: check for view-only key (old format with hyphens)
    const viewMatch = data.match(/[?&]view=([^&]+)/);
    if (viewMatch) {
      const mnemonic = viewMatch[1].replace(/-/g, ' ');
      if (validateMnemonic(mnemonic)) {
        router.push({ pathname: '/(auth)/locker', params: { viewMnemonic: mnemonic } });
        return true;
      }
    }

    // Legacy: check for write key (old format with hyphens)
    const writeMatch = data.match(/[?&]write=([^&]+)/);
    if (writeMatch) {
      const mnemonic = writeMatch[1].replace(/-/g, ' ');
      if (validateMnemonic(mnemonic)) {
        router.push({ pathname: '/(auth)/locker', params: { writeMnemonic: mnemonic } });
        return true;
      }
    }

    // Legacy: check for old-style key param
    const keyMatch = data.match(/[?&]key=([^&]+)/);
    if (keyMatch) {
      const mnemonic = keyMatch[1].replace(/-/g, ' ');
      if (validateMnemonic(mnemonic)) {
        router.push({ pathname: '/(auth)/locker', params: { mnemonic } });
        return true;
      }
    }

    // Try parsing as plain mnemonic
    const plainMnemonic = data.trim();
    if (validateMnemonic(plainMnemonic)) {
      router.push({ pathname: '/(auth)/locker', params: { mnemonic: plainMnemonic } });
      return true;
    }

    return false;
  };

  const handleUploadQR = async () => {
    if (Platform.OS === 'web') {
      // Create file input and trigger it
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = async (e: any) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
          const { Html5Qrcode } = await import('html5-qrcode');
          const html5QrCode = new Html5Qrcode('qr-upload-reader');
          const result = await html5QrCode.scanFile(file, true);
          html5QrCode.clear();

          if (!parseAndNavigateFromQR(result)) {
            window.alert('Invalid QR code. Please upload a valid Monokey QR code.');
          }
        } catch (err) {
          console.error('QR scan error:', err);
          window.alert('Could not read QR code from image. Please try another image.');
        }
      };
      input.click();
    } else {
      // For mobile, could use expo-image-picker
      Alert.alert('Upload QR', 'Please use the camera scanner on mobile devices.');
    }
  };

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);

    if (!parseAndNavigateFromQR(data)) {
      if (Platform.OS === 'web') {
        window.alert('Invalid QR code. Please scan a valid Monokey QR code.');
      } else {
        Alert.alert('Invalid QR Code', 'Please scan a valid Monokey QR code.', [
          { text: 'Try Again', onPress: () => setScanned(false) }
        ]);
      }
    }
  };

  const handleCreate = () => {
    console.log('handleCreate called');
    try {
      console.log('Calling generateDualMnemonic...');
      const result = generateDualMnemonic();
      console.log('Generated dual mnemonic:', result);
      if (result && result.viewWords && result.writeWords &&
          result.viewWords.length === 12 && result.writeWords.length === 12) {
        setViewWords(result.viewWords);
        setWriteWords(result.writeWords);
        setMode('create');
      } else {
        console.error('Invalid result:', result);
        if (Platform.OS === 'web') {
          window.alert('Failed to generate seed phrases - invalid result');
        } else {
          Alert.alert('Error', 'Failed to generate seed phrases');
        }
      }
    } catch (error) {
      console.error('Failed to generate:', error);
      if (Platform.OS === 'web') {
        window.alert('Failed to generate seed phrases: ' + String(error));
      } else {
        Alert.alert('Error', 'Failed to generate seed phrases: ' + String(error));
      }
    }
  };

  const handleOpen = () => {
    setEnteredWords(Array(12).fill(''));
    setMode('enter');
  };

  const handleWordChange = (index: number, value: string) => {
    const cleanValue = value.toLowerCase().trim();
    const newWords = [...enteredWords];
    newWords[index] = cleanValue;
    setEnteredWords(newWords);

    if (cleanValue.length >= 1) {
      const matches = wordList.filter(w => w.startsWith(cleanValue)).slice(0, 5);
      setSuggestions(matches);
    } else {
      setSuggestions([]);
    }
  };

  const handleWordFocus = (index: number) => {
    setActiveWordIndex(index);
    const currentWord = enteredWords[index];
    if (currentWord.length >= 1) {
      const matches = wordList.filter(w => w.startsWith(currentWord)).slice(0, 5);
      setSuggestions(matches);
    } else {
      setSuggestions([]);
    }
  };

  const handleSelectSuggestion = (word: string) => {
    if (activeWordIndex !== null) {
      const newWords = [...enteredWords];
      newWords[activeWordIndex] = word;
      setEnteredWords(newWords);
      setSuggestions([]);
    }
  };

  const handleUnlock = () => {
    const mnemonic = enteredWords.join(' ');
    if (!validateMnemonic(mnemonic)) {
      Alert.alert('Invalid Seed Phrase', 'Please check your words and try again.');
      return;
    }
    router.push({ pathname: '/(auth)/locker', params: { mnemonic } });
  };

  const handleContinue = () => {
    const viewMnemonic = viewWords.join(' ');
    const writeMnemonic = writeWords.join(' ');
    router.push({
      pathname: '/(auth)/locker',
      params: { viewMnemonic, writeMnemonic, isNew: 'true' }
    });
  };

  // Home screen
  if (mode === 'home') {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingVertical: 32 }}
          showsVerticalScrollIndicator={false}
        >
          <View className="items-center">
            <Image
              source={MonokeyLogo}
              style={{ width: 180, height: 180 }}
              resizeMode="contain"
            />
          <Text variant="title" className="mt-6 text-center">
            Monokey
          </Text>
          <Text color="muted" className="mt-2 text-center mb-8">
            Secure content with dual keys: one to edit, one to share
          </Text>
          </View>

          <View style={{ width: '100%', gap: 16 }}>
            <SimpleButton
              title="Create Monokey Locker"
              variant="primary"
              onPress={handleCreate}
            />
            <SimpleButton
              title="Open Monokey Locker"
              variant="outline"
              onPress={handleOpen}
            />
          </View>

          {/* How it works section */}
          <View style={{ marginTop: 48, paddingTop: 24, borderTopWidth: 1, borderTopColor: '#e2e8f0' }}>
            <Text variant="caption" color="muted" style={{ textAlign: 'center', marginBottom: 16, fontWeight: '600' }}>
              How Monokey Works
            </Text>

            <View style={{ gap: 16 }}>
              <View>
                <Text variant="caption" style={{ fontWeight: '600', marginBottom: 4 }}>Two Keys, Two Permissions</Text>
                <Text variant="caption" color="muted">
                  Each locker gets two separate 12-word keys: a Full Access key (for editing) and a View-Only key (safe to share). Share the View-Only key with others — they can see your content but never modify it.
                </Text>
              </View>

              <View>
                <Text variant="caption" style={{ fontWeight: '600', marginBottom: 4 }}>Unguessable Keys</Text>
                <Text variant="caption" color="muted">
                  Each 12-word key is randomly selected from 2,048 words. There are 5.4 × 10³⁹ possible combinations — more than atoms on Earth. The odds of guessing either key are essentially zero.
                </Text>
              </View>

              <View>
                <Text variant="caption" style={{ fontWeight: '600', marginBottom: 4 }}>Military-Grade Encryption</Text>
                <Text variant="caption" color="muted">
                  Your keys generate unique cryptographic keys using industry-standard algorithms (BIP39, HKDF). Content is encrypted with AES — the same standard used by governments, banks, and Bitcoin.
                </Text>
              </View>

              <View>
                <Text variant="caption" style={{ fontWeight: '600', marginBottom: 4 }}>Zero-Knowledge Storage</Text>
                <Text variant="caption" color="muted">
                  Your content is encrypted before it leaves your device. We only store encrypted data — without your seed phrase, not even we can read your content.
                </Text>
              </View>

              <View>
                <Text variant="caption" style={{ fontWeight: '600', marginBottom: 4 }}>Open Source</Text>
                <Text variant="caption" color="muted">
                  Monokey is fully open source. You can verify the code, audit the encryption, or run your own instance.
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    if (Platform.OS === 'web') {
                      window.open('https://github.com/phishery/monokey', '_blank');
                    }
                  }}
                  style={{ marginTop: 8 }}
                >
                  <Text color="primary" variant="caption" style={{ textDecorationLine: 'underline' }}>
                    View source on GitHub →
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={{ marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#e2e8f0' }}>
                <Text variant="caption" style={{ fontWeight: '600', marginBottom: 4 }}>Install the App</Text>
                <Text variant="caption" color="muted">
                  Add Monokey to your home screen for quick access:{'\n'}
                  • iPhone/iPad: Tap Share → "Add to Home Screen"{'\n'}
                  • Android: Tap Menu → "Add to Home Screen"{'\n'}
                  • Desktop: Most browsers show an install icon in the address bar
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Scan screen - QR code scanner (populates words on enter screen)
  if (mode === 'scan') {
    const handleWebScan = (data: string) => {
      if (!parseAndNavigateFromQR(data)) {
        window.alert('Invalid QR code. Please scan a valid Monokey QR code.');
        setMode('enter');
      }
    };

    const handleWebError = (error: string) => {
      window.alert(error);
      setMode('enter');
    };

    // Web scanner
    if (Platform.OS === 'web') {
      return (
        <SafeAreaView className="flex-1 bg-background">
          <View className="flex-row items-center px-4 py-4">
            <Pressable onPress={() => setMode('enter')} className="p-2 -ml-2">
              <BackIcon />
            </Pressable>
            <Text variant="subtitle" className="ml-2">Scan QR Code</Text>
          </View>
          <View style={{ flex: 1 }}>
            <WebQRScanner onScan={handleWebScan} onError={handleWebError} />
          </View>
        </SafeAreaView>
      );
    }

    // Mobile scanner - check permissions
    if (!permission) {
      return (
        <SafeAreaView className="flex-1 bg-background items-center justify-center">
          <Text>Requesting camera permission...</Text>
        </SafeAreaView>
      );
    }

    if (!permission.granted) {
      return (
        <SafeAreaView className="flex-1 bg-background">
          <View className="flex-row items-center px-4 py-4">
            <Pressable onPress={() => setMode('enter')} className="p-2 -ml-2">
              <BackIcon />
            </Pressable>
            <Text variant="subtitle" className="ml-2">Scan QR Code</Text>
          </View>
          <View className="flex-1 items-center justify-center px-6">
            <Text className="text-center mb-4">Camera permission is required to scan QR codes</Text>
            <SimpleButton
              title="Grant Permission"
              variant="primary"
              onPress={requestPermission}
            />
          </View>
        </SafeAreaView>
      );
    }

    // Mobile camera view
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-row items-center px-4 py-4">
          <Pressable onPress={() => setMode('enter')} className="p-2 -ml-2">
            <BackIcon />
          </Pressable>
          <Text variant="subtitle" className="ml-2">Scan QR Code</Text>
        </View>
        <View style={{ flex: 1 }}>
          <CameraView
            style={StyleSheet.absoluteFillObject}
            barcodeScannerSettings={{
              barcodeTypes: ['qr'],
            }}
            onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
          />
          <View style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            marginLeft: -125,
            marginTop: -125,
            width: 250,
            height: 250,
            borderWidth: 2,
            borderColor: '#0ea5e9',
            borderRadius: 20,
            backgroundColor: 'transparent',
          }} />
          <View style={{
            position: 'absolute',
            bottom: 40,
            left: 0,
            right: 0,
            alignItems: 'center',
          }}>
            <Text style={{ color: 'white', textAlign: 'center', backgroundColor: 'rgba(0,0,0,0.5)', padding: 12, borderRadius: 8 }}>
              Point camera at a Monokey QR code
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Create screen - show generated words (dual keys)
  if (mode === 'create') {
    const baseUrl = Platform.OS === 'web' ? window.location.origin : 'https://monokey.onrender.com';

    // Encode mnemonic to URL-safe base64 (obfuscates the words)
    const encodeKey = (words: string[]) => {
      const mnemonic = words.join(' ');
      return btoa(mnemonic).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    };

    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-row items-center px-4 py-4">
          <Pressable onPress={() => setMode('home')} className="p-2 -ml-2">
            <BackIcon />
          </Pressable>
          <Text variant="subtitle" className="ml-2">Your Locker Keys</Text>
        </View>

        <ScrollView className="flex-1 px-6">
          <Card className="bg-error/10 mb-6">
            <Text color="error" variant="caption" style={{ fontWeight: '600', marginBottom: 4 }}>
              Write these words down on paper and store them safely.
            </Text>
            <Text color="muted" variant="caption">
              You have TWO keys: a Full Access key (to edit) and a View-Only key (to share with others). Keep your Full Access key private!
            </Text>
            <TouchableOpacity
              onPress={() => router.push('/print-backup')}
              style={{ marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 6 }}
            >
              <PrintIcon />
              <Text color="primary" variant="caption" style={{ textDecorationLine: 'underline', fontWeight: '600' }}>
                Print a backup sheet to write down your keys
              </Text>
            </TouchableOpacity>
          </Card>

          {writeWords.length > 0 && viewWords.length > 0 ? (
            <>
              {/* Full Access Key Section */}
              <View style={{ marginBottom: 32 }}>
                <View style={{ backgroundColor: '#fef2f2', padding: 12, borderRadius: 8, marginBottom: 12 }}>
                  <Text style={{ color: '#dc2626', fontWeight: '700', fontSize: 14, marginBottom: 4 }}>
                    FULL ACCESS KEY (Keep Private!)
                  </Text>
                  <Text variant="caption" color="muted">
                    Anyone with these 12 words can read AND edit your locker. Never share this key.
                  </Text>
                </View>
                <WordGrid words={writeWords} />

                {/* Full Access QR Code */}
                <View className="mt-6 items-center">
                  <View style={{ backgroundColor: '#fef2f2', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 4, marginBottom: 8 }}>
                    <Text style={{ color: '#dc2626', fontSize: 11, fontWeight: '600' }}>FULL ACCESS QR</Text>
                  </View>
                  <View className="bg-white p-4 rounded-xl" style={{ borderWidth: 2, borderColor: '#fecaca' }}>
                    <QRCode
                      value={`${baseUrl}/open?w=${encodeKey(writeWords)}`}
                      size={160}
                      backgroundColor="white"
                      color="black"
                    />
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      const lockerUrl = `${baseUrl}/open?w=${encodeKey(writeWords)}`;
                      if (Platform.OS === 'web') {
                        navigator.clipboard.writeText(lockerUrl).then(() => {
                          window.alert('Full Access link copied! Keep this private - it allows editing your locker.');
                        }).catch(() => {
                          window.prompt('Copy this link (keep private!):', lockerUrl);
                        });
                      } else {
                        Alert.alert('Full Access Link', lockerUrl);
                      }
                    }}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      paddingVertical: 8,
                      paddingHorizontal: 16,
                      backgroundColor: '#fef2f2',
                      borderRadius: 8,
                      marginTop: 8,
                      gap: 6,
                    }}
                  >
                    <CopyIcon />
                    <Text style={{ color: '#dc2626', fontSize: 12 }}>Copy Full Access Link</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Divider */}
              <View style={{ height: 1, backgroundColor: '#e2e8f0', marginVertical: 16 }} />

              {/* View-Only Key Section */}
              <View style={{ marginBottom: 24 }}>
                <View style={{ backgroundColor: '#f0fdf4', padding: 12, borderRadius: 8, marginBottom: 12 }}>
                  <Text style={{ color: '#16a34a', fontWeight: '700', fontSize: 14, marginBottom: 4 }}>
                    VIEW-ONLY KEY (Safe to Share)
                  </Text>
                  <Text variant="caption" color="muted">
                    Share these 12 words to let others view your locker. They cannot make changes.
                  </Text>
                </View>
                <WordGrid words={viewWords} />

                {/* View-Only QR Code */}
                <View className="mt-6 items-center">
                  <View style={{ backgroundColor: '#f0fdf4', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 4, marginBottom: 8 }}>
                    <Text style={{ color: '#16a34a', fontSize: 11, fontWeight: '600' }}>VIEW-ONLY QR</Text>
                  </View>
                  <View className="bg-white p-4 rounded-xl" style={{ borderWidth: 2, borderColor: '#bbf7d0' }}>
                    <QRCode
                      value={`${baseUrl}/open?v=${encodeKey(viewWords)}`}
                      size={160}
                      backgroundColor="white"
                      color="black"
                    />
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      const lockerUrl = `${baseUrl}/open?v=${encodeKey(viewWords)}`;
                      if (Platform.OS === 'web') {
                        navigator.clipboard.writeText(lockerUrl).then(() => {
                          window.alert('View-Only link copied! Share this to let others view your locker.');
                        }).catch(() => {
                          window.prompt('Copy this link:', lockerUrl);
                        });
                      } else {
                        Alert.alert('View-Only Link', lockerUrl);
                      }
                    }}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      paddingVertical: 8,
                      paddingHorizontal: 16,
                      backgroundColor: '#f0fdf4',
                      borderRadius: 8,
                      marginTop: 8,
                      gap: 6,
                    }}
                  >
                    <CopyIcon />
                    <Text style={{ color: '#16a34a', fontSize: 12 }}>Copy View-Only Link</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </>
          ) : (
            <View className="py-12 items-center">
              <Text color="muted">Generating...</Text>
            </View>
          )}

          <View style={{ marginTop: 16, marginBottom: 24, gap: 12 }}>
            <SimpleButton
              title="Open My Locker"
              variant="primary"
              onPress={handleContinue}
            />
            <SimpleButton
              title="Back to Home"
              variant="outline"
              onPress={() => setMode('home')}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Enter screen - input existing words
  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-row items-center px-4 py-4">
        <Pressable onPress={() => setMode('home')} className="p-2 -ml-2">
          <BackIcon />
        </Pressable>
        <Text variant="subtitle" className="ml-2">Enter Seed Phrase</Text>
      </View>

      <ScrollView className="flex-1 px-6" keyboardShouldPersistTaps="handled">
        <Text color="muted" className="mb-4">
          Enter your 12-word seed phrase to unlock your locker.
        </Text>

        {/* Hidden div for QR upload scanner */}
        {Platform.OS === 'web' && <div id="qr-upload-reader" style={{ display: 'none' }} />}

        {/* Scan/Upload QR Buttons */}
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
          <TouchableOpacity
            onPress={handleScan}
            activeOpacity={0.7}
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: 12,
              paddingHorizontal: 16,
              borderRadius: 12,
              backgroundColor: '#f1f5f9',
              gap: 8,
            }}
          >
            <ScanIcon />
            <RNText style={{ color: '#0ea5e9', fontWeight: '600', fontSize: 14 }}>
              Scan QR
            </RNText>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleUploadQR}
            activeOpacity={0.7}
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: 12,
              paddingHorizontal: 16,
              borderRadius: 12,
              backgroundColor: '#f1f5f9',
              gap: 8,
            }}
          >
            <UploadIcon />
            <RNText style={{ color: '#0ea5e9', fontWeight: '600', fontSize: 14 }}>
              Upload QR
            </RNText>
          </TouchableOpacity>
        </View>

        {suggestions.length > 0 && activeWordIndex !== null && (
          <View className="flex-row flex-wrap gap-2 mb-4 p-3 bg-surface rounded-xl">
            {suggestions.map((word) => (
              <Pressable
                key={word}
                onPress={() => handleSelectSuggestion(word)}
                className="bg-primary-500/20 px-3 py-2 rounded-lg"
              >
                <Text className="text-primary-400">{word}</Text>
              </Pressable>
            ))}
          </View>
        )}

        <View className="flex-row flex-wrap">
          {enteredWords.map((word, index) => (
            <View key={index} className="w-1/3 p-1">
              <View className={`flex-row items-center bg-surface rounded-lg px-2 py-1 ${activeWordIndex === index ? 'border border-primary-500' : ''}`}>
                <Text variant="caption" color="muted" className="w-6 text-right mr-1">
                  {index + 1}.
                </Text>
                <TextInput
                  className="flex-1 text-text py-2"
                  value={word}
                  onChangeText={(text) => handleWordChange(index, text)}
                  onFocus={() => handleWordFocus(index)}
                  onBlur={() => setTimeout(() => setActiveWordIndex(null), 200)}
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholder="word"
                  placeholderTextColor="#475569"
                />
              </View>
            </View>
          ))}
        </View>

        <View className="mt-8 mb-6">
          <Button
            title="Unlock Locker"
            variant="primary"
            size="lg"
            onPress={handleUnlock}
            disabled={enteredWords.some(w => !w)}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
