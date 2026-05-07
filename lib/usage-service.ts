import clientPromise from './mongodb';

export type UsageType = 'hash' | 'verify' | 'registry';

export const LIMITS = {
  hash: 10,
  verify: 15,
  registry: 5
};

export class UsageService {
  static async resolveUsageId(email: string): Promise<string> {
    const cleanEmail = email.toLowerCase().trim();
    const client = await clientPromise;
    const db = client.db('tech-core');
    const users = db.collection('users');
    
    const user = await users.findOne({ email: cleanEmail });
    if (!user) return cleanEmail; // Fallback to email if user not found (shouldn't happen for active users)
    
    if (user.invitedBy) {
      // If invitedBy is an email (legacy), try to find that user's ID
      if (user.invitedBy.includes('@')) {
        const parent = await users.findOne({ email: user.invitedBy.toLowerCase().trim() });
        return parent ? parent._id.toString() : user.invitedBy;
      }
      return user.invitedBy; // Already an ID
    }
    return user._id.toString();
  }

  static async getMonthlyUsage(email: string) {
    const parentId = await this.resolveUsageId(email);
    const client = await clientPromise;
    const db = client.db('tech-core');
    const usage = db.collection('monthly_usage');
    
    const now = new Date();
    const month = now.getMonth(); // 0-11
    const year = now.getFullYear();

    let record = await usage.findOne({ userId: parentId, month, year });
    
    if (!record) {
      const newRecord = {
        userId: parentId,
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
    const parentId = await this.resolveUsageId(email);
    const client = await clientPromise;
    const db = client.db('tech-core');
    const usage = db.collection('monthly_usage');
    
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();

    const field = type === 'hash' ? 'hashCount' : type === 'verify' ? 'verifyCount' : 'registryCount';

    await usage.updateOne(
      { userId: parentId, month, year },
      { 
        $inc: { [field]: 1 },
        $set: { updatedAt: now }
      },
      { upsert: true }
    );
  }
}
