import * as bip39 from 'bip39';

export type WordCount = 12 | 24;

export interface GeneratedMnemonic {
  mnemonic: string;
  words: string[];
  wordCount: WordCount;
}

export interface DualMnemonic {
  viewMnemonic: string;
  viewWords: string[];
  writeMnemonic: string;
  writeWords: string[];
}

/**
 * Generate cryptographically secure random bytes (works on web and native)
 */
function getRandomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  if (typeof globalThis !== 'undefined' && globalThis.crypto) {
    globalThis.crypto.getRandomValues(bytes);
  } else if (typeof window !== 'undefined' && window.crypto) {
    window.crypto.getRandomValues(bytes);
  } else if (typeof crypto !== 'undefined') {
    crypto.getRandomValues(bytes);
  } else {
    throw new Error('No secure random source available');
  }
  return bytes;
}

/**
 * Convert Uint8Array to hex string
 */
function toHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate a new BIP39 mnemonic phrase (12 words)
 */
export function generateMnemonic(): GeneratedMnemonic {
  console.log('generateMnemonic called');
  try {
    // First try using bip39's built-in generator
    console.log('Trying bip39.generateMnemonic(128)...');
    const mnemonic = bip39.generateMnemonic(128);
    console.log('Generated mnemonic:', mnemonic);
    const words = mnemonic.split(' ');
    return {
      mnemonic,
      words,
      wordCount: 12,
    };
  } catch (e) {
    console.log('bip39.generateMnemonic failed, using fallback:', e);
    // Fallback: generate with custom entropy as hex string
    const entropy = getRandomBytes(16); // 128 bits for 12 words
    console.log('Generated entropy:', toHex(entropy));
    const entropyHex = toHex(entropy);
    const mnemonic = bip39.entropyToMnemonic(entropyHex);
    console.log('Fallback mnemonic:', mnemonic);
    const words = mnemonic.split(' ');
    return {
      mnemonic,
      words,
      wordCount: 12,
    };
  }
}

/**
 * Generate dual mnemonics for view/write access
 */
export function generateDualMnemonic(): DualMnemonic {
  const view = generateMnemonic();
  const write = generateMnemonic();
  return {
    viewMnemonic: view.mnemonic,
    viewWords: view.words,
    writeMnemonic: write.mnemonic,
    writeWords: write.words,
  };
}

/**
 * Validate a mnemonic phrase
 */
export function validateMnemonic(mnemonic: string): boolean {
  return bip39.validateMnemonic(mnemonic);
}

/**
 * Derive a seed from mnemonic (with optional passphrase)
 * This follows BIP39 standard seed derivation
 */
export async function mnemonicToSeed(
  mnemonic: string,
  passphrase: string = ''
): Promise<Uint8Array> {
  // BIP39 uses PBKDF2 with "mnemonic" + passphrase as salt
  const seed = await bip39.mnemonicToSeed(mnemonic, passphrase);
  return new Uint8Array(seed);
}

/**
 * Convert mnemonic words array to string
 */
export function wordsToMnemonic(words: string[]): string {
  return words.join(' ');
}

/**
 * Convert mnemonic string to words array
 */
export function mnemonicToWords(mnemonic: string): string[] {
  return mnemonic.trim().split(/\s+/);
}

/**
 * Get the BIP39 word list (English)
 */
export function getWordList(): string[] {
  return bip39.wordlists.english;
}

/**
 * Check if a word is in the BIP39 word list
 */
export function isValidWord(word: string): boolean {
  return bip39.wordlists.english.includes(word.toLowerCase());
}
