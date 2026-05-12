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
    if (mimeType === 'application/pdf') {
      try {
        let pdfParseLocal: any;
        if (typeof window === 'undefined') {
          pdfParseLocal = require('pdf-parse');
        }
        
        if (!pdfParseLocal) throw new Error('PDF Engine not available in this environment');
        
        const data = await pdfParseLocal(buffer);
        const text = data.text || '';
        
        return {
          text: text,
          pages: text.split('\f').map((t: string, i: number) => ({ pageNumber: i + 1, text: t.trim() }))
        };
      } catch (e) {
        console.error('PDF Text Extraction failed:', e);
        throw new Error('Could not parse PDF content locally');
      }
    }

    // For other formats, return empty text for now as local OCR requires complex native dependencies
    return { text: '', pages: [] };
  }

  static compareText(refText: string, uploadText: string): number {
    if (!refText || !uploadText) return 0;
    // Normalize text: lowercase, remove extra whitespace, remove non-alphanumeric for cleaner comparison
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
    
    // 1. Fetch Reference Document
    const refDoc = await db.collection('documents').findOne({ _id: new ObjectId(referenceDocId) });
    if (!refDoc) throw new Error('Reference document not found');

    // 2. Hash Comparison
    const uploadedHash = this.generateHash(uploadedFile.buffer);
    if (uploadedHash === refDoc.hash) {
      const result: VerificationResult = {
        verified: true,
        matchType: MatchType.EXACT_HASH_MATCH,
        hashMatched: true,
        contentChecked: false,
        confidence: 100,
        similarityScore: 100
      };
      await this.saveVerificationResult(referenceDocId, null, result);
      return result;
    }

    // 3. Local Text Comparison Fallback
    let refTextRecord = await db.collection('document_text').findOne({ documentId: refDoc._id });
    if (!refTextRecord) {
      throw new Error('Reference document content not Indexed for deep matching.');
    }

    const { text: uploadedText } = await this.extractText(uploadedFile.buffer, uploadedFile.mimeType);

    if (!uploadedText || uploadedText.length < 10) {
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
    const { text, pages } = await this.extractText(file.buffer, file.mimeType);

    const docResult = await db.collection('documents').insertOne({
      fileName: file.name,
      fileType: file.mimeType,
      hash,
      ocrStatus: text ? 'completed' : 'not_supported',
      verificationStatus: 'verified',
      ...metadata,
      createdAt: new Date()
    });

    await db.collection('document_text').insertOne({
      documentId: docResult.insertedId,
      rawText: text,
      cleanText: text.toLowerCase().replace(/\s+/g, ' ').trim(),
      pages: pages.map(p => ({ ...p, confidence: 100 })),
      extractionMethod: 'local_parser',
      createdAt: new Date()
    });

    return docResult.insertedId;
  }
}
