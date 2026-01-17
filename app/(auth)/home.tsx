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
import { generateMnemonic, validateMnemonic, getWordList } from '../../src/services/bip39';

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
  const [generatedWords, setGeneratedWords] = useState<string[]>([]);
  const [enteredWords, setEnteredWords] = useState<string[]>(Array(12).fill(''));
  const [activeWordIndex, setActiveWordIndex] = useState<number | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [scanned, setScanned] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  const handleScan = () => {
    setScanned(false);
    setMode('scan');
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

          // Parse the result
          let mnemonic = '';
          if (result.includes('/open?key=')) {
            const match = result.match(/[?&]key=([^&]+)/);
            if (match) {
              mnemonic = match[1].replace(/-/g, ' ');
            }
          } else {
            mnemonic = result.trim();
          }

          if (validateMnemonic(mnemonic)) {
            router.push({ pathname: '/(auth)/locker', params: { mnemonic } });
          } else {
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

    let mnemonic = '';

    // Check if it's a URL with key param
    if (data.includes('/open?key=')) {
      const match = data.match(/[?&]key=([^&]+)/);
      if (match) {
        mnemonic = match[1].replace(/-/g, ' ');
      }
    } else {
      // Assume it's a plain mnemonic
      mnemonic = data.trim();
    }

    if (validateMnemonic(mnemonic)) {
      // Valid - go directly to locker
      router.push({ pathname: '/(auth)/locker', params: { mnemonic } });
    } else {
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
      console.log('Calling generateMnemonic...');
      const result = generateMnemonic();
      console.log('Generated:', result);
      if (result && result.words && result.words.length === 12) {
        setGeneratedWords(result.words);
        setMode('create');
      } else {
        console.error('Invalid result:', result);
        if (Platform.OS === 'web') {
          window.alert('Failed to generate seed phrase - invalid result');
        } else {
          Alert.alert('Error', 'Failed to generate seed phrase');
        }
      }
    } catch (error) {
      console.error('Failed to generate:', error);
      if (Platform.OS === 'web') {
        window.alert('Failed to generate seed phrase: ' + String(error));
      } else {
        Alert.alert('Error', 'Failed to generate seed phrase: ' + String(error));
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
    const mnemonic = generatedWords.join(' ');
    router.push({ pathname: '/(auth)/locker', params: { mnemonic } });
  };

  // Home screen
  if (mode === 'home') {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 items-center justify-center px-6">
          <Image source={MonokeyLogo} style={{ width: 200, height: 200 }} resizeMode="contain" />
          <Text variant="title" className="mt-6 text-center">
            Monokey
          </Text>
          <Text color="muted" className="mt-2 text-center mb-12">
            Secure your content with a 12-word seed phrase
          </Text>

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
        </View>
      </SafeAreaView>
    );
  }

  // Scan screen - QR code scanner (populates words on enter screen)
  if (mode === 'scan') {
    const handleWebScan = (data: string) => {
      let mnemonic = '';

      // Check if it's a URL with key param
      if (data.includes('/open?key=')) {
        const match = data.match(/[?&]key=([^&]+)/);
        if (match) {
          mnemonic = match[1].replace(/-/g, ' ');
        }
      } else {
        // Assume it's a plain mnemonic
        mnemonic = data.trim();
      }

      if (validateMnemonic(mnemonic)) {
        // Valid - go directly to locker
        router.push({ pathname: '/(auth)/locker', params: { mnemonic } });
      } else {
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

  // Create screen - show generated words
  if (mode === 'create') {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-row items-center px-4 py-4">
          <Pressable onPress={() => setMode('home')} className="p-2 -ml-2">
            <BackIcon />
          </Pressable>
          <Text variant="subtitle" className="ml-2">Your Seed Phrase</Text>
        </View>

        <ScrollView className="flex-1 px-6">
          <Card className="bg-error/10 mb-6">
            <Text color="error" variant="caption">
              Write these 12 words down and store them safely. Anyone with these words can access your locker.
            </Text>
          </Card>

          {generatedWords.length > 0 ? (
            <>
              <WordGrid words={generatedWords} />

              {/* QR Code Section */}
              <View className="mt-8 items-center">
                <Text variant="caption" color="muted" className="mb-4 text-center">
                  Save this QR code - scan it to instantly open your locker
                </Text>
                <View id="qr-container" className="bg-white p-4 rounded-xl">
                  <QRCode
                    value={`${Platform.OS === 'web' ? window.location.origin : 'https://monokey.onrender.com'}/open?key=${generatedWords.join('-')}`}
                    size={200}
                    backgroundColor="white"
                    color="black"
                  />
                </View>
                <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
                  <TouchableOpacity
                    onPress={() => {
                      if (Platform.OS === 'web') {
                        // Find the SVG inside qr-container
                        const container = document.getElementById('qr-container');
                        const svg = container?.querySelector('svg');
                        if (svg) {
                          const svgData = new XMLSerializer().serializeToString(svg);
                          const canvas = document.createElement('canvas');
                          canvas.width = 200;
                          canvas.height = 200;
                          const ctx = canvas.getContext('2d');
                          const img = new Image();
                          img.onload = () => {
                            ctx?.drawImage(img, 0, 0, 200, 200);
                            const pngUrl = canvas.toDataURL('image/png');
                            const link = document.createElement('a');
                            link.download = 'monokey-qr.png';
                            link.href = pngUrl;
                            link.click();
                          };
                          img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
                        } else {
                          window.alert('Could not find QR code. Try right-clicking and saving the image.');
                        }
                      } else {
                        Alert.alert('Save QR', 'Take a screenshot to save the QR code');
                      }
                    }}
                    style={{
                      paddingVertical: 8,
                      paddingHorizontal: 16,
                      backgroundColor: '#f1f5f9',
                      borderRadius: 8,
                    }}
                  >
                    <Text color="primary" variant="caption">Download QR</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => {
                      const lockerUrl = `${Platform.OS === 'web' ? window.location.origin : 'https://monokey.onrender.com'}/open?key=${generatedWords.join('-')}`;
                      if (Platform.OS === 'web') {
                        navigator.clipboard.writeText(lockerUrl).then(() => {
                          window.alert('Link copied! Share this with anyone to give them access to your locker.');
                        }).catch(() => {
                          window.prompt('Copy this link:', lockerUrl);
                        });
                      } else {
                        Alert.alert('Copy Link', lockerUrl);
                      }
                    }}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingVertical: 8,
                      paddingHorizontal: 16,
                      backgroundColor: '#f1f5f9',
                      borderRadius: 8,
                      gap: 6,
                    }}
                  >
                    <CopyIcon />
                    <Text color="primary" variant="caption">Copy Link</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </>
          ) : (
            <View className="py-12 items-center">
              <Text color="muted">Generating...</Text>
            </View>
          )}

          <View style={{ marginTop: 32, marginBottom: 24, gap: 12 }}>
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
