import CryptoJS from 'crypto-js';

const TRANSPORT_KEY = process.env.NEXT_PUBLIC_TRANSPORT_ENCRYPTION_KEY || 'default_transport_key';

/**
 * Encrypts data for transit between frontend and backend.
 * This should be used on the frontend before sending data, 
 * or on the backend before sending data back to the frontend.
 */
export const encryptTransit = (data: any): string => {
  const jsonString = typeof data === 'string' ? data : JSON.stringify(data);
  return CryptoJS.AES.encrypt(jsonString, TRANSPORT_KEY).toString();
};

/**
 * Decrypts data that was encrypted for transit.
 */
export const decryptTransit = (ciphertext: string): any => {
  try {
    const bytes = CryptoJS.AES.decrypt(ciphertext, TRANSPORT_KEY);
    const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
    try {
      return JSON.parse(decryptedData);
    } catch {
      return decryptedData;
    }
  } catch (error) {
    console.error('Transit Decryption Error:', error);
    return null;
  }
};
