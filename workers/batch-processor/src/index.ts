/**
 * Cloudflare Worker for batch processing session recordings
 * This runs at the edge, close to where the data is stored
 */

export interface Env {
  // R2 bucket binding
  AUDIO_BUCKET: R2Bucket;
  
  // Queue binding
  TRANSCRIPTION_QUEUE: Queue;
  
  // KV namespace for storing transcripts
  TRANSCRIPTS: KVNamespace;
  
  // Durable Object namespace for job coordination
  BATCH_JOBS: DurableObjectNamespace;
  
  // Environment variables
  DEEPGRAM_API_KEY: string;
  OPENAI_API_KEY: string;
}

interface TranscriptionJob {
  id: string;
  sessionId: string;
  teamId: string;
  audioKey: string;
  timestamp: number;
}

export default {
  // Handle HTTP requests (for status checks, manual triggers, etc.)
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    
    // Health check endpoint
    if (url.pathname === '/health') {
      return new Response('OK', { status: 200 });
    }
    
    // Manual job trigger endpoint (for testing)
    if (url.pathname === '/process' && request.method === 'POST') {
      const job = await request.json() as TranscriptionJob;
      await env.TRANSCRIPTION_QUEUE.send(job);
      return new Response(JSON.stringify({ queued: true, jobId: job.id }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    // Get job status from KV
    if (url.pathname.startsWith('/status/')) {
      const jobId = url.pathname.split('/')[2];
      const status = await env.TRANSCRIPTS.get(`job:${jobId}`, 'json');
      
      if (!status) {
        return new Response('Job not found', { status: 404 });
      }
      
      return new Response(JSON.stringify(status), {
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    return new Response('Not found', { status: 404 });
  },
  
  // Handle queue messages
  async queue(batch: MessageBatch<TranscriptionJob>, env: Env, ctx: ExecutionContext): Promise<void> {
    // Process messages in parallel
    await Promise.allSettled(
      batch.messages.map(message => 
        processTranscriptionJob(message.body, env, ctx)
          .then(() => message.ack()) // Acknowledge on success
          .catch(error => {
            console.error(`Failed to process job ${message.body.id}:`, error);
            // Message will be retried if not acknowledged
          })
      )
    );
  },
};

async function processTranscriptionJob(job: TranscriptionJob, env: Env, ctx: ExecutionContext) {
  console.log(`Processing job ${job.id} for session ${job.sessionId}`);
  
  try {
    // Update job status
    await env.TRANSCRIPTS.put(`job:${job.id}`, JSON.stringify({
      status: 'processing',
      startedAt: new Date().toISOString(),
    }));
    
    // Step 1: Download audio from R2
    const audioObject = await env.AUDIO_BUCKET.get(job.audioKey);
    if (!audioObject) {
      throw new Error(`Audio file not found: ${job.audioKey}`);
    }
    
    const audioBuffer = await audioObject.arrayBuffer();
    
    // Step 2: Send to Deepgram for transcription
    const transcriptResult = await transcribeWithDeepgram(
      audioBuffer,
      env.DEEPGRAM_API_KEY
    );
    
    // Step 3: Extract clinical flags
    const clinicalFlags = detectClinicalFlags(transcriptResult.transcript);
    
    // Step 4: Generate summary with AI
    const summary = await generateSummaryWithAI(
      transcriptResult.transcript,
      clinicalFlags,
      env.OPENAI_API_KEY
    );
    
    // Step 5: Store results in KV
    const results = {
      jobId: job.id,
      sessionId: job.sessionId,
      teamId: job.teamId,
      transcript: transcriptResult.transcript,
      speakers: transcriptResult.speakers,
      clinicalFlags,
      summary,
      processedAt: new Date().toISOString(),
    };
    
    // Store transcript (KV has 25MB limit, so we may need to chunk large transcripts)
    await env.TRANSCRIPTS.put(
      `transcript:${job.sessionId}`,
      JSON.stringify(results),
      { expirationTtl: 60 * 60 * 24 * 365 * 7 } // 7 years retention
    );
    
    // Update job status
    await env.TRANSCRIPTS.put(`job:${job.id}`, JSON.stringify({
      status: 'completed',
      completedAt: new Date().toISOString(),
      results: {
        flagsDetected: clinicalFlags.length,
        summaryGenerated: true,
      },
    }));
    
    // Step 6: Send webhook notification (if configured)
    await sendWebhookNotification(job, results);
    
    console.log(`Successfully processed job ${job.id}`);
    
  } catch (error) {
    console.error(`Error processing job ${job.id}:`, error);
    
    // Update job status with error
    await env.TRANSCRIPTS.put(`job:${job.id}`, JSON.stringify({
      status: 'failed',
      failedAt: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
    }));
    
    throw error; // Re-throw to prevent message acknowledgment
  }
}

async function transcribeWithDeepgram(
  audioBuffer: ArrayBuffer,
  apiKey: string
): Promise<{ transcript: string; speakers: any[] }> {
  const response = await fetch('https://api.deepgram.com/v1/listen', {
    method: 'POST',
    headers: {
      'Authorization': `Token ${apiKey}`,
      'Content-Type': 'audio/webm',
    },
    body: audioBuffer,
  });
  
  if (!response.ok) {
    throw new Error(`Deepgram API error: ${response.statusText}`);
  }
  
  const result = await response.json();
  
  return {
    transcript: result.results?.channels?.[0]?.alternatives?.[0]?.transcript || '',
    speakers: result.results?.channels?.[0]?.alternatives?.[0]?.words || [],
  };
}

function detectClinicalFlags(transcript: string): any[] {
  // Simplified clinical flag detection
  // In production, this would use the full clinical detection engine
  const flags = [];
  const patterns = [
    { regex: /\b(suicide|suicidal|kill myself)\b/i, type: 'suicide_risk', severity: 'critical' },
    { regex: /\b(self[- ]harm|cutting|hurt myself)\b/i, type: 'self_harm', severity: 'high' },
    { regex: /\b(voices|hallucination)\b/i, type: 'psychosis_indicators', severity: 'high' },
    { regex: /\b(overdose|too many pills)\b/i, type: 'substance_abuse', severity: 'high' },
  ];
  
  for (const pattern of patterns) {
    if (pattern.regex.test(transcript)) {
      flags.push({
        type: pattern.type,
        severity: pattern.severity,
        detected: true,
        timestamp: Date.now(),
      });
    }
  }
  
  return flags;
}

async function generateSummaryWithAI(
  transcript: string,
  clinicalFlags: any[],
  apiKey: string
): Promise<string> {
  const prompt = `
    Summarize this therapy session transcript. Include:
    1. Main topics discussed
    2. Patient's emotional state
    3. Any clinical concerns
    4. Recommended follow-up actions
    
    Clinical flags detected: ${JSON.stringify(clinicalFlags)}
    
    Transcript: ${transcript.substring(0, 3000)}...
  `;
  
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'You are a clinical assistant helping to summarize therapy sessions.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 500,
      temperature: 0.3,
    }),
  });
  
  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.statusText}`);
  }
  
  const result = await response.json();
  return result.choices?.[0]?.message?.content || 'Summary generation failed';
}

async function sendWebhookNotification(job: TranscriptionJob, results: any) {
  // Send notification to the main app
  // This would be configured with the actual webhook URL
  const webhookUrl = `https://app.example.com/api/webhooks/transcription-complete`;
  
  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Session-ID': job.sessionId,
      },
      body: JSON.stringify({
        jobId: job.id,
        sessionId: job.sessionId,
        teamId: job.teamId,
        status: 'completed',
        flagsDetected: results.clinicalFlags.length,
        processedAt: results.processedAt,
      }),
    });
  } catch (error) {
    console.error('Failed to send webhook notification:', error);
    // Don't fail the job if webhook fails
  }
} 