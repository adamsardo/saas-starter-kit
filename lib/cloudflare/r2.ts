import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import env from '@/lib/env';

// R2 is S3-compatible, so we can use the AWS SDK
// Configure the S3 client to use Cloudflare R2
const r2Client = new S3Client({
  region: 'auto',
  endpoint: env.cloudflare.r2.endpoint,
  credentials: {
    accessKeyId: env.cloudflare.r2.accessKeyId,
    secretAccessKey: env.cloudflare.r2.secretAccessKey,
  },
});

export interface UploadOptions {
  contentType?: string;
  metadata?: Record<string, string>;
  customMetadata?: Record<string, string>;
}

/**
 * Upload a file to R2
 */
export async function uploadToR2(
  key: string,
  body: Buffer | Uint8Array | string | ReadableStream,
  options: UploadOptions = {}
) {
  const command = new PutObjectCommand({
    Bucket: env.cloudflare.r2.bucketName,
    Key: key,
    Body: body,
    ContentType: options.contentType,
    // R2 supports custom metadata - merge both metadata objects
    Metadata: {
      ...options.metadata,
      ...options.customMetadata,
    },
  });

  try {
    const response = await r2Client.send(command);
    return {
      success: true,
      etag: response.ETag,
      versionId: response.VersionId,
      // Use the public URL if configured, otherwise use the worker URL
      url: env.cloudflare.r2.publicUrl 
        ? `${env.cloudflare.r2.publicUrl}/${key}`
        : `${env.cloudflare.r2.workerUrl}/files/${key}`,
    };
  } catch (error) {
    console.error('R2 upload error:', error);
    throw new Error(`Failed to upload to R2: ${error}`);
  }
}

/**
 * Get a presigned URL for secure file access
 * Note: R2 supports presigned URLs just like S3
 */
export async function getPresignedUrl(
  key: string,
  expiresIn: number = 3600 // 1 hour default
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: env.cloudflare.r2.bucketName,
    Key: key,
  });

  try {
    const url = await getSignedUrl(r2Client, command, { expiresIn });
    return url;
  } catch (error) {
    console.error('Error generating presigned URL:', error);
    throw new Error(`Failed to generate presigned URL: ${error}`);
  }
}

/**
 * Delete a file from R2
 */
export async function deleteFromR2(key: string) {
  const command = new DeleteObjectCommand({
    Bucket: env.cloudflare.r2.bucketName,
    Key: key,
  });

  try {
    await r2Client.send(command);
    return { success: true };
  } catch (error) {
    console.error('R2 delete error:', error);
    throw new Error(`Failed to delete from R2: ${error}`);
  }
}

/**
 * Generate R2 key for session recordings
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
 * Upload session recording to R2
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

  const result = await uploadToR2(key, audioBuffer, {
    contentType: mimeType,
    metadata: {
      teamId,
      sessionId,
      uploadedAt: new Date().toISOString(),
    },
    customMetadata: {
      retention: '7years',
      type: 'session-recording',
    },
  });

  return {
    ...result,
    key,
    filename,
  };
}

/**
 * Stream upload for large files
 * R2 supports multipart uploads for files > 5MB
 */
export async function streamUploadToR2(
  key: string,
  stream: ReadableStream,
  contentType: string = 'application/octet-stream'
) {
  // For Workers, we can directly pass the stream
  return uploadToR2(key, stream, { contentType });
} 