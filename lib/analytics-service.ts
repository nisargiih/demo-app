import clientPromise from './mongodb';
import { ObjectId } from 'mongodb';

export type VerificationSource = 'public' | 'share_hub';
export type VerificationStatus = 'authentic' | 'unindexed' | 'mismatch';
export type VerificationType = 'file' | 'registry';

export class AnalyticsService {
  static async logVerification(data: {
    source: VerificationSource;
    registrarEmail: string | null;
    status: VerificationStatus;
    type: VerificationType;
    hash?: string;
    registryId?: string;
  }) {
    const client = await clientPromise;
    const db = client.db('tech-core');
    const verifications = db.collection('verifications');

    await verifications.insertOne({
      ...data,
      timestamp: new Date(),
    });
  }

  static async getVerificationStats(registrarEmail: string) {
    const client = await clientPromise;
    const db = client.db('tech-core');
    const verifications = db.collection('verifications');
    const hashes = db.collection('hashes');

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // 1. Weekly verification volume (last 7 days grouped by day)
    const weeklyVolume = await verifications.aggregate([
      {
        $match: {
          registrarEmail: registrarEmail.toLowerCase(),
          timestamp: { $gte: sevenDaysAgo }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]).toArray();

    // 2. Source distribution
    const sourceStats = await verifications.aggregate([
      {
        $match: { registrarEmail: registrarEmail.toLowerCase() }
      },
      {
        $group: {
          _id: "$source",
          count: { $sum: 1 }
        }
      }
    ]).toArray();

    // 3. Document indexing history (hashes)
    const indexingHistory = await hashes.aggregate([
      {
        $match: {
          userEmail: registrarEmail.toLowerCase(),
          createdAt: { $gte: sevenDaysAgo }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]).toArray();

    return {
      weeklyVolume,
      sourceStats,
      indexingHistory
    };
  }
}
