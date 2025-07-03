import { useAuth, useOrganization, useUser, useClerk } from '@clerk/nextjs';
import { useRouter } from 'next/router';
import { Role } from '@prisma/client';
import { CLERK_ROLES } from '@/lib/clerk';
import { useEffect, useState } from 'react';
import { ApiError } from '@/lib/errors';

interface UserWithTeam {
  id: string;
  email: string;
  name: string | null;
  image?: string | null;
  team?: {
    id: string;
    name: string;
    slug: string;
  };
  role?: Role;
}

export function useClerkAuth() {
  const { isLoaded, isSignedIn, userId } = useAuth();
  const { user } = useUser();
  const { organization, membership } = useOrganization();
  const { signOut, setActive } = useClerk();
  const router = useRouter();
  const [userWithTeam, setUserWithTeam] = useState<UserWithTeam | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    if (!isSignedIn || !user) {
      setUserWithTeam(null);
      setLoading(false);
      return;
    }

    // Build user object with team info
    const userData: UserWithTeam = {
      id: user.id,
      email: user.emailAddresses[0]?.emailAddress || '',
      name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || null,
      image: user.imageUrl,
    };

    if (organization && membership) {
      const role = membership.role as keyof typeof CLERK_ROLES;
      userData.team = {
        id: organization.id,
        name: organization.name,
        slug: organization.slug || organization.id,
      };
      userData.role = CLERK_ROLES[role] || Role.MEMBER;
    }

    setUserWithTeam(userData);
    setLoading(false);
  }, [isLoaded, isSignedIn, user, organization, membership]);

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  const hasPermission = (resource: string, action: string): boolean => {
    if (!userWithTeam?.role) return false;
    
    // Use the existing permission system
    const { permissions } = require('@/lib/permissions');
    
    const rolePermissions = permissions[userWithTeam.role];
    if (!rolePermissions) return false;

    const permission = rolePermissions.find((p: any) => p.resource === resource);
    if (!permission) return false;

    return permission.actions === '*' || permission.actions.includes(action);
  };

  const switchTeam = async (teamId: string) => {
    await setActive({ organization: teamId });
    router.reload();
  };

  return {
    user: userWithTeam,
    isLoaded: isLoaded && !loading,
    isSignedIn,
    signOut: handleSignOut,
    hasPermission,
    switchTeam,
    organization,
  };
}

// Hook to require authentication
export function useRequireAuth(redirectTo = '/auth/login') {
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push(redirectTo);
    }
  }, [isLoaded, isSignedIn, router, redirectTo]);

  return { isLoaded, isSignedIn };
}

// Hook to check team access
export function useTeamAccess(teamSlug: string) {
  const { organization } = useOrganization();
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!organization) {
      setHasAccess(false);
      setLoading(false);
      return;
    }

    // Check if the current organization slug matches
    const orgSlug = organization.slug || organization.id;
    setHasAccess(orgSlug === teamSlug);
    setLoading(false);
  }, [organization, teamSlug]);

  return { hasAccess, loading };
}