import clientPromise from './mongodb';

export type UsageType = 'hash' | 'verify' | 'registry';

export class UsageService {
  static async resolveUser(email: string) {
    const cleanEmail = email.toLowerCase().trim();
    const client = await clientPromise;
    const db = client.db('tech-core');
    const users = db.collection('users');
    return await users.findOne({ email: cleanEmail });
  }

  static async getSystemLimits() {
    const client = await clientPromise;
    const db = client.db('tech-core');
    const config = await db.collection('system_config').findOne({ type: 'usage_limits' });
    return config || { hash: 0, verify: 0, registry: 0 };
  }

  static async resolveUsageId(email: string): Promise<string> {
    const user = await this.resolveUser(email);
    if (!user) return email.toLowerCase().trim();
    
    if (user.invitedBy) {
      if (user.invitedBy.includes('@')) {
        const client = await clientPromise;
        const db = client.db('tech-core');
        const users = db.collection('users');
        const parent = await users.findOne({ email: user.invitedBy.toLowerCase().trim() });
        return parent ? parent._id.toString() : user.invitedBy;
      }
      return user.invitedBy;
    }
    return user._id.toString();
  }

  static async getUserLimits(email: string) {
    const user = await this.resolveUser(email);
    if (!user) return { hash: 0, verify: 0, registry: 0 };

    // Limits can be directly on user object for easy management
    if (user.limits) return user.limits;

    // Fallback to system-wide defaults from database
    return await this.getSystemLimits();
  }

  static async getMonthlyUsage(email: string) {
    const parentId = await this.resolveUsageId(email);
    const client = await clientPromise;
    const db = client.db('tech-core');
    const usage = db.collection('monthly_usage');
    
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();

    const limits = await this.getUserLimits(email);
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
      return { ...newRecord, limits };
    }

    return { ...record, limits };
  }

  static async canUseFree(email: string, type: UsageType): Promise<boolean> {
    const usage = await this.getMonthlyUsage(email);
    const count = type === 'hash' ? (usage.hashCount || 0) : type === 'verify' ? (usage.verifyCount || 0) : (usage.registryCount || 0);
    const limits = usage.limits;
    return count < (limits[type] || 0);
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
