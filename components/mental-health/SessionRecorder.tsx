'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import classNames from 'classnames';

interface SessionRecorderProps {
  sessionId: string;
  patientName: string;
  onTranscriptionUpdate?: (transcript: string) => void;
  onSessionEnd?: () => void;
  className?: string;
}

interface TranscriptionEvent {
  type: 'connection' | 'transcription' | 'error' | 'connection_closed' | 'heartbeat';
  transcript?: string;
  confidence?: number;
  is_final?: boolean;
  speaker?: number;
  timestamp?: string;
  error?: string;
}

export default function SessionRecorder({
  sessionId,
  patientName,
  onTranscriptionUpdate,
  onSessionEnd,
  className
}: SessionRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [transcriptionText, setTranscriptionText] = useState('');
  const [interimText, setInterimText] = useState('');
  const [sessionDuration, setSessionDuration] = useState(0);
  const [currentSpeaker, setCurrentSpeaker] = useState<number | null>(null);
  const [confidence, setConfidence] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [notes, setNotes] = useState('');
  const [importantMoments, setImportantMoments] = useState<Array<{
    timestamp: number;
    note: string;
  }>>([]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const intervalRef = useRef<number | null>(null);

  // Format duration for display
  const formatDuration = useCallback((seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Audio level monitoring
  const monitorAudioLevel = useCallback(() => {
    if (!analyserRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);
    
    const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
    setAudioLevel(Math.min(100, (average / 255) * 100));
    
    if (isRecording && !isPaused) {
      requestAnimationFrame(monitorAudioLevel);
    }
  }, [isRecording, isPaused]);

  // Start recording
  const startRecording = async () => {
    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,
        }
      });

      audioStreamRef.current = stream;

      // Set up audio level monitoring
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      analyserRef.current.fftSize = 256;

      // Set up MediaRecorder for sending audio to server
      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      // Connect to real-time transcription API
      eventSourceRef.current = new EventSource('/api/transcription/realtime', {
        withCredentials: true,
      });

      eventSourceRef.current.onopen = () => {
        setIsConnected(true);
        toast.success('Connected to transcription service');
      };

      eventSourceRef.current.onmessage = (event) => {
        try {
          const data: TranscriptionEvent = JSON.parse(event.data);
          
          switch (data.type) {
            case 'transcription':
              if (data.transcript) {
                if (data.is_final) {
                  setTranscriptionText(prev => prev + ' ' + data.transcript);
                  setInterimText('');
                  onTranscriptionUpdate?.(transcriptionText + ' ' + data.transcript);
                } else {
                  setInterimText(data.transcript);
                }
                
                setConfidence(data.confidence || 0);
                setCurrentSpeaker(data.speaker || null);
              }
              break;
            case 'error':
              toast.error(data.error || 'Transcription error');
              break;
            case 'connection_closed':
              setIsConnected(false);
              break;
          }
        } catch (error) {
          console.error('Error parsing transcription data:', error);
        }
      };

      eventSourceRef.current.onerror = () => {
        setIsConnected(false);
        toast.error('Transcription connection lost');
      };

      // Start recording
      setIsRecording(true);
      setIsPaused(false);
      startTimeRef.current = Date.now();
      
      // Start duration timer
      intervalRef.current = setInterval(() => {
        if (startTimeRef.current && !isPaused) {
          setSessionDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
        }
      }, 1000);

      // Start audio level monitoring
      monitorAudioLevel();

      toast.success('Recording started');

    } catch (error) {
      console.error('Error starting recording:', error);
      toast.error('Failed to start recording. Please check microphone permissions.');
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }

    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(track => track.stop());
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
    }

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    setIsRecording(false);
    setIsConnected(false);
    setAudioLevel(0);
    setIsPaused(false);

    onSessionEnd?.();
    toast.success('Recording stopped');
  };

  // Pause/Resume recording
  const togglePause = () => {
    setIsPaused(!isPaused);
    
    if (!isPaused) {
      toast('Recording paused');
    } else {
      toast.success('Recording resumed');
    }
  };

  // Mark important moment
  const markImportantMoment = () => {
    const timestamp = sessionDuration;
    const note = prompt('Add a note for this moment:') || 'Important moment';
    
    setImportantMoments(prev => [...prev, { timestamp, note }]);
    toast.success('Moment marked');
  };

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      if (isRecording) {
        stopRecording();
      }
    };
  }, []);

  return (
    <div className={classNames('bg-white rounded-lg shadow-lg p-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            Session Recording
          </h2>
          <p className="text-sm text-gray-600">
            Patient: {patientName}
          </p>
        </div>
        
        <div className="text-right">
          <div className="text-2xl font-mono text-gray-900">
            {formatDuration(sessionDuration)}
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className={classNames(
              'w-2 h-2 rounded-full',
              isConnected ? 'bg-green-500' : 'bg-red-500'
            )} />
            <span className="text-gray-600">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>
      </div>

      {/* Audio Level Indicator */}
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600 w-20">Audio Level:</span>
          <div className="flex-1 bg-gray-200 rounded-full h-3">
            <div 
              className={classNames(
                'h-3 rounded-full transition-all duration-150',
                audioLevel > 70 ? 'bg-red-500' : 
                audioLevel > 40 ? 'bg-yellow-500' : 
                'bg-green-500'
              )}
              style={{ width: `${audioLevel}%` }}
            />
          </div>
          <span className="text-sm text-gray-600 w-12">
            {Math.round(audioLevel)}%
          </span>
        </div>
      </div>

      {/* Main Controls */}
      <div className="flex items-center justify-center gap-4 mb-6">
        {!isRecording ? (
          <button
            onClick={startRecording}
            className="flex items-center gap-3 bg-red-600 hover:bg-red-700 text-white px-8 py-4 rounded-full text-lg font-semibold transition-colors"
          >
            <div className="w-4 h-4 bg-white rounded-full" />
            Start Session
          </button>
        ) : (
          <>
            <button
              onClick={togglePause}
              className={classNames(
                'flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors',
                isPaused 
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-yellow-600 hover:bg-yellow-700 text-white'
              )}
            >
              {isPaused ? '▶️ Resume' : '⏸️ Pause'}
            </button>
            
            <button
              onClick={stopRecording}
              className="flex items-center gap-2 bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              ⏹️ Stop
            </button>
            
            <button
              onClick={markImportantMoment}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg font-medium transition-colors"
            >
              📌 Mark
            </button>
          </>
        )}
      </div>

      {/* Transcription Display */}
      {isRecording && (
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium text-gray-900">Live Transcription</h3>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                {currentSpeaker !== null && (
                  <span>Speaker {currentSpeaker}</span>
                )}
                <span>Confidence: {Math.round(confidence * 100)}%</span>
              </div>
            </div>
            
            <div className="min-h-[120px] max-h-60 overflow-y-auto text-sm">
              <p className="text-gray-900 leading-relaxed">
                {transcriptionText}
                {interimText && (
                  <span className="text-gray-500 italic">
                    {' ' + interimText}
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Session Notes */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-2">Session Notes</h3>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add private notes during the session..."
              className="w-full h-20 text-sm border-0 bg-transparent resize-none focus:ring-0 placeholder-gray-500"
            />
          </div>

          {/* Important Moments */}
          {importantMoments.length > 0 && (
            <div className="bg-yellow-50 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-2">Important Moments</h3>
              <div className="space-y-2">
                {importantMoments.map((moment, index) => (
                  <div key={index} className="flex items-center gap-3 text-sm">
                    <span className="font-mono text-gray-600">
                      {formatDuration(moment.timestamp)}
                    </span>
                    <span className="text-gray-900">{moment.note}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Session Status */}
      {isRecording && (
        <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center gap-4">
            <span>Status: {isPaused ? 'Paused' : 'Recording'}</span>
            <span>Words: {transcriptionText.split(' ').filter(w => w.length > 0).length}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <div className={classNames(
              'w-2 h-2 rounded-full animate-pulse',
              isPaused ? 'bg-yellow-500' : 'bg-red-500'
            )} />
            <span>LIVE</span>
          </div>
        </div>
      )}
    </div>
  );
}