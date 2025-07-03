import type { NextApiRequest } from 'next';
import type { NextApiResponseServerIO } from '@/types/socket';
import { Server as SocketIOServer } from 'socket.io';
import { Server as NetServer } from 'http';
import { createLiveTranscription } from '@/lib/deepgram/client';
import { getCurrentUserWithTeam } from '@/lib/clerk-session';
import { hasSessionAccess } from '@/models/therapySession';
import { prisma } from '@/lib/prisma';
import { clinicalFlagDetector } from '@/lib/mentalHealth/clinicalDetection';
import type { ClinicalFlag, WordData } from '@/types/clinical-flags';

interface SocketServer extends NetServer {
  io?: SocketIOServer;
}

// Helper function to save clinical flags to database
async function saveClinicalFlags(sessionId: string, flags: ClinicalFlag[]) {
  try {
    // TODO: Uncomment after running prisma generate
    // await prisma.clinicalFlag.createMany({
    //   data: flags.map(flag => ({
    //     sessionId,
    //     type: flag.type,
    //     severity: flag.severity,
    //     confidence: flag.confidence,
    //     text: flag.text,
    //     context: flag.context,
    //     timestamp: flag.timestamp,
    //     speakerId: flag.speakerId,
    //     metadata: flag.metadata
    //   }))
    // });
    console.log(`Would save ${flags.length} clinical flags for session ${sessionId}`);
  } catch (error) {
    console.error('Failed to save clinical flags:', error);
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponseServerIO
) {
  if (req.method !== 'GET') {
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
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check session access
    const hasAccess = await hasSessionAccess(user.id, sessionId, user.team.id);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Initialize Socket.IO if not already done
    if (!res.socket.server.io) {
      console.log('Initializing Socket.IO server...');
      const io = new SocketIOServer(res.socket.server as SocketServer, {
        path: '/api/socketio',
        cors: {
          origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
          credentials: true,
        },
      });
      res.socket.server.io = io;
    }

    const io = res.socket.server.io;

    // Handle WebSocket connection for this session
    io.on('connection', async (socket) => {
      console.log(`Client connected: ${socket.id}`);

      // Join session room
      socket.join(`session-${sessionId}`);

      let deepgramConnection: any = null;
      let transcriptBuffer: any[] = [];
      let clinicalFlags: ClinicalFlag[] = [];
      let sessionStartTime: number | null = null;

      socket.on('start-transcription', async (data) => {
        console.log('Starting transcription for session:', sessionId);
        sessionStartTime = Date.now();

        try {
          // Create Deepgram live transcription
          deepgramConnection = await createLiveTranscription(
            async (transcript) => {
              // Process transcript
              if (transcript.channel?.alternatives?.[0]) {
                const alternative = transcript.channel.alternatives[0];
                const transcriptData = {
                  type: 'transcript',
                  speaker: transcript.channel_index || 0,
                  text: alternative.transcript,
                  timestamp: Date.now(),
                  confidence: alternative.confidence,
                  isFinal: transcript.is_final,
                  words: alternative.words,
                };

                // Emit to all clients in the session room
                io.to(`session-${sessionId}`).emit('transcript', transcriptData);

                // Detect clinical flags in real-time
                if (transcript.is_final && alternative.transcript.trim()) {
                  const words: WordData[] = alternative.words?.map((w: any) => ({
                    punctuated_word: w.punctuated_word || w.word,
                    word: w.word,
                    start: w.start,
                    end: w.end,
                    confidence: w.confidence,
                    speaker: transcript.channel_index || 0
                  })) || [];

                  const newFlags = clinicalFlagDetector.detectFlags(
                    alternative.transcript,
                    words,
                    clinicalFlags
                  );

                  if (newFlags.length > 0) {
                    // Add session-relative timestamps
                    const flagsWithTimestamp = newFlags.map(flag => ({
                      ...flag,
                      timestamp: sessionStartTime ? flag.timestamp - sessionStartTime : flag.timestamp
                    }));

                    clinicalFlags.push(...flagsWithTimestamp);

                    // Emit clinical flags to all clients
                    io.to(`session-${sessionId}`).emit('clinical_flags', {
                      type: 'clinical_flags',
                      flags: flagsWithTimestamp,
                      timestamp: Date.now()
                    });

                    // Save critical flags immediately
                    const criticalFlags = flagsWithTimestamp.filter(f => f.severity === 'critical');
                    if (criticalFlags.length > 0) {
                      await saveClinicalFlags(sessionId, criticalFlags);
                    }
                  }
                }

                // Buffer for saving
                if (transcript.is_final) {
                  transcriptBuffer.push(transcriptData);
                }
              }
            },
            (error) => {
              console.error('Deepgram error:', error);
              socket.emit('error', { message: 'Transcription error occurred' });
            },
            () => {
              console.log('Deepgram connection closed');
            }
          );

          // Start the session in database
          await prisma.therapySession.update({
            where: { id: sessionId },
            data: {
              status: 'IN_PROGRESS',
              startedAt: new Date(),
            },
          });

          socket.emit('transcription-started');
        } catch (error) {
          console.error('Failed to start transcription:', error);
          socket.emit('error', { message: 'Failed to start transcription' });
        }
      });

      // Handle audio data
      socket.on('audio-data', (audioData: ArrayBuffer) => {
        if (deepgramConnection) {
          deepgramConnection.send(audioData);
        }
      });

      // Handle markers
      socket.on('marker', async (markerData) => {
        // Broadcast marker to all clients
        io.to(`session-${sessionId}`).emit('marker', markerData);
        
        // Add to transcript buffer
        transcriptBuffer.push({
          type: 'marker',
          ...markerData,
        });
      });

      // Handle pause/resume
      socket.on('pause', () => {
        if (deepgramConnection) {
          deepgramConnection.send(JSON.stringify({ type: 'KeepAlive' }));
        }
        io.to(`session-${sessionId}`).emit('paused');
      });

      socket.on('resume', () => {
        io.to(`session-${sessionId}`).emit('resumed');
      });

      // Handle stop
      socket.on('stop-transcription', async () => {
        console.log('Stopping transcription for session:', sessionId);

        if (deepgramConnection) {
          deepgramConnection.finish();
          deepgramConnection = null;
        }

        // Save transcript to database
        if (transcriptBuffer.length > 0) {
          try {
            await prisma.sessionTranscript.create({
              data: {
                sessionId,
                content: transcriptBuffer,
                rawText: transcriptBuffer
                  .filter(t => t.type === 'transcript' && t.isFinal)
                  .map(t => t.text)
                  .join(' '),
                processingStatus: 'completed',
                processedAt: new Date(),
                medicalTerms: [], // Will be extracted in post-processing
                keyTopics: [], // Will be extracted in post-processing
              },
            });

            // Save all clinical flags
            if (clinicalFlags.length > 0) {
              await saveClinicalFlags(sessionId, clinicalFlags);
            }

            // Update session status
            await prisma.therapySession.update({
              where: { id: sessionId },
              data: {
                status: 'COMPLETED',
                endedAt: new Date(),
              },
            });

            // Queue for batch processing
            // TODO: Implement batch processing queue
            console.log(`Session ${sessionId} ready for batch processing`);
          } catch (error) {
            console.error('Failed to save transcript:', error);
          }
        }

        socket.emit('transcription-stopped');
      });

      // Handle disconnect
      socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
        
        if (deepgramConnection) {
          deepgramConnection.finish();
        }
        
        socket.leave(`session-${sessionId}`);
      });
    });

    res.status(200).json({ message: 'WebSocket handler initialized' });
  } catch (error) {
    console.error('WebSocket handler error:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    });
  }
} 