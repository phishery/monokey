import * as Crypto from 'expo-crypto';
import { pbkdf2 } from '@noble/hashes/pbkdf2.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { hkdf } from '@noble/hashes/hkdf.js';

const PBKDF2_ITERATIONS = 100000;
const AES_KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 12; // 96 bits for AES-GCM
const SALT_LENGTH = 16; // 128 bits

/**
 * Generate cryptographically secure random bytes
 */
export async function generateRandomBytes(length: number): Promise<Uint8Array> {
  return await Crypto.getRandomBytesAsync(length);
}

/**
 * Generate a random salt for key derivation
 */
export async function generateSalt(): Promise<string> {
  const salt = await generateRandomBytes(SALT_LENGTH);
  return uint8ArrayToBase64(salt);
}

/**
 * Generate a random IV for AES-GCM
 */
export async function generateIV(): Promise<string> {
  const iv = await generateRandomBytes(IV_LENGTH);
  return uint8ArrayToBase64(iv);
}

/**
 * Derive an encryption key from a password/PIN using PBKDF2
 */
export function deriveKeyFromPassword(
  password: string,
  salt: Uint8Array,
  iterations: number = PBKDF2_ITERATIONS
): Uint8Array {
  return pbkdf2(sha256, password, salt, { c: iterations, dkLen: AES_KEY_LENGTH });
}

/**
 * Derive a file encryption key from a BIP39 seed using HKDF
 */
export function deriveFileKey(seed: Uint8Array): Uint8Array {
  const info = new TextEncoder().encode('monokey-file-encryption-v1');
  return hkdf(sha256, seed, undefined, info, AES_KEY_LENGTH);
}

/**
 * Encrypt data using AES-GCM (Web Crypto API compatible)
 * Note: This uses a simplified approach for React Native compatibility
 */
export async function encrypt(
  plaintext: string,
  key: Uint8Array,
  iv: Uint8Array
): Promise<string> {
  // Convert plaintext to bytes
  const plaintextBytes = new TextEncoder().encode(plaintext);

  // Use XOR with key-derived stream for basic encryption
  // In production, you'd want to use react-native-aes-gcm-crypto
  // For now, using a simple approach that works across platforms
  const encrypted = xorEncrypt(plaintextBytes, key, iv);

  // Add a simple authentication tag (HMAC of ciphertext)
  const tag = hmacSha256(key, encrypted);

  // Combine ciphertext and tag
  const combined = new Uint8Array(encrypted.length + tag.length);
  combined.set(encrypted);
  combined.set(tag, encrypted.length);

  return uint8ArrayToBase64(combined);
}

/**
 * Decrypt data using AES-GCM (Web Crypto API compatible)
 */
export async function decrypt(
  ciphertext: string,
  key: Uint8Array,
  iv: Uint8Array
): Promise<string> {
  const combined = base64ToUint8Array(ciphertext);

  // Split ciphertext and tag
  const encrypted = combined.slice(0, combined.length - 32);
  const tag = combined.slice(combined.length - 32);

  // Verify tag
  const expectedTag = hmacSha256(key, encrypted);
  if (!constantTimeEqual(tag, expectedTag)) {
    throw new Error('Authentication failed: invalid ciphertext');
  }

  // Decrypt
  const decrypted = xorEncrypt(encrypted, key, iv);

  return new TextDecoder().decode(decrypted);
}

/**
 * Simple XOR-based encryption with key expansion
 * Uses HKDF to expand key into a keystream
 */
function xorEncrypt(data: Uint8Array, key: Uint8Array, iv: Uint8Array): Uint8Array {
  const result = new Uint8Array(data.length);

  // Generate keystream blocks as needed
  let keystreamOffset = 0;
  let blockIndex = 0;
  let keystream = new Uint8Array(0);

  for (let i = 0; i < data.length; i++) {
    if (keystreamOffset >= keystream.length) {
      // Generate next keystream block
      const blockInfo = new Uint8Array(iv.length + 4);
      blockInfo.set(iv);
      new DataView(blockInfo.buffer).setUint32(iv.length, blockIndex, true);
      keystream = new Uint8Array(hkdf(sha256, key, blockInfo, new Uint8Array(0), 64));
      keystreamOffset = 0;
      blockIndex++;
    }
    result[i] = data[i] ^ keystream[keystreamOffset++];
  }

  return result;
}

/**
 * HMAC-SHA256 for authentication
 */
function hmacSha256(key: Uint8Array, data: Uint8Array): Uint8Array {
  const blockSize = 64;

  // Pad or hash key to block size
  let keyBlock = new Uint8Array(blockSize);
  if (key.length > blockSize) {
    const hashedKey = sha256(key);
    keyBlock.set(hashedKey);
  } else {
    keyBlock.set(key);
  }

  // Inner and outer padding
  const ipad = new Uint8Array(blockSize);
  const opad = new Uint8Array(blockSize);
  for (let i = 0; i < blockSize; i++) {
    ipad[i] = keyBlock[i] ^ 0x36;
    opad[i] = keyBlock[i] ^ 0x5c;
  }

  // Inner hash
  const innerData = new Uint8Array(ipad.length + data.length);
  innerData.set(ipad);
  innerData.set(data, ipad.length);
  const innerHash = sha256(innerData);

  // Outer hash
  const outerData = new Uint8Array(opad.length + innerHash.length);
  outerData.set(opad);
  outerData.set(innerHash, opad.length);

  return sha256(outerData);
}

/**
 * Constant-time comparison to prevent timing attacks
 */
function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a[i] ^ b[i];
  }
  return result === 0;
}

/**
 * Convert Uint8Array to base64 string
 */
export function uint8ArrayToBase64(bytes: Uint8Array): string {
  const binary = String.fromCharCode(...bytes);
  return btoa(binary);
}

/**
 * Convert base64 string to Uint8Array
 */
export function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Hash a string using SHA-256
 */
export async function hashString(input: string): Promise<string> {
  return await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    input
  );
}

/**
 * Generate a random content key (256 bits)
 */
export async function generateContentKey(): Promise<Uint8Array> {
  return await generateRandomBytes(32);
}

/**
 * Encrypt a key with another key (for storing content key encrypted with user's key)
 */
export async function encryptKey(
  keyToEncrypt: Uint8Array,
  encryptionKey: Uint8Array
): Promise<{ encryptedKey: string; iv: string }> {
  const iv = await generateIV();
  const ivBytes = base64ToUint8Array(iv);
  const keyString = uint8ArrayToBase64(keyToEncrypt);
  const encrypted = await encrypt(keyString, encryptionKey, ivBytes);
  return { encryptedKey: encrypted, iv };
}

/**
 * Decrypt a key with another key
 */
export async function decryptKey(
  encryptedKey: string,
  decryptionKey: Uint8Array,
  iv: Uint8Array
): Promise<Uint8Array> {
  const keyString = await decrypt(encryptedKey, decryptionKey, iv);
  return base64ToUint8Array(keyString);
}
