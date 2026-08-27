import Redis from "ioredis";

const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");

const LOCK_TTL_SECONDS = 30;

export const acquireBlockLock = async (
  blockId: string,
  userId: string
): Promise<boolean> => {
 
  const result = await redis.set(
    `lock:block:${blockId}`,
    userId,
    "EX", LOCK_TTL_SECONDS,
    "NX"
  );
  return result === "OK"; 
};

export const releaseBlockLock = async (blockId: string, userId: string): Promise<void> => {
  const currentHolder = await redis.get(`lock:block:${blockId}`);
  if (currentHolder === userId) {
    await redis.del(`lock:block:${blockId}`);
  }
};

export const getBlockLockHolder = async (blockId: string): Promise<string | null> => {
  return redis.get(`lock:block:${blockId}`);
};