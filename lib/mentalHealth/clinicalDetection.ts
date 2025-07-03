import { ClinicalFlag, FlagType, FlagPattern, WordData } from '@/types/clinical-flags';

export class ClinicalFlagDetector {
  private patterns: Map<FlagType, FlagPattern[]>;
  
  constructor() {
    this.patterns = this.initializePatterns();
  }

  detectFlags(
    transcript: string, 
    words: WordData[], 
    previousFlags: ClinicalFlag[] = []
  ): ClinicalFlag[] {
    const flags: ClinicalFlag[] = [];
    const transcriptLower = transcript.toLowerCase();
    
    // 1. Direct keyword detection with context
    this.patterns.forEach((patterns, flagType) => {
      for (const pattern of patterns) {
        if (pattern.regex.test(transcriptLower)) {
          const match = transcriptLower.match(pattern.regex);
          if (match && match.index !== undefined) {
            // Get surrounding context (±50 words)
            const context = this.extractContext(transcript, match.index, 50);
            
            // Calculate confidence based on multiple factors
            const confidence = this.calculateConfidence({
              pattern,
              words: this.getWordsInRange(words, match.index, match[0].length),
              context,
              previousFlags
            });
            
            if (confidence >= pattern.minConfidence) {
              flags.push({
                id: crypto.randomUUID(),
                type: flagType,
                severity: pattern.severity,
                confidence,
                text: match[0],
                context,
                timestamp: words[0]?.start || Date.now(),
                metadata: pattern.metadata
              });
            }
          }
        }
      }
    });
    
    // 2. Contextual pattern detection (multi-phrase indicators)
    flags.push(...this.detectContextualPatterns(transcript, words));
    
    // 3. Behavioral pattern detection (speech patterns, pauses, etc.)
    flags.push(...this.detectBehavioralPatterns(words));
    
    // 4. Escalation detection (comparing to previous segments)
    flags.push(...this.detectEscalation(transcript, previousFlags));
    
    return this.deduplicateAndPrioritize(flags);
  }

