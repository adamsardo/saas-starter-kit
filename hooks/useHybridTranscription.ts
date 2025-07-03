import { useState, useRef, useCallback, useEffect } from 'react';
import type { ClinicalFlag, TranscriptSegment } from '@/types/clinical-flags';

interface UseHybridTranscriptionOptions {
  sessionId: string;
  onFlagDetected?: (flags: ClinicalFlag[]) => void;
  onTranscriptUpdate?: (segments: TranscriptSegment[]) => void;
  onSessionComplete?: () => void;
}

export function useHybridTranscription({
  sessionId,
  onFlagDetected,
  onTranscriptUpdate,
  onSessionComplete,
}: UseHybridTranscriptionOptions) {
  const [flags, setFlags] = useState<ClinicalFlag[]>([]);
  const [partialTranscript, setPartialTranscript] = useState('');
  const [transcriptSegments, setTranscriptSegments] = useState<TranscriptSegment[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [error, setError] = useState<string | null>(null);
  
  const wsRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingStartTimeRef = useRef<number | null>(null);

  // Get WebSocket URL from API
  const getWebSocketUrl = async () => {
    try {
      const response = await fetch(`/api/sessions/${sessionId}/ws-url`);
      if (!response.ok) throw new Error('Failed to get WebSocket URL');
      const { wsUrl } = await response.json();
      return wsUrl;
    } catch (error) {
      // Fallback to default URL
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      return `${protocol}//${window.location.host}/api/sessions/${sessionId}/transcribe`;
    }
  };

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      setConnectionStatus('connecting');
      
      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
        } 
      });
      
      // Set up media recorder
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
        ? 'audio/webm;codecs=opus' 
        : 'audio/webm';
      
      const mediaRecorder = new MediaRecorder(stream, { 
        mimeType,
        audioBitsPerSecond: 128000 // 128kbps for good quality
      });
      
      // Connect WebSocket
      const wsUrl = await getWebSocketUrl();
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      
      ws.onopen = () => {
        console.log('WebSocket connected');
        setConnectionStatus('connected');
        ws.send(JSON.stringify({ 
          type: 'start',
          sessionId,
        }));
      };
      
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        switch (data.type) {
          case 'clinical_flags':
            const newFlags = data.flags as ClinicalFlag[];
            setFlags(prev => [...prev, ...newFlags]);
            onFlagDetected?.(newFlags);
            
            // Show notification for critical flags
            const criticalFlags = newFlags.filter(f => f.severity === 'critical');
            if (criticalFlags.length > 0 && 'Notification' in window && Notification.permission === 'granted') {
              new Notification('⚠️ Critical Clinical Alert', {
                body: `${criticalFlags.length} critical flag(s) detected in session`,
                icon: '/logo.png',
                requireInteraction: true,
              });
            }
            break;
            
          case 'transcript':
            const segment: TranscriptSegment = {
              speaker: data.speaker,
              text: data.text,
              timestamp: data.timestamp,
              confidence: data.confidence,
              isFinal: data.isFinal,
              words: data.words,
            };
            
            if (data.isFinal) {
              setTranscriptSegments(prev => {
                const updated = [...prev];
                const interimIndex = updated.findIndex(
                  s => !s.isFinal && s.timestamp === data.timestamp
                );
                if (interimIndex >= 0) {
                  updated[interimIndex] = segment;
                } else {
                  updated.push(segment);
                }
                onTranscriptUpdate?.(updated);
                return updated;
              });
            } else {
              setPartialTranscript(data.text);
            }
            break;
            
          case 'error':
            setError(data.message);
            break;
        }
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setError('Connection error occurred');
        setConnectionStatus('disconnected');
      };
      
      ws.onclose = () => {
        console.log('WebSocket disconnected');
        setConnectionStatus('disconnected');
      };
      
      // Handle audio recording
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
          
          // Send audio chunk to WebSocket
          if (ws.readyState === WebSocket.OPEN) {
            event.data.arrayBuffer().then(buffer => {
              ws.send(buffer);
            });
          }
        }
      };
      
      mediaRecorder.onstop = async () => {
        // Create complete audio file
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        
        // Upload for batch processing
        await uploadAudioForBatchProcessing(audioBlob);
      };
      
      // Start recording
      mediaRecorder.start(250); // Send chunks every 250ms
      mediaRecorderRef.current = mediaRecorder;
      recordingStartTimeRef.current = Date.now();
      setIsRecording(true);
      setIsPaused(false);
      
    } catch (err) {
      console.error('Failed to start recording:', err);
      setError(err instanceof Error ? err.message : 'Failed to start recording');
      setConnectionStatus('disconnected');
    }
  }, [sessionId, onFlagDetected, onTranscriptUpdate]);

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      wsRef.current?.send(JSON.stringify({ type: 'pause' }));
      setIsPaused(true);
    }
  }, []);

  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      wsRef.current?.send(JSON.stringify({ type: 'resume' }));
      setIsPaused(false);
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.send(JSON.stringify({ type: 'end_session' }));
      wsRef.current.close();
    }
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
    
    setIsRecording(false);
    setIsPaused(false);
    onSessionComplete?.();
  }, [onSessionComplete]);

  // Upload audio for batch processing
  const uploadAudioForBatchProcessing = async (audioBlob: Blob) => {
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, `session-${sessionId}.webm`);
      formData.append('sessionId', sessionId);
      formData.append('duration', String(Date.now() - (recordingStartTimeRef.current || 0)));
      
      const response = await fetch(`/api/sessions/${sessionId}/upload`, {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Failed to upload recording');
      }
      
      const result = await response.json();
      console.log('Audio uploaded for batch processing:', result);
      
    } catch (error) {
      console.error('Failed to upload audio:', error);
      setError('Failed to save recording for processing');
    }
  };

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isRecording) {
        stopRecording();
      }
    };
  }, [isRecording, stopRecording]);

  return {
    // State
    flags,
    partialTranscript,
    transcriptSegments,
    isRecording,
    isPaused,
    connectionStatus,
    error,
    
    // Actions
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    
    // Computed
    duration: recordingStartTimeRef.current 
      ? Math.floor((Date.now() - recordingStartTimeRef.current) / 1000)
      : 0,
  };
} 