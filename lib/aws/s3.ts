import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import env from '@/lib/env';

// Initialize S3 client
const s3Client = new S3Client({
  region: env.aws.region,
  credentials: {
    accessKeyId: env.aws.accessKeyId,
    secretAccessKey: env.aws.secretAccessKey,
  },
});

export interface UploadOptions {
  contentType?: string;
  metadata?: Record<string, string>;
  tagging?: string;
}

/**
 * Upload a file to S3
 */
export async function uploadToS3(
  key: string,
  body: Buffer | Uint8Array | string,
  options: UploadOptions = {}
) {
  const command = new PutObjectCommand({
    Bucket: env.aws.s3.bucketName,
    Key: key,
    Body: body,
    ContentType: options.contentType,
    Metadata: options.metadata,
    Tagging: options.tagging,
    ServerSideEncryption: 'AES256', // Enable server-side encryption
  });

  try {
    const response = await s3Client.send(command);
    return {
      success: true,
      etag: response.ETag,
      versionId: response.VersionId,
      url: `https://${env.aws.s3.bucketName}.s3.${env.aws.region}.amazonaws.com/${key}`,
    };
  } catch (error) {
    console.error('S3 upload error:', error);
    throw new Error(`Failed to upload to S3: ${error}`);
  }
}

/**
 * Get a presigned URL for secure file access
 */
export async function getPresignedUrl(
  key: string,
  expiresIn: number = 3600 // 1 hour default
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: env.aws.s3.bucketName,
    Key: key,
  });

  try {
    const url = await getSignedUrl(s3Client, command, { expiresIn });
    return url;
  } catch (error) {
    console.error('Error generating presigned URL:', error);
    throw new Error(`Failed to generate presigned URL: ${error}`);
  }
}

/**
 * Delete a file from S3
 */
export async function deleteFromS3(key: string) {
  const command = new DeleteObjectCommand({
    Bucket: env.aws.s3.bucketName,
    Key: key,
  });

  try {
    await s3Client.send(command);
    return { success: true };
  } catch (error) {
    console.error('S3 delete error:', error);
    throw new Error(`Failed to delete from S3: ${error}`);
  }
}

/**
 * Generate S3 key for session recordings
 */
export function generateSessionRecordingKey(
  teamId: string,
  sessionId: string,
  filename: string
): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  
  // Organize by team/year/month for better management
  return `sessions/${teamId}/${year}/${month}/${sessionId}/${filename}`;
}

/**
 * Upload session recording to S3
 */
export async function uploadSessionRecording(
  teamId: string,
  sessionId: string,
  audioBuffer: Buffer,
  mimeType: string = 'audio/webm'
) {
  const timestamp = Date.now();
  const extension = mimeType.split('/')[1] || 'webm';
  const filename = `recording-${timestamp}.${extension}`;
  const key = generateSessionRecordingKey(teamId, sessionId, filename);

  const result = await uploadToS3(key, audioBuffer, {
    contentType: mimeType,
    metadata: {
      teamId,
      sessionId,
      uploadedAt: new Date().toISOString(),
    },
    tagging: 'Type=SessionRecording&Retention=7years',
  });

  return {
    ...result,
    key,
    filename,
  };
} 