  private initializePatterns(): Map<FlagType, FlagPattern[]> {
    return new Map([
      ['suicide_risk', [
        {
          regex: /\b(kill\s+myself|end\s+it\s+all|not\s+be\s+here|better\s+off\s+dead|suicide|suicidal)\b/i,
          severity: 'critical',
          minConfidence: 0.7,
          metadata: { immediate_action: true }
        },
        {
          regex: /\b(don't\s+want\s+to\s+live|wish\s+I\s+was\s+dead|can't\s+go\s+on|no\s+point\s+living)\b/i,
          severity: 'high',
          minConfidence: 0.75
        },
        {
          regex: /\b(thought\s+about\s+dying|imagine\s+being\s+dead|wonder\s+what\s+it's\s+like\s+to\s+die)\b/i,
          severity: 'medium',
          minConfidence: 0.8
        },
        // Indirect indicators
        {
          regex: /\b(giving\s+away\s+belongings|saying\s+goodbye|getting\s+affairs\s+in\s+order)\b/i,
          severity: 'high',
          minConfidence: 0.85,
          metadata: { indirect_indicator: true }
        }
      ]],
      
      ['self_harm', [
        {
          regex: /\b(cut\s+myself|cutting|burn\s+myself|hurt\s+myself|self[\s-]?harm)\b/i,
          severity: 'high',
          minConfidence: 0.75
        },
        {
          regex: /\b(deserve\s+pain|punish\s+myself|feel\s+something|need\s+to\s+hurt)\b/i,
          severity: 'medium',
          minConfidence: 0.8
        }
      ]],
      
      ['substance_abuse', [
        {
          regex: /\b(overdose|OD'd|using\s+again|relapsed|back\s+on\s+\w+)\b/i,
          severity: 'high',
          minConfidence: 0.7
        },
        {
          regex: /\b(drinking\s+every\s+day|need\s+\w+\s+to\s+function|can't\s+stop\s+using)\b/i,
          severity: 'medium',
          minConfidence: 0.75
        },
        {
          regex: /\b(blackout|don't\s+remember|lost\s+time|woke\s+up\s+and)\b/i,
          severity: 'medium',
          minConfidence: 0.85,
          metadata: { context_required: true }
        }
      ]],
      
      ['medication_noncompliance', [
        {
          regex: /\b(stopped\s+taking|haven't\s+taken|threw\s+away|flushed)\s+(?:my\s+)?(?:meds|medication|pills)\b/i,
          severity: 'high',
          minConfidence: 0.8
        },
        {
          regex: /\b(don't\s+need|don't\s+like|hate)\s+(?:my\s+)?(?:meds|medication|pills)\b/i,
          severity: 'medium',
          minConfidence: 0.85
        }
      ]],
      
      ['psychosis_indicators', [
        {
          regex: /\b(voices\s+tell|hearing\s+voices|they're\s+watching|being\s+followed|conspiracy)\b/i,
          severity: 'high',
          minConfidence: 0.7
        },
        {
          regex: /\b(special\s+powers|chosen\s+one|god\s+speaks\s+to\s+me|reading\s+my\s+thoughts)\b/i,
          severity: 'high',
          minConfidence: 0.75,
          metadata: { delusion_type: 'grandiose' }
        },
        {
          regex: /\b(not\s+real|in\s+the\s+walls|cameras\s+everywhere|poisoning\s+my\s+food)\b/i,
          severity: 'high',
          minConfidence: 0.75,
          metadata: { delusion_type: 'paranoid' }
        }
      ]],
      
      ['trauma_disclosure', [
        {
          regex: /\b(raped|molested|abused|touched\s+me|forced\s+me)\b/i,
          severity: 'high',
          minConfidence: 0.8,
          metadata: { sensitive_disclosure: true }
        },
        {
          regex: /\b(nightmares\s+about|flashbacks|can't\s+forget|keeps\s+coming\s+back)\b/i,
          severity: 'medium',
          minConfidence: 0.85,
          metadata: { ptsd_indicator: true }
        }
      ]],
      
      ['homicidal_ideation', [
        {
          regex: /\b(kill\s+(?:him|her|them)|hurt\s+(?:him|her|them)|make\s+them\s+pay)\b/i,
          severity: 'critical',
          minConfidence: 0.75,
          metadata: { immediate_action: true }
        }
      ]],
      
      ['severe_depression', [
        {
          regex: /\b(can't\s+get\s+out\s+of\s+bed|haven't\s+left\s+the\s+house|not\s+eating|lost\s+\d+\s+pounds)\b/i,
          severity: 'high',
          minConfidence: 0.8
        },
        {
          regex: /\b(worthless|hopeless|empty|numb|nothing\s+matters)\b/i,
          severity: 'medium',
          minConfidence: 0.85
        }
      ]],
      
      ['mania_indicators', [
        {
          regex: /\b(haven't\s+slept|don't\s+need\s+sleep|feel\s+invincible|so\s+much\s+energy)\b/i,
          severity: 'high',
          minConfidence: 0.75
        },
        {
          regex: /\b(spending\s+spree|maxed\s+out|bought\s+everything|can't\s+stop\s+talking)\b/i,
          severity: 'medium',
          minConfidence: 0.8
        }
      ]],
      
      ['dissociation', [
        {
          regex: /\b(not\s+in\s+my\s+body|watching\s+myself|floating|disconnected|not\s+real)\b/i,
          severity: 'medium',
          minConfidence: 0.8
        },
        {
          regex: /\b(lost\s+time|don't\s+remember\s+how\s+I\s+got|blank\s+spaces)\b/i,
          severity: 'high',
          minConfidence: 0.75
        }
      ]],
      
      ['eating_disorder', [
        {
          regex: /\b(purging|throwing\s+up|laxatives|starving\s+myself|binge\s+eating)\b/i,
          severity: 'high',
          minConfidence: 0.75
        },
        {
          regex: /\b(hate\s+my\s+body|too\s+fat|need\s+to\s+lose|counting\s+calories|scared\s+to\s+eat)\b/i,
          severity: 'medium',
          minConfidence: 0.8
        }
      ]],
      
      ['significant_stressor', [
        {
          regex: /\b(lost\s+my\s+job|getting\s+divorced|death\s+in\s+the\s+family|evicted|diagnosed\s+with)\b/i,
          severity: 'medium',
          minConfidence: 0.85
        }
      ]]
    ]);
  }

  private detectContextualPatterns(transcript: string, words: WordData[]): ClinicalFlag[] {
    const flags: ClinicalFlag[] = [];
    
    // Detect hopelessness (multiple indicators in proximity)
    const hopelessnessIndicators = [
      'no hope', 'pointless', 'give up', 'why bother', 'nothing matters',
      'don\'t care anymore', 'whatever happens'
    ];
    
    const foundIndicators = hopelessnessIndicators.filter(indicator => 
      transcript.toLowerCase().includes(indicator)
    );
    
    if (foundIndicators.length >= 3) {
      flags.push({
        id: crypto.randomUUID(),
        type: 'severe_depression',
        severity: 'high',
        confidence: Math.min(0.9, 0.7 + (foundIndicators.length * 0.05)),
        text: foundIndicators.join(', '),
        context: transcript,
        timestamp: words[0]?.start || Date.now(),
        metadata: { 
          pattern: 'multiple_hopelessness_indicators',
          indicator_count: foundIndicators.length
        }
      });
    }
    
    // Detect escalating emotional state
    const emotionIntensifiers = [
      'getting worse', 'can\'t take it', 'too much', 'overwhelming',
      'drowning', 'suffocating', 'breaking point', 'losing it'
    ];
    
    const intensifierCount = emotionIntensifiers.filter(phrase => 
      transcript.toLowerCase().includes(phrase)
    ).length;
    
    if (intensifierCount >= 2) {
      flags.push({
        id: crypto.randomUUID(),
        type: 'significant_stressor',
        severity: intensifierCount >= 3 ? 'high' : 'medium',
        confidence: 0.85,
        text: transcript.slice(0, 100) + '...',
        context: transcript,
        timestamp: words[0]?.start || Date.now(),
        metadata: { 
          pattern: 'emotional_escalation',
          intensity: intensifierCount
        }
      });
    }
    
    return flags;
  }

  private detectBehavioralPatterns(words: WordData[]): ClinicalFlag[] {
    const flags: ClinicalFlag[] = [];
    
    // Detect long pauses (potential dissociation or processing trauma)
    for (let i = 1; i < words.length; i++) {
      const pause = words[i].start - words[i-1].end;
      
      if (pause > 5.0) { // 5+ second pause
        const surroundingText = words
          .slice(Math.max(0, i-10), Math.min(words.length, i+10))
          .map(w => w.punctuated_word)
          .join(' ');
        
        // Check if pause follows sensitive content
        if (/\b(trauma|abuse|death|suicide|assault)\b/i.test(surroundingText)) {
          flags.push({
            id: crypto.randomUUID(),
            type: 'dissociation',
            severity: 'low',
            confidence: 0.7,
            text: `[${pause.toFixed(1)}s pause]`,
            context: surroundingText,
            timestamp: words[i-1].end,
            metadata: { 
              pause_duration: pause,
              following_sensitive_content: true
            }
          });
        }
      }
    }
    
    // Detect rapid speech (potential mania)
    const wordsPerMinute = this.calculateSpeechRate(words);
    if (wordsPerMinute > 180) {
      flags.push({
        id: crypto.randomUUID(),
        type: 'mania_indicators',
        severity: wordsPerMinute > 220 ? 'medium' : 'low',
        confidence: 0.75,
        text: `Rapid speech detected: ${wordsPerMinute} words/min`,
        context: words.map(w => w.punctuated_word).join(' '),
        timestamp: words[0].start,
        metadata: { 
          speech_rate: wordsPerMinute,
          pattern: 'pressured_speech'
        }
      });
    }
    
    return flags;
  }

  private detectEscalation(
    currentTranscript: string, 
    previousFlags: ClinicalFlag[]
  ): ClinicalFlag[] {
    const flags: ClinicalFlag[] = [];
    
    // Check if suicide risk is escalating
    const previousSuicideFlags = previousFlags.filter(f => f.type === 'suicide_risk');
    const currentSuicideKeywords = (currentTranscript.match(/\b(kill|die|suicide|dead)\b/gi) || []).length;
    
    if (previousSuicideFlags.length > 0 && currentSuicideKeywords > 2) {
      flags.push({
        id: crypto.randomUUID(),
        type: 'suicide_risk',
        severity: 'critical',
        confidence: 0.9,
        text: 'Escalating suicidal ideation detected',
        context: currentTranscript,
        timestamp: Date.now(),
        metadata: { 
          pattern: 'escalation',
          previous_flags: previousSuicideFlags.length,
          current_keywords: currentSuicideKeywords
        }
      });
    }
    
    return flags;
  }

  private calculateConfidence(params: {
    pattern: FlagPattern;
    words: WordData[];
    context: string;
    previousFlags: ClinicalFlag[];
  }): number {
    let confidence = params.pattern.minConfidence;
    
    // Boost confidence if words have high Deepgram confidence
    if (params.words.length > 0) {
      const avgWordConfidence = params.words.reduce((acc, w) => acc + w.confidence, 0) / params.words.length;
      confidence *= avgWordConfidence;
    }
    
    // Reduce if context suggests negation
    if (/\b(not|never|don't|didn't|wouldn't)\b/.test(params.context)) {
      confidence *= 0.8;
    }
    
    return Math.min(1.0, confidence);
  }

  // Helper methods
  private extractContext(text: string, index: number, wordCount: number): string {
    const words = text.split(/\s+/);
    const targetIndex = text.slice(0, index).split(/\s+/).length;
    const start = Math.max(0, targetIndex - wordCount);
    const end = Math.min(words.length, targetIndex + wordCount);
    
    return words.slice(start, end).join(' ');
  }

  private getWordsInRange(words: WordData[], index: number, length: number): WordData[] {
    // Implementation to find words within character range
    return words.filter(w => w.start >= index && w.start < index + length);
  }

  private calculateSpeechRate(words: WordData[]): number {
    if (words.length < 10) return 0;
    const duration = (words[words.length - 1].end - words[0].start) / 60;
    return Math.round(words.length / duration);
  }

  private deduplicateAndPrioritize(flags: ClinicalFlag[]): ClinicalFlag[] {
    // Remove duplicates and prioritize by severity and confidence
    const unique = new Map<string, ClinicalFlag>();
    
    flags
      .sort((a, b) => {
        const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        return (severityOrder[b.severity] - severityOrder[a.severity]) || 
               (b.confidence - a.confidence);
      })
      .forEach(flag => {
        const key = `${flag.type}-${flag.text.slice(0, 50)}`;
        if (!unique.has(key)) {
          unique.set(key, flag);
        }
      });
    
    return Array.from(unique.values());
  }
}

// Export singleton instance
export const clinicalFlagDetector = new ClinicalFlagDetector(); 