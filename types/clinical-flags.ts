export interface ClinicalFlag {
  id: string;
  type: FlagType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  text: string;
  context: string; // Surrounding text for context
  timestamp: number;
  speakerId?: string;
  metadata?: Record<string, any>;
}

export type FlagType = 
  | 'suicide_risk'
  | 'self_harm'
  | 'substance_abuse'
  | 'medication_noncompliance'
  | 'psychosis_indicators'
  | 'trauma_disclosure'
  | 'abuse_disclosure'
  | 'homicidal_ideation'
  | 'severe_depression'
  | 'mania_indicators'
  | 'dissociation'
  | 'eating_disorder'
  | 'significant_stressor';

export interface FlagPattern {
  regex: RegExp;
  severity: ClinicalFlag['severity'];
  minConfidence: number;
  metadata?: Record<string, any>;
}

export interface WordData {
  punctuated_word: string;
  word: string;
  start: number;
  end: number;
  confidence: number;
  speaker?: number;
}

export interface SessionRecording {
  // Real-time lightweight processing
  realtimeFlags: ClinicalFlag[];
  
  // Full processing happens post-session
  fullTranscript: {
    status: 'pending' | 'processing' | 'complete' | 'failed';
    url?: string;
  };
  
  // Audio recording details
  audioRecording: {
    localPath?: string;
    remoteUrl?: string;
    duration: number;
    fileSize: number;
  };
}

export interface TranscriptSegment {
  speaker: number;
  text: string;
  timestamp: number;
  confidence: number;
  isFinal: boolean;
  words?: WordData[];
}

export interface ClinicalFlagAlert {
  flag: ClinicalFlag;
  acknowledged?: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  notes?: string;
}

export interface BatchProcessingJob {
  id: string;
  sessionId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  result?: {
    transcriptId: string;
    documentIds: string[];
    flagsDetected: number;
  };
} 