import { Role } from '@prisma/client';

type RoleType = (typeof Role)[keyof typeof Role];
export type Action = 'create' | 'update' | 'read' | 'delete' | 'leave';
export type Resource =
  | 'team'
  | 'team_member'
  | 'team_invitation'
  | 'team_sso'
  | 'team_dsync'
  | 'team_audit_log'
  | 'team_webhook'
  | 'team_payments'
  | 'team_api_key'
  | 'patient'
  | 'therapy_session'
  | 'clinical_document'
  | 'treatment_plan'
  | 'risk_assessment'
  | 'document_template'
  | 'transcription';

type RolePermissions = {
  [role in RoleType]: Permission[];
};

export type Permission = {
  resource: Resource;
  actions: Action[] | '*';
};

export const availableRoles = [
  {
    id: Role.MEMBER,
    name: 'Member',
  },
  {
    id: Role.ADMIN,
    name: 'Admin',
  },
  {
    id: Role.OWNER,
    name: 'Owner',
  },
  {
    id: Role.THERAPIST,
    name: 'Therapist',
  },
  {
    id: Role.SUPERVISOR,
    name: 'Supervisor',
  },
  {
    id: Role.CLINICAL_ADMIN,
    name: 'Clinical Admin',
  },
];

export const permissions: RolePermissions = {
  OWNER: [
    {
      resource: 'team',
      actions: '*',
    },
    {
      resource: 'team_member',
      actions: '*',
    },
    {
      resource: 'team_invitation',
      actions: '*',
    },
    {
      resource: 'team_sso',
      actions: '*',
    },
    {
      resource: 'team_dsync',
      actions: '*',
    },
    {
      resource: 'team_audit_log',
      actions: '*',
    },
    {
      resource: 'team_payments',
      actions: '*',
    },
    {
      resource: 'team_webhook',
      actions: '*',
    },
    {
      resource: 'team_api_key',
      actions: '*',
    },
  ],
  ADMIN: [
    {
      resource: 'team',
      actions: '*',
    },
    {
      resource: 'team_member',
      actions: '*',
    },
    {
      resource: 'team_invitation',
      actions: '*',
    },
    {
      resource: 'team_sso',
      actions: '*',
    },
    {
      resource: 'team_dsync',
      actions: '*',
    },
    {
      resource: 'team_audit_log',
      actions: '*',
    },
    {
      resource: 'team_webhook',
      actions: '*',
    },
    {
      resource: 'team_api_key',
      actions: '*',
    },
  ],
  MEMBER: [
    {
      resource: 'team',
      actions: ['read', 'leave'],
    },
  ],
  THERAPIST: [
    {
      resource: 'team',
      actions: ['read'],
    },
    {
      resource: 'patient',
      actions: ['read', 'update'], // Only assigned patients
    },
    {
      resource: 'therapy_session',
      actions: '*', // Full access to their own sessions
    },
    {
      resource: 'clinical_document',
      actions: '*', // Full access to their own documents
    },
    {
      resource: 'treatment_plan',
      actions: '*', // Full access to their own treatment plans
    },
    {
      resource: 'risk_assessment',
      actions: '*', // Full access to their own risk assessments
    },
    {
      resource: 'document_template',
      actions: ['read', 'create', 'update'], // Can create and use templates
    },
    {
      resource: 'transcription',
      actions: '*', // Full access to transcription for their sessions
    },
  ],
  SUPERVISOR: [
    {
      resource: 'team',
      actions: ['read', 'update'],
    },
    {
      resource: 'team_member',
      actions: ['read', 'update'], // Can manage therapists
    },
    {
      resource: 'patient',
      actions: ['read', 'update'], // Can access all patients in team
    },
    {
      resource: 'therapy_session',
      actions: ['read', 'update'], // Can review all sessions
    },
    {
      resource: 'clinical_document',
      actions: ['read', 'update'], // Can review and approve documents
    },
    {
      resource: 'treatment_plan',
      actions: ['read', 'update'], // Can review treatment plans
    },
    {
      resource: 'risk_assessment',
      actions: '*', // Full access for oversight
    },
    {
      resource: 'document_template',
      actions: '*', // Can manage templates
    },
    {
      resource: 'transcription',
      actions: ['read'], // Can review transcriptions
    },
  ],
  CLINICAL_ADMIN: [
    {
      resource: 'team',
      actions: '*',
    },
    {
      resource: 'team_member',
      actions: '*',
    },
    {
      resource: 'team_invitation',
      actions: '*',
    },
    {
      resource: 'patient',
      actions: '*', // Full patient management
    },
    {
      resource: 'therapy_session',
      actions: '*', // Full session management
    },
    {
      resource: 'clinical_document',
      actions: '*', // Full document management
    },
    {
      resource: 'treatment_plan',
      actions: '*', // Full treatment plan management
    },
    {
      resource: 'risk_assessment',
      actions: '*', // Full risk assessment management
    },
    {
      resource: 'document_template',
      actions: '*', // Full template management
    },
    {
      resource: 'transcription',
      actions: '*', // Full transcription management
    },
    {
      resource: 'team_audit_log',
      actions: ['read'],
    },
  ],
};

// Helper function to check if user has permission for a resource and action
export function hasPermission(
  userRole: Role,
  resource: Resource,
  action: Action
): boolean {
  const rolePermissions = permissions[userRole];
  if (!rolePermissions) return false;

  const permission = rolePermissions.find(p => p.resource === resource);
  if (!permission) return false;

  return permission.actions === '*' || permission.actions.includes(action);
}
