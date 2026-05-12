import crypto from 'crypto';
import pdf from 'pdf-parse';
import stringSimilarity from 'string-similarity';
import { GoogleGenAI, Type } from "@google/genai";
import clientPromise from './mongodb';
import { ObjectId } from 'mongodb';

export enum MatchType {
  EXACT_HASH_MATCH = 'EXACT_HASH_MATCH',
  CONTENT_MATCH = 'CONTENT_MATCH',
  PARTIAL_CONTENT_MATCH = 'PARTIAL_CONTENT_MATCH',
  LOW_CONFIDENCE_MATCH = 'LOW_CONFIDENCE_MATCH',
  NO_MATCH = 'NO_MATCH',
  OCR_FAILED = 'OCR_FAILED',
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
  private static ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY || '' });

  static generateHash(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  static async extractText(buffer: Buffer, mimeType: string): Promise<{ text: string; pages: any[] }> {
    if (mimeType === 'application/pdf') {
      try {
        const data = await pdf(buffer);
        // If extracted text is very short, it might be a scanned PDF
        if (data.text.trim().length > 50) {
          return {
            text: data.text,
            pages: data.text.split('\f').map((t, i) => ({ pageNumber: i + 1, text: t.trim() }))
          };
        }
      } catch (e) {
        console.error('PDF Parse failed, falling back to OCR', e);
      }
    }

    // Fallback to Gemini for Image/Scanned PDF OCR
    return await this.extractTextWithGemini(buffer, mimeType);
  }

  private static async extractTextWithGemini(buffer: Buffer, mimeType: string): Promise<{ text: string; pages: any[] }> {
    try {
      const base64Data = buffer.toString('base64');
      const response = await this.ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            parts: [
              {
                inlineData: {
                  data: base64Data,
                  mimeType: mimeType
                }
              },
              {
                text: "Extract all text from this document accurately. For multi-page documents, represent each page's content clearly. Return as JSON with a 'rawText' field and a 'pages' array of objects with 'pageNumber' and 'text'."
              }
            ]
          }
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              rawText: { type: Type.STRING },
              pages: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    pageNumber: { type: Type.INTEGER },
                    text: { type: Type.STRING }
                  },
                  required: ["pageNumber", "text"]
                }
              }
            },
            required: ["rawText", "pages"]
          }
        }
      });

      const result = JSON.parse(response.text);
      return {
        text: result.rawText,
        pages: result.pages
      };
    } catch (error) {
      console.error('Gemini OCR failed:', error);
      throw new Error('OCR extraction failed');
    }
  }

  static compareText(refText: string, uploadText: string): number {
    // Normalize text
    const normalize = (t: string) => t.toLowerCase().replace(/\s+/g, ' ').trim();
    const score = stringSimilarity.compareTwoStrings(normalize(refText), normalize(uploadText));
    return Math.round(score * 100);
  }

  static async extractFields(text: string): Promise<Record<string, any>> {
    try {
      const response = await this.ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            text: `Extract key document fields from the following text: "${text}". 
            Fields to look for: Document number, Name, Date, Amount, Invoice number, Certificate number, Customer ID, Address, Total value, Issue date, Expiry date.
            Return as JSON object with field names as keys.`
          }
        ],
        config: {
          responseMimeType: "application/json"
        }
      });
      return JSON.parse(response.text);
    } catch (e) {
      return {};
    }
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

    // 3. OCR Fallback
    // Check if we already have reference text
    let refTextRecord = await db.collection('document_text').findOne({ documentId: refDoc._id });
    if (!refTextRecord) {
      // We might need the original file to extract text if it wasn't done at upload time
      // For now, let's assume if it's missing, we fail or try to get it if we had storage (we don't stored the file content in DB usually)
      // BUT the requirement says: "The system should continue using hash verification as the first step. If the hash does not match, the system should extract document content and compare the text."
      // So we need to have the reference text stored.
      throw new Error('Reference document content not Indexed. Please re-index reference document.');
    }

    const { text: uploadedText, pages: uploadedPages } = await this.extractText(uploadedFile.buffer, uploadedFile.mimeType);

    if (!uploadedText || uploadedText.length < 20) {
      return {
        verified: false,
        matchType: MatchType.OCR_FAILED,
        hashMatched: false,
        contentChecked: true,
        confidence: 0,
        similarityScore: 0
      };
    }

    const similarityScore = this.compareText(refTextRecord.cleanText || refTextRecord.rawText, uploadedText);

    let matchType = MatchType.NO_MATCH;
    let verified = false;
    let manualReviewRequired = false;

    if (similarityScore >= 85) {
      matchType = MatchType.CONTENT_MATCH;
      verified = true;
    } else if (similarityScore >= 65) {
      matchType = MatchType.PARTIAL_CONTENT_MATCH;
      verified = false;
      manualReviewRequired = true;
    } else if (similarityScore >= 40) {
      matchType = MatchType.LOW_CONFIDENCE_MATCH;
      verified = false;
      manualReviewRequired = true;
    }

    // Field-level matching if score is decent
    let fieldMatch: Record<string, boolean> = {};
    let missingFields: string[] = [];
    if (similarityScore >= 40) {
      const refFields = refDoc.extractedFields || {};
      const uploadedFields = await this.extractFields(uploadedText);
      
      for (const key of Object.keys(refFields)) {
        if (uploadedFields[key]) {
          // Basic comparison - in real world you'd want fuzzy or normalized comparison
          fieldMatch[key] = String(refFields[key]).toLowerCase() === String(uploadedFields[key]).toLowerCase();
        } else {
          missingFields.push(key);
        }
      }
    }

    const result: VerificationResult = {
      verified,
      matchType,
      hashMatched: false,
      contentChecked: true,
      similarityScore,
      confidence: similarityScore,
      manualReviewRequired,
      fieldMatch,
      missingFields
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
    const fields = await this.extractFields(text);

    const docResult = await db.collection('documents').insertOne({
      fileName: file.name,
      fileType: file.mimeType,
      hash,
      ocrStatus: 'completed',
      verificationStatus: 'verified',
      extractedFields: fields,
      ...metadata,
      createdAt: new Date()
    });

    await db.collection('document_text').insertOne({
      documentId: docResult.insertedId,
      rawText: text,
      cleanText: text.toLowerCase().replace(/\s+/g, ' ').trim(),
      pages: pages.map(p => ({ ...p, confidence: 100 })),
      extractionMethod: file.mimeType === 'application/pdf' ? 'pdf_text' : 'ocr',
      createdAt: new Date()
    });

    return docResult.insertedId;
  }
}
