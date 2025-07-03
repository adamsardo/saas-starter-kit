import { streamText } from 'ai';
import type { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from '@/lib/session';
import { throwIfNoTeamAccess } from '../../../models/team';
import { getModel } from '@/lib/ai/config';
import { 
  checkRateLimit, 
  incrementRateLimit, 
  sanitizePrompt,
  validatePromptLength,
  logAIUsage,
  isAIEnabledForTeam,
} from '@/lib/ai/utils';
import { aiTools } from '@/lib/ai/tools';
import env from '@/lib/env';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check authentication
    const session = await getSession(req, res);
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get team access
    const teamMember = await throwIfNoTeamAccess(req, res);
    const teamId = teamMember.team.id;
    const userId = session.user.id;

    // Check if AI features are enabled for the team
    if (!await isAIEnabledForTeam(teamId)) {
      return res.status(403).json({ error: 'AI features are not enabled for this team' });
    }

    // Check rate limit
    const rateLimitStatus = await checkRateLimit(userId, teamId);
    if (rateLimitStatus.remaining <= 0) {
      return res.status(429).json({ 
        error: 'Rate limit exceeded',
        resetAt: rateLimitStatus.reset,
      });
    }

    // Parse request body
    const { messages, model: requestedModel, tools: enableTools = false } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    // Sanitize all message contents
    const sanitizedMessages = messages.map(msg => ({
      ...msg,
      content: typeof msg.content === 'string' ? sanitizePrompt(msg.content) : msg.content,
    }));

    // Get the model
    const modelId = requestedModel || env.ai.defaultModel;
    let model;
    try {
      model = getModel(modelId);
    } catch (error) {
      return res.status(400).json({ error: error instanceof Error ? error.message : 'Invalid model' });
    }

    // Validate prompt length
    const fullPrompt = sanitizedMessages.map(m => 
      typeof m.content === 'string' ? m.content : JSON.stringify(m.content)
    ).join('\n');
    
    if (!validatePromptLength(fullPrompt, modelId)) {
      return res.status(400).json({ error: 'Prompt is too long for the selected model' });
    }

    // Increment rate limit
    const allowed = await incrementRateLimit(userId, teamId);
    if (!allowed) {
      return res.status(429).json({ error: 'Rate limit exceeded' });
    }

    // Stream the response
    const result = streamText({
      model,
      messages: sanitizedMessages,
      tools: enableTools ? aiTools : undefined,
      onFinish: async ({ text, usage, finishReason }) => {
        // Log usage for billing and analytics
        if (usage) {
          await logAIUsage({
            teamId,
            userId,
            model: modelId,
            usage: {
              promptTokens: usage.promptTokens,
              completionTokens: usage.completionTokens,
              totalTokens: usage.totalTokens,
            },
            metadata: {
              finishReason,
              toolsEnabled: enableTools,
            },
          });
        }
      },
    });

    // Convert to data stream response
    // Note: In Next.js Pages Router, we need to handle streaming differently
    // The AI SDK's toDataStreamResponse is designed for App Router
    // For Pages Router, we'll use a different approach
    
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');

    const stream = result.toDataStream();
    const reader = stream.getReader();
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        res.write(chunk);
      }
    } finally {
      res.end();
    }

  } catch (error) {
    console.error('AI Chat Error:', error);
    
    // If headers haven't been sent yet, send error response
    if (!res.headersSent) {
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Internal server error' 
      });
    }
  }
}