import { config } from '../config.js';
import type { ImportStore } from './repository.js';
import { memoryStore } from './memory-store.js';
import { createSupabaseStore } from './supabase-store.js';

let storeInstance: ImportStore | null = null;

export function getImportStore(): ImportStore {
  if (storeInstance) return storeInstance;

  if (config.nodeEnv === 'production' && config.storageDriver !== 'supabase') {
    throw new Error('In production, STORAGE_DRIVER must be set to supabase');
  }

  if (config.storageDriver === 'supabase') {
    storeInstance = createSupabaseStore();
    return storeInstance;
  }

  storeInstance = memoryStore;
  return storeInstance;
}

export function resetImportStoreForTests() {
  storeInstance = null;
}
