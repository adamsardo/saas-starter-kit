import { useUser, useOrganization } from '@clerk/nextjs';
import { useMemo } from 'react';
import { Role } from '@prisma/client';
import { CLERK_ROLES } from '@/lib/clerk';

// Session hook that provides user and organization data
export function useSession() {
  const { user, isLoaded: userLoaded, isSignedIn } = useUser();
  const { organization, membership, isLoaded: orgLoaded } = useOrganization();

  const status = useMemo(() => {
    if (!userLoaded || !orgLoaded) return 'loading';
    if (!isSignedIn) return 'unauthenticated';
    return 'authenticated';
  }, [userLoaded, orgLoaded, isSignedIn]);

  const data = useMemo(() => {
    if (!user || !isSignedIn) return null;

    const role = membership?.role as keyof typeof CLERK_ROLES;
    const mappedRole = CLERK_ROLES[role] || Role.MEMBER;

    return {
      user: {
        id: user.id,
        email: user.primaryEmailAddress?.emailAddress || '',
        name: user.fullName || user.firstName || user.username || '',
        image: user.imageUrl,
        roles: organization ? [{
          teamId: organization.id,
          role: mappedRole
        }] : []
      },
      expires: null // Clerk handles session expiry internally
    };
  }, [user, isSignedIn, organization, membership]);

  // Update function for compatibility - Clerk automatically syncs user data
  const update = async () => {
    console.warn('Session update is not supported. User data is automatically synced.');
    return null;
  };

  return { data, status, update };
}