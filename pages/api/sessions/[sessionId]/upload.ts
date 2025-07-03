import type { NextApiRequest, NextApiResponse } from 'next';
import { getCurrentUserWithTeam } from '@/lib/clerk-session';
import { hasSessionAccess } from '@/models/therapySession';
import { prisma } from '@/lib/prisma';
import { ApiError } from '@/lib/errors';
import formidable from 'formidable';
import fs from 'fs/promises';
import path from 'path';
import { uploadSessionRecording, getPresignedUrl } from '@/lib/cloudflare/r2';
import { queueSessionForProcessing } from '@/lib/cloudflare/queues';

// Disable Next.js body parsing for file uploads
export const config = {
  api: {
    bodyParser: false,
  },
};

// Configure upload directory (in production, use S3 or similar)
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads', 'sessions');

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { sessionId } = req.query;

  if (!sessionId || typeof sessionId !== 'string') {
    return res.status(400).json({ error: 'Session ID is required' });
  }

  try {
    // Check authentication
    const user = await getCurrentUserWithTeam(req, res);
    if (!user) {
      throw new ApiError(401, 'Unauthorized');
    }

    // Check session access
    const hasAccess = await hasSessionAccess(user.id, sessionId, user.team.id);
    if (!hasAccess) {
      throw new ApiError(403, 'Access denied');
    }

    // Ensure upload directory exists
    await fs.mkdir(UPLOAD_DIR, { recursive: true });

    // Parse form data
    const form = formidable({
      uploadDir: UPLOAD_DIR,
      keepExtensions: true,
      maxFileSize: 500 * 1024 * 1024, // 500MB max
      filter: ({ mimetype }) => {
        // Only allow audio files
        return mimetype?.startsWith('audio/') || false;
      },
    });

    const [fields, files] = await form.parse(req);
    
    const audioFile = Array.isArray(files.audio) ? files.audio[0] : files.audio;
    if (!audioFile) {
      throw new ApiError(400, 'No audio file provided');
    }

    // Get file info
    const fileStats = await fs.stat(audioFile.filepath);
    const duration = parseInt(fields.duration?.[0] || '0', 10);

    // Read file buffer
    const audioBuffer = await fs.readFile(audioFile.filepath);

    // Upload to S3
    const uploadResult = await uploadSessionRecording(
      user.team.id,
      sessionId,
      audioBuffer,
      audioFile.mimetype || 'audio/webm'
    );

    // Clean up temp file
    await fs.unlink(audioFile.filepath).catch(console.error);

    // Get presigned URL for secure access
    const presignedUrl = await getPresignedUrl(uploadResult.key, 86400); // 24 hours

    // Save audio recording info to database
    const audioRecording = await prisma.audioRecording.upsert({
      where: { sessionId },
      create: {
        sessionId,
        fileUrl: uploadResult.url,
        fileSize: BigInt(fileStats.size),
        duration: Math.ceil(duration / 1000), // Convert to seconds
        mimeType: audioFile.mimetype || 'audio/webm',
        metadata: {
          originalFilename: audioFile.originalFilename,
          uploadedAt: new Date().toISOString(),
          uploadedBy: user.id,
          s3Key: uploadResult.key,
          s3Bucket: user.team.id,
        },
      },
      update: {
        fileUrl: uploadResult.url,
        fileSize: BigInt(fileStats.size),
        duration: Math.ceil(duration / 1000),
        mimeType: audioFile.mimetype || 'audio/webm',
        metadata: {
          originalFilename: audioFile.originalFilename,
          uploadedAt: new Date().toISOString(),
          uploadedBy: user.id,
          s3Key: uploadResult.key,
          s3Bucket: user.team.id,
        },
      },
    });

    // Update session status if needed
    await prisma.therapySession.update({
      where: { id: sessionId },
      data: {
        status: 'COMPLETED',
        endedAt: new Date(),
      },
    });

    // Queue for batch processing using SQS
    try {
      await queueSessionForProcessing(
        sessionId,
        user.team.id,
        presignedUrl // Use presigned URL for secure access
      );
      console.log(`Session ${sessionId} queued for batch processing`);
    } catch (error) {
      console.error('Failed to queue batch processing:', error);
      // Don't fail the upload if queueing fails
    }

    res.status(200).json({
      message: 'Audio uploaded successfully',
      audioRecording: {
        id: audioRecording.id,
        fileUrl: audioRecording.fileUrl,
        fileSize: audioRecording.fileSize.toString(),
        duration: audioRecording.duration,
        mimeType: audioRecording.mimeType,
      },
    });

  } catch (error: any) {
    console.error('Upload error:', error);
    const status = error.status || 500;
    const message = error.message || 'Failed to upload audio';
    res.status(status).json({ error: message });
  }
}

// In production, you would use a cloud storage service like AWS S3
// This is a simplified local storage implementation for development
export async function getAudioFile(sessionId: string, filename: string): Promise<Buffer | null> {
  try {
    const filePath = path.join(UPLOAD_DIR, filename);
    return await fs.readFile(filePath);
  } catch (error) {
    console.error('Failed to read audio file:', error);
    return null;
  }
} 