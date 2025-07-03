import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { experimental_wrapLanguageModel as wrapLanguageModel } from 'ai';
import env from '@/lib/env';

// Provider instances with custom configurations
export const openaiProvider = env.ai.openai.apiKey
  ? createOpenAI({
      apiKey: env.ai.openai.apiKey,
      organization: env.ai.openai.organization,
    })
  : null;

export const anthropicProvider = env.ai.anthropic.apiKey
  ? createAnthropic({
      apiKey: env.ai.anthropic.apiKey,
    })
  : null;

// Model registry with fallback support
export const models = {
  // OpenAI models
  'gpt-4o': openaiProvider ? openaiProvider('gpt-4o') : null,
  'gpt-4o-mini': openaiProvider ? openaiProvider('gpt-4o-mini') : null,
  'gpt-4-turbo': openaiProvider ? openaiProvider('gpt-4-turbo') : null,
  'gpt-3.5-turbo': openaiProvider ? openaiProvider('gpt-3.5-turbo') : null,
  
  // Anthropic models
  'claude-3-5-sonnet-20241022': anthropicProvider ? anthropicProvider('claude-3-5-sonnet-20241022') : null,
  'claude-3-5-haiku-20241022': anthropicProvider ? anthropicProvider('claude-3-5-haiku-20241022') : null,
  'claude-3-opus-20240229': anthropicProvider ? anthropicProvider('claude-3-opus-20240229') : null,
  'claude-3-sonnet-20240229': anthropicProvider ? anthropicProvider('claude-3-sonnet-20240229') : null,
  'claude-3-haiku-20240307': anthropicProvider ? anthropicProvider('claude-3-haiku-20240307') : null,
} as const;

export type ModelId = keyof typeof models;

// Get model with fallback to default
export function getModel(modelId?: ModelId | string) {
  if (!env.ai.enabled) {
    throw new Error('AI features are disabled');
  }

  const id = (modelId || env.ai.defaultModel) as ModelId;
  const model = models[id];
  
  if (!model) {
    throw new Error(`Model ${id} is not available. Please check your API keys.`);
  }
  
  return model;
}

// Model with rate limiting middleware
export function getModelWithRateLimit(modelId?: ModelId | string, userId?: string) {
  const model = getModel(modelId);
  
  // TODO: Implement rate limiting middleware
  // This is a placeholder for rate limiting logic
  return wrapLanguageModel({
    model,
    middleware: {
      async transformParams({ params, ...rest }) {
        // Add any global parameter transformations here
        return {
          ...params,
          maxTokens: params.maxTokens || env.ai.maxTokens,
          temperature: params.temperature || env.ai.temperature,
        };
      },
    },
  });
}

// Utility to check if a model is available
export function isModelAvailable(modelId: ModelId): boolean {
  return models[modelId] !== null;
}

// Get list of available models
export function getAvailableModels(): ModelId[] {
  return Object.entries(models)
    .filter(([_, model]) => model !== null)
    .map(([id]) => id as ModelId);
}

// Model metadata for UI display
export const modelMetadata: Record<ModelId, {
  name: string;
  provider: string;
  description: string;
  contextWindow: number;
  pricePerMillionTokens: { input: number; output: number };
}> = {
  'gpt-4o': {
    name: 'GPT-4o',
    provider: 'OpenAI',
    description: 'Most capable GPT-4 model with vision capabilities',
    contextWindow: 128000,
    pricePerMillionTokens: { input: 2.5, output: 10 },
  },
  'gpt-4o-mini': {
    name: 'GPT-4o Mini',
    provider: 'OpenAI',
    description: 'Affordable small model for simple tasks',
    contextWindow: 128000,
    pricePerMillionTokens: { input: 0.15, output: 0.6 },
  },
  'gpt-4-turbo': {
    name: 'GPT-4 Turbo',
    provider: 'OpenAI',
    description: 'High-performance GPT-4 with 128k context',
    contextWindow: 128000,
    pricePerMillionTokens: { input: 10, output: 30 },
  },
  'gpt-3.5-turbo': {
    name: 'GPT-3.5 Turbo',
    provider: 'OpenAI',
    description: 'Fast and affordable model for most tasks',
    contextWindow: 16385,
    pricePerMillionTokens: { input: 0.5, output: 1.5 },
  },
  'claude-3-5-sonnet-20241022': {
    name: 'Claude 3.5 Sonnet',
    provider: 'Anthropic',
    description: 'Most intelligent Claude model',
    contextWindow: 200000,
    pricePerMillionTokens: { input: 3, output: 15 },
  },
  'claude-3-5-haiku-20241022': {
    name: 'Claude 3.5 Haiku',
    provider: 'Anthropic',
    description: 'Fast and affordable Claude model',
    contextWindow: 200000,
    pricePerMillionTokens: { input: 0.8, output: 4 },
  },
  'claude-3-opus-20240229': {
    name: 'Claude 3 Opus',
    provider: 'Anthropic',
    description: 'Previous most capable Claude model',
    contextWindow: 200000,
    pricePerMillionTokens: { input: 15, output: 75 },
  },
  'claude-3-sonnet-20240229': {
    name: 'Claude 3 Sonnet',
    provider: 'Anthropic',
    description: 'Balanced performance and cost',
    contextWindow: 200000,
    pricePerMillionTokens: { input: 3, output: 15 },
  },
  'claude-3-haiku-20240307': {
    name: 'Claude 3 Haiku',
    provider: 'Anthropic',
    description: 'Fastest Claude model for simple tasks',
    contextWindow: 200000,
    pricePerMillionTokens: { input: 0.25, output: 1.25 },
  },
};