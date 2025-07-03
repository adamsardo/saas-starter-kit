import { generateObject } from 'ai';
import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { getSession } from '@/lib/session';
import { throwIfNoTeamAccess } from '../../../models/team';
import { getModel, ModelId } from '@/lib/ai/config';
import { 
  checkRateLimit, 
  incrementRateLimit, 
  sanitizePrompt,
  logAIUsage,
  isAIEnabledForTeam,
} from '@/lib/ai/utils';
import env from '@/lib/env';

// Example schemas that can be used
const schemas = {
  // Extract person information
  person: z.object({
    name: z.string().describe('Full name of the person'),
    age: z.number().optional().describe('Age of the person if mentioned'),
    occupation: z.string().optional().describe('Occupation or job title'),
    email: z.string().email().optional().describe('Email address if found'),
    phone: z.string().optional().describe('Phone number if found'),
  }),
  
  // Extract company information
  company: z.object({
    name: z.string().describe('Company name'),
    industry: z.string().optional().describe('Industry or sector'),
    size: z.enum(['small', 'medium', 'large', 'enterprise']).optional(),
    website: z.string().url().optional().describe('Company website'),
    description: z.string().optional().describe('Brief company description'),
  }),
  
  // Extract task or todo item
  task: z.object({
    title: z.string().describe('Task title or summary'),
    description: z.string().optional().describe('Detailed description'),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
    dueDate: z.string().optional().describe('Due date in ISO format'),
    assignee: z.string().optional().describe('Person assigned to the task'),
    tags: z.array(z.string()).optional().describe('Related tags or categories'),
  }),
  
  // Extract meeting information
  meeting: z.object({
    title: z.string().describe('Meeting title or subject'),
    date: z.string().describe('Meeting date in ISO format'),
    time: z.string().optional().describe('Meeting time'),
    duration: z.number().optional().describe('Duration in minutes'),
    attendees: z.array(z.string()).optional().describe('List of attendees'),
    agenda: z.array(z.string()).optional().describe('Meeting agenda items'),
    location: z.string().optional().describe('Meeting location or video link'),
  }),
  
  // Extract product information
  product: z.object({
    name: z.string().describe('Product name'),
    category: z.string().optional().describe('Product category'),
    price: z.number().optional().describe('Product price'),
    currency: z.string().optional().describe('Price currency'),
    description: z.string().optional().describe('Product description'),
    features: z.array(z.string()).optional().describe('Key features'),
    inStock: z.boolean().optional().describe('Availability status'),
  }),
};

export type SchemaType = keyof typeof schemas;

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
      schemaType,
      customSchema,
      model: requestedModel,
      temperature,
      maxTokens,
    } = req.body;

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Prompt string is required' });
    }

    // Get schema
    let schema: z.ZodType<any>;
    if (customSchema) {
      // Parse custom schema from JSON Schema format
      try {
        // For security, we don't allow arbitrary code execution
        // Instead, we expect a JSON Schema that we convert to Zod
        return res.status(400).json({ 
          error: 'Custom schemas are not yet supported. Please use one of the predefined schema types.' 
        });
      } catch (error) {
        return res.status(400).json({ error: 'Invalid custom schema' });
      }
    } else if (schemaType && schemaType in schemas) {
      schema = schemas[schemaType as SchemaType];
    } else {
      return res.status(400).json({ 
        error: 'Schema type is required. Available types: ' + Object.keys(schemas).join(', ') 
      });
    }

    // Sanitize prompt
    const sanitizedPrompt = sanitizePrompt(prompt);

    // Get the model
    const modelId = (requestedModel || env.ai.defaultModel) as ModelId;
    let model;
    try {
      model = getModel(modelId);
    } catch (error) {
      return res.status(400).json({ error: error instanceof Error ? error.message : 'Invalid model' });
    }

    // Increment rate limit
    const allowed = await incrementRateLimit(userId, teamId);
    if (!allowed) {
      return res.status(429).json({ error: 'Rate limit exceeded' });
    }

    // Generate structured object
    const { object, usage, finishReason } = await generateObject({
      model,
      prompt: sanitizedPrompt,
      schema,
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
          type: 'object-generation',
          schemaType: schemaType || 'custom',
        },
      });
    }

    // Return response with rate limit headers
    res.setHeader('X-RateLimit-Limit', rateLimitStatus.limit.toString());
    res.setHeader('X-RateLimit-Remaining', (rateLimitStatus.remaining - 1).toString());
    res.setHeader('X-RateLimit-Reset', rateLimitStatus.reset.toISOString());

    return res.status(200).json({
      object,
      usage,
      finishReason,
      model: modelId,
      schemaType,
    });

  } catch (error) {
    console.error('AI Generate Object Error:', error);
    return res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    });
  }
}