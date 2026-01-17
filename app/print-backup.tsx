import { useEffect } from 'react';
import { View, Platform, Image, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Text } from '../src/components/ui/Text';
import Svg, { Path } from 'react-native-svg';

const MonokeyLogo = require('../assets/monokey.png');

const BackIcon = () => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="#0f172a" strokeWidth={2}>
    <Path d="m15 18-6-6 6-6" />
  </Svg>
);

export default function PrintBackupScreen() {
  const router = useRouter();

  const handlePrint = () => {
    if (Platform.OS === 'web') {
      window.print();
    }
  };

  // Word box component for the printable grid
  const WordBox = ({ number }: { number: number }) => (
    <View style={{
      width: '30%',
      marginBottom: 8,
      flexDirection: 'row',
      alignItems: 'center',
    }}>
      <View style={{
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#f1f5f9',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 4,
      }}>
        <Text style={{ fontSize: 10, color: '#64748b', fontWeight: '600' }}>{number}</Text>
      </View>
      <View style={{
        flex: 1,
        height: 28,
        borderBottomWidth: 1,
        borderBottomColor: '#cbd5e1',
      }} />
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }}>
      {/* Screen header - hidden when printing */}
      <View
        className="print-hidden"
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderBottomWidth: 1,
          borderBottomColor: '#e2e8f0',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Pressable onPress={() => router.back()} style={{ padding: 8, marginLeft: -8 }}>
            <BackIcon />
          </Pressable>
          <Text variant="subtitle" style={{ marginLeft: 8 }}>Backup Sheet</Text>
        </View>
        <Pressable
          onPress={handlePrint}
          style={{
            backgroundColor: '#0ea5e9',
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 8,
          }}
        >
          <Text style={{ color: 'white', fontWeight: '600' }}>Print</Text>
        </Pressable>
      </View>

      {/* Printable content */}
      <View style={{ flex: 1, padding: 24, maxWidth: 600, alignSelf: 'center', width: '100%' }}>
        {/* Header with logo */}
        <View style={{ alignItems: 'center', marginBottom: 24 }}>
          <Image
            source={MonokeyLogo}
            style={{ width: 80, height: 80 }}
            resizeMode="contain"
          />
          <Text style={{ fontSize: 24, fontWeight: '700', marginTop: 8, color: '#0f172a' }}>
            Monokey
          </Text>
          <Text style={{ fontSize: 14, color: '#64748b', marginTop: 4 }}>
            Secure Key Backup Sheet
          </Text>
        </View>

        {/* Instructions */}
        <View style={{
          backgroundColor: '#fef3c7',
          padding: 12,
          borderRadius: 8,
          marginBottom: 24,
          borderWidth: 1,
          borderColor: '#fcd34d',
        }}>
          <Text style={{ fontSize: 12, color: '#92400e', textAlign: 'center', fontWeight: '600' }}>
            Write your words clearly. Store this paper in a secure location.
            {'\n'}Anyone with these words can access your locker.
          </Text>
        </View>

        {/* Full Access Key Section */}
        <View style={{ marginBottom: 32 }}>
          <View style={{
            backgroundColor: '#fef2f2',
            padding: 10,
            borderRadius: 8,
            marginBottom: 12,
            borderWidth: 1,
            borderColor: '#fecaca',
          }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#dc2626', textAlign: 'center' }}>
              FULL ACCESS KEY (Keep Private!)
            </Text>
            <Text style={{ fontSize: 10, color: '#64748b', textAlign: 'center', marginTop: 2 }}>
              This key allows reading AND editing your locker
            </Text>
          </View>

          <View style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            paddingHorizontal: 8,
          }}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((num) => (
              <WordBox key={`write-${num}`} number={num} />
            ))}
          </View>
        </View>

        {/* Divider */}
        <View style={{
          height: 1,
          backgroundColor: '#e2e8f0',
          marginVertical: 8,
        }} />

        {/* View-Only Key Section */}
        <View style={{ marginTop: 16 }}>
          <View style={{
            backgroundColor: '#f0fdf4',
            padding: 10,
            borderRadius: 8,
            marginBottom: 12,
            borderWidth: 1,
            borderColor: '#bbf7d0',
          }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#16a34a', textAlign: 'center' }}>
              VIEW-ONLY KEY (Safe to Share)
            </Text>
            <Text style={{ fontSize: 10, color: '#64748b', textAlign: 'center', marginTop: 2 }}>
              This key allows viewing only - cannot edit your locker
            </Text>
          </View>

          <View style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            paddingHorizontal: 8,
          }}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((num) => (
              <WordBox key={`view-${num}`} number={num} />
            ))}
          </View>
        </View>

        {/* Footer */}
        <View style={{ marginTop: 32, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#e2e8f0' }}>
          <Text style={{ fontSize: 10, color: '#94a3b8', textAlign: 'center' }}>
            Date Created: _______________
          </Text>
          <Text style={{ fontSize: 10, color: '#94a3b8', textAlign: 'center', marginTop: 8 }}>
            monokey.onrender.com
          </Text>
        </View>
      </View>

      {/* Print styles for web */}
      {Platform.OS === 'web' && (
        <style dangerouslySetInnerHTML={{
          __html: `
            @media print {
              .print-hidden {
                display: none !important;
              }
              body {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
            }
          `
        }} />
      )}
    </SafeAreaView>
  );
}
