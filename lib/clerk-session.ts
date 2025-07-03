import { auth, currentUser } from '@clerk/nextjs/server';
import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';
import { CLERK_ROLES } from './clerk';
import { ApiError } from './errors';

interface SessionUser {
  id: string;
  email: string;
  name: string | null;
  image?: string | null;
}

interface SessionWithTeam {
  user: SessionUser & {
    id: string;
    team: {
      id: string;
      name: string;
      slug: string;
    };
    role: Role;
  };
}

// Get session for API routes
export async function getSession(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<{ user: SessionUser } | null> {
  const { userId } = await auth();
  
  if (!userId) {
    return null;
  }

  const clerkUser = await currentUser();
  if (!clerkUser) {
    return null;
  }

  // Get user from database
  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!dbUser) {
    return null;
  }

  return {
    user: {
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.name,
      image: dbUser.image,
    },
  };
}

// Get current user with team for API routes
export async function getCurrentUserWithTeam(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<SessionWithTeam['user']> {
  const { userId, orgId } = await auth();
  
  if (!userId || !orgId) {
    throw new ApiError(401, 'Unauthorized');
  }

  const clerkUser = await currentUser();
  if (!clerkUser) {
    throw new ApiError(401, 'Unauthorized');
  }

  // Get user from database
  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!dbUser) {
    throw new ApiError(401, 'User not found');
  }

  // Get team
  const team = await prisma.team.findUnique({
    where: { id: orgId },
  });

  if (!team) {
    throw new ApiError(404, 'Team not found');
  }

  // Get user's role in the organization from Clerk
  const userWithOrgs = clerkUser as any;
  const orgMemberships = userWithOrgs.organizationMemberships || [];
  const orgMembership = orgMemberships.find(
    (membership: any) => membership.organization.id === orgId
  );

  const role = orgMembership?.role as keyof typeof CLERK_ROLES;
  const mappedRole = CLERK_ROLES[role] || Role.MEMBER;

  return {
    id: dbUser.id,
    email: dbUser.email,
    name: dbUser.name,
    image: dbUser.image,
    team: {
      id: team.id,
      name: team.name,
      slug: team.slug,
    },
    role: mappedRole,
  };
}

// Check if user has team access
export async function throwIfNoTeamAccess(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  const { slug } = req.query as { slug: string };
  
  if (!slug) {
    throw new ApiError(400, 'Team slug is required');
  }

  const user = await getCurrentUserWithTeam(req, res);
  
  if (user.team.slug !== slug) {
    throw new ApiError(403, 'Access denied');
  }
}

// Check if user has permission
export function throwIfNotAllowed(
  user: SessionWithTeam['user'],
  resource: string,
  action: string
): void {
  const { permissions } = require('./permissions');
  
  const rolePermissions = permissions[user.role];
  if (!rolePermissions) {
    throw new ApiError(403, 'Access denied');
  }

  const permission = rolePermissions.find((p: any) => p.resource === resource);
  if (!permission) {
    throw new ApiError(403, 'Access denied');
  }

  const hasPermission = permission.actions === '*' || permission.actions.includes(action);
  if (!hasPermission) {
    throw new ApiError(403, 'Access denied');
  }
}