import { Role } from '@prisma/client';

// Map Clerk roles to our existing Role enum
export const CLERK_ROLE_METADATA_KEY = 'role';
export const CLERK_TEAM_ID_METADATA_KEY = 'teamId';

// Clerk organization role mapping
export const CLERK_ROLES = {
  'org:admin': Role.ADMIN,
  'org:member': Role.MEMBER,
  'org:owner': Role.OWNER,
} as const;