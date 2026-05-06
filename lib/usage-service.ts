import clientPromise from './mongodb';

export type UsageType = 'hash' | 'verify';

export const LIMITS = {
  hash: 10,
  verify: 15
};

export class UsageService {
  static async getMonthlyUsage(email: string) {
    const client = await clientPromise;
    const db = client.db('tech-core');
    const usage = db.collection('monthly_usage');
    
    const now = new Date();
    const month = now.getMonth(); // 0-11
    const year = now.getFullYear();

    let record = await usage.findOne({ email: email.toLowerCase().trim(), month, year });
    
    if (!record) {
      const newRecord = {
        email: email.toLowerCase().trim(),
        month,
        year,
        hashCount: 0,
        verifyCount: 0,
        createdAt: now,
        updatedAt: now
      };
      await usage.insertOne(newRecord);
      return newRecord;
    }

    return record;
  }

  static async canUseFree(email: string, type: UsageType): Promise<boolean> {
    const usage = await this.getMonthlyUsage(email);
    const count = type === 'hash' ? (usage.hashCount || 0) : (usage.verifyCount || 0);
    return count < LIMITS[type];
  }

  static async incrementUsage(email: string, type: UsageType) {
    const client = await clientPromise;
    const db = client.db('tech-core');
    const usage = db.collection('monthly_usage');
    
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();

    const field = type === 'hash' ? 'hashCount' : 'verifyCount';

    await usage.updateOne(
      { email: email.toLowerCase().trim(), month, year },
      { 
        $inc: { [field]: 1 },
        $set: { updatedAt: now }
      },
      { upsert: true }
    );
  }
}
