import clientPromise from './mongodb';

export type UsageType = 'hash' | 'verify' | 'registry';

export const LIMITS = {
  hash: 10,
  verify: 15,
  registry: 5
};

export class UsageService {
  static async resolveUsageEmail(email: string): Promise<string> {
    const cleanEmail = email.toLowerCase().trim();
    const client = await clientPromise;
    const db = client.db('tech-core');
    const users = db.collection('users');
    
    const user = await users.findOne({ email: cleanEmail });
    if (user && user.invitedBy) {
      return user.invitedBy.toLowerCase().trim();
    }
    return cleanEmail;
  }

  static async getMonthlyUsage(email: string) {
    const parentEmail = await this.resolveUsageEmail(email);
    const client = await clientPromise;
    const db = client.db('tech-core');
    const usage = db.collection('monthly_usage');
    
    const now = new Date();
    const month = now.getMonth(); // 0-11
    const year = now.getFullYear();

    let record = await usage.findOne({ email: parentEmail, month, year });
    
    if (!record) {
      const newRecord = {
        email: parentEmail,
        month,
        year,
        hashCount: 0,
        verifyCount: 0,
        registryCount: 0,
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
    const count = type === 'hash' ? (usage.hashCount || 0) : type === 'verify' ? (usage.verifyCount || 0) : (usage.registryCount || 0);
    return count < LIMITS[type];
  }

  static async incrementUsage(email: string, type: UsageType) {
    const parentEmail = await this.resolveUsageEmail(email);
    const client = await clientPromise;
    const db = client.db('tech-core');
    const usage = db.collection('monthly_usage');
    
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();

    const field = type === 'hash' ? 'hashCount' : type === 'verify' ? 'verifyCount' : 'registryCount';

    await usage.updateOne(
      { email: parentEmail, month, year },
      { 
        $inc: { [field]: 1 },
        $set: { updatedAt: now }
      },
      { upsert: true }
    );
  }
}
