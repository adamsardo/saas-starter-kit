import type { Patient, PatientStatus, RiskLevel, Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { encrypt, decrypt } from '@/lib/encryption';
import { logAuditEvent } from '@/lib/retraced';

export type PatientWithRelations = Patient & {
  therapist?: { id: string; name: string; email: string };
  team?: { id: string; name: string };
  _count?: {
    sessions: number;
    documents: number;
  };
};

// Encrypt sensitive patient data
const encryptSensitiveData = (data: any) => {
  if (!data) return null;
  return encrypt(JSON.stringify(data));
};

// Decrypt sensitive patient data
const decryptSensitiveData = (data: any) => {
  if (!data) return null;
  try {
    return JSON.parse(decrypt(data));
  } catch {
    return data; // Return as-is if decryption fails
  }
};

// Create a new patient
export const createPatient = async (
  data: {
    teamId: string;
    therapistId: string;
    firstName: string;
    lastName: string;
    dateOfBirth: Date;
    email?: string;
    phone?: string;
    emergencyContact?: any;
    address?: any;
    insuranceInfo?: any;
    diagnoses?: string[];
    medications?: any[];
    allergies?: string[];
    notes?: string;
  },
  userId: string
) => {
  // Encrypt sensitive fields
  const encryptedData = {
    ...data,
    emergencyContact: encryptSensitiveData(data.emergencyContact),
    address: encryptSensitiveData(data.address),
    insuranceInfo: encryptSensitiveData(data.insuranceInfo),
    medications: data.medications || [],
    diagnoses: data.diagnoses || [],
    allergies: data.allergies || [],
  };

  const patient = await prisma.patient.create({
    data: encryptedData,
    include: {
      therapist: {
        select: { id: true, name: true, email: true },
      },
      team: {
        select: { id: true, name: true },
      },
    },
  });

  // Log audit event
  await logAuditEvent({
    teamId: data.teamId,
    userId,
    action: 'patient.created',
    crud: 'c',
    target: {
      id: patient.id,
      type: 'patient',
      displayName: `${patient.firstName} ${patient.lastName}`,
    },
  });

  return patient;
};

// Get patient by ID with decrypted data
export const getPatient = async (
  patientId: string,
  teamId: string,
  includeRelations = false
) => {
  const patient = await prisma.patient.findFirst({
    where: {
      id: patientId,
      teamId,
    },
    include: includeRelations
      ? {
          therapist: {
            select: { id: true, name: true, email: true },
          },
          team: {
            select: { id: true, name: true },
          },
          _count: {
            select: {
              sessions: true,
              documents: true,
            },
          },
        }
      : undefined,
  });

  if (!patient) return null;

  // Decrypt sensitive fields
  return {
    ...patient,
    emergencyContact: decryptSensitiveData(patient.emergencyContact),
    address: decryptSensitiveData(patient.address),
    insuranceInfo: decryptSensitiveData(patient.insuranceInfo),
  };
};

// Get all patients for a team
export const getPatients = async (
  teamId: string,
  options?: {
    therapistId?: string;
    status?: PatientStatus;
    search?: string;
    limit?: number;
    offset?: number;
    sortBy?: 'name' | 'createdAt' | 'lastSessionDate';
    sortOrder?: 'asc' | 'desc';
  }
) => {
  const where: Prisma.PatientWhereInput = {
    teamId,
    ...(options?.therapistId && { therapistId: options.therapistId }),
    ...(options?.status && { status: options.status }),
    ...(options?.search && {
      OR: [
        { firstName: { contains: options.search, mode: 'insensitive' } },
        { lastName: { contains: options.search, mode: 'insensitive' } },
        { email: { contains: options.search, mode: 'insensitive' } },
      ],
    }),
  };

  const orderBy: Prisma.PatientOrderByWithRelationInput = {};
  if (options?.sortBy === 'name') {
    orderBy.lastName = options.sortOrder || 'asc';
  } else if (options?.sortBy) {
    orderBy[options.sortBy] = options.sortOrder || 'desc';
  }

  const [patients, total] = await Promise.all([
    prisma.patient.findMany({
      where,
      orderBy,
      take: options?.limit || 50,
      skip: options?.offset || 0,
      include: {
        therapist: {
          select: { id: true, name: true, email: true },
        },
        _count: {
          select: {
            sessions: true,
            documents: true,
          },
        },
      },
    }),
    prisma.patient.count({ where }),
  ]);

  // Decrypt sensitive fields for all patients
  const decryptedPatients = patients.map((patient) => ({
    ...patient,
    emergencyContact: decryptSensitiveData(patient.emergencyContact),
    address: decryptSensitiveData(patient.address),
    insuranceInfo: decryptSensitiveData(patient.insuranceInfo),
  }));

  return { patients: decryptedPatients, total };
};

// Update patient
export const updatePatient = async (
  patientId: string,
  teamId: string,
  data: Partial<{
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    emergencyContact: any;
    address: any;
    insuranceInfo: any;
    status: PatientStatus;
    riskLevel: RiskLevel;
    diagnoses: string[];
    medications: any[];
    allergies: string[];
    notes: string;
  }>,
  userId: string
) => {
  // Encrypt sensitive fields if provided
  const updateData: any = { ...data };
  if (data.emergencyContact !== undefined) {
    updateData.emergencyContact = encryptSensitiveData(data.emergencyContact);
  }
  if (data.address !== undefined) {
    updateData.address = encryptSensitiveData(data.address);
  }
  if (data.insuranceInfo !== undefined) {
    updateData.insuranceInfo = encryptSensitiveData(data.insuranceInfo);
  }

  const patient = await prisma.patient.update({
    where: {
      id: patientId,
      teamId,
    },
    data: updateData,
  });

  // Log audit event
  await logAuditEvent({
    teamId,
    userId,
    action: 'patient.updated',
    crud: 'u',
    target: {
      id: patient.id,
      type: 'patient',
      displayName: `${patient.firstName} ${patient.lastName}`,
    },
    fields: Object.keys(data),
  });

  return patient;
};

// Delete patient (soft delete by changing status)
export const deletePatient = async (
  patientId: string,
  teamId: string,
  userId: string
) => {
  const patient = await prisma.patient.update({
    where: {
      id: patientId,
      teamId,
    },
    data: {
      status: 'INACTIVE',
    },
  });

  // Log audit event
  await logAuditEvent({
    teamId,
    userId,
    action: 'patient.deleted',
    crud: 'd',
    target: {
      id: patient.id,
      type: 'patient',
      displayName: `${patient.firstName} ${patient.lastName}`,
    },
  });

  return patient;
};

// Get patient statistics
export const getPatientStats = async (patientId: string, teamId: string) => {
  const stats = await prisma.patient.findFirst({
    where: {
      id: patientId,
      teamId,
    },
    include: {
      _count: {
        select: {
          sessions: true,
          documents: true,
          treatmentPlans: true,
          riskAssessments: true,
        },
      },
      sessions: {
        where: {
          status: 'COMPLETED',
        },
        orderBy: {
          scheduledAt: 'desc',
        },
        take: 1,
        select: {
          scheduledAt: true,
        },
      },
      riskAssessments: {
        orderBy: {
          assessmentDate: 'desc',
        },
        take: 1,
        select: {
          riskLevel: true,
          assessmentDate: true,
        },
      },
    },
  });

  if (!stats) return null;

  return {
    totalSessions: stats._count.sessions,
    totalDocuments: stats._count.documents,
    activeTreatmentPlans: stats._count.treatmentPlans,
    totalRiskAssessments: stats._count.riskAssessments,
    lastSessionDate: stats.sessions[0]?.scheduledAt || null,
    currentRiskLevel: stats.riskAssessments[0]?.riskLevel || 'LOW',
    lastRiskAssessment: stats.riskAssessments[0]?.assessmentDate || null,
  };
};

// Check if user has access to patient
export const hasPatientAccess = async (
  userId: string,
  patientId: string,
  teamId: string
): Promise<boolean> => {
  // Check if user is the primary therapist
  const asTherapist = await prisma.patient.findFirst({
    where: {
      id: patientId,
      teamId,
      therapistId: userId,
    },
  });

  if (asTherapist) return true;

  // Check if user is part of the care team
  const asCareTeam = await prisma.careTeamMember.findFirst({
    where: {
      patientId,
      userId,
      endDate: null, // Active membership
    },
  });

  if (asCareTeam) return true;

  // Check if user is a supervisor (ADMIN or OWNER role)
  const teamMember = await prisma.teamMember.findFirst({
    where: {
      teamId,
      userId,
      role: {
        in: ['ADMIN', 'OWNER'],
      },
    },
  });

  return !!teamMember;
}; 