import { createClient, LiveTranscriptionEvents, LiveClient } from '@deepgram/sdk';
import env from '@/lib/env';

// Initialize Deepgram client
export const deepgramClient = createClient(env.deepgram.apiKey);

// Medical transcription configuration
export const getMedicalTranscriptionConfig = () => ({
  model: env.deepgram.model,
  language: env.deepgram.language,
  punctuate: env.deepgram.medical.punctuate,
  diarize: env.deepgram.medical.diarize,
  numerals: env.deepgram.medical.numerals,
  profanity_filter: env.deepgram.medical.profanityFilter,
  redact: env.deepgram.medical.redact,
  // Medical-specific settings
  smart_format: true,
  utterances: true,
  interim_results: true,
  endpointing: 300, // milliseconds of silence before considering speech ended
  vad_events: true, // Voice activity detection
  // Custom vocabulary for medical terms
  keywords: env.deepgram.medical.vocabulary,
});

// Create a live transcription connection
export const createLiveTranscription = async (
  onTranscript: (transcript: any) => void,
  onError?: (error: Error) => void,
  onClose?: () => void
): Promise<LiveClient> => {
  const connection = deepgramClient.listen.live(getMedicalTranscriptionConfig());

  // Handle transcription events
  connection.on(LiveTranscriptionEvents.Transcript, (data) => {
    onTranscript(data);
  });

  // Handle errors
  connection.on(LiveTranscriptionEvents.Error, (error) => {
    console.error('Deepgram transcription error:', error);
    onError?.(error);
  });

  // Handle connection close
  connection.on(LiveTranscriptionEvents.Close, () => {
    console.log('Deepgram connection closed');
    onClose?.();
  });

  // Handle metadata
  connection.on(LiveTranscriptionEvents.Metadata, (data) => {
    console.log('Deepgram metadata:', data);
  });

  return connection;
};

// Process pre-recorded audio
export const transcribeAudio = async (
  audioUrl: string,
  options?: Partial<typeof getMedicalTranscriptionConfig>
) => {
  const config = {
    ...getMedicalTranscriptionConfig(),
    ...options,
  };

  try {
    const { result } = await deepgramClient.listen.prerecorded.transcribeUrl(
      { url: audioUrl },
      config
    );
    return result;
  } catch (error) {
    console.error('Error transcribing audio:', error);
    throw error;
  }
};

// Extract medical entities from transcript
export const extractMedicalEntities = (transcript: string): {
  medications: string[];
  symptoms: string[];
  diagnoses: string[];
  procedures: string[];
} => {
  // This is a simplified version - in production, you'd use NLP/medical entity recognition
  const medicalPatterns = {
    medications: /\b(medication|prescribed|taking|dosage|mg|ml|tablet|capsule)\s+(\w+)/gi,
    symptoms: /\b(experiencing|feeling|complaining of|reports|symptoms?)\s+(\w+)/gi,
    diagnoses: /\b(diagnosed with|diagnosis of|suffering from)\s+([^,.]+)/gi,
    procedures: /\b(procedure|surgery|therapy|treatment)\s+(\w+)/gi,
  };

  const entities: {
    medications: string[];
    symptoms: string[];
    diagnoses: string[];
    procedures: string[];
  } = {
    medications: [],
    symptoms: [],
    diagnoses: [],
    procedures: [],
  };

  // Extract entities using patterns
  for (const [type, pattern] of Object.entries(medicalPatterns)) {
    const matches = Array.from(transcript.matchAll(pattern));
    for (const match of matches) {
      entities[type as keyof typeof entities].push(match[2] || match[0]);
    }
  }

  // Remove duplicates
  for (const type of Object.keys(entities)) {
    entities[type as keyof typeof entities] = Array.from(new Set(entities[type as keyof typeof entities]));
  }

  return entities;
};

// Format transcript for clinical documentation
export const formatTranscriptForClinical = (
  transcript: any,
  sessionInfo: {
    patientName: string;
    therapistName: string;
    sessionDate: Date;
  }
) => {
  const { channels, utterances } = transcript;
  
  if (!utterances || utterances.length === 0) {
    return {
      formatted: '',
      speakers: [],
      duration: 0,
    };
  }

  // Identify speakers
  const speakers = new Map();
  speakers.set(0, sessionInfo.therapistName);
  speakers.set(1, sessionInfo.patientName);

  // Format utterances
  let formatted = `Session Transcript\n`;
  formatted += `Date: ${sessionInfo.sessionDate.toLocaleDateString()}\n`;
  formatted += `Therapist: ${sessionInfo.therapistName}\n`;
  formatted += `Patient: ${sessionInfo.patientName}\n\n`;
  formatted += `---\n\n`;

  for (const utterance of utterances) {
    const speaker = speakers.get(utterance.speaker) || `Speaker ${utterance.speaker}`;
    const timestamp = new Date(utterance.start * 1000).toISOString().substr(11, 8);
    formatted += `[${timestamp}] ${speaker}: ${utterance.transcript}\n\n`;
  }

  return {
    formatted,
    speakers: Array.from(speakers.values()),
    duration: utterances[utterances.length - 1]?.end || 0,
  };
}; 