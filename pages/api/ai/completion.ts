import { generateText } from 'ai';
import type { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from '@/lib/session';
import { throwIfNoTeamAccess } from '../../../models/team';
import { getModel, ModelId } from '@/lib/ai/config';
import { 
  checkRateLimit, 
  incrementRateLimit, 
  sanitizePrompt,
  validatePromptLength,
  logAIUsage,
  isAIEnabledForTeam,
} from '@/lib/ai/utils';
import env from '@/lib/env';

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
    const { 
      prompt, 
      model: requestedModel,
      temperature,
      maxTokens,
      systemPrompt,
    } = req.body;

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Prompt string is required' });
    }

    // Sanitize prompt
    const sanitizedPrompt = sanitizePrompt(prompt);
    const sanitizedSystemPrompt = systemPrompt ? sanitizePrompt(systemPrompt) : undefined;

    // Get the model
    const modelId = (requestedModel || env.ai.defaultModel) as ModelId;
    let model;
    try {
      model = getModel(modelId);
    } catch (error) {
      return res.status(400).json({ error: error instanceof Error ? error.message : 'Invalid model' });
    }

    // Validate prompt length
    const fullPrompt = [sanitizedSystemPrompt, sanitizedPrompt].filter(Boolean).join('\n');
    if (!validatePromptLength(fullPrompt, modelId)) {
      return res.status(400).json({ error: 'Prompt is too long for the selected model' });
    }

    // Increment rate limit
    const allowed = await incrementRateLimit(userId, teamId);
    if (!allowed) {
      return res.status(429).json({ error: 'Rate limit exceeded' });
    }

    // Generate text
    const { text, usage, finishReason } = await generateText({
      model,
      prompt: sanitizedPrompt,
      system: sanitizedSystemPrompt,
      temperature: temperature ?? env.ai.temperature,
      maxTokens: maxTokens ?? env.ai.maxTokens,
    });

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
          type: 'completion',
        },
      });
    }

    // Return response with rate limit headers
    res.setHeader('X-RateLimit-Limit', rateLimitStatus.limit.toString());
    res.setHeader('X-RateLimit-Remaining', (rateLimitStatus.remaining - 1).toString());
    res.setHeader('X-RateLimit-Reset', rateLimitStatus.reset.toISOString());

    return res.status(200).json({
      text,
      usage,
      finishReason,
      model: modelId,
    });

  } catch (error) {
    console.error('AI Completion Error:', error);
    return res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    });
  }
}