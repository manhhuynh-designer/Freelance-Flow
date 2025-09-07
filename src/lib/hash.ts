import crypto from 'crypto';

// Derive a stable, non-reversible user bucket id
export function userBucketId(userId: string): string {
  return crypto.createHash('sha256').update(userId).digest('hex').slice(0, 16);
}

export function shortId(): string {
  return crypto.randomBytes(6).toString('base64url');
}
