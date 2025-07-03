import type { TherapySession, SessionStatus, TherapyModality, Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { logAuditEvent } from '@/lib/retraced';

export type TherapySessionWithRelations = TherapySession & {
  patient?: {
    id: string;
    firstName: string;
    lastName: string;
    riskLevel: string;
  };
  therapist?: {
    id: string;
    name: string;
    email: string;
  };
  transcript?: {
    id: string;
    processingStatus: string;
    summary?: string | null;
  };
  audioRecording?: {
    id: string;
    fileUrl: string;
    duration: number;
  };
  documents?: Array<{
    id: string;
    type: string;
    title: string;
    isDraft: boolean;
  }>;
};

// Create a new therapy session
export const createTherapySession = async (
  data: {
    patientId: string;
    therapistId: string;
    teamId: string;
    scheduledAt: Date;
    modality?: TherapyModality;
    isRemote?: boolean;
    location?: string;
    presentingIssues?: string[];
  },
  userId: string
) => {
  const session = await prisma.therapySession.create({
    data: {
      ...data,
      status: 'SCHEDULED',
      modality: data.modality || 'CBT',
      isRemote: data.isRemote || false,
      presentingIssues: data.presentingIssues || [],
      interventions: [],
    },
    include: {
      patient: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          riskLevel: true,
        },
      },
    },
  });

  // Log audit event
  await logAuditEvent({
    teamId: data.teamId,
    userId,
    action: 'session.created',
    crud: 'c',
    target: {
      id: session.id,
      type: 'therapy_session',
      displayName: `Session for ${session.patient.firstName} ${session.patient.lastName}`,
    },
  });

  return session;
};

// Start a therapy session
export const startTherapySession = async (
  sessionId: string,
  teamId: string,
  userId: string
) => {
  const session = await prisma.therapySession.update({
    where: {
      id: sessionId,
      teamId,
      status: 'SCHEDULED',
    },
    data: {
      status: 'IN_PROGRESS',
      startedAt: new Date(),
    },
    include: {
      patient: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          riskLevel: true,
        },
      },
    },
  });

  // Log audit event
  await logAuditEvent({
    teamId,
    userId,
    action: 'session.started',
    crud: 'u',
    target: {
      id: session.id,
      type: 'therapy_session',
      displayName: `Session for ${session.patient.firstName} ${session.patient.lastName}`,
    },
  });

  return session;
};

// Complete a therapy session
export const completeTherapySession = async (
  sessionId: string,
  teamId: string,
  data: {
    interventions: string[];
    homework?: string;
    privateNotes?: string;
    billingCode?: string;
    billingUnits?: number;
    isCrisis?: boolean;
    riskFlags?: string[];
  },
  userId: string
) => {
  const session = await prisma.therapySession.findFirst({
    where: {
      id: sessionId,
      teamId,
      status: 'IN_PROGRESS',
    },
  });

  if (!session) {
    throw new Error('Session not found or not in progress');
  }

  const duration = session.startedAt
    ? Math.round((new Date().getTime() - session.startedAt.getTime()) / 60000)
    : undefined;

  const updatedSession = await prisma.therapySession.update({
    where: { id: sessionId },
    data: {
      ...data,
      status: 'COMPLETED',
      endedAt: new Date(),
      duration,
    },
    include: {
      patient: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  });

  // Update patient's last session date
  await prisma.patient.update({
    where: { id: session.patientId },
    data: { lastSessionDate: new Date() },
  });

  // Log audit event
  await logAuditEvent({
    teamId,
    userId,
    action: 'session.completed',
    crud: 'u',
    target: {
      id: session.id,
      type: 'therapy_session',
      displayName: `Session for ${updatedSession.patient.firstName} ${updatedSession.patient.lastName}`,
    },
    metadata: {
      duration,
      isCrisis: data.isCrisis,
      riskFlags: data.riskFlags,
    },
  });

  return updatedSession;
};

// Get therapy session by ID
export const getTherapySession = async (
  sessionId: string,
  teamId: string,
  includeRelations = false
): Promise<TherapySessionWithRelations | null> => {
  const session = await prisma.therapySession.findFirst({
    where: {
      id: sessionId,
      teamId,
    },
    include: includeRelations
      ? {
          patient: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              riskLevel: true,
            },
          },
          therapist: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          transcript: {
            select: {
              id: true,
              processingStatus: true,
              summary: true,
            },
          },
          audioRecording: {
            select: {
              id: true,
              fileUrl: true,
              duration: true,
            },
          },
          documents: {
            select: {
              id: true,
              type: true,
              title: true,
              isDraft: true,
            },
            orderBy: {
              createdAt: 'desc',
            },
          },
        }
      : undefined,
  });

  return session as TherapySessionWithRelations | null;
};

