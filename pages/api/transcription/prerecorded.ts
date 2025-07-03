import type { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from '@/lib/session';
import { throwIfNoTeamAccess } from '../../../models/team';
import { 
  deepgram, 
  getTranscriptionConfig, 
  isDeepgramAvailable, 
  parseDeepgramResponse,
  detectCrisisIndicators,
  extractMedications,
  calculateSessionMetrics
} from '@/lib/deepgram';
import env from '@/lib/env';
import { prisma } from '@/lib/prisma';
import { hasPermission } from '@/lib/permissions';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check authentication
    const session = await getSession(req, res);
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get team access
    const teamMember = await throwIfNoTeamAccess(req, res);
    const teamId = teamMember.team.id;
    const userId = session.user.id;

    // Check if user has permission to transcribe
    if (!hasPermission(teamMember.role, 'transcription', 'create')) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    // Check if Deepgram is available
    if (!isDeepgramAvailable()) {
      return res.status(503).json({ error: 'Transcription service is not available' });
    }

    const { sessionId, audioUrl, customKeywords, fileName } = req.body;

    if (!sessionId || !audioUrl) {
      return res.status(400).json({ error: 'Session ID and audio URL are required' });
    }

    // Verify session exists and user has access
    const therapySession = await prisma.therapySession.findFirst({
      where: {
        id: sessionId,
        teamId,
        OR: [
          { therapistId: userId }, // Session therapist
          // Allow supervisors to transcribe any session in their team
          teamMember.role === 'SUPERVISOR' ? { teamId } : {},
          teamMember.role === 'CLINICAL_ADMIN' ? { teamId } : {},
        ],
      },
      include: {
        patient: true,
        therapist: true,
      },
    });

    if (!therapySession) {
      return res.status(404).json({ error: 'Session not found or access denied' });
    }

    // Check patient consent
    if (!therapySession.patient.consentForRecording) {
      return res.status(403).json({ 
        error: 'Patient has not consented to recording',
        code: 'NO_RECORDING_CONSENT'
      });
    }

    // Create transcription job record
    const transcriptionJob = await prisma.transcriptionJob.create({
      data: {
        sessionId,
        teamId,
        audioFileUrl: audioUrl,
        audioFileName: fileName || 'session_recording.wav',
        fileSizeBytes: 0, // Will be updated after processing
        model: env.deepgram.model,
        language: env.deepgram.language,
        customKeywords: customKeywords || [],
        status: 'PROCESSING',
        startedAt: new Date(),
      },
    });

    try {
      // Get transcription configuration
      const config = getTranscriptionConfig('prerecorded', customKeywords);

      // Perform transcription
      const response = await deepgram!.listen.prerecorded.transcribeUrl(
        {
          url: audioUrl,
        },
        config
      );

      // Parse the response
      const transcriptionResult = parseDeepgramResponse(response);
      
      // Calculate session metrics
      const metrics = calculateSessionMetrics(transcriptionResult);
      
      // Detect potential crisis indicators
      const crisisIndicators = detectCrisisIndicators(transcriptionResult.transcript);
      
      // Extract medications mentioned
      const medications = extractMedications(transcriptionResult.transcript);

      // Update transcription job with results
      await prisma.transcriptionJob.update({
        where: { id: transcriptionJob.id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          transcriptText: transcriptionResult.transcript,
          confidence: transcriptionResult.confidence,
          speakerCount: transcriptionResult.speakers?.length || 0,
          speakerLabels: transcriptionResult.speakers ? JSON.parse(JSON.stringify(transcriptionResult.speakers)) : null,
          durationSeconds: Math.round(metrics.duration * 60),
        },
      });

      // Update therapy session with transcription
      await prisma.therapySession.update({
        where: { id: sessionId },
        data: {
          transcriptionText: transcriptionResult.transcript,
          hasRecording: true,
          // Update risk level if crisis indicators detected
          riskLevel: crisisIndicators.length > 0 ? 'HIGH' : therapySession.riskLevel,
          crisisFlags: crisisIndicators,
        },
      });

      // Create risk assessment if crisis indicators detected
      if (crisisIndicators.length > 0) {
        await prisma.riskAssessment.create({
          data: {
            patientId: therapySession.patientId,
            therapistId: therapySession.therapistId,
            teamId,
            sessionId,
            overallRisk: 'HIGH',
            suicidalIdeation: crisisIndicators.some(c => c.includes('suicid')) ? 'HIGH' : 'LOW',
            selfHarm: crisisIndicators.some(c => c.includes('harm') || c.includes('cut')) ? 'HIGH' : 'LOW',
            homicidalIdeation: crisisIndicators.some(c => c.includes('homicid') || c.includes('kill someone')) ? 'HIGH' : 'LOW',
            substanceUse: crisisIndicators.some(c => c.includes('substance') || c.includes('overdose')) ? 'HIGH' : 'LOW',
            riskFactors: crisisIndicators,
            requiresImmediate: true,
          },
        });
      }

      // Return comprehensive results
      res.status(200).json({
        success: true,
        transcriptionJobId: transcriptionJob.id,
        transcript: transcriptionResult.transcript,
        confidence: transcriptionResult.confidence,
        duration: metrics.duration,
        speakers: transcriptionResult.speakers?.map(speaker => ({
          speaker: speaker.speaker,
          transcript: speaker.transcript,
          confidence: speaker.confidence,
          duration: speaker.end - speaker.start,
        })),
        summary: transcriptionResult.summary,
        topics: transcriptionResult.topics,
        sentiment: transcriptionResult.sentiment,
        metrics: {
          overallConfidence: metrics.overallConfidence,
          speakerBalance: metrics.speakerBalance,
          totalWords: metrics.totalWords,
          averageWordsPerMinute: metrics.averageWordsPerMinute,
        },
        analysis: {
          crisisIndicators,
          medications,
          riskLevel: crisisIndicators.length > 0 ? 'HIGH' : 'LOW',
        },
      });

    } catch (transcriptionError) {
      console.error('Transcription processing error:', transcriptionError);
      
      // Update job status to failed
      await prisma.transcriptionJob.update({
        where: { id: transcriptionJob.id },
        data: {
          status: 'FAILED',
          errorMessage: transcriptionError instanceof Error ? transcriptionError.message : 'Unknown error',
          retryCount: transcriptionJob.retryCount + 1,
        },
      });

      res.status(500).json({ 
        error: 'Transcription processing failed',
        jobId: transcriptionJob.id,
        canRetry: transcriptionJob.retryCount < 3,
      });
    }

  } catch (error) {
    console.error('Pre-recorded transcription error:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    });
  }
}

// Configure larger payload limit for audio files
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '50mb',
    },
  },
};