import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button, Badge } from 'react-daisyui';
import { Card, Alert } from '@/components/shared';
import { useRouter } from 'next/router';
import { ClinicalFlagsList } from './ClinicalFlagAlert';
import type { ClinicalFlag } from '@/types/clinical-flags';

interface TranscriptSegment {
  speaker: number;
  text: string;
  timestamp: number;
  confidence: number;
  isFinal: boolean;
}

interface SessionRecordingProps {
  sessionId: string;
  patientName: string;
  therapistName: string;
  onTranscriptUpdate?: (segments: TranscriptSegment[]) => void;
  onSessionComplete?: () => void;
}

export const SessionRecording: React.FC<SessionRecordingProps> = ({
  sessionId,
  patientName,
  therapistName,
  onTranscriptUpdate,
  onSessionComplete,
}) => {
  const router = useRouter();
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [transcriptSegments, setTranscriptSegments] = useState<TranscriptSegment[]>([]);
  const [audioLevel, setAudioLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [clinicalFlags, setClinicalFlags] = useState<ClinicalFlag[]>([]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const websocketRef = useRef<WebSocket | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const recordingStartTimeRef = useRef<number | null>(null);

  // Initialize audio context and analyser
  const initializeAudio = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } 
      });

      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);

      // Set up media recorder
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
        ? 'audio/webm;codecs=opus' 
        : 'audio/webm';
      
      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType });

      // Monitor audio levels
      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
      const checkAudioLevel = () => {
        if (analyserRef.current && isRecording) {
          analyserRef.current.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
          setAudioLevel(Math.min(100, (average / 128) * 100));
          requestAnimationFrame(checkAudioLevel);
        }
      };
      checkAudioLevel();

      return stream;
    } catch (err) {
      console.error('Error accessing microphone:', err);
      setError('Unable to access microphone. Please check your permissions.');
      throw err;
    }
  };

  // Connect to WebSocket for real-time transcription
  const connectWebSocket = useCallback(() => {
    setConnectionStatus('connecting');
    
    const ws = new WebSocket(`${process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3000'}/api/sessions/${sessionId}/transcribe`);
    
    ws.onopen = () => {
      console.log('WebSocket connected');
      setConnectionStatus('connected');
      ws.send(JSON.stringify({ 
        type: 'start',
        sessionId,
        therapistName,
        patientName,
      }));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'transcript') {
        const newSegment: TranscriptSegment = {
          speaker: data.speaker,
          text: data.text,
          timestamp: data.timestamp,
          confidence: data.confidence,
          isFinal: data.isFinal,
        };

        setTranscriptSegments(prev => {
          const updated = [...prev];
          if (data.isFinal) {
            // Replace interim result with final
            const interimIndex = updated.findIndex(
              s => !s.isFinal && s.timestamp === data.timestamp
            );
            if (interimIndex >= 0) {
              updated[interimIndex] = newSegment;
            } else {
              updated.push(newSegment);
            }
          } else {
            // Add or update interim result
            const existingIndex = updated.findIndex(
              s => !s.isFinal && s.speaker === data.speaker
            );
            if (existingIndex >= 0) {
              updated[existingIndex] = newSegment;
            } else {
              updated.push(newSegment);
            }
          }
          
          onTranscriptUpdate?.(updated);
          return updated;
        });
      } else if (data.type === 'clinical_flags') {
        // Handle clinical flags
        setClinicalFlags(prev => [...prev, ...data.flags]);
        
        // Show notification for critical flags
        const criticalFlags = data.flags.filter((f: ClinicalFlag) => f.severity === 'critical');
        if (criticalFlags.length > 0) {
          // You could implement a more sophisticated notification system here
          console.error('CRITICAL FLAGS DETECTED:', criticalFlags);
        }
      } else if (data.type === 'error') {
        setError(data.message);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setError('Connection error. Please check your internet connection.');
      setConnectionStatus('disconnected');
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setConnectionStatus('disconnected');
    };

    websocketRef.current = ws;
  }, [sessionId, patientName, therapistName, onTranscriptUpdate]);

  // Start recording
  const startRecording = async () => {
    try {
      setError(null);
      setIsProcessing(true);
      setClinicalFlags([]); // Reset flags for new recording

      await initializeAudio();
      connectWebSocket();

      if (mediaRecorderRef.current) {
        const chunks: Blob[] = [];

        mediaRecorderRef.current.ondataavailable = (event) => {
          if (event.data.size > 0) {
            chunks.push(event.data);
            // Send audio chunk to server
            if (websocketRef.current?.readyState === WebSocket.OPEN) {
              event.data.arrayBuffer().then(buffer => {
                websocketRef.current?.send(buffer);
              });
            }
          }
        };

        mediaRecorderRef.current.onstop = async () => {
          const blob = new Blob(chunks, { type: 'audio/webm' });
          // Upload complete recording
          await uploadRecording(blob);
        };

        mediaRecorderRef.current.start(1000); // Collect data every second
        setIsRecording(true);
        setIsPaused(false);
        recordingStartTimeRef.current = Date.now();

        // Start duration timer
        durationIntervalRef.current = setInterval(() => {
          setDuration(Math.floor((Date.now() - recordingStartTimeRef.current!) / 1000));
        }, 1000);
      }
    } catch (err) {
      setError('Failed to start recording');
    } finally {
      setIsProcessing(false);
    }
  };

  // Pause/Resume recording
  const togglePause = () => {
    if (!mediaRecorderRef.current) return;

    if (isPaused) {
      mediaRecorderRef.current.resume();
      websocketRef.current?.send(JSON.stringify({ type: 'resume' }));
    } else {
      mediaRecorderRef.current.pause();
      websocketRef.current?.send(JSON.stringify({ type: 'pause' }));
    }
    setIsPaused(!isPaused);
  };

  // Stop recording
  const stopRecording = async () => {
    setIsProcessing(true);
    
    if (mediaRecorderRef.current?.state !== 'inactive') {
      mediaRecorderRef.current?.stop();
    }

    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
    }

    websocketRef.current?.send(JSON.stringify({ type: 'stop' }));
    websocketRef.current?.close();

    // Stop all audio tracks
    mediaRecorderRef.current?.stream.getTracks().forEach(track => track.stop());

    setIsRecording(false);
    setIsPaused(false);
    setIsProcessing(false);

    onSessionComplete?.();
  };

  // Upload recording to server
  const uploadRecording = async (blob: Blob) => {
    const formData = new FormData();
    formData.append('audio', blob, `session-${sessionId}.webm`);
    formData.append('sessionId', sessionId);
    formData.append('duration', duration.toString());

    try {
      const response = await fetch(`/api/sessions/${sessionId}/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload recording');
      }
    } catch (err) {
      console.error('Upload error:', err);
      setError('Failed to upload recording. It will be saved locally.');
    }
  };

  // Add marker/note during recording
  const addMarker = (type: 'important' | 'concern' | 'intervention') => {
    if (!isRecording || !websocketRef.current) return;

    const marker = {
      type: 'marker',
      markerType: type,
      timestamp: Date.now() - recordingStartTimeRef.current!,
      note: '',
    };

    websocketRef.current.send(JSON.stringify(marker));
    
    // Add visual indicator to transcript
    setTranscriptSegments(prev => [...prev, {
      speaker: -1, // Special marker for non-speech events
      text: `[${type.toUpperCase()} MARKER]`,
      timestamp: marker.timestamp,
      confidence: 1,
      isFinal: true,
    }]);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isRecording) {
        stopRecording();
      }
    };
  }, [isRecording]);

  // Format speaker name
  const getSpeakerName = (speaker: number) => {
    if (speaker === -1) return '';
    return speaker === 0 ? therapistName : patientName;
  };

  const handleAcknowledgeFlag = (flagId: string, notes?: string) => {
    setClinicalFlags(prev => 
      prev.map(flag => 
        flag.id === flagId 
          ? { ...flag, acknowledged: true, acknowledgedAt: new Date(), notes }
          : flag
      )
    );
  };

  return (
    <div className="space-y-4">
      {/* Clinical Flags Alert */}
      {clinicalFlags.length > 0 && (
        <ClinicalFlagsList
          flags={clinicalFlags}
          onAcknowledge={handleAcknowledgeFlag}
          showActions={true}
          maxFlags={5}
        />
      )}

      {/* Recording Controls */}
      <Card>
        <Card.Body>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Session Recording</h3>
            <div className="flex items-center gap-2">
              <Badge color={connectionStatus === 'connected' ? 'success' : connectionStatus === 'connecting' ? 'warning' : 'error'}>
                {connectionStatus}
              </Badge>
              {isRecording && (
                <Badge color="error" className="animate-pulse">
                  REC
                </Badge>
              )}
            </div>
          </div>

          {error && (
            <Alert className="mb-4" status="error">
              {error}
            </Alert>
          )}

          <div className="flex flex-col items-center space-y-4">
            {/* Duration Display */}
            <div className="text-3xl font-mono">
              {Math.floor(duration / 60).toString().padStart(2, '0')}:
              {(duration % 60).toString().padStart(2, '0')}
            </div>

            {/* Audio Level Indicator */}
            {isRecording && (
              <div className="w-full max-w-xs">
                <div className="flex items-center gap-2">
                  <span className="text-sm">Audio Level:</span>
                  <div className="flex-1 bg-base-300 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-primary h-full transition-all duration-100"
                      style={{ width: `${audioLevel}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Control Buttons */}
            <div className="flex gap-2">
              {!isRecording ? (
                <Button
                  size="lg"
                  color="primary"
                  onClick={startRecording}
                  disabled={isProcessing}
                  className="min-w-[120px]"
                >
                  {isProcessing ? (
                    <span className="loading loading-spinner" />
                  ) : (
                    'Start Session'
                  )}
                </Button>
              ) : (
                <>
                  <Button
                    size="lg"
                    color="warning"
                    onClick={togglePause}
                    disabled={isProcessing}
                  >
                    {isPaused ? 'Resume' : 'Pause'}
                  </Button>
                  <Button
                    size="lg"
                    color="error"
                    onClick={stopRecording}
                    disabled={isProcessing}
                  >
                    End Session
                  </Button>
                </>
              )}
            </div>

            {/* Quick Markers */}
            {isRecording && !isPaused && (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  color="info"
                  variant="outline"
                  onClick={() => addMarker('important')}
                >
                  Mark Important
                </Button>
                <Button
                  size="sm"
                  color="warning"
                  variant="outline"
                  onClick={() => addMarker('concern')}
                >
                  Flag Concern
                </Button>
                <Button
                  size="sm"
                  color="success"
                  variant="outline"
                  onClick={() => addMarker('intervention')}
                >
                  Note Intervention
                </Button>
              </div>
            )}
          </div>
        </Card.Body>
      </Card>

      {/* Live Transcript */}
      {transcriptSegments.length > 0 && (
        <Card>
          <Card.Body>
            <h3 className="text-lg font-semibold mb-4">Live Transcript</h3>
            <div className="max-h-96 overflow-y-auto space-y-2">
              {transcriptSegments.map((segment, index) => (
                <div
                  key={index}
                  className={`p-2 rounded ${
                    segment.speaker === -1
                      ? 'bg-warning text-warning-content'
                      : segment.speaker === 0
                      ? 'bg-primary/10'
                      : 'bg-secondary/10'
                  } ${!segment.isFinal ? 'opacity-60' : ''}`}
                >
                  {segment.speaker !== -1 && (
                    <div className="font-semibold text-sm mb-1">
                      {getSpeakerName(segment.speaker)}
                    </div>
                  )}
                  <div className="text-sm">{segment.text}</div>
                  {segment.confidence < 0.8 && segment.isFinal && (
                    <div className="text-xs text-warning mt-1">
                      Low confidence ({Math.round(segment.confidence * 100)}%)
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card.Body>
        </Card>
      )}
    </div>
  );
}; 