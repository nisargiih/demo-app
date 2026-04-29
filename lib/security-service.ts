import { encryptTransit, decryptTransit } from './encryption';
import { encryptStorage, decryptStorage } from './db-encryption';

/**
 * SECURITY SERVICE
 * 
 * Provides unified functions for the multi-layer encryption architecture.
 * 1. Transit Layer: Client <-> Server (AES-256)
 * 2. Storage Layer: Server <-> Database (TripleDES)
 */

export const SecurityService = {
  /**
   * Used by FRONTEND to prepare data for sending to backend.
   */
  prepareForTransit: (data: any) => {
    return {
      payload: encryptTransit(data)
    };
  },

  /**
   * Used by BACKEND to process incoming transit data.
   */
  processFromTransit: (body: any) => {
    if (body && body.payload) {
      return decryptTransit(body.payload);
    }
    return body; // Fallback if not encrypted
  },

  /**
   * Used by BACKEND to prepare data for database storage.
   */
  prepareForStorage: (data: any) => {
    return encryptStorage(data);
  },

  /**
   * Used by BACKEND to process data coming from database.
   */
  processFromStorage: (ciphertext: string) => {
    return decryptStorage(ciphertext);
  }
};
