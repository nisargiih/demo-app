import crypto from 'crypto';
import stringSimilarity from 'string-similarity';
import clientPromise from './mongodb';
import { ObjectId } from 'mongodb';

export enum MatchType {
  EXACT_HASH_MATCH = 'EXACT_HASH_MATCH',
  CONTENT_MATCH = 'CONTENT_MATCH',
  PARTIAL_CONTENT_MATCH = 'PARTIAL_CONTENT_MATCH',
  LOW_CONFIDENCE_MATCH = 'LOW_CONFIDENCE_MATCH',
  NO_MATCH = 'NO_MATCH',
  PROCESSING_FAILED = 'PROCESSING_FAILED',
  MANUAL_REVIEW_REQUIRED = 'MANUAL_REVIEW_REQUIRED'
}

export interface VerificationResult {
  verified: boolean;
  matchType: MatchType;
  hashMatched: boolean;
  contentChecked: boolean;
  similarityScore: number;
  bestMatchingPage?: number;
  confidence: number;
  manualReviewRequired?: boolean;
  fieldMatch?: Record<string, boolean>;
  missingFields?: string[];
  changedText?: string;
  id?: string;
}

export class DocumentService {
  static generateHash(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  static async extractText(buffer: Buffer, mimeType: string): Promise<{ text: string; pages: any[] }> {
    if (mimeType !== 'application/pdf') {
      return { text: '', pages: [] };
    }

    try {
      let pdfParse: any;
      if (typeof window === 'undefined') {
        const imported = require('pdf-parse');
        // Handle various export styles (CJS, ESM interop, nested defaults)
        if (typeof imported === 'function') {
          pdfParse = imported;
        } else if (imported && typeof imported.default === 'function') {
          pdfParse = imported.default;
        } else if (imported && imported.default && typeof imported.default.default === 'function') {
          pdfParse = imported.default.default;
        }
      }

      if (typeof pdfParse !== 'function') {
        throw new Error('PDF parsing engine not initialized correctly');
      }

      const data = await pdfParse(buffer);
      const text = data.text || '';
      
      return {
        text: text,
        pages: text.split('\f').map((t: string, i: number) => ({ pageNumber: i + 1, text: t.trim() }))
      };
    } catch (e) {
      console.error('Local PDF Extraction failed:', e);
      return { text: '', pages: [] };
    }
  }

  static compareText(refText: string, uploadText: string): number {
    if (!refText || !uploadText) return 0;
    
    const normalize = (t: string) => t.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
      
    const score = stringSimilarity.compareTwoStrings(normalize(refText), normalize(uploadText));
    return Math.round(score * 100);
  }

  static async verifyDocument(referenceDocId: string, uploadedFile: { buffer: Buffer; mimeType: string; name: string }): Promise<VerificationResult> {
    const client = await clientPromise;
    const db = client.db('tech-core');
    
    const refDoc = await db.collection('documents').findOne({ _id: new ObjectId(referenceDocId) });
    if (!refDoc) throw new Error('Reference document not found');

    const uploadedHash = this.generateHash(uploadedFile.buffer);
    if (uploadedHash === refDoc.hash) {
      return {
        verified: true,
        matchType: MatchType.EXACT_HASH_MATCH,
        hashMatched: true,
        contentChecked: false,
        confidence: 100,
        similarityScore: 100
      };
    }

    let refTextRecord = await db.collection('document_text').findOne({ documentId: refDoc._id });
    if (!refTextRecord) {
      throw new Error('Reference document content not Indexed for deep matching.');
    }

    const { text: uploadedText } = await this.extractText(uploadedFile.buffer, uploadedFile.mimeType);

    if (!uploadedText || uploadedText.length < 5) {
      return {
        verified: false,
        matchType: MatchType.PROCESSING_FAILED,
        hashMatched: false,
        contentChecked: true,
        confidence: 0,
        similarityScore: 0
      };
    }

    const refText = refTextRecord.cleanText || refTextRecord.rawText || '';
    const similarityScore = this.compareText(refText, uploadedText);

    let matchType = MatchType.NO_MATCH;
    let verified = false;
    let manualReviewRequired = false;

    if (similarityScore >= 90) {
      matchType = MatchType.CONTENT_MATCH;
      verified = true;
    } else if (similarityScore >= 70) {
      matchType = MatchType.PARTIAL_CONTENT_MATCH;
      verified = false;
      manualReviewRequired = true;
    } else if (similarityScore >= 40) {
      matchType = MatchType.LOW_CONFIDENCE_MATCH;
      verified = false;
      manualReviewRequired = true;
    }

    const result: VerificationResult = {
      verified,
      matchType,
      hashMatched: false,
      contentChecked: true,
      similarityScore,
      confidence: similarityScore,
      manualReviewRequired
    };

    await this.saveVerificationResult(referenceDocId, null, result);
    return result;
  }

  private static async saveVerificationResult(refId: string, upId: string | null, result: VerificationResult) {
    const client = await clientPromise;
    const db = client.db('tech-core');
    await db.collection('verification_results').insertOne({
      referenceDocumentId: refId,
      uploadedDocumentId: upId,
      ...result,
      createdAt: new Date()
    });
  }

  static async storeReferenceDocument(file: { buffer: Buffer; mimeType: string; name: string }, metadata: any) {
    const client = await clientPromise;
    const db = client.db('tech-core');
    
    const hash = this.generateHash(file.buffer);
    
    let text = '';
    let pages: any[] = [];
    try {
      const extracted = await this.extractText(file.buffer, file.mimeType);
      text = extracted.text;
      pages = extracted.pages;
    } catch (e) {
      console.warn('Text extraction failed during storage, continuing with hash:', e);
    }

    const docResult = await db.collection('documents').insertOne({
      fileName: file.name,
      fileType: file.mimeType,
      hash,
      ocrStatus: text ? 'completed' : 'none',
      verificationStatus: 'verified',
      ...metadata,
      createdAt: new Date()
    });

    if (text) {
      await db.collection('document_text').insertOne({
        documentId: docResult.insertedId,
        rawText: text,
        cleanText: text.toLowerCase().replace(/\s+/g, ' ').trim(),
        pages: pages.map(p => ({ ...p, confidence: 100 })),
        extractionMethod: 'local_parser',
        createdAt: new Date()
      });
    }

    return docResult.insertedId;
  }
}
