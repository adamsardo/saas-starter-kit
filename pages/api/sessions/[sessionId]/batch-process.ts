import type { NextApiRequest, NextApiResponse } from 'next';
import { getCurrentUserWithTeam } from '@/lib/clerk-session';
import { hasSessionAccess, getTherapySession } from '@/models/therapySession';
import { prisma } from '@/lib/prisma';
import { transcribeAudio } from '@/lib/deepgram/client';
import { generateSessionSummary, extractSessionThemes, generateClinicalDocument } from '@/lib/mentalHealth/documentGeneration';
import { clinicalFlagDetector } from '@/lib/mentalHealth/clinicalDetection';
import type { WordData } from '@/types/clinical-flags';
import { ApiError } from '@/lib/errors';

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

    // Get session details
    const session = await getTherapySession(sessionId, user.team.id, true);
    if (!session) {
      throw new ApiError(404, 'Session not found');
    }

    // Check if audio recording exists
    if (!session.audioRecording) {
      throw new ApiError(400, 'No audio recording found for this session');
    }

    // Create batch processing job
    // TODO: Uncomment after running prisma generate
    const job = {
      id: `job-${Date.now()}`,
      sessionId,
      teamId: user.team.id,
      status: 'processing',
    };
    
    // const job = await prisma.batchProcessingJob.create({
    //   data: {
    //     sessionId,
    //     teamId: user.team.id,
    //     type: 'transcript_processing',
    //     status: 'processing',
    //     startedAt: new Date(),
    //     input: {
    //       audioUrl: session.audioRecording.fileUrl,
    //       duration: session.audioRecording.duration,
    //     },
    //   },
    // });

    // Start async processing
    processSessionAsync(job.id, sessionId, session.audioRecording.fileUrl, user.team.id)
      .catch(error => {
        console.error('Batch processing failed:', error);
        // Update job status to failed
        prisma.batchProcessingJob.update({
          where: { id: job.id },
          data: {
            status: 'failed',
            completedAt: new Date(),
            error: error.message,
          },
        }).catch(console.error);
      });

    // Return immediately with job info
    res.status(202).json({
      message: 'Batch processing started',
      jobId: job.id,
      status: 'processing',
    });

  } catch (error: any) {
    console.error('Batch processing error:', error);
    const status = error.status || 500;
    const message = error.message || 'Failed to start batch processing';
    res.status(status).json({ error: message });
  }
}

async function processSessionAsync(
  jobId: string,
  sessionId: string,
  audioUrl: string,
  teamId: string
) {
  try {
    // Step 1: Full transcription with Deepgram
    console.log(`Starting full transcription for session ${sessionId}`);
    const transcriptResult = await transcribeAudio(audioUrl, {
      model: 'nova-2-medical',
      diarize: true,
      punctuate: true,
      paragraphs: true,
      utterances: true,
      language: 'en-US',
      numerals: true,
    });

    if (!transcriptResult || !transcriptResult.results?.channels?.[0]) {
      throw new Error('No transcription results returned');
    }

    const channel = transcriptResult.results.channels[0];
    const alternatives = channel.alternatives[0];

    // Step 2: Extract full text and process for clinical flags
    const fullText = alternatives.transcript;
    const words: WordData[] = alternatives.words?.map((w: any) => ({
      punctuated_word: w.punctuated_word || w.word,
      word: w.word,
      start: w.start,
      end: w.end,
      confidence: w.confidence,
      speaker: w.speaker || 0,
    })) || [];

    // Detect all clinical flags in the full transcript
    const allFlags = clinicalFlagDetector.detectFlags(fullText, words, []);

    // Step 3: Save complete transcript
    // TODO: Uncomment after running prisma generate
    const transcript = await prisma.sessionTranscript.upsert({
      where: { sessionId },
      create: {
        sessionId,
        content: transcriptResult.results as any, // Type assertion for now
        rawText: fullText,
        processingStatus: 'completed',
        processedAt: new Date(),
        medicalTerms: extractMedicalTerms(fullText),
        keyTopics: [],
      },
      update: {
        content: transcriptResult.results as any, // Type assertion for now
        rawText: fullText,
        processingStatus: 'completed',
        processedAt: new Date(),
        medicalTerms: extractMedicalTerms(fullText),
      },
    });

    // Step 4: Save all detected clinical flags
    if (allFlags.length > 0) {
      await prisma.clinicalFlag.createMany({
        data: allFlags.map(flag => ({
          sessionId,
          transcriptId: transcript.id,
          type: flag.type,
          severity: flag.severity,
          confidence: flag.confidence,
          text: flag.text,
          context: flag.context,
          timestamp: flag.timestamp,
          speakerId: flag.speakerId,
          metadata: flag.metadata,
        })),
        skipDuplicates: true,
      });
    }

    // Step 5: Generate summary and extract themes
    const [summaryResult, themesResult] = await Promise.all([
      generateSessionSummary(fullText, {
        maxLength: 500,
        includeActionItems: true,
        includeClinicalFlags: true,
      }),
      extractSessionThemes(fullText),
    ]);

    // Update transcript with AI-generated insights
    await prisma.sessionTranscript.update({
      where: { id: transcript.id },
      data: {
        summary: summaryResult.summary,
        keyTopics: themesResult.primaryThemes,
        sentiment: {
          emotionalTones: themesResult.emotionalTones,
          concerns: themesResult.concerns,
        },
      },
    });

    // Step 6: Generate clinical document (SOAP note)
    const documentJob = await prisma.batchProcessingJob.create({
      data: {
        sessionId,
        teamId,
        type: 'document_generation',
        status: 'pending',
        input: {
          transcriptId: transcript.id,
          documentType: 'SOAP_NOTE',
        },
      },
    });

    // Update original job as completed
    await prisma.batchProcessingJob.update({
      where: { id: jobId },
      data: {
        status: 'completed',
        completedAt: new Date(),
        result: {
          transcriptId: transcript.id,
          flagsDetected: allFlags.length,
          summaryGenerated: true,
          documentJobId: documentJob.id,
        },
      },
    });

    console.log(`Batch processing completed for session ${sessionId}`);

  } catch (error) {
    console.error(`Batch processing failed for session ${sessionId}:`, error);
    throw error;
  }
}

// Helper function to extract medical terms (simplified version)
function extractMedicalTerms(text: string): string[] {
  // This is a simplified implementation
  // In production, you might use a medical NLP library
  const medicalKeywords = [
    'medication', 'prescription', 'diagnosis', 'symptom', 'treatment',
    'therapy', 'depression', 'anxiety', 'bipolar', 'schizophrenia',
    'PTSD', 'trauma', 'psychosis', 'disorder', 'syndrome',
    // Add more medical terms as needed
  ];

  const words = text.toLowerCase().split(/\s+/);
  const foundTerms = new Set<string>();

  for (const word of words) {
    for (const term of medicalKeywords) {
      if (word.includes(term.toLowerCase())) {
        foundTerms.add(term);
      }
    }
  }

  return Array.from(foundTerms);
} 