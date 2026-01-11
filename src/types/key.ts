export interface MonokeyKey {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  wordCount: 12 | 24;
  hasPassphrase: boolean;
  encryptedMnemonic: string;
  encryptedFile: string | null;
  iv: string;
  salt: string;
  syncStatus: 'synced' | 'pending' | 'conflict' | 'local-only';
  lastSyncedAt: string | null;
}

export type KeySummary = Pick<MonokeyKey, 'id' | 'name' | 'createdAt' | 'wordCount' | 'hasPassphrase' | 'syncStatus'>;
