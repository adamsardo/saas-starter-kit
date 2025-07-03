import { receiveFromQueue, deleteFromQueue, queueDocumentGeneration } from '@/lib/aws/sqs';
import { transcribeAudio } from '@/lib/deepgram/client';
import { generateSessionSummary, extractSessionThemes } from '@/lib/mentalHealth/documentGeneration';
import { clinicalFlagDetector } from '@/lib/mentalHealth/clinicalDetection';
import { prisma } from '@/lib/prisma';
import type { WordData } from '@/types/clinical-flags';

interface ProcessingResult {
  success: boolean;
  error?: string;
  transcriptId?: string;
  flagsDetected?: number;
}

/**
 * Process a single batch job
 */
async function processJob(job: any): Promise<ProcessingResult> {
  const { sessionId, teamId, data } = job.body;
  
  try {
    console.log(`Processing job for session ${sessionId}`);
    
    // Step 1: Full transcription with Deepgram
    const transcriptResult = await transcribeAudio(data.audioUrl, {
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
    const transcript = await prisma.sessionTranscript.upsert({
      where: { sessionId },
      create: {
        sessionId,
        content: transcriptResult.results as any,
        rawText: fullText,
        processingStatus: 'completed',
        processedAt: new Date(),
        medicalTerms: extractMedicalTerms(fullText),
        keyTopics: [],
      },
      update: {
        content: transcriptResult.results as any,
        rawText: fullText,
        processingStatus: 'completed',
        processedAt: new Date(),
        medicalTerms: extractMedicalTerms(fullText),
      },
    });

    // Step 4: Save all detected clinical flags
    if (allFlags.length > 0) {
      // TODO: Uncomment after running prisma generate
      // await prisma.clinicalFlag.createMany({
      //   data: allFlags.map(flag => ({
      //     sessionId,
      //     transcriptId: transcript.id,
      //     type: flag.type,
      //     severity: flag.severity,
      //     confidence: flag.confidence,
      //     text: flag.text,
      //     context: flag.context,
      //     timestamp: flag.timestamp,
      //     speakerId: flag.speakerId,
      //     metadata: flag.metadata,
      //   })),
      //   skipDuplicates: true,
      // });
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

    // Step 6: Queue document generation
    await queueDocumentGeneration(
      sessionId,
      teamId,
      transcript.id,
      'SOAP_NOTE'
    );

    // Update session status
    await prisma.therapySession.update({
      where: { id: sessionId },
      data: {
        status: 'COMPLETED',
        updatedAt: new Date(),
      },
    });

    console.log(`Successfully processed session ${sessionId}`);
    
    return {
      success: true,
      transcriptId: transcript.id,
      flagsDetected: allFlags.length,
    };

  } catch (error) {
    console.error(`Error processing session ${sessionId}:`, error);
    
    // Log error for session
    console.error(`Failed to process transcript for session ${sessionId}:`, 
      error instanceof Error ? error.message : 'Unknown error'
    );
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Main worker loop
 */
export async function runBatchProcessingWorker() {
  console.log('Starting batch processing worker...');
  
  while (true) {
    try {
      // Receive messages from queue
      const messages = await receiveFromQueue(5); // Process up to 5 messages at a time
      
      if (messages.length === 0) {
        // No messages, wait a bit before checking again
        await new Promise(resolve => setTimeout(resolve, 5000));
        continue;
      }
      
      // Process messages in parallel
      const results = await Promise.allSettled(
        messages.map(async (message) => {
          const result = await processJob(message);
          
          if (result.success) {
            // Delete message from queue on success
            await deleteFromQueue(message.receiptHandle!);
          }
          
          return result;
        })
      );
      
      // Log results
      const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
      const failed = results.length - successful;
      
      console.log(`Processed ${results.length} messages: ${successful} successful, ${failed} failed`);
      
    } catch (error) {
      console.error('Worker error:', error);
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
  }
}

// Helper function to extract medical terms
function extractMedicalTerms(text: string): string[] {
  const medicalKeywords = [
    'medication', 'prescription', 'diagnosis', 'symptom', 'treatment',
    'therapy', 'depression', 'anxiety', 'bipolar', 'schizophrenia',
    'PTSD', 'trauma', 'psychosis', 'disorder', 'syndrome',
    'antidepressant', 'antipsychotic', 'mood stabilizer', 'benzodiazepine',
    'SSRI', 'SNRI', 'cognitive', 'behavioral', 'psychotherapy',
    'counseling', 'assessment', 'evaluation', 'screening',
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

// Export for use in worker process
if (require.main === module) {
  runBatchProcessingWorker().catch(console.error);
} 