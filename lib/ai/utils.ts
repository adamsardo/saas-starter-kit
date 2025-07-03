import { encoding_for_model } from 'tiktoken';
import { ModelId, modelMetadata } from './config';
import env from '@/lib/env';

// Define types inline to avoid circular dependencies
export interface AIRateLimitStatus {
  remaining: number;
  limit: number;
  reset: Date;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

// Token counting utilities
const encodingCache = new Map<string, any>();

export function getTokenCount(text: string, model: ModelId): number {
  try {
    // Map model to tiktoken model name
    const modelMap: Record<string, string> = {
      'gpt-4o': 'gpt-4o',
      'gpt-4o-mini': 'gpt-4o-mini',
      'gpt-4-turbo': 'gpt-4-turbo',
      'gpt-3.5-turbo': 'gpt-3.5-turbo',
      // Claude models use similar tokenization to GPT-4
      'claude-3-5-sonnet-20241022': 'gpt-4',
      'claude-3-5-haiku-20241022': 'gpt-4',
      'claude-3-opus-20240229': 'gpt-4',
      'claude-3-sonnet-20240229': 'gpt-4',
      'claude-3-haiku-20240307': 'gpt-4',
    };

    const modelName = modelMap[model] || 'gpt-4';
    let encoding = encodingCache.get(modelName);
    
    if (!encoding) {
      encoding = encoding_for_model(modelName as any);
      encodingCache.set(modelName, encoding);
    }

    const tokens = encoding.encode(text);
    return tokens.length;
  } catch (error) {
    // Fallback to approximation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }
}

// Calculate cost based on token usage
export function calculateCost(usage: TokenUsage, model: ModelId): number {
  const metadata = modelMetadata[model];
  if (!metadata) return 0;

  const inputCost = (usage.promptTokens / 1_000_000) * metadata.pricePerMillionTokens.input;
  const outputCost = (usage.completionTokens / 1_000_000) * metadata.pricePerMillionTokens.output;
  
  return inputCost + outputCost;
}

// Rate limiting utilities - In-memory implementation
const rateLimitCache = new Map<string, { count: number; resetTime: number }>();

export async function checkRateLimit(
  userId: string,
  teamId: string
): Promise<AIRateLimitStatus> {
  const key = `ai:ratelimit:${teamId}:${userId}`;
  const now = Date.now();
  const cached = rateLimitCache.get(key);

  if (!cached || cached.resetTime < now) {
    // Reset the rate limit
    return {
      remaining: env.ai.rateLimitPerUser,
      limit: env.ai.rateLimitPerUser,
      reset: new Date(now + env.ai.rateLimitWindow * 1000),
    };
  }

  const remaining = Math.max(0, env.ai.rateLimitPerUser - cached.count);
  return {
    remaining,
    limit: env.ai.rateLimitPerUser,
    reset: new Date(cached.resetTime),
  };
}

export async function incrementRateLimit(
  userId: string,
  teamId: string
): Promise<boolean> {
  const key = `ai:ratelimit:${teamId}:${userId}`;
  const now = Date.now();
  const cached = rateLimitCache.get(key);

  if (!cached || cached.resetTime < now) {
    // Start new window
    rateLimitCache.set(key, {
      count: 1,
      resetTime: now + env.ai.rateLimitWindow * 1000,
    });
    return true;
  }

  if (cached.count >= env.ai.rateLimitPerUser) {
    return false; // Rate limit exceeded
  }

  // Increment count
  cached.count++;
  rateLimitCache.set(key, cached);
  return true;
}

// Content moderation utilities
export function sanitizePrompt(prompt: string): string {
  // Remove potential injection attempts
  return prompt
    .replace(/\[INST\]/gi, '')
    .replace(/\[\/INST\]/gi, '')
    .replace(/\<\|im_start\|\>/gi, '')
    .replace(/\<\|im_end\|\>/gi, '')
    .replace(/\<\|system\|\>/gi, '')
    .replace(/\<\|user\|\>/gi, '')
    .replace(/\<\|assistant\|\>/gi, '')
    .trim();
}

// Validate prompt length
export function validatePromptLength(prompt: string, model: ModelId): boolean {
  const metadata = modelMetadata[model];
  if (!metadata) return true;

  const tokenCount = getTokenCount(prompt, model);
  // Reserve some tokens for the response
  const maxPromptTokens = Math.floor(metadata.contextWindow * 0.8);
  
  return tokenCount <= maxPromptTokens;
}

// Format messages for different providers
export function formatMessagesForProvider(
  messages: any[],
  provider: 'openai' | 'anthropic'
): any[] {
  if (provider === 'anthropic') {
    // Anthropic requires alternating user/assistant messages
    const formatted: any[] = [];
    let lastRole = '';
    
    for (const msg of messages) {
      if (msg.role === 'system') {
        // Anthropic doesn't have system role, prepend to first user message
        continue;
      }
      
      if (msg.role === lastRole && msg.role === 'user') {
        // Merge consecutive user messages
        formatted[formatted.length - 1].content += '\n' + msg.content;
      } else {
        formatted.push({ ...msg });
        lastRole = msg.role;
      }
    }
    
    return formatted;
  }
  
  return messages;
}

// Extract title from conversation
export function extractConversationTitle(messages: any[]): string {
  const firstUserMessage = messages.find((m: any) => m.role === 'user');
  if (!firstUserMessage) return 'New Conversation';
  
  const content = firstUserMessage.content;
  if (typeof content !== 'string') return 'New Conversation';
  
  // Take first 50 characters or until first punctuation
  const title = content.slice(0, 50).split(/[.!?]/)[0].trim();
  return title || 'New Conversation';
}

// Check if AI features are enabled for a team
export async function isAIEnabledForTeam(teamId: string): Promise<boolean> {
  // TODO: Implement team-specific AI feature flags
  // For now, use global setting
  return env.ai.enabled;
}

// Log AI usage for analytics and billing
export async function logAIUsage(data: {
  teamId: string;
  userId: string;
  model: ModelId;
  usage: TokenUsage;
  conversationId?: string;
  metadata?: Record<string, any>;
}): Promise<void> {
  const cost = calculateCost(data.usage, data.model);
  
  // TODO: Implement database logging
  // For now, just console log
  console.log('AI Usage:', {
    ...data,
    cost,
    timestamp: new Date(),
  });
}