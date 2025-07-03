import { createClient, DeepgramResponse } from '@deepgram/sdk';
import env from '@/lib/env';

// Initialize Deepgram client
export const deepgram = env.deepgram.apiKey 
  ? createClient(env.deepgram.apiKey)
  : null;

// Medical-specific keywords for improved transcription accuracy
export const medicalKeywords = [
  // Common medical terms
  'medication', 'diagnosis', 'symptoms', 'treatment', 'therapy',
  'assessment', 'intervention', 'cognitive', 'behavioral', 'depression',
  'anxiety', 'trauma', 'PTSD', 'bipolar', 'schizophrenia', 'OCD',
  'ADHD', 'autism', 'borderline', 'personality', 'disorder',
  
  // Therapy modalities
  'CBT', 'DBT', 'EMDR', 'ACT', 'psychodynamic', 'humanistic',
  'family systems', 'trauma informed', 'solution focused',
  
  // Common medications (mental health)
  'sertraline', 'fluoxetine', 'paroxetine', 'citalopram', 'escitalopram',
  'venlafaxine', 'duloxetine', 'bupropion', 'mirtazapine', 'trazodone',
  'lithium', 'valproate', 'carbamazepine', 'lamotrigine', 'quetiapine',
  'risperidone', 'olanzapine', 'aripiprazole', 'clonazepam', 'lorazepam',
  
  // Assessment tools
  'PHQ-9', 'GAD-7', 'Beck Depression Inventory', 'MMSE', 'WAIS',
  'Rorschach', 'Minnesota Multiphasic', 'CAPS-5', 'PCL-5',
];

// Configuration for different transcription scenarios
export const transcriptionConfigs = {
  realtime: {
    model: env.deepgram.model,
    language: env.deepgram.language,
    punctuate: env.deepgram.features.punctuation,
    diarize: env.deepgram.features.diarization,
    smart_format: env.deepgram.features.smartFormatting,
    keywords: [...medicalKeywords, ...env.deepgram.features.keywords],
    interim_results: true,
    endpointing: 300, // 300ms of silence before ending
    vad_events: true,
    encoding: 'linear16',
    sample_rate: env.deepgram.realtime.sampleRate,
    channels: env.deepgram.realtime.channels,
  },
  prerecorded: {
    model: env.deepgram.model,
    language: env.deepgram.language,
    punctuate: env.deepgram.features.punctuation,
    diarize: env.deepgram.features.diarization,
    smart_format: env.deepgram.features.smartFormatting,
    keywords: [...medicalKeywords, ...env.deepgram.features.keywords],
    paragraphs: true,
    utterances: true,
    summarize: true,
    detect_topics: true,
    sentiment: true,
  },
};

// Types for Deepgram responses
export interface TranscriptionResult {
  transcript: string;
  confidence: number;
  speakers?: SpeakerSegment[];
  words?: WordSegment[];
  paragraphs?: ParagraphSegment[];
  summary?: Summary;
  topics?: Topic[];
  sentiment?: Sentiment;
}

export interface SpeakerSegment {
  speaker: number;
  start: number;
  end: number;
  transcript: string;
  confidence: number;
}

export interface WordSegment {
  word: string;
  start: number;
  end: number;
  confidence: number;
  speaker?: number;
}

export interface ParagraphSegment {
  start: number;
  end: number;
  transcript: string;
  speakers: number[];
}

export interface Summary {
  short: string;
  structured?: {
    topic: string;
    summary: string;
  }[];
}

export interface Topic {
  topic: string;
  confidence: number;
  start_word: number;
  end_word: number;
}

export interface Sentiment {
  average: number;
  segments: {
    start_word: number;
    end_word: number;
    sentiment: number;
  }[];
}

// Utility functions
export function isDeepgramAvailable(): boolean {
  return deepgram !== null && env.deepgram.enabled;
}

export function getTranscriptionConfig(type: 'realtime' | 'prerecorded', customKeywords?: string[]) {
  const config = { ...transcriptionConfigs[type] };
  
  if (customKeywords && customKeywords.length > 0) {
    config.keywords = [...config.keywords, ...customKeywords];
  }
  
  return config;
}

