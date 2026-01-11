import { useEffect, useRef } from 'react';
import { View, Platform } from 'react-native';

interface WebQRScannerProps {
  onScan: (data: string) => void;
  onError?: (error: string) => void;
}

export function WebQRScanner({ onScan, onError }: WebQRScannerProps) {
  const scannerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (Platform.OS !== 'web') return;

    let html5QrCode: any = null;

    const initScanner = async () => {
      try {
        // Dynamically import html5-qrcode only on web
        const { Html5Qrcode } = await import('html5-qrcode');

        html5QrCode = new Html5Qrcode('qr-reader');
        scannerRef.current = html5QrCode;

        await html5QrCode.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
          },
          (decodedText: string) => {
            // Stop scanning after successful read
            html5QrCode.stop().then(() => {
              onScan(decodedText);
            }).catch(console.error);
          },
          () => {
            // Ignore scan failures (no QR found in frame)
          }
        );
      } catch (err) {
        console.error('Failed to start scanner:', err);
        onError?.('Failed to start camera. Please ensure camera permissions are granted.');
      }
    };

    // Small delay to ensure DOM is ready
    const timeout = setTimeout(initScanner, 100);

    return () => {
      clearTimeout(timeout);
      if (html5QrCode) {
        html5QrCode.stop().catch(() => {});
      }
    };
  }, [onScan, onError]);

  if (Platform.OS !== 'web') {
    return null;
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <div
        id="qr-reader"
        style={{
          width: '100%',
          height: '100%',
        }}
      />
    </View>
  );
}
