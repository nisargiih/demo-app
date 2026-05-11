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
    const systemConfig = db.collection('system_config');
    let config = await systemConfig.findOne({ type: 'usage_limits' });
    
    // Hardcoded absolute defaults as requested by user
    const absoluteDefaults = { hash: 5, verify: 15, registry: 5 };

    // If config is missing, has zeros, or has the old '10' default for hashes, force update to 5
    if (!config || config.hash === 0 || config.hash === 10 || config.verify === 0) {
      const defaultConfig = {
        type: 'usage_limits',
        hash: 5,
        verify: 15,
        registry: 5,
        updatedAt: new Date()
      };
      
      if (!config) {
        await systemConfig.insertOne(defaultConfig);
      } else {
        await systemConfig.updateOne({ type: 'usage_limits' }, { $set: defaultConfig });
      }
      return { hash: 5, verify: 15, registry: 5 };
    }

    return {
      hash: config.hash || absoluteDefaults.hash,
      verify: config.verify || absoluteDefaults.verify,
      registry: config.registry || absoluteDefaults.registry
    };
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
    const systemLimits = await this.getSystemLimits();
    
    if (!user) return systemLimits;

    // Use user-specific overrides if they exist and are non-zero. 
    // We also force a heal if any limit is 0 or matches the old 10-limit default.
    const userLimits = user.limits || {};
    const needsHeal = !user.limits || userLimits.hash === 0 || userLimits.hash === 10 || userLimits.verify === 0;

    if (needsHeal) {
      // Self-heal: Update user record with system defaults
      const client = await clientPromise;
      const db = client.db('tech-core');
      await db.collection('users').updateOne(
        { _id: user._id },
        { $set: { limits: systemLimits } }
      );
      return systemLimits;
    }

    return {
      hash: userLimits.hash || systemLimits.hash,
      verify: userLimits.verify || systemLimits.verify,
      registry: userLimits.registry || systemLimits.registry
    };
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
