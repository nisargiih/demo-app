/**
 * CONTENT FINGERPRINTING SERVICE
 *
 * Format-agnostic document verification. No AI required.
 *
 * Verification layers:
 *   1. Exact hash (SHA-256) — identical files
 *   2. Content fingerprint — full text + per-page hashes (catches any page edit)
 *   3. Perceptual hash — image of any page matches against stored per-page hashes
 */

import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import sharp from 'sharp';
import { createHash } from 'crypto';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { writeFile, readFile, mkdtemp, readdir, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import stringSimilarity from 'string-similarity';

const execFileAsync = promisify(execFile);

const CONTENT_MATCH_THRESHOLD = 0.85;
// dHash thresholds (256-bit normalized scale):
// Same image, format conversion (PNG->JPEG): ~15-25 bits
// Same image, moderate resize: ~15-25 bits
// Photo of printed page: ~30-50 bits
// Different pages of same doc: ~70+ bits
const PHASH_DISTANCE_THRESHOLD_STRICT = 25;  // PDF vs PDF (same rendering)
const PHASH_DISTANCE_THRESHOLD_LOOSE  = 65;  // image/photo vs PDF page

// ---------------------------------------------------------------------------
// Content fingerprint — full text + per-page SHA-256 chain
// ---------------------------------------------------------------------------

export async function extractContentFingerprint(
  fileBuffer: Buffer,
  mimeType: string
): Promise<string> {
  try {
    if (mimeType === 'application/pdf') {
      const data = await pdfParse(fileBuffer);
      const pageHashes = await extractPdfPageHashes(fileBuffer);
      const fullText = normalizeText(data.text);
      const pageChain = pageHashes.join('|');
      return `${fullText}::PAGES::${pageChain}`;
    }

    if (
      mimeType === 'application/msword' ||
      mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      const result = await mammoth.extractRawText({ buffer: fileBuffer });
      return normalizeText(result.value);
    }

    return '';
  } catch {
    return '';
  }
}

async function extractPdfPageHashes(pdfBuffer: Buffer): Promise<string[]> {
  const pageTexts: string[] = [];

  await pdfParse(pdfBuffer, {
    pagerender: (pageData: any) =>
      pageData.getTextContent().then((tc: any) => {
        const text = tc.items.map((i: any) => i.str).join(' ');
        pageTexts.push(normalizeText(text));
        return text;
      })
  });

  return pageTexts.map(text =>
    createHash('sha256').update(text).digest('hex').slice(0, 16)
  );
}

function normalizeText(text: string): string {
  return text.toLowerCase().replace(/\s+/g, ' ').replace(/[^\w\s]/g, '').trim();
}

// ---------------------------------------------------------------------------
// Perceptual hash
//
// For PDFs: stores ALL page hashes joined as "hash1,hash2,...,hashN"
//           so an image of any single page can match
// For images: stores a single 16-char hash
// ---------------------------------------------------------------------------

export async function computePerceptualHash(fileBuffer: Buffer, mimeType?: string): Promise<string> {
  try {
    if (mimeType === 'application/pdf') {
      const pageHashes = await computePdfPageHashes(fileBuffer);
      console.log('[pHash] PDF page hashes:', pageHashes);
      return pageHashes.join(',');
    }
    const h = await hashImageBuffer(fileBuffer);
    console.log('[pHash] image hash:', h);
    return h;
  } catch (e) {
    console.error('[pHash] error:', e);
    return '';
  }
}

async function computePdfPageHashes(pdfBuffer: Buffer): Promise<string[]> {
  const tmpDir = await mkdtemp(join(tmpdir(), 'pdf-hash-'));
  const pdfPath = join(tmpDir, 'input.pdf');

  try {
    await writeFile(pdfPath, pdfBuffer);
    await execFileAsync('pdftoppm', ['-r', '72', '-png', pdfPath, join(tmpDir, 'page')]);

    const files = (await readdir(tmpDir))
      .filter(f => f.startsWith('page') && f.endsWith('.png'))
      .sort();

    const hashes: string[] = [];
    for (const file of files) {
      const imgBuffer = await readFile(join(tmpDir, file));
      const h = await hashImageBuffer(imgBuffer);
      if (h) hashes.push(h);
    }
    return hashes;
  } catch {
    return [];
  } finally {
    await rm(tmpDir, { recursive: true, force: true });
  }
}

async function hashImageBuffer(imageBuffer: Buffer): Promise<string> {
  // Use difference hash (dHash) instead of average hash (aHash)
  // dHash compares adjacent pixels, making it robust against uniform images
  // and more stable across format conversions.
  // 16x17 input -> 16x16 horizontal differences -> 256 bits -> 64 hex chars
  const { data } = await sharp(imageBuffer)
    .resize(17, 16, { fit: 'fill' })
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pixels = Array.from(data as Uint8Array);
  const bits: number[] = [];

  // For each row, compare adjacent pixels (left < right = 1, else 0)
  for (let row = 0; row < 16; row++) {
    for (let col = 0; col < 16; col++) {
      const left  = pixels[row * 17 + col];
      const right = pixels[row * 17 + col + 1];
      bits.push(left < right ? 1 : 0);
    }
  }

  // Pack 4 bits per hex char -> 64 hex chars (256 bits)
  let hex = '';
  for (let i = 0; i < 256; i += 4) {
    const nibble = (bits[i] << 3) | (bits[i + 1] << 2) | (bits[i + 2] << 1) | bits[i + 3];
    hex += nibble.toString(16);
  }
  return hex;
}

export function pHashDistance(a: string, b: string): number {
  if (!a || !b) return 256;
  // Handle legacy 16-char (8x8 aHash) vs current 64-char (16x16 dHash)
  // Normalize both to same length by truncating the longer one
  const len = Math.min(a.length, b.length);
  if (len === 0) return 256;
  const maxBits = len * 4;
  let dist = 0;
  for (let i = 0; i < len; i++) {
    const xor = parseInt(a[i], 16) ^ parseInt(b[i], 16);
    dist += xor.toString(2).split('').filter(c => c === '1').length;
  }
  // Normalize to 256-bit scale so thresholds stay consistent
  return Math.round(dist * 256 / maxBits);
}

// ---------------------------------------------------------------------------
// Comparison
// ---------------------------------------------------------------------------

export type MatchType = 'exact' | 'content' | 'visual' | 'none';
export interface FingerprintMatchResult { matchType: MatchType; confidence: number; }

export function compareFingerprints(
  candidate: { contentFingerprint?: string; pHash?: string },
  stored: { contentFingerprint?: string; pHash?: string }
): FingerprintMatchResult {

  // --- Layer 2: content fingerprint ---
  if (candidate.contentFingerprint && stored.contentFingerprint) {
    const candidateText  = candidate.contentFingerprint.split('::PAGES::')[0];
    const storedText     = stored.contentFingerprint.split('::PAGES::')[0];
    const candidatePages = candidate.contentFingerprint.split('::PAGES::')[1] ?? '';
    const storedPages    = stored.contentFingerprint.split('::PAGES::')[1] ?? '';

    // Only enforce page-chain equality when BOTH sides have a chain
    // (PDF vs PDF). If candidate is a DOC/image it won't have a chain.
    if (candidatePages && storedPages && candidatePages !== storedPages) {
      // Page chain mismatch — document was modified, skip to pHash
    } else {
      const similarity = stringSimilarity.compareTwoStrings(candidateText, storedText);
      if (similarity >= CONTENT_MATCH_THRESHOLD) {
        return { matchType: 'content', confidence: similarity };
      }
    }
  }

  // --- Layer 3: perceptual hash ---
  if (candidate.pHash && stored.pHash) {
    const candidateHashes = candidate.pHash.split(',').filter(Boolean);
    const storedHashes    = stored.pHash.split(',').filter(Boolean);

    // Both PDFs — all pages must match (strict: same rendering pipeline)
    if (candidateHashes.length > 1 && storedHashes.length > 1) {
      if (candidateHashes.length !== storedHashes.length) {
        return { matchType: 'none', confidence: 0 };
      }
      const totalDist = candidateHashes.reduce((sum, h, i) =>
        sum + pHashDistance(h, storedHashes[i]), 0);
      const avgDist = totalDist / candidateHashes.length;
      if (avgDist <= PHASH_DISTANCE_THRESHOLD_STRICT) {
        return { matchType: 'visual', confidence: 1 - avgDist / 256 };
      }
    }

    // Single image vs stored PDF pages — match any page (loose: photo/screenshot)
    if (candidateHashes.length === 1) {
      let bestDist = 256;
      for (const storedPageHash of storedHashes) {
        const d = pHashDistance(candidateHashes[0], storedPageHash);
        console.log(`[compareFingerprints] image(${candidateHashes[0]}) vs page(${storedPageHash}) = dist ${d}`);
        if (d < bestDist) bestDist = d;
      }
      console.log(`[compareFingerprints] best dist for image vs PDF pages: ${bestDist} (threshold: ${PHASH_DISTANCE_THRESHOLD_LOOSE})`);
      if (bestDist <= PHASH_DISTANCE_THRESHOLD_LOOSE) {
        return { matchType: 'visual', confidence: 1 - bestDist / 256 };
      }
    }

    // Stored is single image, candidate is PDF — match any candidate page
    if (storedHashes.length === 1) {
      let bestDist = 256;
      for (const candidatePageHash of candidateHashes) {
        const d = pHashDistance(candidatePageHash, storedHashes[0]);
        if (d < bestDist) bestDist = d;
      }
      if (bestDist <= PHASH_DISTANCE_THRESHOLD_LOOSE) {
        return { matchType: 'visual', confidence: 1 - bestDist / 256 };
      }
    }
  }

  return { matchType: 'none', confidence: 0 };
}

export const SUPPORTED_MIME_TYPES: Record<string, string> = {
  'application/pdf':   'application/pdf',
  'application/msword': 'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/png':   'image/png',
  'image/jpeg':  'image/jpeg',
  'image/jpg':   'image/jpeg',
  'image/webp':  'image/webp',
  'image/gif':   'image/gif',
  'image/tiff':  'image/tiff',
};
