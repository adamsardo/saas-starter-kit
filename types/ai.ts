import { Message } from 'ai';
import { ModelId } from '@/lib/ai/config';

export interface AIConversation {
  id: string;
  teamId: string;
  userId: string;
  title: string;
  model: ModelId;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, any>;
}

export interface AIUsageRecord {
  id: string;
  teamId: string;
  userId: string;
  model: ModelId;
  tokensUsed: number;
  cost: number;
  timestamp: Date;
  conversationId?: string;
  metadata?: Record<string, any>;
}

export interface AIRateLimitStatus {
  remaining: number;
  limit: number;
  reset: Date;
}

export interface AIToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, any>;
  execute: (params: any) => Promise<any>;
}

export interface AIWorkflow {
  id: string;
  teamId: string;
  name: string;
  description?: string;
  steps: AIWorkflowStep[];
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface AIWorkflowStep {
  id: string;
  type: 'prompt' | 'tool' | 'condition' | 'loop';
  config: Record<string, any>;
  nextSteps?: string[];
}

export interface AIAgent {
  id: string;
  teamId: string;
  name: string;
  description?: string;
  systemPrompt: string;
  model: ModelId;
  tools?: string[]; // Tool IDs
  temperature?: number;
  maxTokens?: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface AIPromptTemplate {
  id: string;
  teamId: string;
  name: string;
  description?: string;
  template: string;
  variables: string[];
  category?: string;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface AIGenerationOptions {
  model?: ModelId;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stopSequences?: string[];
  seed?: number;
}

export interface AIStreamingOptions extends AIGenerationOptions {
  onToken?: (token: string) => void;
  onFinish?: (text: string, usage?: TokenUsage) => void;
  onError?: (error: Error) => void;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}