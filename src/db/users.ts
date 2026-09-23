import { db } from './index.ts';
import { users } from './schema.ts';
import { eq } from 'drizzle-orm';

export async function getOrCreateUser(uid: string, email: string, fullName?: string, avatarUrl?: string) {
  try {
    const existing = await db.select().from(users).where(eq(users.uid, uid)).limit(1);
    if (existing.length > 0) {
      return existing[0];
    }

    const result = await db.insert(users)
      .values({
        id: uid,
        uid,
        email,
        fullName: fullName || email.split('@')[0],
        avatarUrl: avatarUrl || '',
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email,
          fullName: fullName || email.split('@')[0],
          avatarUrl: avatarUrl || '',
        },
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error('Error in getOrCreateUser:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function getUsers() {
  try {
    return await db.select().from(users);
  } catch (error) {
    console.error('Database query failed:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}