// Get all therapy sessions for a team
export const getTherapySessions = async (
  teamId: string,
  options?: {
    patientId?: string;
    therapistId?: string;
    status?: SessionStatus;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }
) => {
  const where: Prisma.TherapySessionWhereInput = {
    teamId,
    ...(options?.patientId && { patientId: options.patientId }),
    ...(options?.therapistId && { therapistId: options.therapistId }),
    ...(options?.status && { status: options.status }),
    ...(options?.startDate &&
      options?.endDate && {
        scheduledAt: {
          gte: options.startDate,
          lte: options.endDate,
        },
      }),
  };

  const [sessions, total] = await Promise.all([
    prisma.therapySession.findMany({
      where,
      orderBy: {
        scheduledAt: 'desc',
      },
      take: options?.limit || 50,
      skip: options?.offset || 0,
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            riskLevel: true,
          },
        },
        therapist: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        transcript: {
          select: {
            id: true,
            processingStatus: true,
          },
        },
      },
    }),
    prisma.therapySession.count({ where }),
  ]);

  return { sessions, total };
};

// Cancel a therapy session
export const cancelTherapySession = async (
  sessionId: string,
  teamId: string,
  reason: string,
  userId: string
) => {
  const session = await prisma.therapySession.update({
    where: {
      id: sessionId,
      teamId,
      status: {
        in: ['SCHEDULED', 'IN_PROGRESS'],
      },
    },
    data: {
      status: 'CANCELLED',
      privateNotes: reason,
      endedAt: new Date(),
    },
    include: {
      patient: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
    },
  });

  // Log audit event
  await logAuditEvent({
    teamId,
    userId,
    action: 'session.cancelled',
    crud: 'u',
    target: {
      id: session.id,
      type: 'therapy_session',
      displayName: `Session for ${session.patient.firstName} ${session.patient.lastName}`,
    },
    metadata: {
      reason,
    },
  });

  return session;
};

// Get upcoming sessions for a therapist
export const getUpcomingSessions = async (
  therapistId: string,
  teamId: string,
  days = 7
) => {
  const startDate = new Date();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + days);

  return prisma.therapySession.findMany({
    where: {
      therapistId,
      teamId,
      status: 'SCHEDULED',
      scheduledAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    orderBy: {
      scheduledAt: 'asc',
    },
    include: {
      patient: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          riskLevel: true,
        },
      },
    },
  });
};

// Check if user has access to session
export const hasSessionAccess = async (
  userId: string,
  sessionId: string,
  teamId: string
): Promise<boolean> => {
  // Check if user is the therapist
  const asTherapist = await prisma.therapySession.findFirst({
    where: {
      id: sessionId,
      teamId,
      therapistId: userId,
    },
  });

  if (asTherapist) return true;

  // Check if user has access to the patient
  const session = await prisma.therapySession.findFirst({
    where: {
      id: sessionId,
      teamId,
    },
    select: {
      patientId: true,
    },
  });

  if (!session) return false;

  // Use the patient access check from patient model
  const { hasPatientAccess } = await import('./patient');
  return hasPatientAccess(userId, session.patientId, teamId);
}; 