import type { Team } from '@prisma/client';
import { Client } from '@retracedhq/retraced';
import type { CRUD, Event } from '@retracedhq/retraced';
import type { User } from 'next-auth';

import env from './env';

type EventType =
  | 'member.invitation.create'
  | 'member.invitation.delete'
  | 'member.remove'
  | 'member.update'
  | 'sso.connection.create'
  | 'sso.connection.patch'
  | 'sso.connection.delete'
  | 'dsync.connection.create'
  | 'dsync.connection.delete'
  | 'webhook.create'
  | 'webhook.delete'
  | 'webhook.update'
  | 'team.create'
  | 'team.update'
  | 'team.delete'
  | 'patient.created'
  | 'patient.updated'
  | 'patient.deleted'
  | 'session.created'
  | 'session.started'
  | 'session.completed'
  | 'session.cancelled'
  | 'document.created'
  | 'document.updated'
  | 'document.signed'
  | 'document.deleted';

type Request = {
  action: EventType;
  user: User;
  team: Team;
  crud: CRUD;
  // target: Target;
};

let retracedClient: Client;

const getRetracedClient = () => {
  if (!env.retraced.apiKey || !env.retraced.projectId || !env.retraced.url) {
    return;
  }

  if (!retracedClient) {
    retracedClient = new Client({
      endpoint: env.retraced.url,
      apiKey: env.retraced.apiKey,
      projectId: env.retraced.projectId,
    });
  }

  return retracedClient;
};

export const sendAudit = async (request: Request) => {
  const retracedClient = getRetracedClient();

  if (!retracedClient) {
    return;
  }

  const { action, user, team, crud } = request;

  const event: Event = {
    action,
    crud,
    group: {
      id: team.id,
      name: team.name,
    },
    actor: {
      id: user.id,
      name: user.name as string,
    },
    created: new Date(),
  };

  return await retracedClient.reportEvent(event);
};

export const getViewerToken = async (groupId: string, actorId: string) => {
  const retracedClient = getRetracedClient();

  if (!retracedClient) {
    return;
  }

  try {
    return await retracedClient.getViewerToken(groupId, actorId, true);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error) {
    throw new Error(
      'Unable to get viewer token from Retraced. Please check Retraced configuration.'
    );
  }
};

// New audit event function for mental health platform
export const logAuditEvent = async (params: {
  teamId: string;
  userId: string;
  action: EventType;
  crud: CRUD;
  target?: {
    id: string;
    type: string;
    displayName?: string;
  };
  fields?: string[];
  metadata?: Record<string, any>;
}) => {
  const retracedClient = getRetracedClient();

  if (!retracedClient) {
    return;
  }

  const event: Event = {
    action: params.action,
    crud: params.crud,
    group: {
      id: params.teamId,
    },
    actor: {
      id: params.userId,
    },
    created: new Date(),
    target: params.target,
    metadata: params.metadata,
  };

  try {
    await retracedClient.reportEvent(event);
  } catch (error) {
    console.error('Failed to log audit event:', error);
    // Don't throw - audit logging should not break the application
  }
};
