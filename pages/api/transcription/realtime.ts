import type { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from '@/lib/session';
import { throwIfNoTeamAccess } from '../../../models/team';
import { deepgram, getTranscriptionConfig, isDeepgramAvailable } from '@/lib/deepgram';
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

    // Check if mental health features are enabled
    if (!env.mentalHealth.recording.enabled) {
      return res.status(403).json({ error: 'Session recording is not enabled' });
    }

    const { sessionId, customKeywords } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    // Verify session exists and user has access
    const therapySession = await prisma.therapySession.findFirst({
      where: {
        id: sessionId,
        teamId,
        therapistId: userId, // Only the assigned therapist can start transcription
      },
      include: {
        patient: true,
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

    // Get transcription configuration
    const config = getTranscriptionConfig('realtime', customKeywords);

    // Create WebSocket connection to Deepgram
    const connection = deepgram!.listen.live(config);

    // Set up response as Server-Sent Events
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
    });

    // Send initial connection event
    res.write(`data: ${JSON.stringify({ 
      type: 'connection', 
      status: 'connected',
      sessionId,
      config: {
        model: config.model,
        language: config.language,
        features: {
          diarization: config.diarize,
          punctuation: config.punctuate,
          smartFormatting: config.smart_format,
        }
      }
    })}\n\n`);

    // Handle Deepgram events
    connection.on('open', () => {
      res.write(`data: ${JSON.stringify({ 
        type: 'deepgram_open',
        timestamp: new Date().toISOString()
      })}\n\n`);
    });

    connection.on('Results', (data) => {
      try {
        const result = data.channel?.alternatives?.[0];
        if (result) {
          res.write(`data: ${JSON.stringify({
            type: 'transcription',
            transcript: result.transcript,
            confidence: result.confidence,
            is_final: data.is_final,
            words: result.words,
            speaker: data.channel?.alternatives?.[0]?.words?.[0]?.speaker,
            timestamp: new Date().toISOString(),
          })}\n\n`);

          // If final result, store in database
          if (data.is_final && result.transcript?.trim()) {
            // Store partial transcript (in a real implementation, you'd accumulate these)
            prisma.therapySession.update({
              where: { id: sessionId },
              data: {
                transcriptionText: therapySession.transcriptionText 
                  ? `${therapySession.transcriptionText} ${result.transcript}`
                  : result.transcript,
                hasRecording: true,
              },
            }).catch(console.error); // Non-blocking error handling
          }
        }
      } catch (error) {
        console.error('Error processing transcription result:', error);
      }
    });

    connection.on('error', (error) => {
      console.error('Deepgram connection error:', error);
      res.write(`data: ${JSON.stringify({ 
        type: 'error',
        error: 'Transcription error occurred',
        timestamp: new Date().toISOString()
      })}\n\n`);
    });

    connection.on('close', () => {
      res.write(`data: ${JSON.stringify({ 
        type: 'connection_closed',
        timestamp: new Date().toISOString()
      })}\n\n`);
      res.end();
    });

    // Handle client disconnect
    req.on('close', () => {
      connection.finish();
    });

    // Keep connection alive
    const keepAlive = setInterval(() => {
      res.write(`data: ${JSON.stringify({ 
        type: 'heartbeat',
        timestamp: new Date().toISOString()
      })}\n\n`);
    }, 30000);

    req.on('close', () => {
      clearInterval(keepAlive);
    });

  } catch (error) {
    console.error('Real-time transcription error:', error);
    
    if (!res.headersSent) {
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Internal server error' 
      });
    }
  }
}

// Increase timeout for streaming connections
export const config = {
  api: {
    responseLimit: false,
  },
};