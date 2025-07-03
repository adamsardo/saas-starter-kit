import crypto from 'crypto';

// Use environment variable for encryption key or generate one
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
const IV_LENGTH = 16; // For AES, this is always 16
const ALGORITHM = 'aes-256-cbc';

// Ensure key is 32 bytes
const getKey = () => {
  const key = Buffer.from(ENCRYPTION_KEY, 'hex');
  if (key.length !== 32) {
    // If key is not 32 bytes, hash it to get consistent 32 bytes
    return crypto.createHash('sha256').update(ENCRYPTION_KEY).digest();
  }
  return key;
};

export function encrypt(text: string): string {
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
    
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    
    return iv.toString('hex') + ':' + encrypted.toString('hex');
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

export function decrypt(text: string): string {
  try {
    const textParts = text.split(':');
    const iv = Buffer.from(textParts.shift()!, 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    
    const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
    
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    
    return decrypted.toString();
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
}

// Hash sensitive data for comparison (e.g., SSN for duplicate checking)
export function hashData(data: string): string {
  return crypto
    .createHash('sha256')
    .update(data + (process.env.HASH_SALT || 'default-salt'))
    .digest('hex');
}

// Generate secure random tokens
export function generateSecureToken(length = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

// Mask sensitive data for display (e.g., SSN: ***-**-1234)
export function maskSensitiveData(data: string, visibleChars = 4): string {
  if (data.length <= visibleChars) return data;
  
  const masked = '*'.repeat(data.length - visibleChars);
  const visible = data.slice(-visibleChars);
  
  return masked + visible;
}

// Encrypt file data
export async function encryptFile(buffer: Buffer): Promise<{ encrypted: Buffer; iv: string }> {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  
  const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
  
  return {
    encrypted,
    iv: iv.toString('hex'),
  };
}

// Decrypt file data
export async function decryptFile(encrypted: Buffer, iv: string): Promise<Buffer> {
  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), Buffer.from(iv, 'hex'));
  
  return Buffer.concat([decipher.update(encrypted), decipher.final()]);
} 