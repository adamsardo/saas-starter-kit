import { auth, currentUser } from '@clerk/nextjs/server';
import { Role } from '@prisma/client';
import { CLERK_ROLES } from './clerk-constants';

// Re-export constants from clerk-constants.ts
export { CLERK_ROLE_METADATA_KEY, CLERK_TEAM_ID_METADATA_KEY, CLERK_ROLES } from './clerk-constants';

// Helper to get current user with team context
export async function getCurrentUserWithTeam() {
  const { userId, orgId } = await auth();
  
  if (!userId || !orgId) {
    return null;
  }

  const user = await currentUser();
  if (!user) {
    return null;
  }

  // Cast to any to handle Clerk's dynamic user object
  const userWithOrgs = user as any;
  
  // Get user's role in the organization
  const orgMemberships = userWithOrgs.organizationMemberships || [];
  const orgMembership = orgMemberships.find(
    (membership: any) => membership.organization.id === orgId
  );

  const role = orgMembership?.role as keyof typeof CLERK_ROLES;
  const mappedRole = CLERK_ROLES[role] || Role.MEMBER;

  return {
    id: userId,
    email: user.emailAddresses?.[0]?.emailAddress || '',
    name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || null,
    teamId: orgId,
    role: mappedRole,
  };
}

// Check if user has permission for a resource and action
export function hasPermission(
  userRole: Role,
  resource: string,
  action: string
): boolean {
  // This will use the existing permission system
  // We'll import and use the existing permissions from lib/permissions.ts
  const { permissions } = require('./permissions');
  
  const rolePermissions = permissions[userRole];
  if (!rolePermissions) return false;

  const permission = rolePermissions.find((p: any) => p.resource === resource);
  if (!permission) return false;

  return permission.actions === '*' || permission.actions.includes(action);
}

// Helper to ensure user is authenticated and has team access
export async function requireAuth() {
  const { userId, orgId } = await auth();
  
  if (!userId) {
    throw new Error('Unauthorized');
  }

  if (!orgId) {
    throw new Error('No team selected');
  }

  return { userId, orgId };
}