import CryptoJS from 'crypto-js';

// This key should NEVER be prefixed with NEXT_PUBLIC_ as it is for server-side only.
const DB_KEY = process.env.DATABASE_ENCRYPTION_KEY || 'default_db_storage_key_backend_only';

/**
 * Encrypts data for storage in the database.
 * Uses TripleDES as a different algorithm from the transit layer (AES).
 * This should only be used in server components or API routes.
 */
export const encryptStorage = (data: any): string => {
  const jsonString = typeof data === 'string' ? data : JSON.stringify(data);
  // Using TripleDES for a different algorithm as requested
  return CryptoJS.TripleDES.encrypt(jsonString, DB_KEY).toString();
};

/**
 * Decrypts data retrieved from the database.
 */
export const decryptStorage = (ciphertext: string): any => {
  try {
    const bytes = CryptoJS.TripleDES.decrypt(ciphertext, DB_KEY);
    const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
    try {
      return JSON.parse(decryptedData);
    } catch {
      return decryptedData;
    }
  } catch (error) {
    console.error('Storage Decryption Error:', error);
    return null;
  }
};
