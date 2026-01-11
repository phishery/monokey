// Polyfills for web compatibility
import { Buffer } from 'buffer';

// Make Buffer available globally for libraries that need it (like bip39)
if (typeof global !== 'undefined') {
  (global as any).Buffer = Buffer;
}
if (typeof window !== 'undefined') {
  (window as any).Buffer = Buffer;
}
if (typeof globalThis !== 'undefined') {
  (globalThis as any).Buffer = Buffer;
}
