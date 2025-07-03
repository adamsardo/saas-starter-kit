import { useChat as useAIChat, useCompletion } from '@ai-sdk/react';
import useSWR from 'swr';
import { useRouter } from 'next/router';
import fetcher from '@/lib/fetcher';
import type { ModelId } from '@/lib/ai/config';
import toast from 'react-hot-toast';

// Custom hook for chat with team context
export function useTeamChat(options?: {
  initialMessages?: any[];
  onError?: (error: Error) => void;
}) {
  const router = useRouter();
  const { slug } = router.query as { slug: string };

  return useAIChat({
    api: `/api/teams/${slug}/ai/chat`,
    initialMessages: options?.initialMessages,
    onError: (error) => {
      console.error('Chat error:', error);
      toast.error(error.message || 'Failed to send message');
      options?.onError?.(error);
    },
  });
}

// Hook for text completion
export function useTeamCompletion(options?: {
  onError?: (error: Error) => void;
  onFinish?: (prompt: string, completion: string) => void;
}) {
  const router = useRouter();
  const { slug } = router.query as { slug: string };

  const completion = useCompletion({
    api: `/api/teams/${slug}/ai/completion`,
    onError: (error) => {
      console.error('Completion error:', error);
      toast.error(error.message || 'Failed to generate completion');
      options?.onError?.(error);
    },
    onFinish: options?.onFinish,
  });

  // Custom complete function that sends additional parameters
  const completeWithOptions = async (
    prompt: string,
    options?: {
      model?: ModelId;
      temperature?: number;
      maxTokens?: number;
      systemPrompt?: string;
    }
  ) => {
    try {
      const response = await fetch(`/api/teams/${slug}/ai/completion`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          ...options,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate completion');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Completion error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate completion');
      throw error;
    }
  };

  return {
    ...completion,
    completeWithOptions,
  };
}

// Hook for structured data generation
export function useGenerateObject<T = any>(schemaType?: string) {
  const router = useRouter();
  const { slug } = router.query as { slug: string };

  const generateObject = async (
    prompt: string,
    options?: {
      model?: ModelId;
      temperature?: number;
      maxTokens?: number;
      schemaType?: string;
      customSchema?: any;
    }
  ): Promise<{
    object: T;
    usage?: any;
    finishReason?: string;
    model: string;
  }> => {
    try {
      const response = await fetch(`/api/teams/${slug}/ai/generate-object`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          schemaType: options?.schemaType || schemaType,
          ...options,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate object');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Generate object error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate object');
      throw error;
    }
  };

  return {
    generateObject,
    isLoading: false, // You can add loading state management here
  };
}

// Hook to get available models
export function useAIModels() {
  const router = useRouter();
  const { slug } = router.query as { slug: string };

  const { data, error, isLoading, mutate } = useSWR(
    slug ? `/api/teams/${slug}/ai/models` : null,
    fetcher
  );

  return {
    models: data?.models || [],
    defaultModel: data?.defaultModel,
    isLoading,
    error,
    refetch: mutate,
  };
}

// Hook for AI usage analytics
export function useAIUsage(timeRange: 'day' | 'week' | 'month' = 'week') {
  const router = useRouter();
  const { slug } = router.query as { slug: string };

  const { data, error, isLoading, mutate } = useSWR(
    slug ? `/api/teams/${slug}/ai/usage?range=${timeRange}` : null,
    fetcher
  );

  return {
    usage: data?.usage || [],
    totalCost: data?.totalCost || 0,
    totalTokens: data?.totalTokens || 0,
    isLoading,
    error,
    refetch: mutate,
  };
}

// Hook for rate limit status
export function useAIRateLimit() {
  const router = useRouter();
  const { slug } = router.query as { slug: string };

  const { data, error, isLoading, mutate } = useSWR(
    slug ? `/api/teams/${slug}/ai/rate-limit` : null,
    fetcher,
    {
      refreshInterval: 60000, // Refresh every minute
    }
  );

  return {
    remaining: data?.remaining || 0,
    limit: data?.limit || 0,
    reset: data?.reset ? new Date(data.reset) : null,
    isLoading,
    error,
    refetch: mutate,
  };
}