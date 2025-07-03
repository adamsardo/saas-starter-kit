import type { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from '@/lib/session';
import { throwIfNoTeamAccess } from '../../../models/team';
import { getAvailableModels, modelMetadata } from '@/lib/ai/config';
import { isAIEnabledForTeam } from '@/lib/ai/utils';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow GET requests
  if (req.method !== 'GET') {
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

    // Check if AI features are enabled for the team
    if (!await isAIEnabledForTeam(teamId)) {
      return res.status(403).json({ error: 'AI features are not enabled for this team' });
    }

    // Get available models
    const availableModelIds = getAvailableModels();
    const models = availableModelIds.map(id => ({
      id,
      ...modelMetadata[id],
      available: true,
    }));

    // Add unavailable models with available: false
    const allModelIds = Object.keys(modelMetadata) as Array<keyof typeof modelMetadata>;
    const unavailableModels = allModelIds
      .filter(id => !availableModelIds.includes(id))
      .map(id => ({
        id,
        ...modelMetadata[id],
        available: false,
      }));

    return res.status(200).json({
      models: [...models, ...unavailableModels],
      defaultModel: process.env.AI_DEFAULT_MODEL || 'gpt-4o-mini',
    });

  } catch (error) {
    console.error('AI Models Error:', error);
    return res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    });
  }
}