export function parseDeepgramResponse(response: DeepgramResponse): TranscriptionResult {
  const results = response.results;
  
  if (!results?.channels?.[0]?.alternatives?.[0]) {
    throw new Error('Invalid Deepgram response format');
  }

  const alternative = results.channels[0].alternatives[0];
  
  return {
    transcript: alternative.transcript || '',
    confidence: alternative.confidence || 0,
    speakers: results.channels[0].alternatives[0].words?.reduce((speakers: SpeakerSegment[], word, index, words) => {
      const speaker = word.speaker;
      const lastSpeaker = speakers[speakers.length - 1];
      
      if (!lastSpeaker || lastSpeaker.speaker !== speaker) {
        speakers.push({
          speaker,
          start: word.start,
          end: word.end,
          transcript: word.punctuated_word || word.word,
          confidence: word.confidence,
        });
      } else {
        lastSpeaker.end = word.end;
        lastSpeaker.transcript += ` ${word.punctuated_word || word.word}`;
        lastSpeaker.confidence = (lastSpeaker.confidence + word.confidence) / 2;
      }
      
      return speakers;
    }, []),
    words: alternative.words?.map(word => ({
      word: word.punctuated_word || word.word,
      start: word.start,
      end: word.end,
      confidence: word.confidence,
      speaker: word.speaker,
    })),
    paragraphs: alternative.paragraphs?.paragraphs?.map(paragraph => ({
      start: paragraph.start,
      end: paragraph.end,
      transcript: paragraph.transcript,
      speakers: paragraph.speaker || [],
    })),
    summary: results.summary ? {
      short: results.summary.short || '',
      structured: results.summary.structured?.map(item => ({
        topic: item.topic || '',
        summary: item.summary || '',
      })),
    } : undefined,
    topics: results.topics?.map(topic => ({
      topic: topic.topic,
      confidence: topic.confidence,
      start_word: topic.start_word,
      end_word: topic.end_word,
    })),
    sentiment: results.sentiment ? {
      average: results.sentiment.average,
      segments: results.sentiment.segments?.map(segment => ({
        start_word: segment.start_word,
        end_word: segment.end_word,
        sentiment: segment.sentiment,
      })) || [],
    } : undefined,
  };
}

// Helper function to detect potential crisis indicators
export function detectCrisisIndicators(transcript: string): string[] {
  const crisisKeywords = [
    'suicide', 'suicidal', 'kill myself', 'end it all', 'not worth living',
    'self harm', 'hurt myself', 'cut myself', 'want to die',
    'homicidal', 'hurt someone', 'kill someone', 'violence',
    'abuse', 'domestic violence', 'child abuse',
    'overdose', 'pills', 'substance abuse'
  ];
  
  const lowerTranscript = transcript.toLowerCase();
  return crisisKeywords.filter(keyword => lowerTranscript.includes(keyword));
}

// Helper function to extract medication mentions
export function extractMedications(transcript: string): string[] {
  const medicationPattern = /\b(?:taking|prescribed|medication|med|pills?|drug)\s+([a-zA-Z]+(?:\s+[a-zA-Z]+)*)/gi;
  const matches = [];
  let match;
  
  while ((match = medicationPattern.exec(transcript)) !== null) {
    matches.push(match[1].trim());
  }
  
  return matches;
}

// Helper function to calculate session quality metrics
export function calculateSessionMetrics(transcriptionResult: TranscriptionResult): {
  overallConfidence: number;
  speakerBalance: number;
  totalWords: number;
  averageWordsPerMinute: number;
  duration: number;
} {
  const words = transcriptionResult.words || [];
  const speakers = transcriptionResult.speakers || [];
  
  const overallConfidence = words.length > 0 
    ? words.reduce((sum, word) => sum + word.confidence, 0) / words.length 
    : 0;
  
  const speakerWordCounts = speakers.reduce((counts, speaker) => {
    const speakerWords = speaker.transcript.split(' ').length;
    counts[speaker.speaker] = (counts[speaker.speaker] || 0) + speakerWords;
    return counts;
  }, {} as Record<number, number>);
  
  const totalWords = Object.values(speakerWordCounts).reduce((sum, count) => sum + count, 0);
  const speakerCounts = Object.values(speakerWordCounts);
  const speakerBalance = speakerCounts.length > 1 
    ? 1 - (Math.max(...speakerCounts) - Math.min(...speakerCounts)) / totalWords
    : 1;
  
  const duration = words.length > 0 
    ? (words[words.length - 1].end - words[0].start) / 60 // Convert to minutes
    : 0;
  
  const averageWordsPerMinute = duration > 0 ? totalWords / duration : 0;
  
  return {
    overallConfidence,
    speakerBalance,
    totalWords,
    averageWordsPerMinute,
    duration,
  };
}