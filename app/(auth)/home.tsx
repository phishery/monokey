import { useState, useRef } from 'react';
import { View, ScrollView, TextInput, TouchableOpacity, Pressable, Alert, Platform, Text as RNText } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import QRCode from 'react-native-qrcode-svg';
import { Text } from '../../src/components/ui/Text';
import { Button } from '../../src/components/ui/Button';
import { Card } from '../../src/components/ui/Card';
import { WordGrid } from '../../src/components/key/WordGrid';
import { generateMnemonic, validateMnemonic, getWordList } from '../../src/services/bip39';

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

const KeyIcon = () => (
  <Svg width={80} height={80} viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" strokeWidth={1.5}>
    <Path d="m21 2-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4" />
  </Svg>
);

const BackIcon = () => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="#f8fafc" strokeWidth={2}>
    <Path d="m15 18-6-6 6-6" />
  </Svg>
);

type Mode = 'home' | 'create' | 'enter';

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
          <KeyIcon />
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
                  Or save this QR code to quickly access your locker
                </Text>
                <View className="bg-white p-4 rounded-xl">
                  <QRCode
                    value={generatedWords.join(' ')}
                    size={200}
                    backgroundColor="white"
                    color="black"
                  />
                </View>
                <TouchableOpacity
                  onPress={() => {
                    if (Platform.OS === 'web') {
                      // For web, create a downloadable SVG/PNG
                      const svg = document.querySelector('.qr-container svg');
                      if (svg) {
                        const svgData = new XMLSerializer().serializeToString(svg);
                        const canvas = document.createElement('canvas');
                        const ctx = canvas.getContext('2d');
                        const img = new Image();
                        img.onload = () => {
                          canvas.width = img.width;
                          canvas.height = img.height;
                          ctx?.drawImage(img, 0, 0);
                          const pngUrl = canvas.toDataURL('image/png');
                          const link = document.createElement('a');
                          link.download = 'monokey-qr.png';
                          link.href = pngUrl;
                          link.click();
                        };
                        img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
                      } else {
                        window.alert('Right-click on the QR code and select "Save Image As" to download');
                      }
                    } else {
                      Alert.alert('Save QR', 'Long press on the QR code to save it to your photos');
                    }
                  }}
                  style={{
                    marginTop: 12,
                    paddingVertical: 8,
                    paddingHorizontal: 16,
                  }}
                >
                  <Text color="primary" variant="caption">Save QR Code</Text>
                </TouchableOpacity>
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
